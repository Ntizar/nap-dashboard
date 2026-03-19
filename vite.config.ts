import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Carga variables de .env.local en desarrollo
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Proxy de desarrollo: redirige /api/nap/* a NAP añadiendo la ApiKey
      // La key viene de .env.local — nunca se expone al browser
      proxy: {
        '/api/nap': {
          target: 'https://nap.transportes.gob.es/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nap/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('ApiKey', env.NAP_API_KEY ?? '')
            })
          },
        },
      },
    },
  }
})
