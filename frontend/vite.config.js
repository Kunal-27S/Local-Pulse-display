import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: true, // needed for docker
      port: 3000, // default port, will automatically increment if busy
      hmr: {
        host: 'localhost'
      }
    },
    define: {
      'process.env': env
    }
  }
})
