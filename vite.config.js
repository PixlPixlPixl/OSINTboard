import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/OSINTboard/',
  plugins: [react()],
  resolve: {
    // shared-auth is a symlinked file: dep; without dedupe Vite resolves its
    // 'react' import to a stale nested copy (serverfire workspace, 19.2.6)
    // while the app uses 19.2.8 → two Reacts → "d.H is null" black screen.
    dedupe: ['react', 'react-dom'],
  },
})
