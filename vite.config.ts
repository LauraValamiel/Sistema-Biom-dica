import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Aqui nós conectamos o Tailwind diretamente no coração do Vite
export default defineConfig({
  plugins: [react(), tailwindcss()],
})