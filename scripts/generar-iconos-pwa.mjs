// Genera un ícono distinto por rol para la PWA: public/icons/<rol>.svg y los PNG
// (192, 512 y 180 para iOS). Usa Edge/Chrome headless para rasterizar — no hay librerías
// de imagen en el proyecto. Uso: node scripts/generar-iconos-pwa.mjs
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { execFileSync } from 'child_process'
import { resolve } from 'path'

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
]
const navegador = NAVEGADORES.find(existsSync)
if (!navegador) throw new Error('No encontré Edge ni Chrome para rasterizar los íconos')

const trazo = 'fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"'

// Glifo dentro de la zona segura (centro ~60%), para que el recorte «maskable» no lo corte.
const ROLES = {
  admin: { color: '#0A66C2', glifo: `<path ${trazo} d="M160 176h192a22 22 0 0 1 22 22v108a22 22 0 0 1-22 22H252l-62 50v-50h-30a22 22 0 0 1-22-22V198a22 22 0 0 1 22-22z"/><circle cx="208" cy="252" r="9" fill="#fff"/><circle cx="256" cy="252" r="9" fill="#fff"/><circle cx="304" cy="252" r="9" fill="#fff"/>` },
  asistente: { color: '#6D28D9', glifo: `<rect ${trazo} x="226" y="140" width="60" height="124" rx="30"/><path ${trazo} d="M176 248a80 80 0 0 0 160 0M256 328v44M214 372h84"/>` },
  propietario: { color: '#C27C0E', glifo: `<path ${trazo} d="M170 372V172l86-34 86 34v200M130 372h252"/><path ${trazo} d="M214 214h12M286 214h12M214 262h12M286 262h12M240 372v-56h32v56"/>` },
  corporativo: { color: '#1A3C5E', glifo: `<path ${trazo} d="M146 372h220M186 372V268M256 372V190M326 372V232"/>` },
  finanzas: { color: '#057642', glifo: `<path ${trazo} d="M136 214l120-70 120 70zM136 372h240M176 244v92M256 244v92M336 244v92"/>` },
  facturador: { color: '#0F766E', glifo: `<path ${trazo} d="M178 140h110l56 56v176H178zM288 140v56h56M214 262h84M214 308h84"/>` },
  restaurante: { color: '#B24020', glifo: `<path ${trazo} d="M196 140v76a28 28 0 0 0 56 0v-76M224 140v232M310 372V140c-32 24-44 62-44 100 0 24 18 38 44 38"/>` },
  locatario: { color: '#BE185D', glifo: `<path ${trazo} d="M150 216l22-74h168l22 74a36 36 0 0 1-72 0 36 36 0 0 1-64 0 36 36 0 0 1-76 0zM164 252v120h184V252M226 372v-64h60v64"/>` },
}

const salida = resolve('public/icons')
mkdirSync(salida, { recursive: true })
const tmp = resolve('public/icons/_tmp.html')

const rasterizar = (svgPath, png, px) => {
  // Se incrusta el SVG en una página sin márgenes para que la captura salga al tamaño exacto.
  writeFileSync(tmp, `<html><body style="margin:0;background:#000"><img src="file:///${svgPath.replace(/\\/g, '/')}" width="${px}" height="${px}" style="display:block"></body></html>`)
  execFileSync(navegador, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${px},${px}`, `--screenshot=${png}`, `file:///${tmp.replace(/\\/g, '/')}`], { stdio: 'ignore' })
}

for (const [rol, { color, glifo }] of Object.entries(ROLES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" fill="${color}"/>${glifo}</svg>`
  const svgPath = resolve(salida, `${rol}.svg`)
  writeFileSync(svgPath, svg)
  for (const px of [192, 512, 180]) rasterizar(svgPath, resolve(salida, `${rol}-${px}.png`), px)
  console.log('✓', rol)
}
rmSync(tmp, { force: true })
