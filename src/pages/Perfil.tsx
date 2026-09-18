import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Perfil() {
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'sucesso' | 'erro' } | null>(null);

  useEffect(() => {
    carregarDadosUsuario();
  }, []);

  const carregarDadosUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
      // Buscar o telemóvel guardado na tabela de perfis (se aplicável)
      const { data } = await supabase.from('perfis_usuario').select('telefone').eq('id', user.id).single();
      if (data) setTelefone(data.telefone || '');
    }
  };

  const atualizarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      // 1. Atualizar E-mail ou Senha se preenchidos
      const atualizacoesAuth: any = {};
      if (email !== user.email) atualizacoesAuth.email = email;
      if (novaSenha) atualizacoesAuth.password = novaSenha;

      if (Object.keys(atualizacoesAuth).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(atualizacoesAuth);
        if (authError) throw new Error(authError.message);
      }

      // 2. Atualizar Telemóvel na tabela de perfis
      const { error: perfilError } = await supabase
        .from('perfis_usuario')
        .upsert({ id: user.id, email, telefone });

      if (perfilError) throw new Error(perfilError.message);

      setMensagem({ texto: 'Dados atualizados com sucesso!', tipo: 'sucesso' });
      setNovaSenha('');
    } catch (err: any) {
      setMensagem({ texto: err.message || 'Erro ao atualizar dados.', tipo: 'erro' });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-4xl mx-auto flex flex-col h-full overflow-y-auto">
      <header className="mb-6 md:mb-8 shrink-0">
        <h1 className="text-2xl md:text-3xl font-light text-gray-800">Meu Perfil e Dados</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">Atualize as suas credenciais de acesso ao sistema</p>
      </header>

      <div className="bg-white rounded-xl border border-[#B68B40]/30 shadow-sm p-6 md:p-8">
        {mensagem && (
          <div className={`p-4 rounded-lg mb-6 text-sm font-medium border ${
            mensagem.tipo === 'sucesso' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={atualizarDados} className="space-y-6 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">E-mail de Acesso</label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Número de Telemóvel (Login Alternativo)</label>
            <input 
              type="text" 
              value={telefone} 
              onChange={e => setTelefone(e.target.value)}
              placeholder="(31) 97224-1476"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Nova Senha (Deixe em branco para manter a atual)</label>
            <input 
              type="password" 
              value={novaSenha} 
              onChange={e => setNovaSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none bg-white"
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={carregando}
              className="bg-[#B68B40] text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-[#9a7330] shadow-sm transition-colors disabled:opacity-50"
            >
              {carregando ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}