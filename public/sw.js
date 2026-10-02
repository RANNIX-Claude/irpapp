// Service worker mínimo: hace instalable la PWA. No guarda nada en caché a propósito —
// la app maneja datos financieros en vivo y un caché viejo mostraría cifras desactualizadas.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
