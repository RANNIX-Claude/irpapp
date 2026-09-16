import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

function getBuildId() {
  try {
    const now = new Date()
    const yy  = String(now.getFullYear()).slice(2)
    const mm  = String(now.getMonth() + 1).padStart(2, '0')
    const dd  = String(now.getDate()).padStart(2, '0')
    const hh  = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    return `V_${yy}${mm}${dd}_${hh}_${min}`
  } catch {
    return `V_??????`
  }
}

const APP_VERSION = getBuildId()

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [react()],
  server: { port: 5173 }
})
