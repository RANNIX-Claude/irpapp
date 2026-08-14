import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  LogOut, Download, FileText, CheckCircle, Clock, AlertTriangle,
  DollarSign, ChevronDown, ChevronUp, Eye, Home, CreditCard
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }
const MES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MES_CORTO = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const ESTATUS_META = {
  PAGADO:    { label: 'Pagado',    color: '#16a34a', bg: '#D1FAE5' },
  PARCIAL:   { label: 'Parcial',   color: '#7C3AED', bg: '#EDE9FE' },
  PENDIENTE: { label: 'Pendiente', color: '#D97706', bg: '#FEF3C7' },
  EN_MORA:   { label: 'En mora',   color: '#DC2626', bg: '#FEE2E2' },
  CANCELADO: { label: 'Cancelado', color: '#6B7280', bg: '#F3F4F6' },
}

const TIPO_META = {
  RENTA:      { label: 'Renta',    color: '#0A66C2' },
  SANCION:    { label: 'Sanción',  color: '#DC2626' },
  RECARGO:    { label: 'Recargo',  color: '#D97706' },
  CUOTA_MANT: { label: 'Mantenimiento', color: '#6B7280' },
  OTRO:       { label: 'Otro',     color: '#9CA3AF' },
}

// ── Componente: badge estatus ─────────────────────────────────────────────────
function EstatusBadge({ estatus }) {
  const m = ESTATUS_META[estatus] || ESTATUS_META.PENDIENTE
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color: m.color, background: m.bg, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

// ── Componente: tarjeta de un cobro ──────────────────────────────────────────
function CobrosCard({ cobro }) {
  const [open, setOpen] = useState(false)
  const ingresos = cobro.ingresos_json || []
  const m = ESTATUS_META[cobro.estatus] || ESTATUS_META.PENDIENTE
  const tipo = TIPO_META[cobro.tipo] || TIPO_META.RENTA
  const pct = cobro.monto_total > 0
    ? Math.min(100, ((parseFloat(cobro.monto_pagado) || 0) / parseFloat(cobro.monto_total)) * 100)
    : 0

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${cobro.estatus === 'EN_MORA' ? '#FCA5A5' : '#E5E7EB'}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Cabecera del cobro */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {/* Mes / año */}
        <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: cobro.estatus === 'PAGADO' ? '#D1FAE5' : cobro.estatus === 'EN_MORA' ? '#FEE2E2' : '#EEF2FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: cobro.estatus === 'PAGADO' ? '#16a34a' : cobro.estatus === 'EN_MORA' ? '#DC2626' : '#0A66C2' }}>{MES_CORTO[cobro.mes]}</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: cobro.estatus === 'PAGADO' ? '#16a34a' : cobro.estatus === 'EN_MORA' ? '#DC2626' : '#0A66C2' }}>{cobro.anio}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#1F2937' }}>{fmt(cobro.monto_total)}</span>
            <EstatusBadge estatus={cobro.estatus} />
            {cobro.tipo !== 'RENTA' && (
              <span style={{ fontSize: '10px', fontWeight: 700, color: tipo.color, background: tipo.color + '18', padding: '2px 7px', borderRadius: '10px' }}>{tipo.label}</span>
            )}
          </div>
          {cobro.estatus === 'PARCIAL' && (
            <div style={{ marginTop: '5px' }}>
              <div style={{ height: '5px', background: '#E5E7EB', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#7C3AED', borderRadius: '5px' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600 }}>{fmt(cobro.monto_pagado)} pagado ({pct.toFixed(0)}%)</span>
            </div>
          )}
          {cobro.fecha_pago_real && (
            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>Pagado el {cobro.fecha_pago_real}</div>
          )}
          {ingresos.length > 0 && (
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
              {ingresos.filter(i => i.factura_pdf_url).length} factura(s) disponible(s)
            </div>
          )}
        </div>

        <ChevronDown size={18} color="#9CA3AF" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {/* Detalle expandible */}
      {open && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 16px', background: '#FAFAFA' }}>
          {ingresos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: '#9CA3AF', fontSize: '13px' }}>
              Sin movimientos registrados
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ingresos.map((ing, idx) => (
                <div key={ing.id || idx} style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1F2937' }}>{fmt(ing.importe)}</span>
                        {ing.tipo_concepto && ing.tipo_concepto !== 'RENTA' && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: (TIPO_META[ing.tipo_concepto] || TIPO_META.OTRO).color, background: (TIPO_META[ing.tipo_concepto] || TIPO_META.OTRO).color + '18', padding: '2px 7px', borderRadius: '10px' }}>
                            {(TIPO_META[ing.tipo_concepto] || TIPO_META.OTRO).label}
                          </span>
                        )}
                        {ing.factura_numero && (
                          <span style={{ fontSize: '10px', color: '#6B7280', fontFamily: 'monospace', background: '#F3F4F6', padding: '2px 7px', borderRadius: '8px' }}>
                            Factura {ing.factura_serie || ''}{ing.factura_numero}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                        {ing.fecha} · {ing.forma_pago}{ing.referencia ? ` · ${ing.referencia}` : ''}
                      </div>
                    </div>
                    {/* Botones descarga */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {ing.factura_pdf_url && (
                        <a href={ing.factura_pdf_url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#DC2626', color: 'white', borderRadius: '7px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
                          <Download size={12} /> PDF
                        </a>
                      )}
                      {ing.factura_xml_url && (
                        <a href={ing.factura_xml_url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#16a34a', color: 'white', borderRadius: '7px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
                          <Download size={12} /> XML
                        </a>
                      )}
                      {!ing.factura_pdf_url && !ing.factura_xml_url && (
                        <span style={{ fontSize: '11px', color: '#9CA3AF', padding: '6px 10px', background: '#F9FAFB', borderRadius: '7px' }}>Sin factura</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Si está pendiente o en mora */}
          {(cobro.estatus === 'PENDIENTE' || cobro.estatus === 'EN_MORA' || cobro.estatus === 'PARCIAL') && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: cobro.estatus === 'EN_MORA' ? '#FEF2F2' : '#FFFBEB', borderRadius: '8px', border: `1px solid ${cobro.estatus === 'EN_MORA' ? '#FCA5A5' : '#FDE68A'}` }}>
              <div style={{ fontSize: '12px', color: cobro.estatus === 'EN_MORA' ? '#DC2626' : '#92400E', fontWeight: 600 }}>
                {cobro.estatus === 'EN_MORA'
                  ? `⚠ Pago vencido — Saldo pendiente: ${fmt((parseFloat(cobro.monto_total) || 0) - (parseFloat(cobro.monto_pagado) || 0))}`
                  : `Saldo pendiente: ${fmt((parseFloat(cobro.monto_total) || 0) - (parseFloat(cobro.monto_pagado) || 0))}`}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                Para realizar tu pago utiliza la cuenta BBVA indicada en tu contrato y envía tu comprobante a la administración.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Login del portal (email + contraseña) ────────────────────────────────────
function PortalLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setLoading(false)
    if (error) setErr('Correo o contraseña incorrectos. Contacta a la administración.')
    else onLogin()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1A3C5E 0%, #0A66C2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '40px 36px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Home size={28} color="white" />
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#1A3C5E' }}>Portal del Arrendatario</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Plaza IWOL — Metepec, México</p>
        </div>

        <form onSubmit={handleSubmit}>
          {err && (
            <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {err}
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Correo electrónico
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="tucorreo@ejemplo.com"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contraseña
            </label>
            <input
              type="password" value={pass} onChange={e => setPass(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', background: loading ? '#9CA3AF' : '#0A66C2', color: 'white',
            border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          }}>
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9CA3AF', marginTop: '20px', lineHeight: 1.6 }}>
          ¿Problemas para acceder? Comunícate con la administración de Plaza IWOL.
        </p>
      </div>
    </div>
  )
}

// ── Página principal del portal ───────────────────────────────────────────────
export default function PortalArrendatario() {
  const [session, setSession] = useState(null)
  const [arrendatario, setArrendatario] = useState(null)
  const [cobros, setCobros] = useState([])
  const [loading, setLoading] = useState(true)
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())
  const [filtroEst, setFiltroEst] = useState('Todos')

  // Escuchar cambios de sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Cargar datos cuando hay sesión
  useEffect(() => {
    if (!session) { setLoading(false); return }
    cargarDatos()
  }, [session])

  const cargarDatos = async () => {
    setLoading(true)
    // Datos del arrendatario logueado
    const { data: arr } = await supabase
      .from('arrendatarios')
      .select('id, nombre_razon_social, rfc, tipo_persona, telefono')
      .eq('auth_user_id', session.user.id)
      .single()

    if (!arr) { setLoading(false); return }
    setArrendatario(arr)

    // Cobros programados desde la vista portal_mis_cobros
    const { data: rows } = await supabase
      .from('portal_mis_cobros')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    setCobros(rows ?? [])
    setLoading(false)
  }

  const cerrarSesion = () => supabase.auth.signOut()

  // ── Sin sesión → login ──
  if (!session) return <PortalLogin onLogin={cargarDatos} />

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#6B7280' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#0A66C2', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Cargando tu información...
      </div>
    </div>
  )

  if (!arrendatario) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: '#1F2937', marginBottom: '8px' }}>Cuenta no vinculada</h2>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Tu cuenta no está asociada a ningún contrato. Contacta a la administración de Plaza IWOL.</p>
        <button onClick={cerrarSesion} style={{ marginTop: '20px', padding: '10px 20px', background: '#0A66C2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cerrar sesión</button>
      </div>
    </div>
  )

  // ── KPIs ──
  const totalPagado    = cobros.filter(c => c.estatus === 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totalPendiente = cobros.filter(c => c.estatus !== 'PAGADO' && c.estatus !== 'CANCELADO').reduce((a, b) => a + ((parseFloat(b.monto_total) || 0) - (parseFloat(b.monto_pagado) || 0)), 0)
  const pagados        = cobros.filter(c => c.estatus === 'PAGADO').length
  const pendientes     = cobros.filter(c => c.estatus === 'PENDIENTE' || c.estatus === 'PARCIAL').length
  const mora           = cobros.filter(c => c.estatus === 'EN_MORA').length
  const totalFacturas  = cobros.reduce((a, b) => a + (parseInt(b.num_pdfs) || 0), 0)

  // ── Filtros ──
  const anios = [...new Set(cobros.map(c => c.anio))].sort((a, b) => b - a)
  const filtrados = cobros.filter(c => {
    const matchAnio = c.anio === anioFiltro
    const matchEst  = filtroEst === 'Todos' || c.estatus === filtroEst
    return matchAnio && matchEst
  })

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      {/* Header */}
      <div style={{ background: '#1A3C5E', padding: '0 20px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>Portal IWOL</div>
              <div style={{ fontSize: '10px', color: '#93C5FD', lineHeight: 1.2 }}>Mis pagos y facturas</div>
            </div>
          </div>
          <button onClick={cerrarSesion} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#93C5FD', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Bienvenida */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={24} color="#0A66C2" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bienvenido</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#1F2937', lineHeight: 1.2 }}>{arrendatario.nombre_razon_social}</div>
              {cobros[0] && (
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  {cobros[0].inmueble_nombre} · Local {cobros[0].numero_local}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total pagado', value: fmt(totalPagado), color: '#16a34a', bg: '#D1FAE5', icon: CheckCircle },
            { label: 'Por pagar', value: fmt(totalPendiente), color: totalPendiente > 0 ? '#D97706' : '#16a34a', bg: totalPendiente > 0 ? '#FEF3C7' : '#D1FAE5', icon: totalPendiente > 0 ? Clock : CheckCircle },
            { label: `${pagados} pagados`, value: `${cobros.length} cobros`, color: '#0A66C2', bg: '#EEF2FF', icon: DollarSign },
            { label: `${totalFacturas} facturas`, value: 'disponibles', color: '#6B7280', bg: '#F3F4F6', icon: FileText },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1F2937' }}>{value}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerta mora */}
        {mora > 0 && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '14px' }}>Tienes {mora} pago(s) en mora</div>
              <div style={{ fontSize: '12px', color: '#991B1B', marginTop: '2px' }}>Por favor realiza tu pago a la brevedad para evitar cargos adicionales. Contacta a la administración si tienes alguna duda.</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {anios.map(a => (
              <button key={a} onClick={() => setAnioFiltro(a)} style={{
                padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1.5px solid',
                borderColor: anioFiltro === a ? '#0A66C2' : '#E5E7EB',
                background: anioFiltro === a ? '#0A66C2' : 'white',
                color: anioFiltro === a ? 'white' : '#6B7280',
              }}>{a}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            {['Todos', 'PAGADO', 'PENDIENTE', 'EN_MORA'].map(e => (
              <button key={e} onClick={() => setFiltroEst(e)} style={{
                padding: '7px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                borderColor: filtroEst === e ? '#0A66C2' : '#E5E7EB',
                background: filtroEst === e ? '#EEF2FF' : 'white',
                color: filtroEst === e ? '#0A66C2' : '#6B7280',
              }}>{e === 'Todos' ? 'Todos' : (ESTATUS_META[e]?.label || e)}</button>
            ))}
          </div>
        </div>

        {/* Lista de cobros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
              <FileText size={36} color="#E5E7EB" style={{ marginBottom: '12px' }} />
              <div style={{ fontWeight: 600 }}>Sin movimientos para este período</div>
            </div>
          ) : (
            filtrados.map(cobro => <CobrosCard key={cobro.id} cobro={cobro} />)
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#9CA3AF', paddingBottom: '20px' }}>
          Plaza IWOL — Metepec, México · {new Date().getFullYear()}<br />
          Powered by RANNIX Consulting
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
