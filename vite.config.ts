import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// Inline only the public Supabase values. Do not set envPrefix to SUPABASE_:
// that would also ship SUPABASE_SERVICE_ROLE_KEY in the client bundle.
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, rootDir, '')
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(fileEnv.SUPABASE_URL ?? ''),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(fileEnv.SUPABASE_ANON_KEY ?? ''),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://127.0.0.1:3001',
      },
    },
  }
})
