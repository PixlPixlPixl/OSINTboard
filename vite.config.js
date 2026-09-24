import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_PORT = 8000
const BACKEND_BIN = path.join(root, 'backend', '.venv', 'bin', 'python')
const BACKEND_ENTRY = path.join(root, 'backend', 'main.py')

function portOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host })
    sock.once('connect', () => {
      sock.destroy()
      resolve(true)
    })
    sock.once('error', () => resolve(false))
  })
}

function waitForPort(port, timeoutMs = 20000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (await portOpen(port)) return resolve()
      if (Date.now() - start >= timeoutMs) {
        return reject(new Error(`maigret backend did not start on port ${port}`))
      }
      setTimeout(tick, 250)
    }
    tick()
  })
}

let backendProc = null

async function ensureBackend() {
  // Reuse an already-running worker (e.g. from a manual start)
  if (await portOpen(BACKEND_PORT)) return
  backendProc = spawn(BACKEND_BIN, [BACKEND_ENTRY], {
    cwd: root,
    stdio: 'ignore',
  })
  backendProc.on('exit', () => {
    backendProc = null
  })
  await waitForPort(BACKEND_PORT)
}

// Demand lifecycle: nothing runs on :8000 until the first /api request
// (the scan button's POST). The worker serves the request, then exits
// itself after ~60s of inactivity — see backend/main.py _idle_watch.
function maigretLauncher() {
  const middleware = (req, res, next) => {
    ensureBackend()
      .then(() => next())
      .catch((err) => {
        res.statusCode = 502
        res.end(String(err.message || err))
      })
  }
  return {
    name: 'maigret-launcher',
    configureServer(server) {
      server.middlewares.use('/api', middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api', middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/osint/',
  plugins: [react(), maigretLauncher()],
  server: {
    proxy: {
      // Backend API — same-origin in dev
      '/api': 'http://127.0.0.1:8000',
    },
  },
  preview: {
    proxy: {
      // Same-origin /api for `vite preview` (built app)
      '/api': 'http://127.0.0.1:8000',
    },
  },
  resolve: {
    // shared-auth is a symlinked file: dep; without dedupe Vite resolves its
    // 'react' import to a stale nested copy (serverfire workspace, 19.2.6)
    // while the app uses 19.2.8 → two Reacts → "d.H is null" black screen.
    dedupe: ['react', 'react-dom'],
  },
})
