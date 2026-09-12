import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, FileText, CreditCard, BarChart2, Phone, Mail,
  Calendar, Hash, Upload, ChevronRight, Printer, Shield, AlertTriangle,
  CheckCircle, Clock, Download, MapPin, Plus, X, Save,
} from 'lucide-react'
import { supabase, llamarFuncion } from '../lib/supabase'
import { EnlacePrivado } from '../components/ui/ArchivoPrivado'
import LogoEditable from '../components/ui/LogoEditable'
import { IngresoModal } from './Ingresos'
import { useApp } from '../context/AppContext'
import toast from 'react-hot-toast'

// ── Paleta RANNIX ────────────────────────────────────────────────────────────
const C = {
  primary: '#0A66C2', dark: '#1A3C5E', gold: '#E8A020',
  success: '#057642', warning: '#F59E0B', danger: '#B24020',
  bg: '#F0F4F8', surface: '#FFFFFF', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', light: '#F8FAFC',
}

const fmt$ = n => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const fmtD = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const hoyISO = () => new Date().toISOString().slice(0, 10)

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const TABS = [
  { id: 'resumen',    label: 'Resumen',    icon: BarChart2 },
  { id: 'contrato',   label: 'Contrato',   icon: FileText },
  { id: 'pagos',      label: 'Pagos',      icon: CreditCard },
  { id: 'documentos', label: 'Documentos', icon: Shield },
]

// Documentos que se piden en el expediente del arrendatario.
const DOCS_REQUERIDOS = [
  ['INE_FRENTE', 'INE (frente)'],
  ['INE_REVERSO', 'INE (reverso)'],
  ['RFC_CONSTANCIA', 'Constancia fiscal'],
  ['COMPROBANTE_DOMICILIO', 'Comprobante de domicilio'],
  ['ACTA_CONSTITUTIVA', 'Acta constitutiva'],
  ['PODER_NOTARIAL', 'Poder notarial'],
]

// ── Átomos ───────────────────────────────────────────────────────────────────
function Badge({ label, color = C.primary, bg }) {
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg || color + '15', color }}>{label}</span>
}

function Campo({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? C.text : C.muted, fontWeight: 500, fontFamily: mono ? 'monospace' : undefined }}>{value || '—'}</div>
    </div>
  )
}

function Grid4({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>{children}</div>
}

function Card({ children, padding = '20px' }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding }}>{children}</div>
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {Icon && <Icon size={15} color={C.primary} />}
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Empty({ msg }) {
  return <div style={{ padding: '28px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>{msg}</div>
}

function Th({ children }) {
  return <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{children}</th>
}

function Td({ children, mono, bold, small }) {
  return <td style={{ padding: '10px 12px', fontSize: small ? 11 : 13, fontFamily: mono ? 'monospace' : undefined, color: C.text, fontWeight: bold ? 700 : 400, fontVariantNumeric: mono ? 'tabular-nums' : undefined }}>{children}</td>
}

// ── Modal: el locatario solo sube el comprobante, no reparte el pago ────────
// A diferencia de IngresoModal (para staff), este NO crea aplicaciones_pago:
// el ingreso entra "Por validar" y un administrador lo revisa y lo aplica
// a los cargos correspondientes desde /ingresos.
function ModalSubirComprobanteLocatario({ cobro, contratoId, onClose, onSaved }) {
  const [form, setForm] = useState({
    fecha: hoyISO(),
    monto: cobro.saldo ?? cobro.monto_total ?? '',
    origen: 'TRANSFERENCIA BBVA',
    referencia: '',
    notas: '',
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) return toast.error('Indica el monto pagado')
    setSaving(true)
    try {
      const { data, error } = await supabase.from('ingresos').insert({
        contrato_id:     contratoId,
        fecha:           form.fecha || null,
        tipo:            cobro.referencia_pago || 'RENTA',
        mes:             cobro.mes,
        anio:            cobro.anio,
        importe:         parseFloat(form.monto),
        origen:          form.origen || null,
        concepto_origen: form.referencia || null,
        nota:            form.notas || null,
        estatus_validacion: 'POR_VALIDAR',
      }).select('id').single()
      if (error) throw error

      if (file) {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file)
        })
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const resp = await llamarFuncion('subir-comprobante', {
          bucket: 'facturas-cfdi', path: `comprobantes/${data.id}/comp.${ext}`,
          file_base64: b64, mime_type: file.type || 'image/jpeg', ingreso_id: data.id,
        })
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}))
          toast.error('El pago se registró, pero el comprobante no se pudo subir: ' + (j.error || resp.status))
        }
      }

      toast.success('Comprobante enviado — un administrador lo va a validar')
      onSaved(); onClose()
    } catch (e) {
      toast.error(e.message)
    } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 480, maxWidth: '96vw', maxHeight: '92vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Subir comprobante de pago</h3>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {MESES[cobro.mes]} {cobro.anio} · {fmt$(cobro.saldo ?? cobro.monto_total)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px 22px', display: 'grid', gap: 14 }}>
          <div>
            <label style={lbl}>Comprobante (foto o PDF)</label>
            <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])}
              style={{ ...inp, padding: 8, border: `1.5px dashed ${C.border}`, cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Fecha del pago</label>
              <input type="date" value={form.fecha} onChange={e => sf('fecha', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Monto pagado</label>
              <input type="number" step="0.01" value={form.monto} onChange={e => sf('monto', e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Forma de pago</label>
            <select value={form.origen} onChange={e => sf('origen', e.target.value)} style={{ ...inp, background: 'white' }}>
              {['TRANSFERENCIA BBVA','DEPOSITO','EFECTIVO','CHEQUE','TARJETA'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Referencia / No. de operación</label>
            <input value={form.referencia} onChange={e => sf('referencia', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Notas</label>
            <input value={form.notas} onChange={e => sf('notas', e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancelar</button>
          <button onClick={guardar} disabled={saving}
            style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: C.success, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Save size={15} /> {saving ? 'Enviando…' : 'Enviar comprobante'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function ExpedienteContrato() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil, user } = useApp()
  const rolId = perfil?.rol_id || user?.user_metadata?.rol_id
  const esLocatario = rolId === 'locatario'
  const [exp, setExp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumen')
  const [cobros, setCobros] = useState([])
  const [docs, setDocs] = useState([])
  const [logoUrl, setLogoUrl] = useState(null)
  const [modalCobro, setModalCobro] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const reload = () => setRefreshKey(k => k + 1)

  const loadData = useCallback(async () => {
    setLoading(true)
    // Se lee de prp_contratos, la misma vista que alimenta la lista.
    // prp_expediente_arrendatario NO sirve aquí: está construida sobre el
    // esquema `prp` (prp.contratos_arrendamiento), un modelo distinto al de
    // public.contratos, así que sus contrato_id no corresponden a estos.
    const { data: c } = await supabase
      .from('prp_contratos').select('*').eq('id', id).maybeSingle()

    if (!c) { setExp(null); setLoading(false); return }

    // Nombres que espera el resto de la pantalla.
    const expData = {
      ...c,
      contrato_id:        c.id,
      nombre_completo:    c.arrendatario_nombre,
      rfc:                c.arrendatario_rfc,
      telefono:           c.arrendatario_telefono,
      email:              c.arrendatario_email,
      domicilio:          c.arrendatario_domicilio,
      contrato_estatus:   c.estatus,
      numero_local:       c.locales_display || c.unidad_numero,
      metros_cuadrados:   c.m2_totales,
      dia_limite_pago:    c.dia_pago,
      penalizacion_mora_pct: c.penalizacion_pct,
      alta_fecha:         c.created_at?.slice(0, 10),
    }

    const [cobrosR, docsR, arrR] = await Promise.all([
      // prp_cartera, no prp_cobros: esta última vive en el esquema `prp` y sus
      // contrato_id no corresponden a los de public.contratos, así que devolvía
      // siempre cero filas. Es la misma vista que usa /cobranza.
      supabase.from('prp_cartera').select('*').eq('contrato_id', id)
        .order('periodo_anio', { ascending: false }).order('periodo_mes', { ascending: false }),
      supabase.from('documentos').select('*').eq('entidad_tipo', 'ARRENDATARIO').eq('entidad_id', c.arrendatario_id),
      // logo_url no está en la vista; se lee de la tabla.
      supabase.from('arrendatarios').select('logo_url').eq('id', c.arrendatario_id).maybeSingle(),
    ])

    setExp(expData)
    setCobros((cobrosR.data ?? []).map(r => ({
      ...r,
      mes:               r.periodo_mes,
      anio:              r.periodo_anio,
      monto_total:       r.importe,
      monto_pagado:      r.total_aplicado,
      estatus:           r.estado,
      fecha_limite_pago: r.fecha_vencimiento,
      referencia_pago:   r.concepto,
    })))
    setDocs(docsR.data ?? [])
    setLogoUrl(arrR.data?.logo_url ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData, refreshKey])


  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12, color: C.muted }}>
      <div style={{ width: 30, height: 30, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Cargando expediente…
    </div>
  )

  if (!exp) return (
    <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
      Contrato no encontrado.{' '}
      <button onClick={() => navigate('/contratos')} style={{ color: C.primary, border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Volver a contratos</button>
    </div>
  )

  // Un locatario solo puede ver SU contrato. App.jsx ya lo manda para acá,
  // pero la ruta acepta cualquier :id — sin este guard, con solo editar la
  // URL vería el expediente de otro arrendatario.
  if (esLocatario && perfil?.contrato_id !== id) return (
    <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
      No tienes acceso a este expediente.
    </div>
  )

  const vigente = exp.contrato_estatus === 'VIGENTE'
  const enMora = c => c.estatus !== 'PAGADO' && !!c.fecha_limite_pago && c.fecha_limite_pago < hoyISO()
  const pendientes = cobros.filter(c => c.estatus !== 'PAGADO')
  const morosos = pendientes.filter(enMora)
  const pagados = cobros.filter(c => c.estatus === 'PAGADO')
  const totalPagado = pagados.reduce((a, c) => a + (parseFloat(c.monto_pagado) || 0), 0)
  const saldoPendiente = pendientes.reduce((a, c) => a + ((parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pagado) || 0)), 0)
  const docsOk = DOCS_REQUERIDOS.filter(([t]) => docs.some(d => d.tipo_doc === t)).length
  const pctDocs = Math.round(docsOk / DOCS_REQUERIDOS.length * 100)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Barra superior */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 100 }}>
        {!esLocatario && (
          <>
            <button onClick={() => navigate('/contratos')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', color: C.muted, fontSize: 13 }}>
              <ArrowLeft size={13} /> Contratos
            </button>
            <ChevronRight size={13} color={C.muted} />
          </>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{exp.nombre_completo}</span>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{exp.folio || exp.numero_local}</span>
        <div style={{ flex: 1 }} />
        <Badge label={exp.contrato_estatus || '—'} color={vigente ? C.success : C.danger} />
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 12, color: C.muted }}>
          <Printer size={13} /> Imprimir
        </button>
      </div>

      {/* Encabezado con logo */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: 90, background: `linear-gradient(135deg, ${C.dark} 0%, ${C.primary} 60%, ${C.primary}99 100%)`, borderRadius: '0 0 12px 12px', marginBottom: '-28px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, padding: '0 8px 16px' }}>
            <LogoEditable
              bucket="logos-arrendatarios" prefijo="arrendatarios"
              tabla="arrendatarios" columna="logo_url"
              registroId={exp.arrendatario_id} url={logoUrl}
              nombre={exp.nombre_completo} size={72} redondo={false}
              onSubido={setLogoUrl}
            />
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: -20, marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,.35)' }}>{exp.nombre_completo}</h1>
                <Badge label={exp.tipo_persona === 'MORAL' ? 'Persona moral' : 'Persona física'} color={C.primary} bg={C.surface} />
              </div>
              <div style={{ fontSize: 14, color: C.primary, fontWeight: 600 }}>
                {exp.giro_autorizado || 'Sin giro registrado'}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{[exp.inmueble_nombre, exp.numero_local].filter(Boolean).join(' · ') || 'Sin local'}</span>
                {exp.email && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} />{exp.email}</span>}
                {exp.telefono && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} />{exp.telefono}</span>}
                <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Hash size={12} />{exp.rfc || 'Sin RFC'}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingBottom: 4 }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 700 }}>Renta mensual</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{fmt$(exp.renta_mensual)}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderTop: `1px solid ${C.border}`, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '11px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? `2.5px solid ${C.primary}` : '2.5px solid transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.primary : C.muted, whiteSpace: 'nowrap' }}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 20 }}>

          {tab === 'resumen' && (
            <>
              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                  {[
                    ['Total pagado',     fmt$(totalPagado),      C.success],
                    ['Saldo pendiente',  fmt$(saldoPendiente),   saldoPendiente > 0 ? C.warning : C.muted],
                    ['Cobros en mora',   String(morosos.length), morosos.length ? C.danger : C.success],
                    ['Depósito',         fmt$(exp.deposito_garantia), C.primary],
                  ].map(([l, v, col]) => (
                    <div key={l} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.5px' }}>{l}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: col, marginTop: 4 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {morosos.length > 0 && (
                <Card>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px' }}>
                    <AlertTriangle size={16} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: '#991B1B' }}>
                      <strong>{morosos.length} cobro{morosos.length !== 1 ? 's' : ''} vencido{morosos.length !== 1 ? 's' : ''}</strong> — el más antiguo del {fmtD(morosos[morosos.length - 1]?.fecha_limite_pago)}.
                      Penalización pactada: {exp.penalizacion_mora_pct ?? 0}% mensual.
                    </div>
                  </div>
                </Card>
              )}

              <Card>
                <Section title="Datos del contrato" icon={FileText} action={
                  <button onClick={() => setTab('contrato')} style={{ fontSize: 11, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todo</button>
                }>
                  <Grid4>
                    <Campo label="Vigencia" value={`${fmtD(exp.fecha_inicio)} — ${fmtD(exp.fecha_fin)}`} />
                    <Campo label="Tipo de contrato" value={exp.tipo_contrato} />
                    <Campo label="Local" value={[exp.numero_local, exp.metros_cuadrados && `${exp.metros_cuadrados} m²`].filter(Boolean).join(' · ')} />
                    <Campo label="Día límite de pago" value={exp.dia_limite_pago ? `Día ${exp.dia_limite_pago}` : '—'} />
                  </Grid4>
                </Section>
              </Card>

              <Card>
                <Section title="Últimos pagos" icon={CreditCard} action={
                  <button onClick={() => setTab('pagos')} style={{ fontSize: 11, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todos</button>
                }>
                  {cobros.length === 0 ? <Empty msg="Sin cobros registrados" /> : <TablaPagos rows={cobros.slice(0, 5)} enMora={enMora} />}
                </Section>
              </Card>
            </>
          )}

          {tab === 'contrato' && (
            <Card>
              <div style={{ display: 'grid', gap: 24 }}>
                <Section title="Vigencia y condiciones" icon={Calendar}>
                  <Grid4>
                    <Campo label="Fecha de inicio" value={fmtD(exp.fecha_inicio)} />
                    <Campo label="Fecha de fin" value={fmtD(exp.fecha_fin)} />
                    <Campo label="Folio" value={exp.folio} mono />
                    <Campo label="Tipo de contrato" value={exp.tipo_contrato} />
                    <Campo label="Estatus" value={exp.contrato_estatus} />
                    <Campo label="Renta mensual" value={fmt$(exp.renta_mensual)} />
                    <Campo label="Depósito en garantía" value={fmt$(exp.deposito_garantia)} />
                    <Campo label="Día límite de pago" value={exp.dia_limite_pago ? `Día ${exp.dia_limite_pago}` : '—'} />
                    <Campo label="Penalización por mora" value={exp.penalizacion_mora_pct != null ? `${exp.penalizacion_mora_pct}% mensual` : '—'} />
                  </Grid4>
                </Section>

                <Section title="Local arrendado" icon={Building2}>
                  <Grid4>
                    <Campo label="Inmueble" value={exp.inmueble_nombre} />
                    <Campo label="Local" value={exp.numero_local} />
                    <Campo label="Tipo de unidad" value={exp.tipo_unidad} />
                    <Campo label="Metros cuadrados" value={exp.metros_cuadrados ? `${exp.metros_cuadrados} m²` : '—'} />
                    <Campo label="Giro autorizado" value={exp.giro_autorizado} />
                  </Grid4>
                </Section>

                <Section title="Arrendatario" icon={Shield}>
                  <Grid4>
                    <Campo label="Nombre / Razón social" value={exp.nombre_completo} />
                    <Campo label="Tipo de persona" value={exp.tipo_persona} />
                    <Campo label="RFC" value={exp.rfc} mono />
                    <Campo label="Email" value={exp.email} />
                    <Campo label="Teléfono" value={exp.telefono} />
                    <Campo label="WhatsApp" value={exp.whatsapp} />
                    <Campo label="Domicilio" value={exp.domicilio} />
                    <Campo label="Alta" value={fmtD(exp.alta_fecha)} />
                  </Grid4>
                </Section>

                <Section title="Fiador y datos de pago" icon={CreditCard}>
                  <Grid4>
                    <Campo label="Fiador" value={exp.fiador_nombre} />
                    <Campo label="RFC del fiador" value={exp.fiador_rfc} mono />
                    <Campo label="Cuenta de pago" value={exp.cuenta_banco_pago} mono />
                    <Campo label="CLABE" value={exp.clabe_interbancaria} mono />
                  </Grid4>
                </Section>

                {exp.archivo_contrato_url && (
                  <Section title="Contrato firmado" icon={FileText}>
                    <EnlacePrivado bucket="contratos-firmados" valor={exp.archivo_contrato_url}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: C.primary, color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                      <Download size={14} /> Ver contrato (PDF)
                    </EnlacePrivado>
                  </Section>
                )}
              </div>
            </Card>
          )}

          {tab === 'pagos' && (
            <Card>
              <Section title={`Historial de pagos (${cobros.length})`} icon={CreditCard}>
                {cobros.length === 0
                  ? <Empty msg="Sin cobros registrados para este contrato" />
                  : <TablaPagos rows={cobros} enMora={enMora} onSubir={c => setModalCobro(c)} />}
              </Section>
            </Card>
          )}

          {tab === 'documentos' && (
            <Card>
              <Section title="Documentos del expediente" icon={Shield}>
                <div style={{ background: C.light, borderRadius: 10, padding: '14px 18px', marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                    Documentos requeridos ({docsOk}/{DOCS_REQUERIDOS.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                    {DOCS_REQUERIDOS.map(([tipo, label]) => {
                      const tiene = docs.some(d => d.tipo_doc === tipo)
                      return (
                        <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: tiene ? C.success : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {tiene && <CheckCircle size={10} color="#fff" />}
                          </div>
                          <span style={{ color: tiene ? C.text : C.muted }}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {docs.length === 0 ? <Empty msg="Sin documentos cargados" /> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {docs.map(d => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.light }}>
                        <FileText size={18} color={C.primary} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{d.nombre_archivo || d.tipo_doc}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{d.tipo_doc}</div>
                        </div>
                        <Badge label={d.estatus} color={d.estatus === 'APROBADO' ? C.success : d.estatus === 'RECHAZADO' ? C.danger : C.warning} />
                        {d.url && (
                          <EnlacePrivado bucket="expedientes-docs" valor={d.url}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, fontSize: 12, color: C.primary, textDecoration: 'none' }}>
                            <Download size={13} /> Abrir
                          </EnlacePrivado>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </Card>
          )}
        </div>

        {/* Columna lateral */}
        <div style={{ display: 'grid', gap: 16 }}>
          <Card padding="16px">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Expediente</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 52, height: 52 }}>
                <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="26" cy="26" r="22" fill="none" stroke={C.border} strokeWidth="5" />
                  <circle cx="26" cy="26" r="22" fill="none" stroke={pctDocs === 100 ? C.success : C.gold} strokeWidth="5"
                    strokeDasharray={`${pctDocs * 1.382} 999`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.text }}>{pctDocs}%</div>
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {docsOk} de {DOCS_REQUERIDOS.length} documentos
              </div>
            </div>
          </Card>

          {pendientes.length > 0 && (
            <Card padding="16px">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Pagos pendientes</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {pendientes.slice(0, 5).map(c => (
                  <div key={c.id} style={{ border: `1px solid ${enMora(c) ? '#FECACA' : C.border}`, background: enMora(c) ? '#FEF2F2' : C.light, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{MESES[c.mes]} {c.anio}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: enMora(c) ? C.danger : C.text }}>{fmt$(c.monto_total)}</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      Vence {fmtD(c.fecha_limite_pago)}{enMora(c) ? ' · vencido' : ''}
                    </div>
                    <button onClick={() => setModalCobro(c)}
                      style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px', border: 'none', borderRadius: 6, background: C.primary, color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      <Upload size={12} /> Subir comprobante
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {modalCobro && (
        esLocatario ? (
          <ModalSubirComprobanteLocatario
            cobro={modalCobro}
            contratoId={exp.contrato_id}
            onClose={() => setModalCobro(null)}
            onSaved={reload}
          />
        ) : (
          <IngresoModal
            contratoFijo={exp.contrato_id}
            cargoObjetivo={modalCobro}
            onClose={() => setModalCobro(null)}
            onSaved={reload}
          />
        )
      )}
    </div>
  )
}

// ── Tabla de pagos ───────────────────────────────────────────────────────────
function TablaPagos({ rows, enMora, onSubir }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.light }}>
            {['Período','Referencia','Vence','Monto','Pagado','Estado', ''].map((h, i) => <Th key={i}>{h}</Th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(c => {
            const mora = enMora(c)
            const pagado = c.estatus === 'PAGADO'
            return (
              <tr key={c.id} style={{ borderTop: `1px solid ${C.border}`, background: mora ? '#FEF2F2' : undefined }}>
                <Td bold>{MESES[c.mes]} {c.anio}</Td>
                <Td mono small>{c.referencia_pago || '—'}</Td>
                <Td small>{fmtD(c.fecha_limite_pago)}</Td>
                <Td mono>{fmt$(c.monto_total)}</Td>
                <Td mono>{pagado ? fmt$(c.monto_pagado) : '—'}</Td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge
                    label={pagado ? 'Pagado' : mora ? 'En mora' : 'Pendiente'}
                    color={pagado ? C.success : mora ? C.danger : C.warning}
                  />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {!pagado && onSubir && (
                    <button onClick={() => onSubir(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, cursor: 'pointer', fontSize: 11, color: C.primary, fontWeight: 600 }}>
                      <Upload size={12} /> Comprobante
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
