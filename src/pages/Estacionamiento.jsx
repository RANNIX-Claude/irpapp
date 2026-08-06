import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect } from 'react'
import { Car, Plus, Search, DollarSign, AlertTriangle, CheckCircle, X, Calendar, User, FileText, TrendingUp, ChevronDown } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

const HISTORIAL_DEMO = [
  { fecha_inicio: '2025-02-01', fecha_fin: '2026-02-01', titular: 'Ing. García Ramos', placa: 'MXK-234-A', marca: 'Nissan Sentra', color: 'Gris', monto: 800 },
  { fecha_inicio: '2024-05-15', fecha_fin: '2025-01-31', titular: 'Lic. Soto Medina', placa: 'TBJ-112-B', marca: 'Honda City', color: 'Blanco', monto: 750 },
  { fecha_inicio: '2023-09-01', fecha_fin: '2024-05-14', titular: 'Sr. Ramírez V.', placa: 'BAC-567-C', marca: 'VW Jetta', color: 'Azul', monto: 700 },
]

function NuevaPensionModal({ cajon, onClose }) {
  const [form, setForm] = useState({ titular: '', telefono: '', placa: '', marca: '', color: '', monto: 900 })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const guardar = () => {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Pensión Cajón #${cajon.numero_cajon}</title>
    <style>body{font-family:Arial;padding:32px;max-width:600px;margin:0 auto}h2{color:#0A66C2}table{width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #eee}td:first-child{font-weight:600;color:#666;width:40%}.firma{margin-top:60px;display:flex;gap:80px}.firma-box{flex:1;border-top:1px solid #000;padding-top:8px;font-size:12px;color:#666}</style>
    </head><body>
    <h2>Contrato de Pensión de Estacionamiento</h2>
    <p>Cajón #${cajon.numero_cajon} · Tipo: ${cajon.tipo || 'General'}</p>
    <table>
      <tr><td>Titular</td><td>${form.titular}</td></tr>
      <tr><td>Teléfono</td><td>${form.telefono}</td></tr>
      <tr><td>Placa</td><td>${form.placa}</td></tr>
      <tr><td>Vehículo</td><td>${form.marca} ${form.color}</td></tr>
      <tr><td>Monto mensual</td><td>${fmt(form.monto)}</td></tr>
      <tr><td>Fecha inicio</td><td>${new Date().toLocaleDateString('es-MX')}</td></tr>
    </table>
    <div class="firma">
      <div class="firma-box">Firma del Titular</div>
      <div class="firma-box">Firma del Administrador</div>
    </div>
    </body></html>`)
    win.document.close()
    win.print()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '480px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Nueva Pensión — Cajón #{cajon.numero_cajon}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {[['titular', 'Titular / Nombre'], ['telefono', 'Teléfono'], ['placa', 'Placa del vehículo'], ['marca', 'Marca y modelo'], ['color', 'Color del vehículo']].map(([k, label]) => (
          <div key={k} style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-light)', display: 'block', marginBottom: '4px' }}>{label}</label>
            <input value={form[k]} onChange={set(k)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
          </div>
        ))}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-light)', display: 'block', marginBottom: '4px' }}>Monto mensual</label>
          <input type="number" value={form.monto} onChange={set('monto')} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancelar</button>
          <button onClick={guardar} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Guardar e imprimir</button>
        </div>
      </div>
    </div>
  )
}

function CajonModal({ cajon, onClose, onNuevaPension }) {
  const [tab, setTab] = useState('info')
  const ocupado = cajon.estatus === 'OCUPADO'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '560px', maxWidth: '95vw', maxHeight: '88vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cajon.tipo || 'General'}</div>
            <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800 }}>Cajón #{cajon.numero_cajon}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px',
              background: ocupado ? '#EFF6FF' : '#F0FDF4',
              color: ocupado ? 'var(--color-primary)' : 'var(--color-success)' }}>
              {cajon.estatus}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #F3F4F6', padding: '0 24px' }}>
          {[['info', 'Información'], ['historial', 'Historial']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              color: tab === id ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: tab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {tab === 'info' && (
            ocupado ? (
              <>
                <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'grid', gap: '10px' }}>
                  {[
                    [User, 'Titular', cajon.pension_titular],
                    [Car, 'Vehículo', `${cajon.vehiculo_marca || ''} ${cajon.vehiculo_color || ''}`.trim()],
                    [FileText, 'Placa', cajon.vehiculo_placa],
                    [DollarSign, 'Monto mensual', fmt(cajon.monto_mensual)],
                    [Calendar, 'Vigencia', cajon.fecha_fin_pension ? `Hasta ${cajon.fecha_fin_pension}` : 'Indefinida'],
                  ].filter(([, , v]) => v).map(([Icon, label, val]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <Icon size={14} color="var(--color-text-light)" style={{ flexShrink: 0 }} />
                      <span style={{ color: 'var(--color-text-light)', fontWeight: 600, minWidth: '100px' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
                <button style={{ width: '100%', padding: '10px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '8px', color: 'var(--color-danger)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  Liberar cajón
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Car size={40} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-light)', marginBottom: '20px' }}>Cajón disponible</div>
                <button onClick={() => onNuevaPension(cajon)} style={{ padding: '12px 24px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  + Asignar pensión
                </button>
              </div>
            )
          )}
          {tab === 'historial' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '12px' }}>Historial de ocupación</div>
              {HISTORIAL_DEMO.map((h, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{h.titular}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)' }}>{fmt(h.monto)}/mes</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{h.placa} · {h.marca} {h.color}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '2px' }}>{h.fecha_inicio} → {h.fecha_fin}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CajonCard({ c, onClick }) {
  const ocupado = c.estatus === 'OCUPADO'
  return (
    <div
      onClick={() => onClick(c)}
      style={{
        background: ocupado ? 'var(--color-primary)08' : '#F0FDF4',
        border: `2px solid ${ocupado ? 'var(--color-primary)30' : '#86EFAC'}`,
        borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px',
        cursor: 'pointer', transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 800, fontSize: '16px', color: ocupado ? 'var(--color-primary)' : 'var(--color-success)' }}>
          #{c.numero_cajon}
        </div>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
          background: ocupado ? 'var(--color-primary)20' : '#DCF5DC',
          color: ocupado ? 'var(--color-primary)' : 'var(--color-success)' }}>{c.estatus}</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>{c.tipo || 'General'}</div>
      {ocupado && c.pension_titular && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '8px', marginTop: '2px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.pension_titular}</div>
          {c.vehiculo_placa && <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{c.vehiculo_placa} · {c.vehiculo_marca} {c.vehiculo_color}</div>}
          {c.monto_mensual > 0 && <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 700, marginTop: '4px' }}>{fmt(c.monto_mensual)}/mes</div>}
        </div>
      )}
      <div style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '2px' }}>Ver detalle →</div>
    </div>
  )
}

// ── Captura Diaria de Ingresos ────────────────────────────────────────────────
function CapturaDiaria() {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ fecha: today, cantidad: '', notas: '' })
  const [guardando, setGuardando] = useState(false)
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandMes, setExpandMes] = useState(null)

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('estacionamiento_diario')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(120)
    setRegistros(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.fecha || !form.cantidad) return toast.error('Fecha y monto son obligatorios')
    setGuardando(true)
    const dt = new Date(form.fecha + 'T12:00:00')
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const anio = dt.getFullYear()
    const mes = MESES[dt.getMonth()]
    const dia_semana = DIAS[dt.getDay()]
    const sem = `S${Math.ceil(dt.getDate()/7)}`

    const { error } = await supabase.from('estacionamiento_diario').upsert({
      fecha: form.fecha,
      cantidad: parseFloat(form.cantidad),
      notas: form.notas || null,
      anio, mes, dia_semana, semana: sem
    }, { onConflict: 'fecha' })

    if (error) { toast.error('Error al guardar: ' + error.message) }
    else {
      toast.success('Ingreso registrado')
      setForm({ fecha: today, cantidad: '', notas: '' })
      cargar()
    }
    setGuardando(false)
  }

  // Agrupar por mes para el historial
  const porMes = {}
  registros.forEach(r => {
    const key = `${r.anio || r.fecha?.slice(0,4)}-${r.mes || r.fecha?.slice(5,7)}`
    if (!porMes[key]) porMes[key] = { label: `${r.mes || r.fecha?.slice(5,7)} ${r.anio || r.fecha?.slice(0,4)}`, registros: [], total: 0 }
    porMes[key].registros.push(r)
    porMes[key].total += parseFloat(r.cantidad) || 0
  })
  const meses = Object.entries(porMes).slice(0, 14)
  const totalHistorial = registros.reduce((a, b) => a + (parseFloat(b.cantidad) || 0), 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
      {/* Formulario */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1.5px solid #E5E7EB', padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} color="var(--color-primary)" /> Registrar ingreso del día
        </h3>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '6px' }}>Fecha</label>
          <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '6px' }}>Monto en efectivo ($)</label>
          <input type="number" min="0" step="0.50" value={form.cantidad}
            onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
            placeholder="0.00"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '20px', fontWeight: 700, boxSizing: 'border-box', textAlign: 'right' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '6px' }}>Notas (opcional)</label>
          <input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Ej: día festivo, lluvia..."
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        <button onClick={guardar} disabled={guardando}
          style={{ width: '100%', padding: '12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
          {guardando ? 'Guardando...' : 'Guardar ingreso'}
        </button>
        <p style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '12px', textAlign: 'center' }}>
          Si ya existe un registro para esa fecha, se reemplaza el monto.
        </p>
      </div>

      {/* Historial */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Historial de ingresos</h3>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success)' }}>
            Total: {fmt(totalHistorial)}
          </div>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {meses.map(([key, grupo]) => {
              const open = expandMes === key
              return (
                <div key={key} style={{ background: 'white', borderRadius: '10px', border: '1.5px solid #E5E7EB', overflow: 'hidden' }}>
                  <div onClick={() => setExpandMes(open ? null : key)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ChevronDown size={16} color="var(--color-text-light)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{grupo.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{grupo.registros.length} días registrados</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-success)' }}>{fmt(grupo.total)}</div>
                  </div>
                  {open && (
                    <div style={{ borderTop: '1px solid #F3F4F6', maxHeight: '320px', overflowY: 'auto' }}>
                      {grupo.registros.map(r => (
                        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', padding: '10px 18px', borderBottom: '1px solid #F9FAFB', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.fecha}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{r.dia_semana} {r.semana} {r.notas ? '· ' + r.notas : ''}</div>
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-success)' }}>{fmt(r.cantidad)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Estacionamiento() {
  useModuleAudit('ESTACIONAMIENTO')
  const [mainTab, setMainTab] = useState('cajones')
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [selected, setSelected] = useState(null)
  const [nuevaPension, setNuevaPension] = useState(null)
  const { data, loading } = usePRP('prp_estacionamiento')

  const lista = data ?? []
  const ocupados = lista.filter(c => c.estatus === 'OCUPADO').length
  const disponibles = lista.filter(c => c.estatus === 'DISPONIBLE').length
  const ingresos = lista.filter(c => c.estatus === 'OCUPADO').reduce((a, b) => a + (parseFloat(b.monto_mensual) || 0), 0)

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || (c.pension_titular || '').toLowerCase().includes(q)
      || (c.vehiculo_placa || '').toLowerCase().includes(q)
      || String(c.numero_cajon).includes(q)
    const matchF = filtro === 'Todos' || c.estatus === filtro
    return matchQ && matchF
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Car size={22} color="var(--color-primary)" /> Estacionamiento
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>Pensiones mensuales e ingresos diarios de estacionamiento público</p>
        </div>
        {mainTab === 'cajones' && (
          <button onClick={() => setNuevaPension({ numero_cajon: '—', tipo: 'General', estatus: 'DISPONIBLE' })} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={15} /> Nueva Pensión
          </button>
        )}
      </div>

      {/* Tabs principales */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #E5E7EB', marginBottom: '24px' }}>
        {[['cajones', Car, 'Pensiones / Cajones'], ['diario', TrendingUp, 'Ingreso Diario']].map(([id, Icon, label]) => (
          <button key={id} onClick={() => setMainTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600,
            color: mainTab === id ? 'var(--color-primary)' : 'var(--color-text-light)',
            borderBottom: mainTab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-2px',
          }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {mainTab === 'cajones' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <div onClick={() => setFiltro('OCUPADO')} style={{ cursor: 'pointer' }}><KPICard title="Ocupados" value={ocupados} icon={Car} color="var(--color-primary)" /></div>
            <div onClick={() => setFiltro('DISPONIBLE')} style={{ cursor: 'pointer' }}><KPICard title="Disponibles" value={disponibles} icon={CheckCircle} color="var(--color-success)" /></div>
            <KPICard title="Ocupación" value={lista.length ? `${Math.round(ocupados/lista.length*100)}%` : '0%'} icon={AlertTriangle} color="var(--color-warning)" />
            <KPICard title="Ingresos/mes" value={`$${(ingresos/1000).toFixed(1)}K`} icon={DollarSign} color="var(--color-secondary)" />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por titular, placa o número..."
                style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            {['Todos', 'OCUPADO', 'DISPONIBLE'].map(f => (
              <button key={f} onClick={() => setFiltro(f)} style={{
                padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                borderColor: filtro === f ? 'var(--color-primary)' : '#E5E7EB',
                background: filtro === f ? 'var(--color-primary)' : 'white',
                color: filtro === f ? 'white' : 'var(--color-text-light)',
              }}>{f}</button>
            ))}
          </div>

          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
            : filtrados.length === 0
            ? <EmptyState title="Sin cajones" description="No hay cajones que coincidan con los filtros." />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {filtrados.map(c => <CajonCard key={c.id} c={c} onClick={setSelected} />)}
              </div>
          }
        </>
      )}

      {mainTab === 'diario' && <CapturaDiaria />}

      {selected && (
        <CajonModal
          cajon={selected}
          onClose={() => setSelected(null)}
          onNuevaPension={c => { setSelected(null); setNuevaPension(c) }}
        />
      )}
      {nuevaPension && (
        <NuevaPensionModal cajon={nuevaPension} onClose={() => setNuevaPension(null)} />
      )}
    </div>
  )
}
