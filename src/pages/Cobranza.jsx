import { useState } from 'react'
import { DollarSign, Search, CheckCircle, Clock, AlertTriangle, TrendingUp, Download, RefreshCw, X } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

const MES_NOMBRES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n) { return '$' + (parseFloat(n)||0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

function CobroRow({ c, onSelect }) {
  const vencida = !c.fecha_pago_real && new Date(c.fecha_limite_pago) < new Date()
  const colorEstatus = c.estatus === 'PAGADO' ? 'var(--color-success)' : vencida ? 'var(--color-danger)' : 'var(--color-warning)'
  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => onSelect(c)}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{c.referencia_pago}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{MES_NOMBRES[c.mes]} {c.anio} · Pagaré #{c.pagare_numero}</div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.arrendatario_nombre}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.inmueble_nombre} · {c.unidad_numero}</div>
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{fmt(c.monto_total)}</div>
        {c.monto_mora > 0 && <div style={{ fontSize: '11px', color: 'var(--color-danger)' }}>+{fmt(c.monto_mora)} mora</div>}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '12px' }}>{c.fecha_limite_pago}</div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        {c.fecha_pago_real
          ? <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>{c.fecha_pago_real}</div>
          : <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>—</div>}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: colorEstatus + '20', color: colorEstatus }}>
          {c.estatus}
        </span>
      </td>
    </tr>
  )
}

function PagoModal({ cobro, onClose, onSaved }) {
  const [form, setForm] = useState({ fecha_pago: new Date().toISOString().split('T')[0], monto_pagado: cobro?.monto_total || '', forma_pago: 'TRANSFERENCIA', operacion: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  if (!cobro) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      const { error } = await supabase
        .from('cobros_programados')
        .update({
          estatus: 'PAGADO',
          fecha_pago_real: form.fecha_pago,
          monto_pagado: parseFloat(form.monto_pagado),
          forma_pago: form.forma_pago,
          numero_operacion_banco: form.operacion,
          conciliado: true,
        })
        .eq('id', cobro.id)
        .select()
      if (error) throw error
      onSaved()
      onClose()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Registrar Pago</div>
            <h2 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700 }}>{cobro.referencia_pago}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <form onSubmit={guardar} style={{ padding: '20px 24px', display: 'grid', gap: '14px' }}>
          <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Arrendatario</div><div style={{ fontSize: '13px', fontWeight: 600 }}>{cobro.arrendatario_nombre}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Monto a cobrar</div><div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>{fmt(cobro.monto_total)}</div></div>
          </div>
          {err && <div style={{ padding: '10px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '13px' }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={lbl}>Fecha de pago</label><input type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)} style={inp} required /></div>
            <div><label style={lbl}>Monto recibido</label><input type="number" value={form.monto_pagado} onChange={e => set('monto_pagado', e.target.value)} style={inp} step="0.01" required /></div>
            <div><label style={lbl}>Forma de pago</label>
              <select value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)} style={inp}>
                {['TRANSFERENCIA','EFECTIVO','CHEQUE','DEPOSITO'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div><label style={lbl}>No. Operación / Ref.</label><input type="text" value={form.operacion} onChange={e => set('operacion', e.target.value)} placeholder="Ej. TRF20260801..." style={inp} /></div>
          </div>
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: saving ? '#9CA3AF' : 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Guardando...' : '✓ Confirmar Pago'}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Cobranza() {
  const [search, setSearch] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('Todos')
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1)
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data, loading } = usePRP('prp_cobros', {
    order: { col: 'fecha_limite_pago', asc: true },
  })

  const lista = data ?? []

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || (c.arrendatario_nombre || '').toLowerCase().includes(q)
      || (c.referencia_pago || '').toLowerCase().includes(q)
      || (c.unidad_numero || '').toLowerCase().includes(q)
    const matchEst = filtroEstatus === 'Todos' || c.estatus === filtroEstatus
    const matchMes = mesFiltro === 0 || (c.mes === mesFiltro && c.anio === anioFiltro)
    return matchQ && matchEst && matchMes
  })

  const pagados = lista.filter(c => c.estatus === 'PAGADO').length
  const pendientes = lista.filter(c => c.estatus === 'PENDIENTE').length
  const mora = lista.filter(c => c.estatus === 'EN_MORA').length
  const totalCobrado = lista.filter(c => c.estatus === 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totalPendiente = lista.filter(c => c.estatus !== 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_total) || 0), 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Cobranza y Conciliación</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{lista.length} cobros programados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Pagados" value={pagados} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Pendientes" value={pendientes} icon={Clock} color="var(--color-warning)" />
        <KPICard title="En Mora" value={mora} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Total Cobrado" value={`$${(totalCobrado/1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
        <KPICard title="Por Cobrar" value={`$${(totalPendiente/1000).toFixed(0)}K`} icon={DollarSign} color="var(--color-secondary)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar arrendatario, referencia, unidad..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        <select value={mesFiltro} onChange={e => setMesFiltro(parseInt(e.target.value))}
          style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}>
          <option value={0}>Todos los meses</option>
          {MES_NOMBRES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m} {anioFiltro}</option>)}
        </select>
        <select value={anioFiltro} onChange={e => setAnioFiltro(parseInt(e.target.value))}
          style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}>
          {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['Todos', 'PENDIENTE', 'PAGADO', 'EN_MORA'].map(e => (
            <button key={e} onClick={() => setFiltroEstatus(e)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: filtroEstatus === e ? 'var(--color-primary)' : '#E5E7EB',
              background: filtroEstatus === e ? 'var(--color-primary)' : 'white',
              color: filtroEstatus === e ? 'white' : 'var(--color-text-light)',
            }}>{e}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
          : filtrados.length === 0
          ? <EmptyState title="Sin cobros" description="No hay cobros que coincidan con los filtros." />
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Referencia', 'Arrendatario', 'Total', 'Vence', 'Pagado', 'Estatus'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Total' ? 'right' : 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(c => <CobroRow key={c.id} c={c} onSelect={setSelected} />)}
                </tbody>
              </table>
            </div>
        }
      </div>

      {selected && selected.estatus !== 'PAGADO' && (
        <PagoModal cobro={selected} onClose={() => setSelected(null)} onSaved={() => setRefreshKey(k => k + 1)} />
      )}
    </div>
  )
}
