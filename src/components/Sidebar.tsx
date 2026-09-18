import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  // As rotas aqui agora correspondem EXATAMENTE ao App.tsx
  const menuItems = [
    { path: '/', label: 'Visão Geral' },
    { path: '/agenda', label: 'Agenda' },
    { path: '/pacientes', label: 'Pacientes' },
    { path: '/fichas-anamnese', label: 'Fichas de Anamnese' },
    { path: '/midias-evolucao', label: 'Mídias e Evolução' },
    { path: '/documentos-termos', label: 'Documentos e Termos' },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-[#B68B40]/20 flex flex-col h-full shrink-0">
      <div className="p-6 md:p-8 flex justify-center border-b border-[#B68B40]/10">
        <img src="/logo.jpeg" alt="Emily Barcelos" className="w-32 object-contain" />
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.path)
                ? 'bg-[#B68B40]/10 text-[#B68B40]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#B68B40]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}