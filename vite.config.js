import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

function getVersion() {
  try { return execSync('git describe --tags --abbrev=0').toString().trim() } catch { return 'v0.03' }
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(getVersion()) },
  plugins: [react()],
  server: { port: 5173 }
})
