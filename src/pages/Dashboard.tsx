import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [atendimentosHoje, setAtendimentosHoje] = useState(0);
  const [pacientesAtivos, setPacientesAtivos] = useState(0);
  const [fichasPendentes, setFichasPendentes] = useState(0);
  const [consultasHoje, setConsultasHoje] = useState<any[]>([]);

  const [modalAberto, setModalAberto] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [formAgenda, setFormAgenda] = useState({
    paciente_id: '',
    data: new Date().toISOString().split('T')[0],
    hora: '09:00',
    procedimento: ''
  });

  const [notificacao, setNotificacao] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);

  useEffect(() => {
    buscarDadosGerais();
    buscarPacientes();
  }, []);

  const mostrarAviso = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setNotificacao({ mensagem, tipo });
    setTimeout(() => setNotificacao(null), 4000);
  };

  const buscarDadosGerais = async () => {
    const { count } = await supabase.from('pacientes').select('*', { count: 'exact', head: true });
    if (count !== null) setPacientesAtivos(count);

    // Intervalo exato do dia local no Supabase
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    const inicioDia = `${ano}-${mes}-${dia}T00:00:00`;
    const fimDia = `${ano}-${mes}-${dia}T23:59:59`;

    const { data: agendamentosData } = await supabase
      .from('agendamentos')
      .select('*, pacientes(nome_completo)')
      .gte('data_hora', inicioDia)
      .lte('data_hora', fimDia)
      .order('data_hora', { ascending: true });

    if (agendamentosData) {
      setConsultasHoje(agendamentosData);
      setAtendimentosHoje(agendamentosData.length);
    }
  };

  const buscarPacientes = async () => {
    const { data } = await supabase.from('pacientes').select('id, nome_completo').order('nome_completo');
    if (data) setPacientes(data);
  };

  const salvarAgendamento = async () => {
    if (!formAgenda.paciente_id || !formAgenda.data || !formAgenda.hora) {
      return mostrarAviso('Preencha o Paciente, Data e Hora para agendar.', 'erro');
    }
    
    // Grava exatamente a string local no formato ISO sem conversão automática de fuso
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
      buscarDadosGerais();
    }
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col h-full overflow-y-auto overflow-x-hidden box-border relative">
      
      {notificacao && (
        <div className={`fixed top-6 right-6 z-[999] px-6 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-3 transition-all animate-bounce ${
          notificacao.tipo === 'sucesso' ? 'bg-[#FDFCFB] border-[#B68B40] text-[#B68B40]' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <span>{notificacao.tipo === 'sucesso' ? '✨' : '⚠️'}</span>
          {notificacao.mensagem}
        </div>
      )}

      <header className="mb-6 md:mb-8 shrink-0">
        <h1 className="text-2xl md:text-3xl font-light text-gray-800">Visão Geral</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">Bem-vinda ao seu painel, Dra. Emily.</p>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-6 md:mb-8 shrink-0">
        <div className="bg-white border border-[#B68B40]/20 rounded-xl p-3 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left justify-center">
          <h3 className="text-[9px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2 leading-tight">Atendimentos <br className="sm:hidden" /> Hoje</h3>
          <p className="text-xl sm:text-4xl font-serif text-[#B68B40] leading-none mt-1 sm:mt-0">{atendimentosHoje}</p>
        </div>
        <div className="bg-white border border-[#B68B40]/20 rounded-xl p-3 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left justify-center">
          <h3 className="text-[9px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2 leading-tight">Pacientes <br className="sm:hidden" /> Ativos</h3>
          <p className="text-xl sm:text-4xl font-serif text-[#B68B40] leading-none mt-1 sm:mt-0">{pacientesAtivos}</p>
        </div>
        <div className="bg-white border border-[#B68B40]/20 rounded-xl p-3 sm:p-6 shadow-sm flex flex-col items-center sm:items-start text-center sm:text-left justify-center">
          <h3 className="text-[9px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2 leading-tight">Fichas <br className="sm:hidden" /> Pendentes</h3>
          <p className="text-xl sm:text-4xl font-serif text-[#B68B40] leading-none mt-1 sm:mt-0">{fichasPendentes}</p>
        </div>
      </div>

      <div className="bg-white border border-[#B68B40]/20 rounded-xl p-4 sm:p-6 shadow-sm flex-1 flex flex-col min-h-[300px]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4 gap-3">
          <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-4">
            <h2 className="text-base sm:text-lg font-medium text-gray-800 truncate">Agenda de Hoje</h2>
            <button onClick={() => setModalAberto(true)} className="bg-[#B68B40] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#9a7330] shadow-sm shrink-0 transition-colors">
              + Novo Agendamento
            </button>
          </div>
          <Link to="/agenda" className="text-xs sm:text-sm font-medium text-[#B68B40] hover:text-[#9a7330] hover:underline shrink-0 text-left sm:text-right">
            Ver agenda completa &rarr;
          </Link>
        </div>

        {consultasHoje.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-70 py-10">
            <div className="text-4xl sm:text-5xl mb-3">🗓️</div>
            <p className="text-sm">Nenhum agendamento para hoje.</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto flex-1">
            {consultasHoje.map(c => {
              // Extrai a hora diretamente da string do banco para ignorar o fuso horário do navegador
              const partesData = c.data_hora.split('T');
              const horaMinuto = partesData[1] ? partesData[1].substring(0, 5) : '';
              return (
                <div key={c.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.pacientes?.nome_completo || 'Paciente'}</p>
                    <p className="text-xs text-[#B68B40] font-medium mt-0.5">{c.procedimento || 'Consulta Estética'}</p>
                  </div>
                  <div className="bg-[#B68B40]/10 text-[#B68B40] px-3 py-1 rounded-full text-xs font-bold">
                    {horaMinuto}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col mx-auto">
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