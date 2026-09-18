import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Tipagens
type Paciente = { id: string; nome_completo: string; };
type Agendamento = {
  id: string;
  paciente_id: string;
  data_hora: string;
  procedimento: string;
  status: string;
  pacientes?: { nome_completo: string };
};

export default function Agenda() {
  // O SEGREDO: Iniciar sempre com 'new Date()' puxa o momento exato de hoje
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Novo Agendamento
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [form, setForm] = useState({ paciente_id: '', hora: '09:00', procedimento: '', status: 'AGENDADO' });

  // Dispara a busca sempre que o mês atual mudar
  useEffect(() => {
    buscarDados();
  }, [currentDate]);

  const buscarDados = async () => {
    setLoading(true);
    
    // 1. Busca os pacientes para o select do modal
    const { data: pacData } = await supabase.from('pacientes').select('id, nome_completo').order('nome_completo');
    if (pacData) setPacientes(pacData);

    // 2. Busca os agendamentos apenas do mês visível
    const ano = currentDate.getFullYear();
    const mes = currentDate.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0, 23, 59, 59);

    const { data: agData } = await supabase
      .from('agendamentos')
      .select('*, pacientes(nome_completo)')
      .gte('data_hora', primeiroDia.toISOString())
      .lte('data_hora', ultimoDia.toISOString());

    if (agData) setAgendamentos(agData as any);
    setLoading(false);
  };

  const salvarAgendamento = async () => {
    if (!form.paciente_id) return alert('Selecione um paciente.');
    if (!form.procedimento) return alert('Descreva o procedimento.');
    if (!diaSelecionado) return;

    // Constrói a data completa (Ano, Mês, Dia selecionado, Hora, Minuto)
    const ano = currentDate.getFullYear();
    const mes = currentDate.getMonth();
    const [horas, minutos] = form.hora.split(':').map(Number);
    const dataCompleta = new Date(ano, mes, diaSelecionado, horas, minutos);

    const payload = {
      paciente_id: form.paciente_id,
      data_hora: dataCompleta.toISOString(),
      procedimento: form.procedimento,
      status: form.status
    };

    const { error } = await supabase.from('agendamentos').insert([payload]);
    
    if (error) {
      alert('Erro ao salvar agendamento: ' + error.message);
    } else {
      setModalAberto(false);
      setForm({ paciente_id: '', hora: '09:00', procedimento: '', status: 'AGENDADO' });
      buscarDados(); // Recarrega os blocos na tela
    }
  };

  const deletarAgendamento = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede de abrir o modal de criar ao clicar no botão excluir
    if (window.confirm('Tem certeza que deseja cancelar/excluir este agendamento?')) {
      await supabase.from('agendamentos').delete().eq('id', id);
      buscarDados();
    }
  };

  // --- NAVEGAÇÃO DO CALENDÁRIO ---
  const mesAnterior = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const proximoMes = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const irParaHoje = () => setCurrentDate(new Date());

  // --- LÓGICA DE MONTAGEM DO GRID ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Quantos dias tem o mês atual?
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Em qual dia da semana (0 a 6) cai o dia 1º?
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Arrays para renderizar a tabela
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Formatação do título principal (Ex: "Setembro de 2026")
  const nomeMes = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const tituloMes = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} de ${year}`;

  const hojeDataReal = new Date();

  return (
    <div className="p-8 w-full max-w-7xl mx-auto flex flex-col h-screen overflow-hidden relative">
      <header className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-light text-gray-800">Agenda Completa</h1>
          <p className="text-[#B68B40] font-medium mt-1">{tituloMes}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={irParaHoje} className="text-sm font-medium text-gray-500 hover:text-[#B68B40] transition-colors">
            Ir para Hoje
          </button>
          
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <button onClick={mesAnterior} className="px-4 py-2 text-gray-500 hover:bg-gray-50 hover:text-[#B68B40] border-r border-gray-200 transition-colors">
              &lt;
            </button>
            <button onClick={proximoMes} className="px-4 py-2 text-gray-500 hover:bg-gray-50 hover:text-[#B68B40] transition-colors">
              &gt;
            </button>
          </div>

          <div className="bg-white border border-[#B68B40]/30 rounded-lg flex p-1 shadow-sm">
            <button className="px-5 py-1.5 bg-[#B68B40]/10 text-[#B68B40] font-medium rounded-md text-sm transition-colors">Mês</button>
            <button className="px-5 py-1.5 text-gray-500 hover:text-gray-800 font-medium rounded-md text-sm transition-colors">Semana</button>
          </div>
        </div>
      </header>

      {/* --- GRID DO CALENDÁRIO --- */}
      <div className="bg-white rounded-xl border border-[#B68B40]/30 shadow-sm flex-1 flex flex-col overflow-hidden">
        
        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-[#B68B40]/20 bg-[#FDFCFB]">
          {weekDays.map(day => (
            <div key={day} className="text-center py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Células dos Dias */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto auto-rows-fr">
          
          {/* Espaços em branco antes do dia 1 */}
          {blanks.map(blank => (
            <div key={`blank-${blank}`} className="border-b border-r border-gray-100 bg-gray-50/50 min-h-[120px]"></div>
          ))}

          {/* Dias reais do mês */}
          {days.map(day => {
            const isToday = day === hojeDataReal.getDate() && month === hojeDataReal.getMonth() && year === hojeDataReal.getFullYear();
            
            // Filtra os agendamentos que caem exatamente neste dia e ordena pela hora
            const agendamentosDoDia = agendamentos
              .filter(ag => new Date(ag.data_hora).getDate() === day)
              .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

            return (
              <div 
                key={day} 
                onClick={() => { setDiaSelecionado(day); setModalAberto(true); }}
                className="border-b border-r border-gray-100 min-h-[120px] p-2 relative hover:bg-[#B68B40]/5 transition-colors cursor-pointer group"
              >
                {/* Número do Dia */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-2 text-sm ${isToday ? 'bg-[#B68B40] text-white font-bold shadow-md' : 'text-gray-700 font-medium group-hover:text-[#B68B40]'}`}>
                  {day}
                </div>

                {/* Lista de Eventos no Dia */}
                <div className="space-y-1">
                  {agendamentosDoDia.map(ag => {
                    const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const isConfirmado = ag.status === 'CONFIRMADO';
                    
                    return (
                      <div key={ag.id} className={`p-1.5 rounded text-[10px] leading-tight relative group/item ${isConfirmado ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-[#B68B40]/10 text-[#B68B40] border border-[#B68B40]/20'}`}>
                        <div className="font-bold">{hora} - {ag.pacientes?.nome_completo?.split(' ')[0]}</div>
                        <div className="truncate opacity-80">{ag.procedimento}</div>
                        
                        {/* Botão de excluir escondido que aparece no hover */}
                        <button onClick={(e) => deletarAgendamento(ag.id, e)} className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 text-red-500 hover:text-red-700 font-bold px-1">
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL DE NOVO AGENDAMENTO --- */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#FDFCFB]">
              <h2 className="text-xl font-medium text-[#B68B40]">
                Agendar para {diaSelecionado} de {nomeMes}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 text-2xl hover:text-gray-700">&times;</button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Paciente *</label>
                <select value={form.paciente_id} onChange={e => setForm({...form, paciente_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white">
                  <option value="">Selecione o paciente cadastrado...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">O paciente precisa estar cadastrado na aba "Pacientes" antes.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Horário *</label>
                  <input type="time" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white">
                    <option value="AGENDADO">Agendado</option>
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="REALIZADO">Realizado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Procedimento *</label>
                <input type="text" value={form.procedimento} onChange={e => setForm({...form, procedimento: e.target.value})} placeholder="Ex: Avaliação, Lipo Enzimática..." className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
              <button onClick={() => setModalAberto(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={salvarAgendamento} className="bg-[#B68B40] text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-[#9a7330] shadow-sm">
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}