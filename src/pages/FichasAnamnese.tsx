import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Tipagens para o motor dinâmico
type Campo = { id: string; label: string; tipo: string; opcoes?: string[] };
type Secao = { titulo: string; campos: Campo[] };
type ModeloFicha = { id: string; titulo: string; campos: Secao[]; created_at: string };

// --- MODELOS PADRÃO (SÃO CARREGADOS AUTOMATICAMENTE SE O BANCO ESTIVER VAZIO) ---
const MODELOS_PADRAO: Record<string, Secao[]> = {
  'Anamnese Facial': [
    { titulo: 'Queixa Principal', campos: [
      { id: 'facial_queixa', label: 'O que mais incomoda na sua pele?', tipo: 'text' },
      { id: 'facial_tempo', label: 'Há quanto tempo percebe essa alteração?', tipo: 'text' },
      { id: 'facial_trat_ant', label: 'Já realizou algum tratamento estético anteriormente? Qual?', tipo: 'text' }
    ]},
    { titulo: 'Hábitos de Vida', campos: [
      { id: 'facial_fuma', label: 'Fuma', tipo: 'checkbox' },
      { id: 'facial_alcool', label: 'Consome bebida alcoólica', tipo: 'checkbox' },
      { id: 'facial_agua', label: 'Ingere água regularmente', tipo: 'checkbox' },
      { id: 'facial_skincare', label: 'Faz rotina de skincare? Produtos utilizados:', tipo: 'text' }
    ]},
    { titulo: 'Histórico de Saúde', campos: [
      { id: 'facial_doencas', label: 'Possui alguma doença?', tipo: 'text' },
      { id: 'facial_medic', label: 'Faz uso contínuo de medicamentos?', tipo: 'text' },
      { id: 'facial_alergias', label: 'Possui alergias?', tipo: 'text' },
      { id: 'facial_gestante', label: 'Está gestante ou amamentando?', tipo: 'select', opcoes: ['Não', 'Sim'] }
    ]},
    { titulo: 'Avaliação Profissional', campos: [
      { id: 'facial_pele', label: 'Tipo de Pele', tipo: 'select', opcoes: ['Normal', 'Seca', 'Oleosa', 'Mista', 'Sensível'] },
      { id: 'facial_foto', label: 'Fototipo', tipo: 'text' },
      { id: 'facial_obs', label: 'Avaliação Clínica (Acne, Manchas, Flacidez, etc.)', tipo: 'textarea' }
    ]}
  ],
  'Anamnese Corporal': [
    { titulo: 'Queixa Principal', campos: [
      { id: 'corp_queixas', label: 'Selecione as queixas principais:', tipo: 'multiselect', opcoes: ['Gordura localizada', 'Flacidez', 'Celulite', 'Estrias', 'Retenção de líquidos', 'Modelagem corporal'] },
    ]},
    { titulo: 'Avaliação Corporal & Medidas', campos: [
      { id: 'corp_biotipo', label: 'Biotipo', tipo: 'select', opcoes: ['Ectomorfo', 'Mesomorfo', 'Endomorfo'] },
      { id: 'corp_peso', label: 'Peso (kg)', tipo: 'text' },
      { id: 'corp_altura', label: 'Altura (m)', tipo: 'text' },
      { id: 'corp_cintura', label: 'Cintura (cm)', tipo: 'text' },
      { id: 'corp_abdomen', label: 'Abdômen (cm)', tipo: 'text' },
      { id: 'corp_quadril', label: 'Quadril (cm)', tipo: 'text' }
    ]},
    { titulo: 'Histórico de Saúde', campos: [
      { id: 'corp_saude', label: 'Hipertensão / Diabetes / Problemas circulatórios?', tipo: 'textarea' },
      { id: 'corp_cirur', label: 'Já realizou cirurgias? Quais?', tipo: 'text' }
    ]}
  ],
  'Anamnese - Microvasos': [
    { titulo: 'Histórico de Saúde Vascular', campos: [
      { id: 'vasos_hiper', label: 'Você tem hipertensão arterial?', tipo: 'select', opcoes: ['Não', 'Sim'] },
      { id: 'vasos_circ', label: 'Possui algum problema circulatório ou histórico de trombose?', tipo: 'select', opcoes: ['Não', 'Sim'] },
      { id: 'vasos_anti', label: 'Faz uso de anticoagulantes?', tipo: 'select', opcoes: ['Não', 'Sim'] },
      { id: 'vasos_hist', label: 'Tem histórico familiar de varizes?', tipo: 'select', opcoes: ['Não', 'Sim'] }
    ]},
    { titulo: 'Avaliação Vascular', campos: [
      { id: 'vasos_pres', label: 'Presença de telangiectasias (vasinhos superficiais)?', tipo: 'select', opcoes: ['Não', 'Sim'] },
      { id: 'vasos_edema', label: 'Apresenta edema ou manchas?', tipo: 'select', opcoes: ['Não', 'Sim'] },
      { id: 'vasos_obs', label: 'Observações profissionais', tipo: 'textarea' }
    ]}
  ]
};

export default function FichasAnamnese() {
  const [modelos, setModelos] = useState<ModeloFicha[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Modo (Lista vs Edição/Criação)
  const [modo, setModo] = useState<'lista' | 'criando'>('lista');

  // Estados do Formulário de Edição/Criação
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formSecoes, setFormSecoes] = useState<Secao[]>([]);

  useEffect(() => {
    buscarModelos();
  }, []);

  const buscarModelos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('modelos_fichas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar modelos:', error);
      setLoading(false);
      return;
    }

    // AUTO-CARREGAMENTO AUTOMÁTICO:
    // Se a tabela no banco estiver vazia, grava os 3 modelos padrão em segundo plano sem precisar de botão
    if (data && data.length === 0) {
      const promessas = Object.entries(MODELOS_PADRAO).map(([titulo, campos]) => {
        return supabase.from('modelos_fichas').insert([{ titulo, campos }]);
      });
      await Promise.all(promessas);

      // Rebusca do banco com os modelos recém-gravados
      const { data: dadosNovos } = await supabase
        .from('modelos_fichas')
        .select('*')
        .order('created_at', { ascending: false });

      if (dadosNovos) setModelos(dadosNovos);
    } else if (data) {
      setModelos(data);
    }

    setLoading(false);
  };

  const deletarModelo = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este modelo de ficha? As fichas de pacientes já preenchidas não serão afetadas.')) {
      const { error } = await supabase.from('modelos_fichas').delete().eq('id', id);
      if (error) alert(`Erro ao excluir: ${error.message}`);
      else buscarModelos();
    }
  };

  const salvarModelo = async () => {
    if (!formTitulo) return alert('Dê um título para a ficha (ex: Anamnese Facial).');
    if (formSecoes.length === 0) return alert('Adicione pelo menos uma seção à ficha.');

    const payload = { titulo: formTitulo, campos: formSecoes };
    
    if (formId) {
      const { error } = await supabase.from('modelos_fichas').update(payload).eq('id', formId);
      if (error) {
        alert(`Erro ao atualizar modelo: ${error.message}`);
      } else {
        alert('Modelo de ficha atualizado com sucesso!');
        setModo('lista');
        buscarModelos();
      }
    } else {
      const { error } = await supabase.from('modelos_fichas').insert([payload]);
      if (error) {
        alert(`Erro ao salvar modelo: ${error.message}`);
      } else {
        alert('Modelo de ficha salvo com sucesso!');
        setModo('lista');
        buscarModelos();
      }
    }
  };

  const editarModelo = (modelo: ModeloFicha) => {
    setFormId(modelo.id);
    setFormTitulo(modelo.titulo);
    setFormSecoes(modelo.campos);
    setModo('criando');
  };

  // --- FUNÇÕES DO CONSTRUTOR ---
  const adicionarSecao = () => setFormSecoes([...formSecoes, { titulo: '', campos: [] }]);
  const atualizarTituloSecao = (index: number, valor: string) => {
    const novasSecoes = [...formSecoes];
    novasSecoes[index].titulo = valor;
    setFormSecoes(novasSecoes);
  };
  const removerSecao = (index: number) => {
    const novasSecoes = [...formSecoes];
    novasSecoes.splice(index, 1);
    setFormSecoes(novasSecoes);
  };
  const adicionarCampo = (secaoIndex: number) => {
    const novasSecoes = [...formSecoes];
    const idCampo = `campo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    novasSecoes[secaoIndex].campos.push({ id: idCampo, label: '', tipo: 'text' });
    setFormSecoes(novasSecoes);
  };
  const atualizarCampo = (secaoIndex: number, campoIndex: number, chave: keyof Campo, valor: any) => {
    const novasSecoes = [...formSecoes];
    if (chave === 'opcoes') novasSecoes[secaoIndex].campos[campoIndex].opcoes = valor.split(',').map((op: string) => op.trim());
    else novasSecoes[secaoIndex].campos[campoIndex] = { ...novasSecoes[secaoIndex].campos[campoIndex], [chave]: valor };
    setFormSecoes(novasSecoes);
  };
  const removerCampo = (secaoIndex: number, campoIndex: number) => {
    const novasSecoes = [...formSecoes];
    novasSecoes[secaoIndex].campos.splice(campoIndex, 1);
    setFormSecoes(novasSecoes);
  };

  const abrirNovoModelo = () => {
    setFormId(null);
    setFormTitulo('');
    setFormSecoes([
      {
        titulo: 'Queixa Principal',
        campos: [
          { id: `q_1_${Date.now()}`, label: 'Qual a sua queixa principal?', tipo: 'textarea' },
          { id: `q_2_${Date.now()}`, label: 'Há quanto tempo percebe isso?', tipo: 'text' }
        ]
      },
      {
        titulo: 'Histórico de Saúde',
        campos: [
          { id: `s_1_${Date.now()}`, label: 'Possui alguma doença pré-existente?', tipo: 'text' },
          { id: `s_2_${Date.now()}`, label: 'Possui alergia a alguma substância?', tipo: 'text' },
          { id: `s_3_${Date.now()}`, label: 'Faz uso contínuo de algum medicamento?', tipo: 'text' }
        ]
      }
    ]);
    setModo('criando');
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto flex flex-col h-screen overflow-hidden relative">
      <header className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-light text-gray-800">Fichas de Anamnese</h1>
          <p className="text-gray-500 mt-1">Gestão e personalização de modelos</p>
        </div>
        
        {modo === 'lista' ? (
          <button onClick={abrirNovoModelo} className="bg-[#B68B40] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#9a7330] transition-colors shadow-sm">
            + Criar Novo Modelo
          </button>
        ) : (
          <button onClick={() => setModo('lista')} className="text-gray-500 hover:text-gray-800 font-medium text-sm">
            ← Voltar para a Lista
          </button>
        )}
      </header>

      <div className="bg-white rounded-xl border border-[#B68B40]/30 shadow-sm flex-1 flex flex-col overflow-hidden">
        
        {/* --- TELA DA LISTA DE FICHAS --- */}
        {modo === 'lista' && (
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <p className="text-center text-gray-400 py-10">A carregar fichas...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modelos.map(modelo => (
                  <div key={modelo.id} className="p-6 border border-gray-200 rounded-xl hover:border-[#B68B40] transition-colors bg-[#FDFCFB] flex flex-col h-full">
                    <div className="flex-1">
                      <div className="w-12 h-12 bg-[#B68B40]/10 text-[#B68B40] rounded-full flex items-center justify-center mb-4 text-xl">📋</div>
                      <h3 className="font-medium text-gray-800 text-lg mb-1">{modelo.titulo}</h3>
                      <p className="text-xs text-gray-500 mb-4">{modelo.campos.length} Seções configuradas</p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-auto">
                      <span className="text-xs text-gray-400">Modelo Ativo</span>
                      <div className="flex gap-4">
                        <button onClick={() => editarModelo(modelo)} className="text-[#B68B40] font-medium text-xs hover:underline">
                          Editar
                        </button>
                        <button onClick={() => deletarModelo(modelo.id)} className="text-red-500 font-medium text-xs hover:underline">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TELA DE CRIAÇÃO OU EDIÇÃO --- */}
        {modo === 'criando' && (
          <div className="flex-1 flex flex-col h-full bg-gray-50/50">
            <div className="p-6 border-b border-gray-200 bg-white">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                {formId ? 'Editar Título da Ficha' : 'Título da Nova Ficha'}
              </label>
              <input 
                type="text" 
                placeholder="Ex: Anamnese Capilar" 
                value={formTitulo}
                onChange={e => setFormTitulo(e.target.value)}
                className="w-full max-w-2xl border border-gray-300 rounded-lg p-3 text-lg font-medium focus:outline-none focus:border-[#B68B40]"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {formSecoes.map((secao, sIdx) => (
                <div key={sIdx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  
                  <div className="bg-[#B68B40]/5 px-5 py-3 border-b border-gray-200 flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-[#B68B40] uppercase tracking-wider mb-1">Nome da Seção</label>
                      <input type="text" placeholder="Ex: Histórico de Saúde" value={secao.titulo} onChange={e => atualizarTituloSecao(sIdx, e.target.value)} className="w-full bg-transparent border-b border-gray-300 focus:border-[#B68B40] outline-none text-sm font-medium py-1"/>
                    </div>
                    <button onClick={() => removerSecao(sIdx)} className="text-red-400 hover:text-red-600 text-sm mt-4">Remover Seção</button>
                  </div>

                  <div className="p-5 space-y-4">
                    {secao.campos.map((campo, cIdx) => (
                      <div key={campo.id} className="flex gap-4 items-start p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Pergunta / Rótulo do Campo</label>
                            <input type="text" value={campo.label} onChange={e => atualizarCampo(sIdx, cIdx, 'label', e.target.value)} placeholder="Ex: Possui alguma alergia?" className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#B68B40] outline-none"/>
                          </div>
                          
                          <div className="flex gap-4">
                            <div className="w-1/3">
                              <label className="block text-xs text-gray-500 mb-1">Tipo de Resposta</label>
                              <select value={campo.tipo} onChange={e => atualizarCampo(sIdx, cIdx, 'tipo', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#B68B40] outline-none bg-white">
                                <option value="text">Texto Curto</option>
                                <option value="textarea">Texto Longo (Parágrafo)</option>
                                <option value="select">Lista de Seleção (Dropdown)</option>
                                <option value="checkbox">Caixa de Marcação (Sim/Não)</option>
                                <option value="multiselect">Múltipla Escolha</option>
                              </select>
                            </div>

                            {(campo.tipo === 'select' || campo.tipo === 'multiselect') && (
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Opções (separe por vírgula)</label>
                                <input type="text" value={campo.opcoes?.join(', ') || ''} onChange={e => atualizarCampo(sIdx, cIdx, 'opcoes', e.target.value)} placeholder="Ex: Normal, Seca, Oleosa, Mista" className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#B68B40] outline-none"/>
                              </div>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removerCampo(sIdx, cIdx)} className="text-gray-400 hover:text-red-500 text-xl leading-none mt-6" title="Remover Pergunta">&times;</button>
                      </div>
                    ))}
                    
                    <button onClick={() => adicionarCampo(sIdx)} className="text-sm font-medium text-[#B68B40] hover:underline flex items-center gap-1 mt-2">
                      + Adicionar Pergunta nesta Seção
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-4">
                <button onClick={adicionarSecao} className="border-2 border-dashed border-[#B68B40]/50 text-[#B68B40] px-8 py-3 rounded-xl hover:bg-[#B68B40]/5 transition-colors font-medium">
                  + Adicionar Nova Seção
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-4 shrink-0">
              <button onClick={() => setModo('lista')} className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button onClick={salvarModelo} className="bg-[#B68B40] text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-[#9a7330] shadow-sm">
                {formId ? 'Atualizar Modelo' : 'Salvar Novo Modelo'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}