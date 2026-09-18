import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Pacientes from './pages/Pacientes';
import FichasAnamnese from './pages/FichasAnamnese';
import DocumentosTermos from './pages/DocumentosTermos';
import MidiasEvolucao from './pages/MidiasEvolucao';


function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#FDFCFB] font-sans">
        <Sidebar />
        
        <main className="flex-1 flex">
          <Routes>
            <Route path="/visao-geral" element={<Dashboard />} />
            {/* Agora a página raiz carrega o componente oficial da Agenda */}
            <Route path="/" element={<Agenda />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/fichas" element={<FichasAnamnese />} />
            <Route path="/documentos" element={<DocumentosTermos />} />
            <Route path="/midias" element={<MidiasEvolucao />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;