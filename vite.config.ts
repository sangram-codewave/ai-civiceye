import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// Inline only the public Supabase values. Do not set envPrefix to SUPABASE_:
// that would also ship SUPABASE_SERVICE_ROLE_KEY in the client bundle.
export default defineConfig(({ mode }) => {
  // loadEnv(mode, root, '') copies process.env even when no .env file exists.
  // Read the two public values from process.env first so a Vercel build, which
  // has no .env file, still inlines them. Never define the service role or Gemini key.
  const fileEnv = loadEnv(mode, rootDir, '')
  const supabaseUrl = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || ''
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || fileEnv.SUPABASE_ANON_KEY || ''
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
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
