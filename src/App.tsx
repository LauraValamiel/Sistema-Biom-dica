import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Pacientes from './pages/Pacientes';
import FichasAnamnese from './pages/FichasAnamnese';
import MidiasEvolucao from './pages/MidiasEvolucao';
import DocumentosTermos from './pages/DocumentosTermos';

export default function App() {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#FDFCFB] overflow-hidden w-full">
        
        {/* OVERLAY MOBILE (Fundo escuro quando o menu abre) */}
        {menuMobileAberto && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setMenuMobileAberto(false)}
          />
        )}

        {/* SIDEBAR RESPONSIVA */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Botão de Fechar apenas no Mobile */}
          <div className="absolute top-4 right-4 md:hidden">
            <button onClick={() => setMenuMobileAberto(false)} className="text-gray-400 hover:text-red-500 bg-gray-50 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <Sidebar />
        </div>

        {/* ÁREA PRINCIPAL DO SISTEMA */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
          
          {/* CABEÇALHO MOBILE (Menu Hamburguer) */}
          <div className="md:hidden bg-white border-b border-[#B68B40]/20 p-4 flex items-center justify-between z-30 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setMenuMobileAberto(true)} className="p-2 -ml-2 text-[#B68B40] hover:bg-[#B68B40]/10 rounded-lg transition-colors focus:outline-none">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
            <img src="/logo.jpeg" alt="Emily Barcelos" className="h-9 object-contain" />
            <div className="w-7"></div> {/* Espaçador invisível para centralizar a logo */}
          </div>

          {/* CONTEÚDO DAS PÁGINAS */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto w-full">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/fichas-anamnese" element={<FichasAnamnese />} />
              <Route path="/midias-evolucao" element={<MidiasEvolucao />} />
              <Route path="/documentos-termos" element={<DocumentosTermos />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          
        </div>
      </div>
    </BrowserRouter>
  );
}