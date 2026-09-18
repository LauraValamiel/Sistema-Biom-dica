import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Paciente = { id: string; nome_completo: string; };
type Midia = {
  id: string;
  paciente_id: string;
  url_arquivo: string;
  categoria: 'Antes' | 'Durante' | 'Depois';
  procedimento: string;
  data_registro: string;
  observacoes: string;
  pacientes: { nome_completo: string }; // Join do Supabase
};

export default function MidiasEvolucao() {
  const [midias, setMidias] = useState<Midia[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filtroPaciente, setFiltroPaciente] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Upload Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  
  // Form Upload
  const [form, setForm] = useState({
    paciente_id: '',
    categoria: 'Antes',
    procedimento: '',
    data_registro: new Date().toISOString().split('T')[0],
    observacoes: ''
  });

  useEffect(() => {
    buscarDados();
  }, []);

  const buscarDados = async () => {
    setLoading(true);
    // Busca as mídias e traz junto o nome do paciente usando o Join do Supabase
    const { data: midiasData, error: midiasError } = await supabase
      .from('paciente_midias')
      .select('*, pacientes(nome_completo)')
      .order('data_registro', { ascending: false });
      
    if (midiasData) setMidias(midiasData as any);
    if (midiasError) console.error('Erro ao buscar mídias:', midiasError);

    // Busca pacientes para o Select do modal
    const { data: pacData } = await supabase.from('pacientes').select('id, nome_completo').order('nome_completo');
    if (pacData) setPacientes(pacData);
    
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivo(e.target.files[0]);
    }
  };

  const salvarMidia = async () => {
    if (!arquivo) return alert('Selecione uma foto para enviar.');
    if (!form.paciente_id) return alert('Selecione o paciente correspondente.');
    if (!form.procedimento) return alert('Informe o nome do procedimento.');

    setUploading(true);

    try {
      // 1. Gera um nome único para o arquivo
      const fileExt = arquivo.name.split('.').pop();
      const fileName = `${form.paciente_id}-${Date.now()}.${fileExt}`;

      // 2. Faz o Upload da foto para o Storage (Bucket 'midias')
      const { error: uploadError } = await supabase.storage.from('midias').upload(fileName, arquivo, {
        cacheControl: '3600',
        upsert: false
      });

      if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

      // 3. Pega a URL pública gerada
      const { data: publicUrlData } = supabase.storage.from('midias').getPublicUrl(fileName);

      // 4. Salva o registro na tabela
      const payload = {
        paciente_id: form.paciente_id,
        url_arquivo: publicUrlData.publicUrl,
        categoria: form.categoria,
        procedimento: form.procedimento,
        data_registro: form.data_registro,
        observacoes: form.observacoes
      };

      const { error: dbError } = await supabase.from('paciente_midias').insert([payload]);
      
      if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);

      alert('Foto salva com sucesso!');
      setModalAberto(false);
      setArquivo(null);
      setForm({ ...form, procedimento: '', observacoes: '' });
      buscarDados();

    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const deletarMidia = async (id: string, url_arquivo: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta foto permanentemente?')) {
      // Deleta do Banco
      await supabase.from('paciente_midias').delete().eq('id', id);
      
      // Tenta deletar do Storage (Opcional, mas mantém limpo)
      try {
        const fileName = url_arquivo.split('/').pop();
        if (fileName) await supabase.storage.from('midias').remove([fileName]);
      } catch (e) {}

      buscarDados();
    }
  };

  const midiasFiltradas = midias.filter(m => {
    const matchPaciente = filtroPaciente ? m.paciente_id === filtroPaciente : true;
    const matchCategoria = filtroCategoria ? m.categoria === filtroCategoria : true;
    return matchPaciente && matchCategoria;
  });

  return (
    <div className="p-8 w-full max-w-7xl mx-auto flex flex-col h-screen overflow-hidden relative">
      <header className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-light text-gray-800">Mídias e Evolução</h1>
          <p className="text-gray-500 mt-1">Galeria de acompanhamento clínico de resultados (Antes e Depois)</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="bg-[#B68B40] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#9a7330] shadow-sm flex items-center gap-2">
          + Adicionar Foto
        </button>
      </header>

      <div className="bg-white rounded-xl border border-[#B68B40]/30 shadow-sm flex-1 flex flex-col overflow-hidden p-6">
        
        {/* BARRA DE FILTROS */}
        <div className="flex gap-4 mb-6 border-b border-gray-100 pb-6 shrink-0">
          <div className="w-1/3">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar por Paciente</label>
            <select value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} className="w-full border border-gray-300 p-2.5 text-sm rounded-lg outline-none focus:border-[#B68B40] bg-white">
              <option value="">Todos os pacientes</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
            </select>
          </div>
          <div className="w-1/4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Evolução</label>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="w-full border border-gray-300 p-2.5 text-sm rounded-lg outline-none focus:border-[#B68B40] bg-white">
              <option value="">Todas as fotos</option>
              <option value="Antes">Antes do Procedimento</option>
              <option value="Durante">Durante o Tratamento</option>
              <option value="Depois">Depois (Resultado Final)</option>
            </select>
          </div>
        </div>

        {/* GALERIA (GRID) */}
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Carregando galeria...</p>
          ) : midiasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4 opacity-30">📸</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma foto encontrada</h3>
              <p className="text-gray-500 text-sm max-w-md">Faça o upload das imagens dos seus procedimentos para acompanhar a evolução dos seus pacientes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {midiasFiltradas.map(midia => (
                <div key={midia.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative">
                  
                  {/* Etiqueta Flutuante de Categoria */}
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm z-10 ${
                    midia.categoria === 'Antes' ? 'bg-gray-600' : 
                    midia.categoria === 'Depois' ? 'bg-[#B68B40]' : 'bg-emerald-600'
                  }`}>
                    {midia.categoria}
                  </div>

                  {/* Imagem (Exibe um quadrado perfeito, cortando as sobras de forma elegante) */}
                  <div className="h-48 w-full bg-gray-100 relative">
                    <img src={midia.url_arquivo} alt="Evolução" className="w-full h-full object-cover" />
                    
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => window.open(midia.url_arquivo, '_blank')} className="text-white text-sm font-medium border border-white px-4 py-2 rounded-lg hover:bg-white hover:text-black transition-colors">Ampliar Foto</button>
                    </div>
                  </div>
                  
                  {/* Rodapé da Foto */}
                  <div className="p-4">
                    <p className="font-bold text-gray-800 text-sm truncate" title={midia.pacientes?.nome_completo}>{midia.pacientes?.nome_completo || 'Paciente Desconhecido'}</p>
                    <p className="text-xs text-[#B68B40] font-medium mt-1 truncate">{midia.procedimento}</p>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 font-medium">Data: {new Date(midia.data_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                      <button onClick={() => deletarMidia(midia.id, midia.url_arquivo)} className="text-red-400 hover:text-red-600 text-xs">Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DE UPLOAD DE NOVA MÍDIA --- */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#FDFCFB]">
              <h2 className="text-xl font-medium text-[#B68B40]">Adicionar Nova Foto</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 text-2xl hover:text-gray-700" disabled={uploading}>&times;</button>
            </div>
            
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Paciente *</label>
                <select value={form.paciente_id} onChange={e => setForm({...form, paciente_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white">
                  <option value="">Selecione o paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Etapa (Evolução) *</label>
                  <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value as any})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white">
                    <option value="Antes">Antes</option>
                    <option value="Durante">Durante</option>
                    <option value="Depois">Depois</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Data da Foto *</label>
                  <input type="date" value={form.data_registro} onChange={e => setForm({...form, data_registro: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Procedimento *</label>
                <input type="text" value={form.procedimento} onChange={e => setForm({...form, procedimento: e.target.value})} placeholder="Ex: Lipo Enzimática de Papada" className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Arquivo da Imagem *</label>
                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border border-dashed border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#B68B40]/10 file:text-[#B68B40] hover:file:bg-[#B68B40]/20" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Observações Técnicas</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} placeholder="Ex: Paciente apresentou leve edema lateral..." className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none h-20" />
              </div>

            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
              <button onClick={() => setModalAberto(false)} disabled={uploading} className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50">Cancelar</button>
              <button onClick={salvarMidia} disabled={uploading} className="bg-[#B68B40] text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-[#9a7330] shadow-sm disabled:opacity-50 flex items-center gap-2">
                {uploading ? 'Enviando foto...' : 'Fazer Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}