import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect } from 'react'
import { Wallet, Plus, CheckCircle, AlertTriangle, Receipt, X, TrendingDown, List, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import TicketModal from '../components/ui/TicketModal'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

const RUBROS = [
  { clave: 'LIMPIEZA',   label: 'Limpieza y aseo',        emoji: '🧹' },
  { clave: 'VENDING',    label: 'Reposición vending',      emoji: '🥤' },
  { clave: 'SERVICIOS',  label: 'Servicios',               emoji: '📡' },
  { clave: 'COMPRAS',    label: 'Compras operativas',       emoji: '🛒' },
  { clave: 'PAPELERIA',  label: 'Papelería',               emoji: '📄' },
  { clave: 'FERRETERIA', label: 'Ferretería',              emoji: '🔧' },
  { clave: 'MEDICO',     label: 'Gastos médicos',          emoji: '🏥' },
  { clave: 'BANCARIOS',  label: 'Comisiones bancarias',    emoji: '🏦' },
  { clave: 'OTROS',      label: 'Otros gastos',            emoji: '📦' },
]

function fmt(n) {
  return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
}

function BarraFondo({ gastado, base }) {
  const pct = Math.min(100, Math.round((gastado / base) * 100))
  const color = pct >= 90 ? 'var(--color-danger)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-success)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Gastado {pct}%</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color }}>{fmt(gastado)} / {fmt(base)}</span>
      </div>
      <div style={{ height: '10px', background: '#E5E7EB', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

const PROVEEDORES_FRECUENTES = ['Dogo','Sam\'s Club','Home Depot','Office Depot','Oxxo','Amazon','Comex','Los Canarios','Waldo\'s','Walmart','Chedraui','Costco','Liverpool','Ferretería Moriyama']

function GastoModal({ gasto = null, fondo, onClose, onSaved }) {
  const hoy = new Date().toISOString().split('T')[0]
  // lunes de esta semana
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const lunes = d.toISOString().split('T')[0]

  const [form, setForm] = useState(gasto ? {
    fecha: gasto.fecha || hoy,
    grupo_clave: gasto.grupo_clave || 'LIMPIEZA',
    proveedor_nombre: gasto.proveedor_nombre || '',
    descripcion: gasto.descripcion || '',
    monto_pagado: gasto.monto_pagado != null ? String(gasto.monto_pagado) : '',
    monto_comprobante: gasto.monto_comprobante != null ? String(gasto.monto_comprobante) : '',
    tiene_factura: gasto.tiene_factura || false,
  } : {
    fecha: hoy,
    grupo_clave: 'LIMPIEZA',
    proveedor_nombre: '',
    descripcion: '',
    monto_pagado: '',
    monto_comprobante: '',
    tiene_factura: false,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.monto_pagado) { setErr('El monto pagado es obligatorio'); return }
    setSaving(true); setErr(null)
    try {
      const rubro = RUBROS.find(r => r.clave === form.grupo_clave) || RUBROS[0]
      const dt = new Date(form.fecha + 'T12:00:00')
      const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
      const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
      const payload = {
        fecha: form.fecha,
        proveedor: form.proveedor_nombre || null,
        grupo_gasto: rubro.label,
        descripcion: form.descripcion || null,
        cantidad: parseFloat(form.monto_pagado),
        anio: dt.getFullYear(),
        mes: MESES[dt.getMonth()],
        dia_semana: DIAS[dt.getDay()],
        semana: `S${Math.ceil(dt.getDate() / 7)}`,
      }
      let error
      if (gasto) {
        ;({ error } = await supabase.from('gastos_operativos').update(payload).eq('id', gasto.id))
      } else {
        ;({ error } = await supabase.from('gastos_operativos').insert(payload))
      }
      if (error) throw error
      onSaved()
      onClose()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }} />
        </div>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{gasto ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-light)' }}>Semana {lunes}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
        </div>

        <form onSubmit={guardar} style={{ padding: '20px', display: 'grid', gap: '16px' }}>
          {err && <div style={{ padding: '10px 14px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px' }}>{err}</div>}

          {/* Selector de rubro — grid de botones */}
          <div>
            <label style={lbl}>Rubro *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {RUBROS.map(r => (
                <button key={r.clave} type="button" onClick={() => set('grupo_clave', r.clave)}
                  style={{
                    padding: '10px 6px', borderRadius: '10px', border: '2px solid',
                    borderColor: form.grupo_clave === r.clave ? 'var(--color-primary)' : '#E5E7EB',
                    background: form.grupo_clave === r.clave ? 'var(--color-primary)10' : 'white',
                    cursor: 'pointer', textAlign: 'center',
                  }}>
                  <div style={{ fontSize: '20px' }}>{r.emoji}</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: form.grupo_clave === r.clave ? 'var(--color-primary)' : 'var(--color-text-light)', marginTop: '4px', lineHeight: 1.2 }}>{r.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Proveedor / Lugar</label>
              <input value={form.proveedor_nombre} onChange={e => set('proveedor_nombre', e.target.value)}
                placeholder="Escribe o elige proveedor..." style={inp} list="prov-fondo-list" autoComplete="off" />
              <datalist id="prov-fondo-list">
                {PROVEEDORES_FRECUENTES.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Descripción *</label>
              <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="¿Qué se compró o pagó?" style={inp} required />
            </div>
            <div>
              <label style={lbl}>Monto pagado *</label>
              <input type="number" value={form.monto_pagado} onChange={e => set('monto_pagado', e.target.value)}
                placeholder="0.00" style={inp} step="0.01" min="0" required />
            </div>
            <div>
              <label style={lbl}>Monto comprobante</label>
              <input type="number" value={form.monto_comprobante} onChange={e => set('monto_comprobante', e.target.value)}
                placeholder={form.monto_pagado || '0.00'} style={inp} step="0.01" min="0" />
            </div>
            <div>
              <label style={lbl}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
              <input type="checkbox" id="factura" checked={form.tiene_factura} onChange={e => set('tiene_factura', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="factura" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Tiene factura</label>
            </div>
          </div>

          <button type="submit" disabled={saving} style={{
            padding: '14px', background: saving ? '#9CA3AF' : 'var(--color-primary)',
            color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800,
            fontSize: '15px', cursor: saving ? 'default' : 'pointer',
          }}>
            {saving ? 'Guardando...' : gasto ? 'Guardar cambios' : '+ Registrar Gasto'}
          </button>
        </form>
      </div>
    </div>
  )
}

function GastoRow({ g, onEdit, onDelete }) {
  const diff = (parseFloat(g.monto_comprobante) || 0) - (parseFloat(g.monto_pagado) || 0)
  const rubro = RUBROS.find(r => r.clave === g.grupo_clave) || { emoji: '📦', label: g.grupo_nombre }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ fontSize: '22px', flexShrink: 0 }}>{rubro.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.descripcion}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
          {rubro.label} {g.proveedor_nombre ? `· ${g.proveedor_nombre}` : ''} · {g.fecha}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '14px' }}>{fmt(g.monto_pagado)}</div>
        {Math.abs(diff) > 0.01 && (
          <div style={{ fontSize: '11px', color: diff > 0 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
            comprobante {fmt(g.monto_comprobante)}
          </div>
        )}
        {g.tiene_factura && <div style={{ fontSize: '10px', color: 'var(--color-success)' }}>✓ Factura</div>}
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button onClick={() => onEdit(g)} style={{ padding: '5px 7px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Pencil size={13} /></button>
        <button onClick={() => onDelete(g)} style={{ padding: '5px 7px', background: '#FEF2F2', color: '#B91C1C', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

export default function FondoRevolvente() {
  useModuleAudit('FONDO_REVOLVENTE')
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [vista, setVista] = useState('semana') // 'semana' | 'rubros'

  const { data: fondo, loading: fLoading } = usePRP('prp_fondo_semana')
  const { data: gastos, loading: gLoading } = usePRP('prp_gastos', {
    order: { col: 'fecha', asc: false },
  })
  const f = fondo?.[0]
  const gastadoSemana = parseFloat(f?.gastado_semana) || 0
  const base = parseFloat(f?.monto_base) || 20000
  const disponible = base - gastadoSemana

  // Lunes de esta semana
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const lunesISO = d.toISOString().split('T')[0]

  const gastosSemana = (gastos ?? []).filter(g => g.semana_inicio === lunesISO)

  // Totales por rubro
  const porRubro = RUBROS.map(r => ({
    ...r,
    total: gastosSemana.filter(g => g.grupo_clave === r.clave).reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0),
  })).filter(r => r.total > 0).sort((a, b) => b.total - a.total)

  const eliminar = async (g) => {
    const { error } = await supabase.from('gastos_operativos').delete().eq('id', g.id)
    if (error) { toast.error(error.message); return }
    toast.success('Gasto eliminado')
    setConfirmDel(null)
    setRefreshKey(k => k + 1)
  }

  if (fLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><LoadingSpinner /></div>

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 2px' }}>Fondo Revolvente</h1>
          <p style={{ fontSize: '12px', color: 'var(--color-text-light)', margin: 0 }}>
            {f?.nombre || 'Plaza IWOL'} · Semana {lunesISO}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--color-primary)', color: 'white', border: 'none',
          borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Gasto
        </button>
      </div>

      {/* Estado del fondo */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Disponible</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: disponible >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{fmt(disponible)}</div>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Gastado</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-danger)' }}>{fmt(gastadoSemana)}</div>
          </div>
        </div>
        <BarraFondo gastado={gastadoSemana} base={base} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['semana','Lista de gastos'], ['rubros','Por rubro']].map(([v, l]) => (
          <button key={v} onClick={() => setVista(v)} style={{
            flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '2px solid',
            borderColor: vista === v ? 'var(--color-primary)' : '#E5E7EB',
            background: vista === v ? 'var(--color-primary)' : 'white',
            color: vista === v ? 'white' : 'var(--color-text-light)',
          }}>{l}</button>
        ))}
      </div>

      {/* Contenido */}
      {gLoading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><LoadingSpinner /></div>
        : vista === 'semana'
          ? gastosSemana.length === 0
            ? <EmptyState title="Sin gastos esta semana" description="Toca '+Gasto' para registrar el primer gasto de la semana." />
            : <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', padding: '0 16px' }}>
                {gastosSemana.map(g => <GastoRow key={g.id} g={g} onEdit={g => setModalData(g)} onDelete={g => setConfirmDel(g)} />)}
                <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Total semana</span>
                  <span style={{ color: 'var(--color-danger)' }}>{fmt(gastadoSemana)}</span>
                </div>
              </div>
          : porRubro.length === 0
            ? <EmptyState title="Sin gastos esta semana" description="Aún no hay gastos registrados." />
            : <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                {porRubro.map(r => (
                  <div key={r.clave} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: '22px' }}>{r.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.label}</div>
                      <div style={{ height: '4px', background: '#F3F4F6', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((r.total / gastadoSemana) * 100)}%`, background: 'var(--color-primary)', borderRadius: '2px' }} />
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{fmt(r.total)}</div>
                  </div>
                ))}
              </div>
      }

      {showModal && (
        <TicketModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setRefreshKey(k => k + 1); setShowModal(false) }}
        />
      )}
      {modalData && (
        <TicketModal
          gasto={modalData}
          onClose={() => setModalData(null)}
          onSaved={() => { setRefreshKey(k => k + 1); setModalData(null) }}
        />
      )}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setConfirmDel(null)}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', maxWidth: '400px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>¿Eliminar gasto?</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '20px' }}>
              {confirmDel.descripcion} · {confirmDel.fecha} · {fmt(confirmDel.monto_pagado)}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding: '9px 18px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDel)} style={{ padding: '9px 18px', background: '#B91C1C', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
