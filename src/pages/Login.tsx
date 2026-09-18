import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    let emailParaLogin = identificador.trim();

    try {
      // Se não contém '@', tratamos como telemóvel e buscamos na tabela perfis_usuario
      if (!emailParaLogin.includes('@')) {
        // Remove formatação caso tenha colchetes ou traços, mantendo apenas números
        const telefoneLimpo = emailParaLogin.replace(/\D/g, '');

        const { data: userData, error: userError } = await supabase
          .from('perfis_usuario')
          .select('email')
          .eq('telefone', telefoneLimpo)
          .maybeSingle();

        if (userError || !userData) {
          throw new Error('Telemóvel não encontrado. Verifique o número inserido.');
        }
        emailParaLogin = userData.email;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailParaLogin,
        password: senha,
      });

      if (authError) throw new Error('Senha incorreta ou credenciais inválidas.');

      navigate('/');
    } catch (err: any) {
      setErro(err.message || 'Ocorreu um erro ao entrar.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
      <div className="bg-white border border-[#B68B40]/30 rounded-2xl shadow-xl w-full max-w-md p-8 flex flex-col items-center">
        
        {/* LOGO AUMENTADA (h-36) */}
        <img src="/logo.jpeg" alt="Emily Barcelos" className="h-36 object-contain mb-6" />
        
        <h1 className="text-2xl font-light text-gray-800 mb-1">Área Restrita</h1>
        <p className="text-xs text-gray-400 mb-8">Gestão Clínica Profissional</p>

        {erro && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4 text-center font-medium">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">E-mail ou Telemóvel</label>
            <input 
              type="text" 
              required
              value={identificador} 
              onChange={e => setIdentificador(e.target.value)}
              placeholder="exemplo@email.com ou telemóvel" 
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Senha</label>
            <input 
              type="password" 
              required
              value={senha} 
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••" 
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white"
            />
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            className="w-full bg-[#B68B40] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#9a7330] shadow-sm transition-colors mt-2 disabled:opacity-50"
          >
            {carregando ? 'A entrar...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}