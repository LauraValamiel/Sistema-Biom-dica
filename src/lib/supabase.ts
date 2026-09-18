import { createClient } from '@supabase/supabase-js';

// O Vite usa import.meta.env para ler o arquivo .env.local que criamos
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Trava de segurança: avisa se esquecermos de colocar as chaves
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam as variáveis de ambiente do Supabase no arquivo .env.local');
}

// Cria e exporta a conexão para usarmos em qualquer tela do sistema
export const supabase = createClient(supabaseUrl, supabaseAnonKey);