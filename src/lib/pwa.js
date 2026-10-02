// Identidad de la PWA por rol: cada rol instala «su» app, con nombre, color e ícono propios.
// El manifiesto y los íconos se cambian en el <head> al conocerse el rol (después del login);
// `id`/`start_url` distintos por rol hacen que el navegador los trate como apps separadas.
const ROLES_CON_ICONO = ['asistente', 'propietario', 'corporativo', 'finanzas', 'facturador', 'restaurante', 'locatario']
const TITULOS = {
  admin: 'IRP Admin', asistente: 'IRP Asistente', propietario: 'IRP Propietario', corporativo: 'IRP Corporativo',
  finanzas: 'IRP Finanzas', facturador: 'IRP Facturación', restaurante: 'IRP Restaurante', locatario: 'IRP Mi Local',
}
const COLORES = {
  admin: '#0A66C2', asistente: '#6D28D9', propietario: '#C27C0E', corporativo: '#1A3C5E',
  finanzas: '#057642', facturador: '#0F766E', restaurante: '#B24020', locatario: '#BE185D',
}

// Cualquier rol de personal sin identidad propia (super_admin, admin, etc.) usa la del administrador.
export const claveIcono = rolId => (ROLES_CON_ICONO.includes(rolId) ? rolId : 'admin')

function enlace(rel, atributos = {}) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el) }
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v))
}
function meta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el) }
  el.setAttribute('content', content)
}

export function aplicarIdentidadPWA(rolId) {
  const k = claveIcono(rolId)
  enlace('manifest', { href: `/manifests/${k}.webmanifest` })
  enlace('icon', { type: 'image/png', href: `/icons/${k}-192.png` })
  enlace('apple-touch-icon', { href: `/icons/${k}-180.png` })
  meta('theme-color', COLORES[k])
  meta('apple-mobile-web-app-title', TITULOS[k])
}

export function registrarServiceWorker() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}
