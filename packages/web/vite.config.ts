import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': 'process.env',
  },
  server: {
    port: 3000,
    https: false, // Will be HTTPS in production via Firebase Hosting
    host: true,   // Allow external connections for mobile testing
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'qr-scanner': ['qr-scanner'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
          'mui': ['@mui/material', '@mui/icons-material'],
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'qr-scanner',
      'firebase/app',
      'firebase/auth', 
      'firebase/firestore',
      'firebase/analytics',
      '@mui/material',
      '@mui/icons-material'
    ]
  }
})