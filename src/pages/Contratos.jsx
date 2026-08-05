import { useState } from 'react'
import { FileText, Plus, Search, AlertTriangle, CheckCircle, Clock, TrendingUp, X } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

function diasLabel(dias) {
  if (dias === null || dias === undefined) return { texto: 'Tiempo indeterminado', color: 'var(--color-text-light)' }
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)} días`, color: 'var(--color-danger)' }
  if (dias <= 30) return { texto: `Vence en ${dias} días`, color: 'var(--color-danger)' }
  if (dias <= 60) return { texto: `Vence en ${dias} días`, color: 'var(--color-warning)' }
  return { texto: `${dias} días restantes`, color: 'var(--color-success)' }
}

function ContratoRow({ c, onClick }) {
  const { texto, color } = diasLabel(c.dias_restantes)
  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => onClick(c)}
    >
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>{c.folio}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.tipo_contrato}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.inmueble_nombre}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Unidad {c.unidad_numero}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.arrendatario_nombre}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{c.arrendatario_rfc}</div>
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>${parseFloat(c.renta_mensual).toLocaleString()}</div>
        {c.deposito_garantia && <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Dep. ${parseFloat(c.deposito_garantia).toLocaleString()}</div>}
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '12px' }}>{c.fecha_inicio}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{c.fecha_fin ?? 'Indeterminado'}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color }}>{texto}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <StatusBadge status={c.estado_id} />
      </td>
    </tr>
  )
}

function DetalleModal({ contrato: c, onClose }) {
  if (!c) return null
  const { texto, color } = diasLabel(c.dias_restantes)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Contrato</div>
            <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{c.folio}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
          <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusBadge status={c.estado_id} />
            <span style={{ fontSize: '13px', fontWeight: 600, color }}>{texto}</span>
          </div>
          {[
            ['Folio', c.folio], ['Inmueble', c.inmueble_nombre], ['Unidad', c.unidad_numero],
            ['Tipo', c.tipo_contrato], ['Arrendatario', c.arrendatario_nombre], ['RFC', c.arrendatario_rfc],
            ['Renta mensual', `$${parseFloat(c.renta_mensual).toLocaleString()}`],
            ['Cuota mantenimiento', c.cuota_mant ? `$${parseFloat(c.cuota_mant).toLocaleString()}` : '$0'],
            ['Depósito en garantía', c.deposito_garantia ? `$${parseFloat(c.deposito_garantia).toLocaleString()} (2 meses)` : 'N/A'],
            ['Inicio', c.fecha_inicio], ['Vencimiento', c.fecha_fin ?? 'Tiempo indeterminado'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '8px' }}>
            {['Renovar contrato', 'Generar addenda', 'Ver cobranza', 'Cancelar contrato'].map((label, i) => (
              <button key={label} style={{ padding: '8px 16px', background: ['var(--color-primary)','var(--color-secondary)','var(--color-success)','var(--color-danger)'][i], color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function NuevoContratoModal({ onClose, onCreated }) {
  const { data: arrendatarios } = usePRP('prp_arrendatarios', { order: { col: 'nombre_razon_social' }, filters: [['estado_id', 'eq', 'ACTIVO']] })
  const { data: unidades } = usePRP('prp_unidades', { filters: [['estado_id', 'eq', 'DISPONIBLE']], order: { col: 'numero_local' } })

  const [form, setForm] = useState({
    arrendatario_id: '', unidad_id: '', tipo_contrato: 'ANUAL',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '', renta_mensual: '', cuota_mant: '0', deposito_garantia: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.arrendatario_id || !form.unidad_id || !form.fecha_inicio || !form.renta_mensual) {
      setError('Completa los campos obligatorios: arrendatario, unidad, fecha inicio y renta.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: res, error: err } = await supabase.rpc('crear_contrato', {
        p_arrendatario_id: form.arrendatario_id,
        p_unidad_id: form.unidad_id,
        p_tipo_contrato: form.tipo_contrato,
        p_fecha_inicio: form.fecha_inicio,
        p_fecha_fin: form.fecha_fin || null,
        p_renta_mensual: parseFloat(form.renta_mensual),
        p_cuota_mant: parseFloat(form.cuota_mant) || 0,
        p_deposito_garantia: parseFloat(form.deposito_garantia) || parseFloat(form.renta_mensual) * 2,
      })
      if (err) throw err
      setSuccess(`Contrato ${res.folio} creado exitosamente.`)
      setTimeout(() => { onCreated?.(); onClose() }, 1800)
    } catch (err) {
      setError(err.message || 'Error al crear el contrato.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-light)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>Nuevo Contrato</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-light)' }}>Folio generado automáticamente</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={20} /></button>
        </div>

        {success ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-success)' }}>{success}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'grid', gap: '16px' }}>
            {error && <div style={{ padding: '10px 14px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Arrendatario *</label>
                <select value={form.arrendatario_id} onChange={e => set('arrendatario_id', e.target.value)} style={inputStyle} required>
                  <option value="">— Seleccionar —</option>
                  {(arrendatarios ?? []).map(a => <option key={a.id} value={a.id}>{a.nombre_razon_social} ({a.rfc})</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Unidad disponible *</label>
                <select value={form.unidad_id} onChange={e => set('unidad_id', e.target.value)} style={inputStyle} required>
                  <option value="">— Seleccionar —</option>
                  {(unidades ?? []).map(u => <option key={u.id} value={u.id}>{u.inmueble_nombre} — {u.numero_local} ({u.tipo_unidad}, {u.m2_totales}m²)</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Tipo de contrato</label>
                <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)} style={inputStyle}>
                  {[['ANUAL','Contrato anual'],['SEMESTRAL','Contrato semestral'],['MENSUAL','Contrato mensual'],['EVENTUAL','Contrato eventual/evento']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Renta mensual (MXN) *</label>
                <input type="number" value={form.renta_mensual} onChange={e => set('renta_mensual', e.target.value)} placeholder="Ej. 15000" style={inputStyle} required min="1" step="0.01" />
              </div>

              <div>
                <label style={labelStyle}>Cuota mantenimiento</label>
                <input type="number" value={form.cuota_mant} onChange={e => set('cuota_mant', e.target.value)} placeholder="0" style={inputStyle} min="0" step="0.01" />
              </div>

              <div>
                <label style={labelStyle}>Depósito en garantía (2 meses auto)</label>
                <input type="number" value={form.deposito_garantia} onChange={e => set('deposito_garantia', e.target.value)} placeholder={form.renta_mensual ? String(parseFloat(form.renta_mensual) * 2) : '0'} style={inputStyle} min="0" step="0.01" />
              </div>

              <div>
                <label style={labelStyle}>Fecha inicio *</label>
                <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>Fecha fin (vacío = indeterminado)</label>
                <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} style={inputStyle} min={form.fecha_inicio} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px', background: saving ? '#9CA3AF' : 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Creando...' : 'Crear Contrato'}
              </button>
              <button type="button" onClick={onClose} style={{ padding: '11px 20px', background: '#F3F4F6', color: 'var(--color-text)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Contratos() {
  const [search, setSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [selected, setSelected] = useState(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading } = usePRP('prp_contratos', { order: { col: 'fecha_inicio', asc: false } })

  const lista = data ?? []
  const ESTADOS = ['Todos', 'VIGENTE', 'VENCIDO', 'EN_MORA', 'EN_PROCESO', 'CANCELADO']

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase()
    const match = !q || (c.folio || '').toLowerCase().includes(q) || (c.arrendatario_nombre || '').toLowerCase().includes(q) || (c.inmueble_nombre || '').toLowerCase().includes(q)
    const estado = estadoFiltro === 'Todos' || c.estado_id === estadoFiltro
    return match && estado
  })

  const vigentes = lista.filter(c => c.estado_id === 'VIGENTE').length
  const vencidos = lista.filter(c => c.estado_id === 'VENCIDO').length
  const mora = lista.filter(c => c.estado_id === 'EN_MORA').length
  const porVencer = lista.filter(c => c.dias_restantes > 0 && c.dias_restantes <= 60).length
  const rentaTotal = lista.filter(c => c.estado_id === 'VIGENTE').reduce((a, b) => a + (parseFloat(b.renta_mensual) || 0), 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>Contratos de Arrendamiento</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{lista.length} contratos registrados</p>
        </div>
        <button onClick={() => setShowNuevo(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo Contrato
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Vigentes" value={vigentes} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Vencidos" value={vencidos} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="En Mora" value={mora} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Por Vencer (60d)" value={porVencer} icon={Clock} color="var(--color-warning)" />
        <KPICard title="Renta Mensual" value={`$${(rentaTotal/1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio, arrendatario o inmueble..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ESTADOS.map(e => (
            <button key={e} onClick={() => setEstadoFiltro(e)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: estadoFiltro === e ? 'var(--color-primary)' : '#E5E7EB',
              background: estadoFiltro === e ? 'var(--color-primary)' : 'white',
              color: estadoFiltro === e ? 'white' : 'var(--color-text-light)',
            }}>{e}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
        ) : filtrados.length === 0 ? (
          <EmptyState title="Sin contratos" description="No hay contratos que coincidan con los filtros aplicados." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Contrato', 'Inmueble', 'Arrendatario', 'Renta', 'Vigencia', 'Plazo', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Renta' ? 'right' : 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => <ContratoRow key={c.id} c={c} onClick={setSelected} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DetalleModal contrato={selected} onClose={() => setSelected(null)} />

      {showNuevo && (
        <NuevoContratoModal
          onClose={() => setShowNuevo(false)}
          onCreated={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}
