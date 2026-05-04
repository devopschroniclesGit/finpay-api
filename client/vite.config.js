import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // In dev, proxy API calls to your Express server
    proxy: {
      '/api': {
	target: 'https://127.0.0.1:3000',
        changeOrigin: true,
	secure: false,
	//ws: false,
      }
    }
  }
})
