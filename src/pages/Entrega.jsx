const DOCS = [
  {
    num: '01',
    icon: '📋',
    title: 'Acta de Entrega',
    desc: 'Documento oficial de entrega-recepción del sistema IRP bajo licencia de operación RANNIX.',
    url: 'https://claude.ai/artifact/2DAQGWACWQqd3zTNSyeirC',
    color: '#0A66C2',
  },
  {
    num: '02',
    icon: '🗂️',
    title: 'Catálogo de Módulos',
    desc: 'Listado de los 30+ módulos del sistema con descripción funcional y alcance de cada uno.',
    url: 'https://claude.ai/artifact/RDo1DwzFhAKjritQgwRHNi',
    color: '#E8A020',
  },
  {
    num: '03',
    icon: '⚡',
    title: 'Guía Rápida',
    desc: 'Referencia compacta de los flujos más usados: contratos, cobranza, gastos, nómina y reportes.',
    url: 'https://claude.ai/artifact/T5cPBR6icG7J1X25A8Qzh2',
    color: '#057642',
  },
  {
    num: '04',
    icon: '📖',
    title: 'Manual de Usuario',
    desc: 'Manual completo con capturas de pantalla reales, flujos paso a paso y guía de IA.',
    url: 'https://claude.ai/artifact/3oRLxt2rk9h8bGQ9x7yoiA',
    color: '#6B3FC2',
  },
]

export default function Entrega() {
  return (
    <div style={{
      minHeight: 'calc(100vh - var(--header-height))',
      background: 'var(--color-primary-dark)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(10,102,194,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(10,102,194,.06) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,#000 40%,transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,#000 40%,transparent 100%)',
      }} />

      {/* logos row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        {/* RANNIX */}
        <svg width="110" height="32" viewBox="0 0 280 75" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rl" x1="0" y1="0" x2="60" y2="75" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38E8C8"/><stop offset="1" stopColor="#0A66C2"/>
            </linearGradient>
          </defs>
          <path d="M8 65 L8 12 L36 44 L36 12 L36 44 L64 12 L64 65" stroke="url(#rl)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <text x="80" y="46" fontFamily="Montserrat,sans-serif" fontSize="30" fontWeight="900" fill="white" letterSpacing="2">RANNIX</text>
        </svg>
        <div style={{ width: 1, height: 38, background: 'rgba(255,255,255,.15)' }} />
        {/* iWOL */}
        <svg width="42" height="42" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="48" fill="#0a0a0a"/>
          <defs>
            <linearGradient id="ig" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E040A0"/><stop offset="1" stopColor="#00B4FF"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ig)" strokeWidth="5"/>
          <text x="50" y="58" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="26" fontWeight="900" fill="white">iWOL</text>
        </svg>
      </div>

      {/* eyebrow + title */}
      <div style={{ color: '#E8A020', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
        Entrega oficial · Inmobiliaria Alcedines del Norte
      </div>
      <h1 style={{
        margin: '0 0 10px', textAlign: 'center',
        fontFamily: "'Montserrat',sans-serif", fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900,
        color: '#fff', lineHeight: 1.1,
      }}>
        IRP — Inmueble Resource Planning
      </h1>
      <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, margin: '0 0 36px', textAlign: 'center', maxWidth: 420 }}>
        Selecciona el documento del paquete de entrega que deseas consultar.
      </p>

      {/* cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 14, width: '100%', maxWidth: 820,
      }}>
        {DOCS.map(doc => (
          <a
            key={doc.num}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 14, padding: '22px 18px 20px',
              textDecoration: 'none', color: '#fff',
              display: 'flex', flexDirection: 'column',
              transition: 'background .15s, border-color .15s, transform .15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,.08)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.22)'
              e.currentTarget.style.transform = 'translateY(-3px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, marginBottom: 14,
            }}>{doc.icon}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 5 }}>
              {doc.num}
            </div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 14, fontWeight: 800, marginBottom: 7, lineHeight: 1.2 }}>
              {doc.title}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.55, flex: 1 }}>
              {doc.desc}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 14, fontSize: 11, fontWeight: 600, color: doc.color }}>
              Abrir
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M9 4l4 4-4 4"/>
              </svg>
            </div>
          </a>
        ))}
      </div>

      {/* footer */}
      <div style={{ marginTop: 36, fontSize: 11, color: 'rgba(255,255,255,.25)', textAlign: 'center' }}>
        RANNIX Consulting · Licencia de Operación IRP v1.0 · Septiembre 2026
      </div>
    </div>
  )
}
