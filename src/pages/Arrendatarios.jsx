import { useState, useEffect } from 'react'
import {
  Users, Search, Plus, AlertTriangle, CheckCircle,
  Edit2, Trash2, Building2, Phone, Mail, X, Save,
  ChevronRight, FileText, Calendar, MapPin, User,
  DollarSign, Clock, Shield
} from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { useModuleAudit, logAudit } from '../hooks/useAudit'
import { supabase } from '../lib/supabase'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }
function fdate(d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

// ── Colores de estatus de contrato ───────────────────────────────────────────
const ESTATUS_COLOR = {
  VIGENTE:   { bg: '#D1FAE5', color: '#057642' },
  VENCIDO:   { bg: '#FEE2E2', color: '#B24020' },
  RENOVADO:  { bg: '#EDE9FE', color: '#6D28D9' },
  CANCELADO: { bg: '#F3F4F6', color: '#6B7280' },
  RESCISION: { bg: '#FEF3C7', color: '#D97706' },
}

// ── Modal Nuevo / Editar ─────────────────────────────────────────────────────
const FORM_INIT = {
  locatario: '', nombre_negocio: '', rfc: '', tipo_persona: 'FISICA',
  telefono: '', email: '', domicilio_fiscal: '', estatus: 'ACTIVO',
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
    if (!form.locatario.trim()) return setError('El nombre es obligatorio')
    setSaving(true)
    try {
      const payload = {
        locatario:        form.locatario.trim(),
        nombre_negocio:   form.nombre_negocio.trim() || null,
        rfc:              form.rfc.trim().toUpperCase() || null,
        tipo_persona:     form.tipo_persona,
        telefono:         form.telefono.trim() || null,
        email:            form.email.trim().toLowerCase() || null,
        domicilio_fiscal: form.domicilio_fiscal.trim() || null,
        estatus:          form.estatus,
      }
      if (editando) {
        const { error: e } = await supabase.from('arrendatarios').update(payload).eq('id', initial.id)
        if (e) throw e
        logAudit({ modulo: 'ARRENDATARIOS', accion: 'EDITAR', entidad: 'ARRENDATARIO', entidad_id: initial.id, descripcion: `Editado: ${payload.locatario}` })
      } else {
        const { error: e } = await supabase.from('arrendatarios').insert(payload)
        if (e) throw e
        logAudit({ modulo: 'ARRENDATARIOS', accion: 'CREAR', entidad: 'ARRENDATARIO', descripcion: `Nuevo: ${payload.locatario}` })
      }
      onSaved()
    } catch (e) { setError(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }
  const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#1A3C5E', borderRadius: '12px 12px 0 0' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'white' }}>
            {editando ? 'Editar arrendatario' : 'Nuevo arrendatario'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#93C5FD', cursor: 'pointer' }}><X size={20} /></button>
        </div>
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
              <input value={form.locatario} onChange={e => set('locatario', e.target.value)}
                placeholder="Nombre o Razón social" style={inp} required />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Nombre del negocio / giro</label>
              <input value={form.nombre_negocio} onChange={e => set('nombre_negocio', e.target.value)}
                placeholder="Nombre comercial o giro" style={inp} />
            </div>
            <div>
              <label style={lbl}>RFC</label>
              <input value={form.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())}
                placeholder="RFC con homoclave" style={inp} maxLength={13} />
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
              <label style={lbl}>Domicilio fiscal</label>
              <textarea value={form.domicilio_fiscal} onChange={e => set('domicilio_fiscal', e.target.value)}
                placeholder="Calle, número, colonia, CP, ciudad" style={{ ...inp, resize: 'vertical', minHeight: '64px' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Estatus</label>
              <select value={form.estatus} onChange={e => set('estatus', e.target.value)} style={inp}>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
          </div>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '12px', margin: '12px 0 0', background: '#FEF2F2', padding: '8px 12px', borderRadius: '6px' }}>{error}</p>}
        </form>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            <Save size={14} /> {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear arrendatario'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ficha Arrendatario (panel lateral) ───────────────────────────────────────
function FichaArrendatario({ arrendatario, onClose, onEdit }) {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!arrendatario?.id) return
    setLoading(true)
    supabase
      .from('contratos')
      .select(`
        id, numero_contrato, tipo_contrato, giro_autorizado,
        fecha_inicio, fecha_fin, renta_mensual, deposito_garantia,
        dia_pago, penalizacion_pct, incremento_anual_pct,
        fiador_nombre, fiador_rfc, fiador_domicilio,
        pagares_cantidad, periodo_gracia_meses,
        estatus, notas, contrato_anterior_id,
        contratos_locales (
          local_id, renta_asignada,
          cat_locales ( numero_local, superficie_m2, nivel )
        )
      `)
      .eq('arrendatario_id', arrendatario.id)
      .order('fecha_inicio', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setContratos(data ?? [])
        setLoading(false)
      })
  }, [arrendatario?.id])

  const vigente = contratos.find(c => c.estatus === 'VIGENTE')
  const a = arrendatario

  const pill = (label, bg, color) => (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: bg, color }}>{label}</span>
  )

  return (
    <>
      {/* overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />

      {/* panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', maxWidth: '95vw',
        zIndex: 401, background: 'white', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ background: '#1A3C5E', padding: '20px 24px', color: 'white', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#93C5FD', marginBottom: '4px', textTransform: 'uppercase' }}>
                {a.tipo_persona === 'MORAL' ? 'Persona Moral' : 'Persona Física'}
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>{a.locatario}</h2>
              {a.nombre_negocio && (
                <div style={{ fontSize: '13px', color: '#93C5FD', marginTop: '3px' }}>{a.nombre_negocio}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => onEdit(a)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '7px', padding: '7px 12px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Edit2 size={12} /> Editar
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#93C5FD', cursor: 'pointer' }}><X size={20} /></button>
            </div>
          </div>

          {/* datos clave en header */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {a.rfc && (
              <span style={{ fontSize: '12px', color: '#CBD5E1', fontFamily: 'monospace' }}>RFC: {a.rfc}</span>
            )}
            {vigente && (
              <span style={{ fontSize: '12px', color: '#6EE7B7', fontWeight: 700 }}>
                Local(es): {vigente.contratos_locales?.map(cl => cl.cat_locales?.numero_local || cl.local_id).join(', ')}
              </span>
            )}
            {a.estatus && (
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                background: a.estatus === 'ACTIVO' ? 'rgba(16,185,129,0.25)' : 'rgba(156,163,175,0.25)',
                color: a.estatus === 'ACTIVO' ? '#6EE7B7' : '#D1D5DB' }}>
                {a.estatus}
              </span>
            )}
          </div>
        </div>

        {/* Datos de contacto */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {a.telefono && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Phone size={13} color="#0A66C2" />
              <span style={{ fontSize: '13px' }}>{a.telefono}</span>
            </div>
          )}
          {a.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Mail size={13} color="#0A66C2" />
              <span style={{ fontSize: '13px' }}>{a.email}</span>
            </div>
          )}
          {a.domicilio_fiscal && (
            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
              <MapPin size={13} color="#0A66C2" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '12px', color: '#4B5563' }}>{a.domicilio_fiscal}</span>
            </div>
          )}
        </div>

        {/* Historial de contratos */}
        <div style={{ flex: 1, padding: '16px 24px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Historial de contratos ({contratos.length})
          </h3>

          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><LoadingSpinner /></div>
            : contratos.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: '13px' }}>Sin contratos registrados</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {contratos.map(c => {
                    const col = ESTATUS_COLOR[c.estatus] ?? { bg: '#F3F4F6', color: '#6B7280' }
                    const locales = c.contratos_locales ?? []
                    const dias = c.fecha_fin
                      ? Math.floor((new Date(c.fecha_fin) - new Date()) / 86400000)
                      : null
                    return (
                      <div key={c.id} style={{ border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', background: '#FAFAFA' }}>
                        {/* cabecera del contrato */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', borderBottom: '1px solid #F3F4F6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={14} color="var(--color-primary)" />
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>{c.numero_contrato}</span>
                            <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{c.tipo_contrato}</span>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: col.bg, color: col.color }}>
                            {c.estatus}
                          </span>
                        </div>

                        {/* cuerpo */}
                        <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {/* Locales */}
                          <div style={{ gridColumn: '1/-1' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '5px' }}>Locales</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                              {locales.length === 0
                                ? <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Sin locales asociados</span>
                                : locales.map(cl => (
                                    <div key={cl.local_id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }}>
                                      <Building2 size={11} color="var(--color-primary)" />
                                      <span style={{ fontWeight: 700 }}>{cl.cat_locales?.numero_local || cl.local_id}</span>
                                      {cl.cat_locales?.superficie_m2 && (
                                        <span style={{ color: '#9CA3AF' }}>{cl.cat_locales.superficie_m2}m²</span>
                                      )}
                                      {cl.renta_asignada && cl.renta_asignada !== c.renta_mensual && (
                                        <span style={{ color: '#0A66C2', fontWeight: 600 }}>{fmt(cl.renta_asignada)}</span>
                                      )}
                                    </div>
                                  ))
                              }
                            </div>
                          </div>

                          {/* Vigencia */}
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '3px' }}>Vigencia</div>
                            <div style={{ fontSize: '12px' }}>{fdate(c.fecha_inicio)} → {fdate(c.fecha_fin)}</div>
                            {dias !== null && (
                              <div style={{ fontSize: '11px', fontWeight: 600, color: dias < 0 ? '#B24020' : dias < 60 ? '#D97706' : '#057642', marginTop: '2px' }}>
                                {dias < 0 ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `${dias}d restantes`}
                              </div>
                            )}
                          </div>

                          {/* Renta */}
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '3px' }}>Renta mensual</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace' }}>{fmt(c.renta_mensual)}</div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Dep. {fmt(c.deposito_garantia)} · Día {c.dia_pago}</div>
                          </div>

                          {/* Condiciones */}
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '3px' }}>Condiciones</div>
                            <div style={{ fontSize: '11px', color: '#4B5563' }}>Mora {c.penalizacion_pct}% · Inc. {c.incremento_anual_pct ?? 0}%</div>
                            <div style={{ fontSize: '11px', color: '#4B5563' }}>{c.pagares_cantidad ?? 12} pagarés</div>
                          </div>

                          {/* Fiador */}
                          {c.fiador_nombre && (
                            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'flex-start', gap: '6px', paddingTop: '6px', borderTop: '1px dashed #E5E7EB' }}>
                              <Shield size={12} color="#9CA3AF" style={{ marginTop: '1px', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Fiador / Aval</div>
                                <div style={{ fontSize: '12px', fontWeight: 600 }}>{c.fiador_nombre}</div>
                                {c.fiador_rfc && <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'monospace' }}>RFC: {c.fiador_rfc}</div>}
                                {c.fiador_domicilio && <div style={{ fontSize: '11px', color: '#6B7280' }}>{c.fiador_domicilio}</div>}
                              </div>
                            </div>
                          )}

                          {/* Giro */}
                          {c.giro_autorizado && (
                            <div style={{ gridColumn: '1/-1' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Giro: </span>
                              <span style={{ fontSize: '12px', color: '#4B5563' }}>{c.giro_autorizado}</span>
                            </div>
                          )}

                          {/* Notas */}
                          {c.notas && (
                            <div style={{ gridColumn: '1/-1', padding: '6px 10px', background: '#FFF7ED', borderRadius: '6px', fontSize: '11px', color: '#92400E' }}>
                              {c.notas}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
          }
        </div>
      </div>
    </>
  )
}

// ── Fila de tabla ────────────────────────────────────────────────────────────
function Fila({ a, onVerFicha, onEdit, onDelete }) {
  const mora      = parseFloat(a.total_mora) || 0
  const pendiente = parseFloat(a.total_pendiente) || 0
  const enMora    = mora > 0

  let estadoBadge
  if (a.estatus === 'INACTIVO') {
    estadoBadge = <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: '#F3F4F6', color: '#9CA3AF' }}>INACTIVO</span>
  } else if (enMora) {
    estadoBadge = <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: '#FEE2E2', color: '#B91C1C' }}>EN MORA</span>
  } else if (pendiente > 0) {
    estadoBadge = <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>PENDIENTE</span>
  } else {
    estadoBadge = <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: '#D1FAE5', color: '#057642' }}>AL CORRIENTE</span>
  }

  // Locales desde locales_display o numero_local del arrendatario
  const localesDisplay = a.locales_display || a.numero_local

  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}
      onClick={() => onVerFicha(a)}>

      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.locatario || a.nombre_completo || a.nombre_razon_social}</div>
        {a.nombre_negocio && <div style={{ fontSize: '11px', color: '#6B7280' }}>{a.nombre_negocio}</div>}
        <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>{a.rfc}</div>
      </td>

      <td style={{ padding: '12px 16px' }}>
        {localesDisplay
          ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {localesDisplay.split(/[,|]/).map(l => l.trim()).filter(Boolean).map(l => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: '#EEF2FF', borderRadius: '5px', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  <Building2 size={10} />{l}
                </span>
              ))}
            </div>
          : <span style={{ fontSize: '12px', color: '#9CA3AF' }}>—</span>
        }
      </td>

      <td style={{ padding: '12px 16px' }}>
        {a.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}><Phone size={11} color="#9CA3AF" />{a.telefono}</div>}
        {a.email    && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}><Mail size={11} color="#9CA3AF" />{a.email}</div>}
        {!a.telefono && !a.email && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>—</span>}
      </td>

      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        {a.renta_mensual
          ? <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'monospace' }}>{fmt(a.renta_mensual)}</span>
          : <span style={{ color: '#9CA3AF', fontSize: '12px' }}>—</span>}
      </td>

      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{estadoBadge}</td>

      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
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
  { col: 'locatario',    label: 'Nombre A-Z' },
  { col: 'numero_local', label: 'Local' },
  { col: 'renta_mensual', label: 'Renta' },
]

export default function Arrendatarios() {
  useModuleAudit('ARRENDATARIOS')

  const [search, setSearch]   = useState('')
  const [filtro, setFiltro]   = useState('Todos')
  const [sortCol, setSortCol] = useState('locatario')
  const [sortAsc, setSortAsc] = useState(true)
  const [modal, setModal]     = useState(null)
  const [ficha, setFicha]     = useState(null)   // arrendatario seleccionado para panel
  const [confirm, setConfirm] = useState(null)
  const [reload, setReload]   = useState(0)

  // Intentar cargar desde view, fallback a tabla directa
  const { data: dataView, loading: loadingView } = usePRP('prp_expediente_arrendatario', {
    order: { col: 'nombre_completo', asc: true },
    deps: [reload],
  })
  const { data: dataDirecta, loading: loadingDirecta } = usePRP('arrendatarios', {
    order: { col: 'locatario', asc: true },
    deps: [reload],
  })

  // Usar la view si tiene datos, si no usar tabla directa
  const loading = loadingView && loadingDirecta
  const lista   = (dataView?.length ? dataView : dataDirecta) ?? []

  function toggleSort(col) {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(true) }
  }

  const filtrados = lista
    .filter(a => {
      const q = search.toLowerCase()
      const nombre = (a.locatario || a.nombre_completo || a.nombre_razon_social || '')
      const matchQ = !q
        || nombre.toLowerCase().includes(q)
        || (a.rfc || '').toLowerCase().includes(q)
        || (a.email || '').toLowerCase().includes(q)
        || (a.numero_local || '').toLowerCase().includes(q)
        || (a.locales_display || '').toLowerCase().includes(q)
        || (a.telefono || '').toLowerCase().includes(q)
      const matchF = filtro === 'Todos'
        || (filtro === 'Activos'   && a.estatus !== 'INACTIVO' && a.activo !== false)
        || (filtro === 'Mora'      && parseFloat(a.total_mora) > 0)
        || (filtro === 'Pendiente' && parseFloat(a.total_pendiente) > 0 && parseFloat(a.total_mora) === 0)
        || (filtro === 'Sin local' && !a.numero_local && !a.locales_display)
      return matchQ && matchF
    })
    .sort((a, b) => {
      const va = a[sortCol] ?? ''
      const vb = b[sortCol] ?? ''
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
      return sortAsc ? cmp : -cmp
    })

  const total       = lista.length
  const activos     = lista.filter(a => a.estatus !== 'INACTIVO' && a.activo !== false).length
  const mora        = lista.filter(a => parseFloat(a.total_mora) > 0).length
  const alCorriente = lista.filter(a => parseFloat(a.total_mora) === 0 && parseFloat(a.total_pendiente) === 0 && a.estatus !== 'INACTIVO' && a.activo !== false).length

  async function eliminar(a) {
    const id = a.arrendatario_id || a.id
    const { error } = await supabase.from('arrendatarios').delete().eq('id', id)
    if (!error) {
      logAudit({ modulo: 'ARRENDATARIOS', accion: 'ELIMINAR', entidad: 'ARRENDATARIO', entidad_id: id, descripcion: `Eliminado: ${a.locatario || a.nombre_completo}` })
      setConfirm(null)
      setFicha(null)
      setReload(r => r + 1)
    }
  }

  function abrirEditar(a) {
    setFicha(null)
    setModal({
      id:               a.arrendatario_id || a.id,
      locatario:        a.locatario || a.nombre_completo || '',
      nombre_negocio:   a.nombre_negocio || '',
      rfc:              a.rfc || '',
      tipo_persona:     a.tipo_persona || 'FISICA',
      telefono:         a.telefono || '',
      email:            a.email || '',
      domicilio_fiscal: a.domicilio_fiscal || a.domicilio || '',
      estatus:          a.estatus || 'ACTIVO',
    })
  }

  const thStyle = (col) => ({
    padding: '11px 16px',
    textAlign: col === 'renta_mensual' ? 'right' : col === 'estado' ? 'center' : 'left',
    fontWeight: 600, fontSize: '11px', color: '#6B7280',
    borderBottom: '1px solid #E5E7EB', textTransform: 'uppercase',
    letterSpacing: '0.04em', whiteSpace: 'nowrap',
    cursor: SORTS.find(s => s.col === col) ? 'pointer' : 'default',
    userSelect: 'none',
    background: sortCol === col ? '#F0F9FF' : '#F9FAFB',
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1300px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Arrendatarios</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{total} registrados · {filtrados.length} en vista</p>
        </div>
        <button onClick={() => setModal('nuevo')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo arrendatario
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
        <KPICard title="Total"        value={total}       icon={Users}         color="var(--color-primary)" />
        <KPICard title="Activos"      value={activos}     icon={CheckCircle}   color="var(--color-success)" />
        <KPICard title="Al corriente" value={alCorriente} icon={CheckCircle}   color="var(--color-success)" />
        <KPICard title="Con mora"     value={mora}        icon={AlertTriangle} color="var(--color-danger)" />
      </div>

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
                        { col: 'locatario',    label: 'Arrendatario' },
                        { col: 'numero_local', label: 'Local(es)' },
                        { col: null,           label: 'Contacto' },
                        { col: 'renta_mensual', label: 'Renta/mes' },
                        { col: null,           label: 'Estado' },
                        { col: null,           label: '' },
                      ].map(({ col, label }) => (
                        <th key={label} style={thStyle(col)} onClick={() => col && toggleSort(col)}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(a => (
                      <Fila
                        key={a.arrendatario_id || a.id}
                        a={a}
                        onVerFicha={setFicha}
                        onEdit={abrirEditar}
                        onDelete={setConfirm}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
      }

      {/* Panel ficha arrendatario */}
      {ficha && (
        <FichaArrendatario
          arrendatario={{ ...ficha, id: ficha.arrendatario_id || ficha.id }}
          onClose={() => setFicha(null)}
          onEdit={abrirEditar}
        />
      )}

      {modal && (
        <ArrendatarioModal
          initial={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); setReload(r => r + 1) }}
        />
      )}

      {confirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700 }}>¿Eliminar arrendatario?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6B7280' }}>
              Se eliminará <strong>{confirm.locatario || confirm.nombre_completo}</strong> de forma permanente.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setConfirm(null)} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminar(confirm)} style={{ padding: '8px 16px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
