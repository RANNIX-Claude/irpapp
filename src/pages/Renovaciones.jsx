import { useState, useEffect } from 'react'
import { RefreshCw, FileText, CheckCircle, Clock, AlertTriangle, Eye, Pencil, Trash2, X, Save, Paperclip } from 'lucide-react'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/ui/StatusBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

// Sólo aparecen contratos con estatus_proceso = EN_RENOVACION
// Salen de aquí cuando se cambia a EN_EJECUCION (contrato firmado y vigente)

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
function fmtFecha(s) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${parseInt(d)} ${MESES[parseInt(m)]} ${y}`
}

// ─── Panel lateral de detalle/edición ────────────────────────────────────────

function PanelDetalle({ contrato: c, onClose, onUpdated, onCerrar }) {
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [confirmCerrar, setConfirmCerrar] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  const startEdit = () => {
    setEditForm({
      renta_mensual:    c.renta_mensual ?? '',
      deposito_garantia: c.deposito_garantia ?? '',
      fecha_inicio:     c.fecha_inicio ?? '',
      fecha_fin:        c.fecha_fin ?? '',
      giro_autorizado:  c.giro_autorizado ?? '',
      fiador_nombre:    c.fiador_nombre ?? '',
      fiador_rfc:       c.fiador_rfc ?? '',
      fiador_domicilio: c.fiador_domicilio ?? '',
      notas:            c.notas ?? '',
    })
    setErr(null)
    setEditMode(true)
  }

  const guardar = async () => {
    setSaving(true); setErr(null)
    const { error } = await supabase.from('contratos').update({
      renta_mensual:    editForm.renta_mensual    ? parseFloat(editForm.renta_mensual)    : null,
      deposito_garantia: editForm.deposito_garantia ? parseFloat(editForm.deposito_garantia) : null,
      fecha_inicio:     editForm.fecha_inicio  || null,
      fecha_fin:        editForm.fecha_fin     || null,
      giro_autorizado:  editForm.giro_autorizado || null,
      fiador_nombre:    editForm.fiador_nombre  || null,
      fiador_rfc:       editForm.fiador_rfc     || null,
      fiador_domicilio: editForm.fiador_domicilio || null,
      notas:            editForm.notas          || null,
      updated_at: new Date().toISOString(),
    }).eq('id', c.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    setEditMode(false)
    onUpdated?.()
  }

  // Cerrar renovación = pasar a EN_EJECUCION (contrato ya firmado y ejecutándose)
  const cerrarRenovacion = async () => {
    setCerrando(true)
    await supabase.from('contratos').update({
      estatus_proceso: 'EN_EJECUCION',
      updated_at: new Date().toISOString(),
    }).eq('id', c.id)
    setCerrando(false)
    setConfirmCerrar(false)
    onCerrar?.()
  }

  const inp = (field, type = 'text', placeholder = '') => (
    <input type={type} value={editForm[field]} placeholder={placeholder}
      onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
      style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
  )
  const Row = ({ label, children, full }) => (
    <div style={{ display: 'grid', gridTemplateColumns: full ? '1fr' : '140px 1fr', gap: '6px', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  )
  const Campo = ({ label, val }) => (
    <div style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: val ? 'var(--color-text)' : '#D1D5DB' }}>{val || '—'}</div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      {/* Panel */}
      <div style={{ position: 'relative', width: 520, height: '100%', background: 'white', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', background: '#F5F3FF', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <RefreshCw size={14} color="#7C3AED" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En renovación</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>{c.folio}</div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
              {c.arrendatario_nombre} · {c.unidad_numero || c.locales_display}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', marginTop: '-4px' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Vigencia rápida */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Inicio', val: fmtFecha(c.fecha_inicio) },
              { label: 'Vencimiento', val: fmtFecha(c.fecha_fin) },
              { label: 'Renta', val: fmt(c.renta_mensual) },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, background: '#F9FAFB', borderRadius: '8px', padding: '10px 12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>{k.val}</div>
              </div>
            ))}
          </div>

          {editMode ? (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', marginBottom: '12px' }}>Editar datos de renovación</div>
              <Row label="Renta mensual">{inp('renta_mensual','number')}</Row>
              <Row label="Depósito garantía">{inp('deposito_garantia','number')}</Row>
              <Row label="Inicio">{inp('fecha_inicio','date')}</Row>
              <Row label="Vencimiento">{inp('fecha_fin','date')}</Row>
              <Row label="Giro autorizado">{inp('giro_autorizado')}</Row>
              <div style={{ marginTop: '12px', padding: '12px', background: '#FFF8F0', borderRadius: '8px', border: '1px solid #FBBF24' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '8px' }}>Fiador / Aval</div>
                <Row label="Nombre">{inp('fiador_nombre')}</Row>
                <Row label="RFC">{inp('fiador_rfc')}</Row>
                <Row label="Domicilio">{inp('fiador_domicilio')}</Row>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, marginBottom: '4px' }}>NOTAS</div>
                <textarea value={editForm.notas} onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              {err && <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '8px' }}>{err}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button onClick={guardar} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  <Save size={14} />{saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setEditMode(false)} style={{ padding: '9px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>Datos del contrato</div>
                <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  <Pencil size={12} /> Editar
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <div>
                  <Campo label="Tipo contrato"    val={c.tipo_contrato} />
                  <Campo label="Giro autorizado"  val={c.giro_autorizado} />
                  <Campo label="Depósito"         val={c.deposito_garantia ? fmt(c.deposito_garantia) : null} />
                  <Campo label="Día pago"         val={c.dia_pago ? `Día ${c.dia_pago}` : null} />
                  <Campo label="Mora"             val={c.penalizacion_pct ? `${c.penalizacion_pct}%` : null} />
                </div>
                <div>
                  <Campo label="Fiador"           val={c.fiador_nombre} />
                  <Campo label="RFC fiador"       val={c.fiador_rfc} />
                  <Campo label="Domicilio fiador" val={c.fiador_domicilio} />
                  <Campo label="Pagarés"          val={c.pagares_cantidad ? `${c.pagares_cantidad} pagarés` : null} />
                </div>
              </div>
              {c.notas && (
                <div style={{ marginTop: '14px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Notas</div>
                  <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{c.notas}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — acciones */}
        {!editMode && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', background: '#FAFAFA' }}>
            {!confirmCerrar ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setConfirmCerrar(true)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  <CheckCircle size={16} /> Marcar como en ejecución
                </button>
              </div>
            ) : (
              <div style={{ background: '#F0FFF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontSize: '13px', margin: '0 0 12px', fontWeight: 600 }}>
                  ¿Confirmas que el contrato <strong>{c.folio}</strong> ya fue firmado y está en ejecución?
                </p>
                <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 12px' }}>
                  Saldrá del panel de Renovaciones y pasará a EN_EJECUCION.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={cerrarRenovacion} disabled={cerrando}
                    style={{ flex: 1, padding: '9px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                    {cerrando ? 'Procesando...' : 'Sí, ya está en ejecución'}
                  </button>
                  <button onClick={() => setConfirmCerrar(false)}
                    style={{ padding: '9px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal Renovaciones ───────────────────────────────────────────

export default function Renovaciones() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [seleccionado, setSeleccionado] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { data, loading } = usePRP('prp_contratos', {
    order: { col: 'fecha_fin', asc: true },
    refreshKey,
  })

  const refresh = () => setRefreshKey(k => k + 1)

  // Sólo contratos EN_RENOVACION
  const lista = (data ?? []).filter(c => c.estatus_proceso === 'EN_RENOVACION')

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase().trim()
    return !q
      || (c.folio || '').toLowerCase().includes(q)
      || (c.arrendatario_nombre || '').toLowerCase().includes(q)
      || (c.locales_display || '').toLowerCase().includes(q)
      || (c.unidad_numero || '').toLowerCase().includes(q)
  })

  // Métricas propias del proceso de renovación
  const total        = lista.length
  const conPDF       = lista.filter(c => c.archivo_contrato_url).length
  const yaVencidos   = lista.filter(c => c.fecha_fin && c.fecha_fin < new Date().toISOString().split('T')[0]).length
  const porVencer30  = lista.filter(c => {
    if (!c.fecha_fin) return false
    const dias = Math.ceil((new Date(c.fecha_fin) - new Date()) / 86400000)
    return dias >= 0 && dias <= 30
  }).length
  const sinFiador    = lista.filter(c => !c.fiador_nombre).length

  const KPI = ({ title, value, sub, color, icon: Icon }) => (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '16px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>{sub}</div>}
    </div>
  )

  const diasLabel = c => {
    if (!c.fecha_fin) return { texto: 'Indefinido', color: '#9CA3AF' }
    const dias = Math.ceil((new Date(c.fecha_fin) - new Date()) / 86400000)
    if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)}d`, color: 'var(--color-danger)' }
    if (dias <= 30) return { texto: `${dias}d restantes`, color: '#D97706' }
    return { texto: `${dias}d restantes`, color: 'var(--color-success)' }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1300px' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={18} color="#7C3AED" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>Renovaciones</h1>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
              Contratos en proceso de renovación · Permanecen aquí hasta ser firmados y ejecutados
            </p>
          </div>
        </div>
      </div>

      {/* Aviso informativo */}
      <div style={{ padding: '10px 14px', background: '#F5F3FF', borderRadius: '8px', border: '1px solid #DDD6FE', fontSize: '12px', color: '#5B21B6', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RefreshCw size={13} />
        Un contrato sale de este panel cuando se marca como <strong>&nbsp;En ejecución</strong> — significa que ya fue firmado y está vigente.
      </div>

      {/* KPIs específicos de renovación */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
        <KPI title="En renovación"     value={total}       sub="contratos activos"         color="#7C3AED"                    icon={RefreshCw} />
        <KPI title="Vencidos"          value={yaVencidos}  sub="contrato original vencido" color="var(--color-danger)"        icon={AlertTriangle} />
        <KPI title="Vencen en 30 días" value={porVencer30} sub="requieren atención urgente" color="var(--color-warning)"       icon={Clock} />
        <KPI title="Sin fiador"        value={sinFiador}   sub="pendientes de aval"         color="#D97706"                    icon={FileText} />
        <KPI title="Con PDF adjunto"   value={`${conPDF}/${total}`} sub="documentos cargados" color="var(--color-success)"   icon={Paperclip} />
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '16px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, local, folio..."
          style={{ width: '100%', maxWidth: '480px', padding: '9px 14px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
          : filtrados.length === 0
            ? <EmptyState title="Sin contratos en renovación" description="No hay contratos en proceso de renovación actualmente." />
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F5F3FF' }}>
                      {['Contrato', 'Local(es)', 'Arrendatario', 'Renta', 'Vencimiento original', 'Plazo', 'Proceso', 'Vigencia', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Renta' ? 'right' : 'left', fontWeight: 600, fontSize: '11px', color: '#5B21B6', borderBottom: '1px solid #DDD6FE', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(c => {
                      const { texto, color } = diasLabel(c)
                      return (
                        <tr key={c.id}
                          onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                          onClick={() => setSeleccionado(c)}>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#7C3AED' }}>{c.folio}</div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{c.tipo_contrato}</div>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {(c.unidad_numero || c.locales_display || '—').split(',').map(l => (
                              <span key={l} style={{ display: 'inline-block', background: '#EEF2FF', color: 'var(--color-primary)', fontWeight: 700, fontSize: '11px', padding: '2px 8px', borderRadius: '10px', marginRight: '4px', marginBottom: '2px' }}>{l.trim()}</span>
                            ))}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.arrendatario_nombre}</div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>{c.arrendatario_rfc}</div>
                          </td>
                          <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{fmt(c.renta_mensual)}</div>
                            {c.deposito_garantia > 0 && <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Dep. {fmt(c.deposito_garantia)}</div>}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontSize: '12px' }}>{fmtFecha(c.fecha_inicio)}</div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{fmtFecha(c.fecha_fin)}</div>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color, background: color + '18', padding: '3px 8px', borderRadius: '12px' }}>{texto}</span>
                          </td>
                          {/* Estatus proceso */}
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, background: '#F5F3FF', color: '#7C3AED', padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                              EN RENOVACIÓN
                            </span>
                          </td>
                          {/* Estatus vigencia */}
                          <td style={{ padding: '13px 16px' }}>
                            {(() => {
                              const hoy = new Date().toISOString().split('T')[0]
                              const vencido = c.fecha_fin && c.fecha_fin < hoy
                              return (
                                <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, background: vencido ? '#FEF2F2' : '#F0FDF4', color: vencido ? 'var(--color-danger)' : 'var(--color-success)', padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                                  {vencido ? 'VENCIDO' : 'VIGENTE'}
                                </span>
                              )
                            })()}
                          </td>
                          <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button title="Ver detalle" onClick={e => { e.stopPropagation(); setSeleccionado(c) }}
                                style={{ width: 30, height: 30, border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Eye size={14} />
                              </button>
                              <button title="Eliminar" onClick={e => { e.stopPropagation(); setConfirmDelete(c) }}
                                style={{ width: 30, height: 30, border: '1px solid #FECACA', borderRadius: '6px', background: '#FFF5F5', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Panel detalle */}
      {seleccionado && (
        <PanelDetalle
          contrato={seleccionado}
          onClose={() => setSeleccionado(null)}
          onUpdated={() => { refresh(); setSeleccionado(null) }}
          onCerrar={() => { refresh(); setSeleccionado(null) }}
        />
      )}

      {/* Modal confirmación eliminar */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '10px' }}>Eliminar contrato en renovación</div>
            <p style={{ fontSize: '13px', margin: '0 0 8px' }}>
              ¿Eliminar <strong>{confirmDelete.folio}</strong> ({confirmDelete.arrendatario_nombre})?
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-danger)', background: '#FFF5F5', padding: '10px', borderRadius: '8px', border: '1px solid #FECACA', margin: '0 0 20px' }}>
              Acción irreversible. Se eliminará el contrato y sus locales asignados.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                style={{ padding: '9px 20px', border: '1px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancelar</button>
              <button disabled={deleting} onClick={async () => {
                setDeleting(true)
                await supabase.from('contratos_locales').delete().eq('contrato_id', confirmDelete.id)
                await supabase.from('contratos').delete().eq('id', confirmDelete.id)
                setDeleting(false); setConfirmDelete(null); refresh()
              }}
                style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: 'var(--color-danger)', color: 'white', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
