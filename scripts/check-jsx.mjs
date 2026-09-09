/**
 * Detecta componentes JSX usados pero nunca importados ni definidos.
 *
 *   node scripts/check-jsx.mjs            # revisa src/
 *   node scripts/check-jsx.mjs src/pages/Contratos.jsx
 *
 * Existe porque `vite build` NO atrapa esto: el JSX compila igual y el fallo
 * aparece en el navegador como "X is not defined", con la pantalla en blanco.
 * Pasó con LogoEditable en Contratos.jsx.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function archivos(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) archivos(p, acc)
    else if (p.endsWith('.jsx')) acc.push(p)
  }
  return acc
}

function importados(src) {
  const nombres = new Set()
  // Cubre imports multilínea: import {\n  A,\n  B,\n} from '...'
  for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g)) {
    const clausula = m[1]
    // default y namespace
    const def = clausula.match(/^\s*([A-Za-z_$][\w$]*)/)
    if (def && !clausula.trimStart().startsWith('{')) nombres.add(def[1])
    for (const n of clausula.matchAll(/\*\s+as\s+([A-Za-z_$][\w$]*)/g)) nombres.add(n[1])
    // nombrados, incluido "X as Y"
    const llaves = clausula.match(/\{([\s\S]*?)\}/)
    if (llaves) {
      for (const parte of llaves[1].split(',')) {
        const t = parte.trim()
        if (!t) continue
        const alias = t.match(/\bas\s+([A-Za-z_$][\w$]*)/)
        nombres.add(alias ? alias[1] : t.split(/\s+/)[0])
      }
    }
  }
  return nombres
}

function definidos(src) {
  const nombres = new Set()
  for (const m of src.matchAll(/\b(?:function|class)\s+([A-Z][\w$]*)/g)) nombres.add(m[1])
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Z][\w$]*)\s*=/g)) nombres.add(m[1])
  // destructuring con renombre en props: { icon: Icon }
  for (const m of src.matchAll(/:\s*([A-Z][\w$]*)\s*[,}]/g)) nombres.add(m[1])
  // destructuring de arreglos en parámetros: .map(([v, t, c, Icon]) => ...)
  for (const m of src.matchAll(/\(\s*\[([^\]]*)\]\s*\)\s*=>/g)) {
    for (const parte of m[1].split(',')) {
      const t = parte.trim()
      if (/^[A-Z][\w$]*$/.test(t)) nombres.add(t)
    }
  }
  return nombres
}

const objetivo = process.argv[2]
const lista = objetivo ? [objetivo] : archivos('src')
let problemas = 0

for (const f of lista) {
  const src = readFileSync(f, 'utf-8')
  const disponibles = new Set([...importados(src), ...definidos(src)])
  const usados = new Set([...src.matchAll(/<([A-Z][\w$]*)[\s/>]/g)].map(m => m[1]))
  const faltan = [...usados].filter(c => !disponibles.has(c) && !c.includes('.'))
  if (faltan.length) {
    problemas++
    console.log(`✗ ${f}`)
    for (const c of faltan) {
      const linea = src.slice(0, src.indexOf(`<${c}`)).split('\n').length
      console.log(`    ${c}  (línea ${linea})`)
    }
  }
}

console.log(problemas ? `\n${problemas} archivo(s) con componentes sin definir.` : `✓ ${lista.length} archivos revisados, sin componentes sueltos.`)
process.exit(problemas ? 1 : 0)
