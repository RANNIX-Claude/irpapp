/**
 * capturar-png-qa.mjs
 * Genera los PNG de tickets y fichas bancarias QA usando Puppeteer (headless Chrome).
 * No requiere abrir el navegador manualmente — los PNG quedan en la misma carpeta.
 *
 * Uso:
 *   node scripts/capturar-png-qa.mjs tickets   → tickets-demo/qa-tickets/*.png
 *   node scripts/capturar-png-qa.mjs fichas     → tickets-demo/qa-fichas/*.png
 *   node scripts/capturar-png-qa.mjs all        → ambas carpetas
 */

import puppeteer from 'puppeteer'
import fs        from 'fs'
import path      from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')
const modo      = process.argv[2] || 'all'

async function capturarCarpeta(browser, carpeta, selectorId) {
  const dir   = path.join(ROOT, carpeta)
  const htmls = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html' && f !== 'pruebas.html')
  let ok = 0

  for (const html of htmls) {
    const pngNombre = html.replace('.html', '.png')
    const pngPath   = path.join(dir, pngNombre)
    const fileUrl   = 'file:///' + path.join(dir, html).replace(/\\/g, '/')

    const page = await browser.newPage()
    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 })
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 })

    const el = await page.$(`#${selectorId}`)
    if (!el) {
      console.warn(`  ⚠ No encontré #${selectorId} en ${html}`)
      await page.close()
      continue
    }

    await el.screenshot({ path: pngPath, type: 'png' })
    await page.close()
    ok++
    process.stdout.write(`  ✓ ${pngNombre}\n`)
  }

  console.log(`\n  → ${ok} PNG en ${carpeta}/\n`)
  return ok
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })

try {
  if (modo === 'tickets' || modo === 'all') {
    console.log('── Tickets de compra ────────────────────────────────')
    await capturarCarpeta(browser, 'tickets-demo/qa-tickets', 'ticket')
  }
  if (modo === 'fichas' || modo === 'all') {
    console.log('── Fichas bancarias ──────────────────────────────────')
    await capturarCarpeta(browser, 'tickets-demo/qa-fichas', 'doc')
  }
} finally {
  await browser.close()
}

console.log('✅ Listo')
