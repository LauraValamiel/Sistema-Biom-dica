import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentosMes, setAgendamentosMes] = useState<any[]>([]);
  const [visao, setVisao] = useState<'mes' | 'semana'>('mes');
  
  // Estados do Modal de Novo Agendamento
  const [modalAberto, setModalAberto] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [formAgenda, setFormAgenda] = useState({
    paciente_id: '',
    data: new Date().toISOString().split('T')[0],
    hora: '09:00',
    procedimento: ''
  });

  // Estados do Modal de Detalhes do Dia Clicado
  const [modalDiaAberto, setModalDiaAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<{ dataStr: string; consultas: any[] }>({ dataStr: '', consultas: [] });

  const [notificacao, setNotificacao] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);

  useEffect(() => {
    buscarAgendamentosMes();
    buscarPacientes();
  }, [currentDate]);

  const mostrarAviso = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setNotificacao({ mensagem, tipo });
    setTimeout(() => setNotificacao(null), 4000);
  };

  const buscarAgendamentosMes = async () => {
    const ano = currentDate.getFullYear();
    const mes = String(currentDate.getMonth() + 1).padStart(2, '0');
    
    const primeiroDia = `${ano}-${mes}-01T00:00:00`;
    const ultimoDia = `${ano}-${mes}-${new Date(ano, Number(mes), 0).getDate()}T23:59:59`;

    const { data } = await supabase
      .from('agendamentos')
      .select('*, pacientes(nome_completo, telefone)')
      .gte('data_hora', primeiroDia)
      .lte('data_hora', ultimoDia)
      .order('data_hora', { ascending: true });

    if (data) setAgendamentosMes(data);
  };

  const buscarPacientes = async () => {
    const { data } = await supabase.from('pacientes').select('id, nome_completo').order('nome_completo');
    if (data) setPacientes(data);
  };

  const salvarAgendamento = async () => {
    if (!formAgenda.paciente_id || !formAgenda.data || !formAgenda.hora) {
      return mostrarAviso('Preencha o Paciente, Data e Hora para agendar.', 'erro');
    }

    const dataHoraLocal = `${formAgenda.data}T${formAgenda.hora}:00`;

    const payload = {
      paciente_id: formAgenda.paciente_id,
      data_hora: dataHoraLocal,
      procedimento: formAgenda.procedimento || 'Consulta Estética',
      status: 'agendado'
    };

    const { error } = await supabase.from('agendamentos').insert([payload]);
    if (error) {
      mostrarAviso('Erro ao marcar agendamento: ' + error.message, 'erro');
    } else {
      mostrarAviso('Consulta agendada com sucesso!');
      setModalAberto(false);
      setFormAgenda({ paciente_id: '', data: new Date().toISOString().split('T')[0], hora: '09:00', procedimento: '' });
      buscarAgendamentosMes();
    }
  };

  const irParaHoje = () => setCurrentDate(new Date());
  
  const navegarPeriodo = (direcao: 'ante' | 'proximo') => {
    const ano = currentDate.getFullYear();
    const mes = currentDate.getMonth();
    if (visao === 'mes') {
      setCurrentDate(new Date(ano, direcao === 'ante' ? mes - 1 : mes + 1, 1));
    } else {
      const novoDia = new Date(currentDate);
      novoDia.setDate(novoDia.getDate() + (direcao === 'ante' ? -7 : 7));
      setCurrentDate(novoDia);
    }
  };

  const abrirDetalhesDia = (dataStr: string, consultas: any[]) => {
    setDiaSelecionado({ dataStr, consultas });
    setModalDiaAberto(true);
  };

  // Função para abrir o modal de agendamento já com a data pré-preenchida pelo dia clicado
  const abrirAgendarParaData = (dataStr: string) => {
    setModalDiaAberto(false);
    setFormAgenda(prev => ({ ...prev, data: dataStr }));
    setModalAberto(true);
  };

  const renderDiasMes = () => {
    const ano = currentDate.getFullYear();
    const mes = currentDate.getMonth();
    const primeiroDiaMes = new Date(ano, mes, 1).getDay(); 
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
    
    const dias = [];
    
    for (let i = 0; i < primeiroDiaMes; i++) {
      dias.push(<div key={`empty-${i}`} className="border-b border-r border-gray-100 bg-gray-50/30 p-1 sm:p-2 min-h-[90px] sm:min-h-[120px]"></div>);
    }
    
    for (let d = 1; d <= totalDiasMes; d++) {
      const dataAtualLoop = new Date(ano, mes, d);
      const mesStr = String(mes + 1).padStart(2, '0');
      const diaStr = String(d).padStart(2, '0');
      const dataStr = `${ano}-${mesStr}-${diaStr}`;
      
      const hoje = new Date();
      const isHoje = dataAtualLoop.getDate() === hoje.getDate() && 
                     dataAtualLoop.getMonth() === hoje.getMonth() && 
                     dataAtualLoop.getFullYear() === hoje.getFullYear();

      const consultasDoDia = agendamentosMes.filter(a => {
        if (!a.data_hora) return false;
        const dataApenas = a.data_hora.split('T')[0];
        return dataApenas === dataStr;
      });
      
      dias.push(
        <div 
          key={d} 
          onClick={() => abrirDetalhesDia(dataStr, consultasDoDia)}
          className="border-b border-r border-gray-100 p-1 sm:p-2 min-h-[90px] sm:min-h-[120px] hover:bg-[#B68B40]/10 transition-colors cursor-pointer flex flex-col"
        >
          <div className={`text-[10px] sm:text-sm font-medium w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full mb-1 ${isHoje ? 'bg-[#B68B40] text-white shadow-md' : 'text-gray-700'}`}>
            {d}
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto max-w-full">
            {consultasDoDia.map(c => {
              const partesData = c.data_hora.split('T');
              const horaMinuto = partesData[1] ? partesData[1].substring(0, 5) : '';
              return (
                <div key={c.id} className="bg-[#B68B40]/15 border border-[#B68B40]/30 rounded px-1.5 py-0.5 text-[9px] sm:text-xs text-[#B68B40] truncate" title={`${horaMinuto} - ${c.pacientes?.nome_completo}`}>
                  <strong className="font-semibold">{horaMinuto}</strong> {c.pacientes?.nome_completo}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return dias;
  };

  const renderDiasSemana = () => {
    const curr = new Date(currentDate);
    const primeiroDiaSemana = curr.getDate() - curr.getDay();
    
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const diaDaSemana = new Date(curr.setDate(primeiroDiaSemana + i));
      const ano = diaDaSemana.getFullYear();
      const mes = diaDaSemana.getMonth();
      const d = diaDaSemana.getDate();
      const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const hoje = new Date();
      const isHoje = diaDaSemana.getDate() === hoje.getDate() && 
                     diaDaSemana.getMonth() === hoje.getMonth() && 
                     diaDaSemana.getFullYear() === hoje.getFullYear();

      const consultasDoDia = agendamentosMes.filter(a => {
        if (!a.data_hora) return false;
        const dataApenas = a.data_hora.split('T')[0];
        return dataApenas === dataStr;
      });

      dias.push(
        <div 
          key={i} 
          onClick={() => abrirDetalhesDia(dataStr, consultasDoDia)}
          className="border-b border-r border-gray-100 p-2 min-h-[300px] hover:bg-[#B68B40]/10 transition-colors cursor-pointer flex flex-col bg-white"
        >
          <div className="text-center pb-2 mb-2 border-b border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i]}
            </span>
            <div className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mx-auto mt-0.5 ${isHoje ? 'bg-[#B68B40] text-white shadow-md' : 'text-gray-700'}`}>
              {d}
            </div>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {consultasDoDia.map(c => {
              const partesData = c.data_hora.split('T');
              const horaMinuto = partesData[1] ? partesData[1].substring(0, 5) : '';
              return (
                <div key={c.id} className="bg-[#B68B40]/15 border border-[#B68B40]/30 rounded p-1.5 text-xs text-[#B68B40]">
                  <strong className="block font-bold">{horaMinuto}</strong>
                  <span className="truncate block">{c.pacientes?.nome_completo}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return dias;
  };

  return (
    <div className="w-full h-full flex flex-col mx-auto overflow-x-hidden box-border sm:p-8 max-w-7xl relative">
      
      {notificacao && (
        <div className={`fixed top-6 right-6 z-[999] px-6 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-3 transition-all animate-bounce ${
          notificacao.tipo === 'sucesso' ? 'bg-[#FDFCFB] border-[#B68B40] text-[#B68B40]' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <span>{notificacao.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
          {notificacao.mensagem}
        </div>
      )}

      <header className="px-4 pt-6 pb-4 sm:p-0 flex flex-col sm:flex-row justify-between sm:items-center gap-4 w-full shrink-0 mb-2 sm:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-800">Agenda Completa</h1>
          <p className="text-sm md:text-lg text-[#B68B40] font-medium mt-1 capitalize">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button onClick={irParaHoje} className="text-xs sm:text-sm font-medium text-gray-500 hover:text-[#B68B40] whitespace-nowrap px-2">Ir para Hoje</button>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0 shadow-sm">
              <button onClick={() => navegarPeriodo('ante')} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-gray-50 text-gray-600 border-r border-gray-200 text-sm transition-colors">&lt;</button>
              <button onClick={() => navegarPeriodo('proximo')} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-gray-50 text-gray-600 text-sm transition-colors">&gt;</button>
            </div>
            <select 
              value={visao} 
              onChange={e => setVisao(e.target.value as 'mes' | 'semana')}
              className="bg-[#B68B40]/10 text-[#B68B40] border-none text-xs sm:text-sm font-medium px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg outline-none cursor-pointer shrink-0"
            >
              <option value="mes">Mês</option>
              <option value="semana">Semana</option>
            </select>
          </div>
          
          <button onClick={() => { setFormAgenda(prev => ({ ...prev, data: new Date().toISOString().split('T')[0] })); setModalAberto(true); }} className="bg-[#B68B40] text-white px-5 py-2 sm:py-2.5 rounded-lg text-sm font-medium hover:bg-[#9a7330] w-full sm:w-auto shadow-sm shrink-0 transition-colors">
            + Agendar Consulta
          </button>
        </div>
      </header>

      {/* CALENDÁRIO */}
      <div className="bg-white sm:rounded-lg border-y sm:border border-[#B68B40]/30 shadow-sm flex-1 flex flex-col overflow-hidden w-full">
        {visao === 'mes' && (
          <div className="grid grid-cols-7 border-b border-[#B68B40]/20 bg-[#FDFCFB]">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
              <div key={dia} className="py-2 sm:py-3 text-center text-[9px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-transparent last:border-none">
                {dia}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {visao === 'mes' ? (
            <div className="grid grid-cols-7 auto-rows-fr">
              {renderDiasMes()}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-7 h-full">
              {renderDiasSemana()}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALHES DO DIA CLICADO (Com botão de agendamento rápido se estiver vazio) */}
      {modalDiaAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setModalDiaAberto(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col mx-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-[#FDFCFB]">
              <h2 className="text-lg font-medium text-[#B68B40]">
                Consultas de {new Date(diaSelecionado.dataStr + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setModalDiaAberto(false)} className="text-gray-400 text-2xl hover:text-gray-700">&times;</button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-3 flex-1 overflow-y-auto max-h-[60vh]">
              {diaSelecionado.consultas.length === 0 ? (
                <div className="text-center py-8 text-gray-400 flex flex-col items-center">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm mb-4">Nenhum agendamento para este dia.</p>
                  <button 
                    onClick={() => abrirAgendarParaData(diaSelecionado.dataStr)}
                    className="bg-[#B68B40] text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-[#9a7330] shadow-sm transition-colors"
                  >
                    + Agendar para este dia
                  </button>
                </div>
              ) : (
                diaSelecionado.consultas.map(c => {
                  const partesData = c.data_hora.split('T');
                  const horaMinuto = partesData[1] ? partesData[1].substring(0, 5) : '';
                  return (
                    <div key={c.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800 text-base">{c.pacientes?.nome_completo || 'Paciente'}</p>
                        <p className="text-xs text-[#B68B40] font-medium mt-0.5">Procedimento: {c.procedimento || 'Consulta Estética'}</p>
                        {c.pacientes?.telefone && <p className="text-xs text-gray-500 mt-1">Tel: {c.pacientes.telefone}</p>}
                      </div>
                      <div className="bg-[#B68B40] text-white px-3.5 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                        {horaMinuto}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              {diaSelecionado.consultas.length > 0 && (
                <button 
                  onClick={() => abrirAgendarParaData(diaSelecionado.dataStr)}
                  className="bg-[#B68B40] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#9a7330] shadow-sm transition-colors"
                >
                  + Agendar novo horário neste dia
                </button>
              )}
              <button onClick={() => setModalDiaAberto(false)} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-xs font-medium hover:bg-gray-300 ml-auto">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO AGENDAMENTO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setModalAberto(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col mx-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-[#FDFCFB]">
              <h2 className="text-lg font-medium text-[#B68B40]">Novo Agendamento</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 text-2xl hover:text-gray-700">&times;</button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Paciente *</label>
                <select value={formAgenda.paciente_id} onChange={e => setFormAgenda({...formAgenda, paciente_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:border-[#B68B40] outline-none bg-white">
                  <option value="">Selecione o paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Data *</label>
                  <input type="date" value={formAgenda.data} onChange={e => setFormAgenda({...formAgenda, data: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:border-[#B68B40] outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Hora *</label>
                  <input type="time" value={formAgenda.hora} onChange={e => setFormAgenda({...formAgenda, hora: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:border-[#B68B40] outline-none bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Procedimento (Opcional)</label>
                <input type="text" value={formAgenda.procedimento} onChange={e => setFormAgenda({...formAgenda, procedimento: e.target.value})} placeholder="Ex: Limpeza de Pele" className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:border-[#B68B40] outline-none" />
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-200 sm:bg-transparent rounded-lg sm:rounded-none">Cancelar</button>
              <button onClick={salvarAgendamento} className="bg-[#B68B40] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#9a7330] shadow-sm">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}