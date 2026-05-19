import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const serverTarget = env.DEVFORGE_SERVER_URL || env.VITE_SERVER_URL || 'http://localhost:3001'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: serverTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: serverTarget,
          ws: true,
        },
      },
    },
    optimizeDeps: {
      exclude: ['monaco-editor'],
    },
  }
})
