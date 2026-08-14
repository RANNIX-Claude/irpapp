import { useModuleAudit } from '../hooks/useAudit'
import { useState } from 'react'
import { UserPlus, Plus, Search, Phone, Mail, TrendingUp, Clock, CheckCircle, AlertTriangle, X, Pencil, Trash2 } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ESTATUS_COLOR = {
  NUEVO: '#3B82F6',
  CONTACTADO: '#F59E0B',
  VISITA_AGENDADA: '#8B5CF6',
  PROPUESTA: '#0A66C2',
  APROBADO: '#057642',
  RECHAZADO: '#B24020',
  CONVERTIDO: '#057642',
}

const ESTATUS_OPTS = ['NUEVO','CONTACTADO','VISITA_AGENDADA','PROPUESTA','APROBADO','RECHAZADO']

function ProspectoModal({ prospecto = null, onClose, onSaved }) {
  const [form, setForm] = useState(prospecto ? {
    nombre_completo: prospecto.nombre_completo || '',
    telefono: prospecto.telefono || '',
    email: prospecto.email || '',
    giro_solicitado: prospecto.giro_solicitado || '',
    unidad_interes: prospecto.unidad_interes || '',
    monto_ofertado: prospecto.monto_ofertado != null ? String(prospecto.monto_ofertado) : '',
    estatus: prospecto.estatus || 'NUEVO',
    notas: prospecto.notas || '',
  } : {
    nombre_completo: '', telefono: '', email: '', giro_solicitado: '',
    unidad_interes: '', monto_ofertado: '', estatus: 'NUEVO', notas: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre_completo) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    const payload = {
      nombre_completo: form.nombre_completo.trim(),
      telefono: form.telefono || null,
      email: form.email || null,
      giro_solicitado: form.giro_solicitado || null,
      unidad_interes: form.unidad_interes || null,
      monto_ofertado: form.monto_ofertado ? parseFloat(form.monto_ofertado) : null,
      estatus: form.estatus,
      notas: form.notas || null,
    }
    let error
    if (prospecto) {
      ;({ error } = await supabase.from('prospectos').update(payload).eq('id', prospecto.id))
    } else {
      ;({ error } = await supabase.from('prospectos').insert(payload))
    }
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(prospecto ? 'Prospecto actualizado' : 'Prospecto registrado')
    onSaved(); onClose()
  }

  const inp = (k, type = 'text', placeholder = '') => (
    <input type={type} value={form[k]} placeholder={placeholder}
      onChange={e => set(k, e.target.value)}
      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
  )
  const lbl = (text) => <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{text}</label>

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', background: 'var(--color-primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>{prospecto ? 'Editar Prospecto' : 'Nuevo Prospecto'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 18px' }}>
            <div style={{ gridColumn: '1/-1' }}>{lbl('Nombre completo *')}{inp('nombre_completo')}</div>
            <div>{lbl('Teléfono')}{inp('telefono', 'tel')}</div>
            <div>{lbl('Email')}{inp('email', 'email')}</div>
            <div>{lbl('Giro solicitado')}{inp('giro_solicitado', 'text', 'Ej: Restaurante, Farmacia...')}</div>
            <div>{lbl('Unidad de interés')}{inp('unidad_interes', 'text', 'Ej: L05')}</div>
            <div>{lbl('Renta ofertada')}{inp('monto_ofertado', 'number', '0.00')}</div>
            <div>
              {lbl('Estatus')}
              <select value={form.estatus} onChange={e => set('estatus', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }}>
                {ESTATUS_OPTS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              {lbl('Notas')}
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ padding: '9px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando...' : prospecto ? 'Guardar cambios' : 'Registrar prospecto'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EstatusBadge({ estatus }) {
  const color = ESTATUS_COLOR[estatus] || '#6B7280'
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: color + '20', color }}>
      {estatus?.replace(/_/g, ' ') || 'NUEVO'}
    </span>
  )
}

function ProspectoCard({ p, onEdit, onDelete }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.nombre_completo}</div>
          {p.giro_solicitado && <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '2px' }}>{p.giro_solicitado}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
          <EstatusBadge estatus={p.estatus} />
          <button onClick={() => onEdit(p)} style={{ padding: '4px 6px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Pencil size={12} /></button>
          <button onClick={() => onDelete(p)} style={{ padding: '4px 6px', background: '#FEF2F2', color: '#B91C1C', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Trash2 size={12} /></button>
        </div>
      </div>
      {(p.inmueble_nombre || p.unidad_interes) && (
        <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>
          {p.inmueble_nombre} {p.unidad_interes ? `· ${p.unidad_interes}` : ''}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {p.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}><Phone size={12} />{p.telefono}</div>}
        {p.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}><Mail size={12} />{p.email}</div>}
      </div>
      {p.monto_ofertado > 0 && (
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Renta ofertada</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-success)' }}>${parseFloat(p.monto_ofertado).toLocaleString()}</span>
        </div>
      )}
      {p.fecha_visita && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={11} /> Visita: {p.fecha_visita}
        </div>
      )}
    </div>
  )
}

export default function Prospectos() {
  useModuleAudit('PROSPECTOS')
  const [search, setSearch] = useState('')
  const [filtroEst, setFiltroEst] = useState('Todos')
  const [modalData, setModalData] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading } = usePRP('prp_prospectos', { order: { col: 'created_at', asc: false }, refreshKey })

  const lista = data ?? []
  const activos = lista.filter(p => !['RECHAZADO','CONVERTIDO'].includes(p.estatus)).length
  const convertidos = lista.filter(p => p.estatus === 'CONVERTIDO').length
  const rechazados = lista.filter(p => p.estatus === 'RECHAZADO').length

  const eliminar = async (p) => {
    const { error } = await supabase.from('prospectos').delete().eq('id', p.id)
    if (error) { toast.error(error.message); return }
    toast.success('Prospecto eliminado')
    setConfirmDel(null)
    setRefreshKey(k => k + 1)
  }

  const filtrados = lista.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || (p.nombre_completo || '').toLowerCase().includes(q)
      || (p.giro_solicitado || '').toLowerCase().includes(q)
      || (p.unidad_interes || '').toLowerCase().includes(q)
    const matchE = filtroEst === 'Todos' || p.estatus === filtroEst
    return matchQ && matchE
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Prospectos y CRM</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{lista.length} prospectos registrados</p>
        </div>
        <button onClick={() => setModalData('nuevo')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo Prospecto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Total" value={lista.length} icon={UserPlus} color="var(--color-primary)" />
        <KPICard title="En Proceso" value={activos} icon={Clock} color="var(--color-warning)" />
        <KPICard title="Convertidos" value={convertidos} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Rechazados" value={rechazados} icon={AlertTriangle} color="var(--color-danger)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, giro, unidad..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        {['Todos','NUEVO','CONTACTADO','PROPUESTA','APROBADO','RECHAZADO'].map(e => (
          <button key={e} onClick={() => setFiltroEst(e)} style={{
            padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
            borderColor: filtroEst === e ? 'var(--color-primary)' : '#E5E7EB',
            background: filtroEst === e ? 'var(--color-primary)' : 'white',
            color: filtroEst === e ? 'white' : 'var(--color-text-light)',
          }}>{e.replace(/_/g,' ')}</button>
        ))}
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
        : filtrados.length === 0
        ? <EmptyState title="Sin prospectos" description="No hay prospectos registrados aún." />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {filtrados.map(p => <ProspectoCard key={p.id} p={p} onEdit={p => setModalData(p)} onDelete={p => setConfirmDel(p)} />)}
          </div>
      }
      {modalData && (
        <ProspectoModal
          prospecto={modalData === 'nuevo' ? null : modalData}
          onClose={() => setModalData(null)}
          onSaved={() => { setRefreshKey(k => k + 1); setModalData(null) }}
        />
      )}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setConfirmDel(null)}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', maxWidth: '400px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>¿Eliminar prospecto?</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '20px' }}>
              {confirmDel.nombre_completo} {confirmDel.giro_solicitado ? `· ${confirmDel.giro_solicitado}` : ''}
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
