/**
 * Dos defectos que dejan la pantalla en blanco y que `vite build` NO detecta,
 * porque el JSX compila igual y el fallo solo aparece en el navegador:
 *
 *   1. Componente usado en JSX sin importar ni definir
 *      -> "X is not defined"        (pasó con LogoEditable en Contratos.jsx)
 *   2. Variable usada antes de declararse, en la zona muerta temporal
 *      -> "Cannot access 'X' before initialization"
 *         (pasó con un useEffect que dependía de un useState 54 líneas abajo)
 *
 *   node scripts/check-jsx.mjs                    # revisa src/
 *   node scripts/check-jsx.mjs src/pages/Foo.jsx  # un archivo
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const NL = String.fromCharCode(10)

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
    const def = clausula.match(/^\s*([A-Za-z_$][\w$]*)/)
    if (def && !clausula.trimStart().startsWith('{')) nombres.add(def[1])
    for (const n of clausula.matchAll(/\*\s+as\s+([A-Za-z_$][\w$]*)/g)) nombres.add(n[1])
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

/**
 * Dependencias de hooks declaradas más abajo que el propio hook.
 * Se analiza componente por componente: un nombre puede ser prop de uno y
 * variable de otro, y compararlos entre sí daría un falso positivo.
 */
function usoAntesDeDeclarar(src) {
  const cortes = [...src.matchAll(new RegExp(NL + 'function\\s+[A-Za-z_$][\\w$]*\\s*\\(', 'g'))].map(m => m.index)
  if (cortes.length > 1) {
    const partes = []
    for (let i = 0; i < cortes.length; i++) {
      const desde = cortes[i]
      const hasta = i + 1 < cortes.length ? cortes[i + 1] : src.length
      partes.push({ texto: src.slice(desde, hasta), offset: desde })
    }
    return partes.flatMap(({ texto, offset }) =>
      enBloque(texto).map(x => ({ ...x, linea: src.slice(0, offset).split(NL).length + x.linea - 1 })))
  }
  return enBloque(src)
}

function enBloque(src) {
  const problemas = []
  const declaradaEn = new Map()
  for (const m of src.matchAll(/\n\s*const\s+(?:\[\s*([\w$]+)[^\]]*\]|([\w$]+))\s*=/g)) {
    const nombre = m[1] || m[2]
    if (!declaradaEn.has(nombre)) declaradaEn.set(nombre, m.index)
  }
  for (const m of src.matchAll(/\}\s*,\s*\[([^\]]*)\]\s*\)/g)) {
    for (const dep of m[1].split(',')) {
      const nombre = dep.trim()
      if (!/^[a-z_$][\w$]*$/i.test(nombre)) continue
      const pos = declaradaEn.get(nombre)
      if (pos !== undefined && pos > m.index) {
        problemas.push({ nombre, linea: src.slice(0, m.index).split(NL).length })
      }
    }
  }
  return problemas
}

/**
 * Hook despues de un return condicional.
 *
 * React exige que el numero de hooks sea el mismo en cada render. Si un
 * componente sale temprano con `if (algo) return ...` y despues llama a un
 * hook, el render que NO toma esa salida cuenta un hook de mas: error #310 y
 * pantalla en blanco. `vite build` no lo detecta porque el codigo es valido.
 * Paso en DetalleEDR al bajar de un total a uno de sus sumandos.
 *
 * Solo se marca la SALIDA TEMPRANA —un return gobernado por un `if` de primer
 * nivel— y no el return final del componente, que por definicion no deja
 * hooks despues. Un return dentro de un useMemo o de un inicializador de
 * useState tambien queda indentado a cuatro espacios: por eso no basta con
 * mirar la indentacion, hay que exigir el `if` que lo precede.
 */
function hookTrasReturn(src) {
  const problemas = []
  // Cualquier declaracion de primer nivel corta el analisis: los hooks de una
  // funcion no se cuentan contra el return de otra.
  const inicios = [...src.matchAll(/^(?:export default )?(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)]

  for (let i = 0; i < inicios.length; i++) {
    const nombre = inicios[i][1]
    if (!/^[A-Z]/.test(nombre)) continue          // solo componentes
    const desde = inicios[i].index
    const hasta = i + 1 < inicios.length ? inicios[i + 1].index : src.length
    const cuerpo = src.slice(desde, hasta)

    // Los hooks del componente viven SIEMPRE a dos espacios de indentacion:
    // mas adentro ya es otra funcion, y esos no cuentan para React.
    const hooks = [...cuerpo.matchAll(/^  (?:const\s+[^=]+=\s*)?use(?:State|Effect|Memo|Callback|Ref|Context|Reducer)\s*\(/gm)]
    if (!hooks.length) continue

    // La salida temprana: un `if` de primer nivel cuyo cuerpo es un return,
    // en una linea o en dos.
    const salidas = [...cuerpo.matchAll(/^  if \(.*?\)\s*\{?[^\S\n]*\n?[^\S\n]*return[\s(;]/gm)]
    if (!salidas.length) continue

    const ultimoHook = hooks[hooks.length - 1].index
    if (salidas[0].index < ultimoHook) {
      problemas.push({ nombre, linea: src.slice(0, desde + ultimoHook + 1).split(NL).length })
    }
  }
  return problemas
}

const objetivo = process.argv[2]
const lista = objetivo ? [objetivo] : archivos('src')
let problemas = 0
let avisos = 0

for (const f of lista) {
  const src = readFileSync(f, 'utf-8')
  const disponibles = new Set([...importados(src), ...definidos(src)])
  const usados = new Set([...src.matchAll(/<([A-Z][\w$]*)[\s/>]/g)].map(m => m[1]))
  const faltan = [...usados].filter(c => !disponibles.has(c) && !c.includes('.'))
  const tdz = usoAntesDeDeclarar(src)
  const hooks = hookTrasReturn(src)

  if (faltan.length) {
    problemas++
    console.log('x ' + f)
    for (const c of faltan) {
      const linea = src.slice(0, src.indexOf('<' + c)).split(NL).length
      console.log('    sin definir: ' + c + '  (linea ' + linea + ')')
    }
  }
  // El detector de zona muerta no distingue una prop de una variable del mismo
  // nombre en otro componente, asi que avisa sin marcar fallo: hay que mirarlo.
  for (const h of hooks) {
    problemas++
    console.log('x ' + f)
    console.log('    hook despues de un return condicional en ' + h.nombre + '  (linea ' + h.linea + ')')
  }
  for (const t of tdz) {
    avisos++
    console.log('? ' + f + ' - revisar si ' + t.nombre + ' se usa antes de declararse (linea ' + t.linea + ')')
  }
}

console.log(problemas
  ? NL + problemas + ' archivo(s) con fallas que dejan la pantalla en blanco.'
  : 'OK - ' + lista.length + ' archivos revisados' + (avisos ? ', ' + avisos + ' aviso(s) por revisar.' : ', limpios.'))
process.exit(problemas ? 1 : 0)
