import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Tipagem dos dados
type Agendamento = {
  id: string;
  data_hora: string;
  procedimento: string;
  status: string;
  pacientes: {
    nome_completo: string;
  };
};

export default function VisaoGeral() {
  const [loading, setLoading] = useState(true);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [fichasPendentes, setFichasPendentes] = useState(0);
  const [agendaHoje, setAgendaHoje] = useState<Agendamento[]>([]);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    setLoading(true);

    try {
      // 1. Busca o total de Pacientes Ativos
      const { count: countPacientes } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true });
      
      if (countPacientes !== null) setTotalPacientes(countPacientes);

      // 2. Busca a Agenda de Hoje
      const hojeInicio = new Date();
      hojeInicio.setHours(0, 0, 0, 0);
      
      const hojeFim = new Date();
      hojeFim.setHours(23, 59, 59, 999);

      const { data: agenda } = await supabase
        .from('agendamentos')
        .select('id, data_hora, procedimento, status, pacientes(nome_completo)')
        .gte('data_hora', hojeInicio.toISOString())
        .lte('data_hora', hojeFim.toISOString())
        .order('data_hora', { ascending: true });

      if (agenda) {
        setAgendaHoje(agenda as any);
      }

      // 3. Lógica para Fichas Pendentes (Exemplo: Agendamentos de hoje sem ficha criada)
      // Como simplificação visual inicial, vamos contar quantos agendamentos de hoje estão apenas "AGENDADO"
      const pendentes = agenda?.filter(item => item.status === 'AGENDADO').length || 0;
      setFichasPendentes(pendentes);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar a hora (Ex: "09:00")
  const formatarHora = (dataString: string) => {
    return new Date(dataString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Função para cores do Status
  const getStatusCor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMADO':
        return 'bg-emerald-100 text-emerald-700';
      case 'AGENDADO':
        return 'bg-yellow-100 text-yellow-700';
      case 'CANCELADO':
        return 'bg-red-100 text-red-700';
      case 'REALIZADO':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto flex flex-col min-h-screen">
      <header className="mb-8 shrink-0">
        <h1 className="text-3xl font-light text-gray-800">Visão Geral</h1>
        <p className="text-gray-500 mt-1">Bem-vinda ao seu painel, Dra. Emily.</p>
      </header>

      {/* --- CARDS DE RESUMO --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#B68B40]/30 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Atendimentos Hoje</h3>
          <p className="text-4xl font-serif text-[#B68B40]">{loading ? '-' : agendaHoje.length}</p>
        </div>
        
        <div className="bg-white border border-[#B68B40]/30 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pacientes Ativos</h3>
          <p className="text-4xl font-serif text-[#B68B40]">{loading ? '-' : totalPacientes}</p>
        </div>

        <div className="bg-white border border-[#B68B40]/30 rounded-xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fichas Pendentes</h3>
          <p className="text-4xl font-serif text-[#B68B40]">{loading ? '-' : fichasPendentes}</p>
        </div>
      </div>

      {/* --- AGENDA DO DIA --- */}
      <div className="bg-white border border-[#B68B40]/30 rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FDFCFB]">
          <h2 className="text-lg font-medium text-gray-800">Agenda de Hoje</h2>
          <Link to="/" className="text-[#B68B40] text-sm font-medium hover:underline">
            Ver agenda completa →
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Carregando agenda...</div>
          ) : agendaHoje.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="text-4xl mb-3 opacity-30">📅</div>
              <p className="text-gray-500 font-medium">Nenhum atendimento marcado para hoje.</p>
              <p className="text-sm text-gray-400 mt-1">Sua agenda está livre.</p>
            </div>
          ) : (
            agendaHoje.map((agendamento) => (
              <div key={agendamento.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                
                <div className="flex items-center gap-6">
                  {/* Hora */}
                  <div className="text-xl font-medium text-gray-700 w-16">
                    {formatarHora(agendamento.data_hora)}
                  </div>
                  
                  {/* Paciente e Procedimento */}
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{agendamento.pacientes?.nome_completo}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{agendamento.procedimento}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 shadow-sm ${getStatusCor(agendamento.status)}`}>
                  {agendamento.status}
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}