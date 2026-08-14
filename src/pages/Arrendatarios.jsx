import { useState, useEffect } from 'react'
import { Users, Search, Plus, AlertTriangle, CheckCircle, Edit2, Trash2, Building2, Phone, Mail, X, Save } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { useModuleAudit, logAudit } from '../hooks/useAudit'
import { supabase } from '../lib/supabase'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

// ── Modal Nuevo / Editar ─────────────────────────────────────────────────────
const FORM_INIT = {
  nombre_razon_social: '', rfc: '', tipo_persona: 'FISICA',
  telefono: '', email: '', domicilio: '', activo: true,
}

function ArrendatarioModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial ?? FORM_INIT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const editando = !!initial?.id

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre_razon_social.trim()) return setError('El nombre es obligatorio')
    if (!form.rfc.trim()) return setError('El RFC es obligatorio')
    setSaving(true)
    try {
      const payload = {
        nombre_razon_social: form.nombre_razon_social.trim(),
        rfc: form.rfc.trim().toUpperCase(),
        tipo_persona: form.tipo_persona,
        telefono: form.telefono.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        domicilio: form.domicilio.trim() || null,
        activo: form.activo,
      }
      if (editando) {
        const { error: e } = await supabase.from('arrendatarios').update(payload).eq('id', initial.id)
        if (e) throw e
        logAudit({ modulo: 'ARRENDATARIOS', accion: 'EDITAR', entidad: 'ARRENDATARIO', entidad_id: initial.id, descripcion: `Editado: ${payload.nombre_razon_social}` })
      } else {
        const { error: e } = await supabase.from('arrendatarios').insert(payload)
        if (e) throw e
        logAudit({ modulo: 'ARRENDATARIOS', accion: 'CREAR', entidad: 'ARRENDATARIO', descripcion: `Nuevo: ${payload.nombre_razon_social}` })
      }
      onSaved()
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }
  const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#1A3C5E', borderRadius: '12px 12px 0 0' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'white' }}>
            {editando ? 'Editar arrendatario' : 'Nuevo arrendatario'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#93C5FD', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Formulario */}
        <form onSubmit={guardar} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Tipo de persona *</label>
              <select value={form.tipo_persona} onChange={e => set('tipo_persona', e.target.value)} style={inp}>
                <option value="FISICA">Persona Física</option>
                <option value="MORAL">Persona Moral / Empresa</option>
              </select>
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>{form.tipo_persona === 'MORAL' ? 'Razón Social' : 'Nombre Completo'} *</label>
              <input value={form.nombre_razon_social} onChange={e => set('nombre_razon_social', e.target.value)}
                placeholder="Nombre o Razón social" style={inp} required />
            </div>

            <div>
              <label style={lbl}>RFC *</label>
              <input value={form.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())}
                placeholder="RFC con homoclave" style={inp} required maxLength={13} />
            </div>

            <div>
              <label style={lbl}>Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                placeholder="55 1234 5678" style={inp} />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="correo@ejemplo.com" type="email" style={inp} />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Domicilio</label>
              <textarea value={form.domicilio} onChange={e => set('domicilio', e.target.value)}
                placeholder="Calle, número, colonia, CP, ciudad" style={{ ...inp, resize: 'vertical', minHeight: '64px' }} />
            </div>

            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="activo" checked={form.activo} onChange={e => set('activo', e.target.checked)}
                style={{ width: '16px', height: '16px' }} />
              <label htmlFor="activo" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Arrendatario activo</label>
            </div>

          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: '12px', margin: '12px 0 0', background: '#FEF2F2', padding: '8px 12px', borderRadius: '6px' }}>{error}</p>}
        </form>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            <Save size={14} /> {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear arrendatario'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fila de tabla ────────────────────────────────────────────────────────────
function Fila({ a, onEdit, onDelete }) {
  const mora = parseFloat(a.total_mora) || 0
  const pendiente = parseFloat(a.total_pendiente) || 0
  const enMora = mora > 0

  let estadoBadge
  if (!a.activo) {
    estadoBadge = <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: '#F3F4F6', color: '#9CA3AF' }}>INACTIVO</span>
  } else if (enMora) {
    estadoBadge = <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: '#FEE2E2', color: '#B91C1C' }}>EN MORA</span>
  } else if (pendiente > 0) {
    estadoBadge = <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>PENDIENTE</span>
  } else {
    estadoBadge = <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: '#D1FAE5', color: '#057642' }}>AL CORRIENTE</span>
  }

  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>

      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.nombre_completo || a.nombre_razon_social}</div>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'monospace' }}>{a.rfc}</div>
      </td>

      <td style={{ padding: '12px 16px' }}>
        {a.numero_local
          ? <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={12} color="var(--color-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>{a.numero_local}</span>
            </div>
          : <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Sin local</span>
        }
      </td>

      <td style={{ padding: '12px 16px' }}>
        {a.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#374151' }}><Phone size={11} color="#9CA3AF" />{a.telefono}</div>}
        {a.email && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#374151' }}><Mail size={11} color="#9CA3AF" />{a.email}</div>}
        {!a.telefono && !a.email && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>—</span>}
      </td>

      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        {a.renta_mensual
          ? <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'monospace' }}>{fmt(a.renta_mensual)}</span>
          : <span style={{ color: '#9CA3AF', fontSize: '12px' }}>—</span>}
      </td>

      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{estadoBadge}</td>

      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          <button onClick={() => onEdit(a)} title="Editar"
            style={{ padding: '6px 8px', background: '#EEF2FF', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Edit2 size={13} color="var(--color-primary)" />
          </button>
          <button onClick={() => onDelete(a)} title="Eliminar"
            style={{ padding: '6px 8px', background: '#FEF2F2', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={13} color="#B91C1C" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
const SORTS = [
  { col: 'nombre_completo', label: 'Nombre A-Z' },
  { col: 'numero_local',    label: 'Local' },
  { col: 'renta_mensual',   label: 'Renta' },
]

export default function Arrendatarios() {
  useModuleAudit('ARRENDATARIOS')

  const [search, setSearch]   = useState('')
  const [filtro, setFiltro]   = useState('Todos')
  const [sortCol, setSortCol] = useState('nombre_completo')
  const [sortAsc, setSortAsc] = useState(true)
  const [modal, setModal]     = useState(null)   // null | 'nuevo' | { arrendatario }
  const [confirm, setConfirm] = useState(null)   // arrendatario a eliminar
  const [reload, setReload]   = useState(0)

  const { data, loading } = usePRP('prp_expediente_arrendatario', {
    order: { col: 'nombre_completo', asc: true },
    deps: [reload],
  })
  const lista = data ?? []

  function toggleSort(col) {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(true) }
  }

  const filtrados = lista
    .filter(a => {
      const q = search.toLowerCase()
      const matchQ = !q
        || (a.nombre_completo || '').toLowerCase().includes(q)
        || (a.rfc || '').toLowerCase().includes(q)
        || (a.email || '').toLowerCase().includes(q)
        || (a.numero_local || '').toLowerCase().includes(q)
        || (a.telefono || '').toLowerCase().includes(q)
      const matchF = filtro === 'Todos'
        || (filtro === 'Activos'   && a.activo !== false)
        || (filtro === 'Mora'      && parseFloat(a.total_mora) > 0)
        || (filtro === 'Pendiente' && parseFloat(a.total_pendiente) > 0 && parseFloat(a.total_mora) === 0)
        || (filtro === 'Sin local' && !a.numero_local)
      return matchQ && matchF
    })
    .sort((a, b) => {
      const va = a[sortCol] ?? ''
      const vb = b[sortCol] ?? ''
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
      return sortAsc ? cmp : -cmp
    })

  const total       = lista.length
  const activos     = lista.filter(a => a.activo !== false).length
  const mora        = lista.filter(a => parseFloat(a.total_mora) > 0).length
  const alCorriente = lista.filter(a => parseFloat(a.total_mora) === 0 && parseFloat(a.total_pendiente) === 0 && a.activo !== false).length

  async function eliminar(a) {
    const { error } = await supabase.from('arrendatarios').delete().eq('id', a.arrendatario_id)
    if (!error) {
      logAudit({ modulo: 'ARRENDATARIOS', accion: 'ELIMINAR', entidad: 'ARRENDATARIO', entidad_id: a.arrendatario_id, descripcion: `Eliminado: ${a.nombre_completo}` })
      setConfirm(null)
      setReload(r => r + 1)
    }
  }

  function abrirEditar(a) {
    setModal({
      id: a.arrendatario_id,
      nombre_razon_social: a.nombre_completo,
      rfc: a.rfc,
      tipo_persona: a.tipo_persona || 'FISICA',
      telefono: a.telefono || '',
      email: a.email || '',
      domicilio: a.domicilio || '',
      activo: a.activo !== false,
    })
  }

  const thStyle = (col) => ({
    padding: '11px 16px', textAlign: col === 'renta_mensual' ? 'right' : col === 'estado' ? 'center' : 'left',
    fontWeight: 600, fontSize: '11px', color: '#6B7280', borderBottom: '1px solid #E5E7EB',
    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    cursor: SORTS.find(s => s.col === col) ? 'pointer' : 'default',
    userSelect: 'none',
    background: sortCol === col ? '#F0F9FF' : '#F9FAFB',
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1300px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Arrendatarios</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{total} registrados · {filtrados.length} en vista</p>
        </div>
        <button onClick={() => setModal('nuevo')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo arrendatario
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
        <KPICard title="Total"        value={total}        icon={Users}         color="var(--color-primary)" />
        <KPICard title="Activos"      value={activos}      icon={CheckCircle}   color="var(--color-success)" />
        <KPICard title="Al corriente" value={alCorriente}  icon={CheckCircle}   color="var(--color-success)" />
        <KPICard title="Con mora"     value={mora}         icon={AlertTriangle} color="var(--color-danger)" />
      </div>

      {/* Barra búsqueda + filtros + orden */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre, RFC, email, local, teléfono…"
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['Todos', 'Activos', 'Mora', 'Pendiente', 'Sin local'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
            borderColor: filtro === f ? 'var(--color-primary)' : '#E5E7EB',
            background: filtro === f ? 'var(--color-primary)' : 'white',
            color: filtro === f ? 'white' : '#6B7280',
          }}>{f}</button>
        ))}
      </div>

      {/* Orden */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>ORDENAR:</span>
        {SORTS.map(s => (
          <button key={s.col} onClick={() => toggleSort(s.col)} style={{
            padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
            borderColor: sortCol === s.col ? 'var(--color-primary)' : '#E5E7EB',
            background: sortCol === s.col ? '#EEF2FF' : 'white',
            color: sortCol === s.col ? 'var(--color-primary)' : '#6B7280',
          }}>
            {s.label} {sortCol === s.col ? (sortAsc ? '↑' : '↓') : ''}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9CA3AF' }}>{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><LoadingSpinner /></div>
        : filtrados.length === 0
          ? <EmptyState title="Sin arrendatarios" description="No hay arrendatarios que coincidan." />
          : <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      {[
                        { col: 'nombre_completo', label: 'Arrendatario' },
                        { col: 'numero_local',    label: 'Local' },
                        { col: null,              label: 'Contacto' },
                        { col: 'renta_mensual',   label: 'Renta/mes' },
                        { col: null,              label: 'Estado' },
                        { col: null,              label: '' },
                      ].map(({ col, label }) => (
                        <th key={label} style={thStyle(col)} onClick={() => col && toggleSort(col)}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(a => (
                      <Fila
                        key={a.arrendatario_id}
                        a={a}
                        onEdit={abrirEditar}
                        onDelete={setConfirm}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
      }

      {/* Modal Nuevo / Editar */}
      {modal && (
        <ArrendatarioModal
          initial={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); setReload(r => r + 1) }}
        />
      )}

      {/* Confirmación eliminación */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700 }}>¿Eliminar arrendatario?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6B7280' }}>
              Se eliminará <strong>{confirm.nombre_completo}</strong> de forma permanente. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setConfirm(null)} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => eliminar(confirm)} style={{ padding: '8px 16px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
