import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  // Lista das páginas do sistema (agora com a Visão Geral no topo)
  const menuItems = [
    { name: 'Visão Geral', path: '/visao-geral' },
    { name: 'Agenda', path: '/' },
    { name: 'Pacientes', path: '/pacientes' },
    { name: 'Fichas de Anamnese', path: '/fichas' },
    { name: 'Mídias e Evolução', path: '/midias' },
    { name: 'Documentos e Termos', path: '/documentos' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#B68B40]/30 min-h-screen flex flex-col shrink-0">
      
      {/* --- ÁREA DA LOGO --- */}
      <Link 
        to="/visao-geral" 
        className="flex flex-col items-center justify-center border-b border-[#B68B40]/30 pt-6 pb-6 mb-6 hover:bg-[#B68B40]/5 transition-colors cursor-pointer block px-4"
      >
        <div className="flex items-center justify-center w-full">
          {/* Imagem da Logo - Certifique-se de que logo.jpeg está na pasta public */}
          <img 
            src="/logo.jpeg" 
            alt="Logo Dra. Emily Barcelos" 
            className="w-44 object-contain mix-blend-multiply" 
          />
        </div>
      </Link>

      {/* Links de Navegação */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive 
                  ? 'bg-[#B68B40]/10 text-[#B68B40] font-medium border border-[#B68B40]/20' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#B68B40]'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé do Menu */}
      <div className="p-4 border-t border-[#B68B40]/30 text-xs text-center text-gray-400">
        Sistema Gerencial v1.0
      </div>
    </aside>
  );
}