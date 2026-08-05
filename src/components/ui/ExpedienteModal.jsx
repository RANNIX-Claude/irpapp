import { useState, useRef, useEffect } from 'react'
import ElaborarContratoModal from './ElaborarContratoModal'
import {
  X, FileText, Upload, Download, Eye, CheckCircle, Clock,
  AlertTriangle, CreditCard, Paperclip, User, Building2,
  Phone, Mail, MapPin, Shield, Trash2, Plus
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import { logAudit } from '../../hooks/useAudit'

const TIPOS_DOC = {
  ARRENDATARIO: [
    { key: 'INE_FRENTE',            label: 'INE / Identificación (frente)',  icon: '🪪', acepta: 'image/*,application/pdf' },
    { key: 'INE_REVERSO',           label: 'INE / Identificación (reverso)', icon: '🪪', acepta: 'image/*,application/pdf' },
    { key: 'RFC_CONSTANCIA',        label: 'Constancia de situación fiscal', icon: '📋', acepta: 'application/pdf' },
    { key: 'COMPROBANTE_DOMICILIO', label: 'Comprobante de domicilio',       icon: '🏠', acepta: 'image/*,application/pdf' },
    { key: 'ESTADO_CUENTA_1',       label: 'Estado de cuenta (mes 1)',       icon: '🏦', acepta: 'application/pdf' },
    { key: 'ESTADO_CUENTA_2',       label: 'Estado de cuenta (mes 2)',       icon: '🏦', acepta: 'application/pdf' },
    { key: 'ESTADO_CUENTA_3',       label: 'Estado de cuenta (mes 3)',       icon: '🏦', acepta: 'application/pdf' },
    { key: 'ACTA_CONSTITUTIVA',     label: 'Acta constitutiva (moral)',      icon: '📜', acepta: 'application/pdf' },
    { key: 'PODER_NOTARIAL',        label: 'Poder notarial (moral)',         icon: '⚖️', acepta: 'application/pdf' },
    { key: 'REFERENCIAS_COMERCIALES',label: 'Referencias comerciales',      icon: '📞', acepta: 'application/pdf' },
  ],
  EMPLEADO: [
    { key: 'INE_FRENTE',            label: 'INE (frente)',                  icon: '🪪', acepta: 'image/*,application/pdf' },
    { key: 'INE_REVERSO',           label: 'INE (reverso)',                 icon: '🪪', acepta: 'image/*,application/pdf' },
    { key: 'RFC_CONSTANCIA',        label: 'Constancia fiscal / RFC',       icon: '📋', acepta: 'application/pdf' },
    { key: 'CURP',                  label: 'CURP',                          icon: '📄', acepta: 'image/*,application/pdf' },
    { key: 'COMPROBANTE_DOMICILIO', label: 'Comprobante de domicilio',      icon: '🏠', acepta: 'image/*,application/pdf' },
    { key: 'ACTA_NACIMIENTO',       label: 'Acta de nacimiento',            icon: '👶', acepta: 'application/pdf' },
    { key: 'ESTUDIO_SOCIOECONOMICO',label: 'Estudio socioeconómico',        icon: '📊', acepta: 'application/pdf' },
    { key: 'TITULO_PROFESIONAL',    label: 'Título / Cédula profesional',   icon: '🎓', acepta: 'application/pdf' },
    { key: 'CONTRATO_FIRMADO',      label: 'Contrato firmado',              icon: '✍️', acepta: 'application/pdf' },
  ],
}

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

function EstatusDoc({ estatus }) {
  const s = { APROBADO: { bg: '#D1FAE5', c: '#057642' }, PENDIENTE: { bg: '#FEF3C7', c: '#D97706' }, RECHAZADO: { bg: '#FEE2E2', c: '#B24020' } }[estatus] || { bg: '#F3F4F6', c: '#6B7280' }
  return <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: s.bg, color: s.c }}>{estatus}</span>
}

export default function ExpedienteModal({ entidad, entidadTipo = 'ARRENDATARIO', titulo, onClose }) {
  const [tab, setTab] = useState('resumen')
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [showElaborar, setShowElaborar] = useState(false)
  const [uploading, setUploading] = useState(null)
  const fileRefs = useRef({})

  const tiposDocs = TIPOS_DOC[entidadTipo] || TIPOS_DOC.ARRENDATARIO

  useEffect(() => {
    if (!entidad) return
    if (tab === 'documentos') cargarDocs()
  }, [tab, entidad])

  const cargarDocs = async () => {
    setDocsLoading(true)
    const { data } = await supabase.from('documentos')
      .select('*').eq('entidad_tipo', entidadTipo).eq('entidad_id', entidad.arrendatario_id || entidad.id)
    setDocsLoading(false)
    setDocs(data ?? [])
  }

  const subirDoc = async (tipoDoc, file) => {
    setUploading(tipoDoc)
    const entidadId = entidad.arrendatario_id || entidad.id
    const ext = file.name.split('.').pop()
    const path = `${entidadTipo.toLowerCase()}/${entidadId}/${tipoDoc}.${ext}`
    const { error: upErr } = await supabase.storage.from('expedientes-docs').upload(path, file, { upsert: true })
    if (upErr) { setUploading(null); alert('Error: ' + upErr.message); return }
    const { data: { publicUrl } } = supabase.storage.from('expedientes-docs').getPublicUrl(path)
    // Upsert en documentos
    const existing = docs.find(d => d.tipo_doc === tipoDoc)
    if (existing) {
      await supabase.from('documentos').update({ url: publicUrl, nombre_archivo: file.name, estatus: 'PENDIENTE' }).eq('id', existing.id)
    } else {
      await supabase.from('documentos').insert({ entidad_tipo: entidadTipo, entidad_id: entidadId, tipo_doc: tipoDoc, url: publicUrl, nombre_archivo: file.name, estatus: 'PENDIENTE' })
    }
    logAudit({ modulo: entidadTipo, accion: 'SUBIR_DOCUMENTO', entidad: tipoDoc, entidad_id: entidadId, descripcion: `Documento ${tipoDoc} subido: ${file.name}` })
    setUploading(null)
    cargarDocs()
  }

  const cambiarEstatus = async (docId, estatus) => {
    await supabase.from('documentos').update({ estatus }).eq('id', docId)
    cargarDocs()
  }

  if (!entidad) return null

  const cobrosOk = parseFloat(entidad.total_mora || 0) === 0 && parseFloat(entidad.total_pendiente || 0) === 0
  const pctDocs = (() => {
    const requeridos = entidad.tipo_persona === 'MORAL' ? tiposDocs.length : tiposDocs.filter(d => !['ACTA_CONSTITUTIVA','PODER_NOTARIAL'].includes(d.key)).length
    return requeridos > 0 ? Math.round((docs.length / requeridos) * 100) : 0
  })()

  const Tab = ({ id, label, icon: Icon }) => (
    <button onClick={() => setTab(id)} style={{
      display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 14px',
      background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
      borderBottom: tab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
      color: tab === id ? 'var(--color-primary)' : 'var(--color-text-light)',
      fontWeight: tab === id ? 700 : 400, fontSize: '13px',
    }}>
      <Icon size={14} />{label}
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: 800, flexShrink: 0 }}>
                {(entidad.nombre_completo || titulo || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>{entidadTipo} · Expediente</div>
                <h2 style={{ margin: '2px 0', fontSize: '18px', fontWeight: 800 }}>{entidad.nombre_completo || titulo}</h2>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-light)' }}>
                  {entidad.rfc && <span style={{ fontFamily: 'monospace' }}>{entidad.rfc}</span>}
                  {entidad.telefono && <span>{entidad.telefono}</span>}
                  <span style={{ color: entidad.activo !== false ? 'var(--color-success)' : '#9CA3AF', fontWeight: 600 }}>
                    {entidad.activo !== false ? '● Activo' : '● Inactivo'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            <Tab id="resumen"    label="Resumen"        icon={User} />
            <Tab id="contrato"   label="Contrato"       icon={FileText} />
            <Tab id="cobranza"   label="Cobranza"       icon={CreditCard} />
            <Tab id="documentos" label="Documentos"     icon={Paperclip} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── RESUMEN ── */}
          {tab === 'resumen' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* KPIs rápidos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                {[
                  { label: 'Total pagado', val: fmt(entidad.total_pagado), color: 'var(--color-success)', icon: CheckCircle },
                  { label: 'Pendiente', val: fmt(entidad.total_pendiente), color: 'var(--color-warning)', icon: Clock },
                  { label: 'En mora', val: fmt(entidad.total_mora), color: parseFloat(entidad.total_mora) > 0 ? 'var(--color-danger)' : '#9CA3AF', icon: AlertTriangle },
                ].map(k => (
                  <div key={k.label} style={{ background: '#F9FAFB', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <k.icon size={18} color={k.color} style={{ marginBottom: '6px' }} />
                    <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>
              {/* Datos de contacto */}
              <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '10px' }}>Datos de contacto</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {entidad.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}><Mail size={14} color="#9CA3AF" />{entidad.email}</div>}
                  {entidad.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}><Phone size={14} color="#9CA3AF" />{entidad.telefono}{entidad.whatsapp && entidad.whatsapp !== entidad.telefono ? ` · WA: ${entidad.whatsapp}` : ''}</div>}
                  {entidad.domicilio && <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}><MapPin size={14} color="#9CA3AF" style={{ marginTop: '2px' }} />{entidad.domicilio}</div>}
                </div>
              </div>
              {/* Local */}
              {entidad.inmueble_nombre && (
                <div style={{ background: '#EFF6FF', borderRadius: '10px', padding: '16px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Local arrendado</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Building2 size={20} color="var(--color-primary)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{entidad.inmueble_nombre} — {entidad.numero_local}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{entidad.tipo_unidad} · {entidad.metros_cuadrados}m² · {fmt(entidad.renta_mensual)}/mes</div>
                    </div>
                  </div>
                </div>
              )}
              {/* Estado de cuenta rápido */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: cobrosOk ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${cobrosOk ? '#6EE7B7' : '#FCA5A5'}` }}>
                {cobrosOk ? <CheckCircle size={18} color="var(--color-success)" /> : <AlertTriangle size={18} color="var(--color-danger)" />}
                <span style={{ fontSize: '13px', fontWeight: 700, color: cobrosOk ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {cobrosOk ? 'Al corriente — sin saldos pendientes' : `Saldo pendiente ${fmt(parseFloat(entidad.total_pendiente || 0) + parseFloat(entidad.total_mora || 0))}`}
                </span>
              </div>
            </div>
          )}

          {/* ── CONTRATO ── */}
          {tab === 'contrato' && (
            <div style={{ display: 'grid', gap: '14px' }}>
              {entidad.contrato_id ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
                    {[
                      ['Tipo', entidad.tipo_contrato],
                      ['Renta mensual', fmt(entidad.renta_mensual)],
                      ['Depósito garantía', fmt(entidad.deposito_garantia)],
                      ['Día límite pago', entidad.dia_limite_pago ? `Día ${entidad.dia_limite_pago}` : null],
                      ['Mora', entidad.penalizacion_mora_pct ? `${entidad.penalizacion_mora_pct}%` : null],
                      ['Inicio', entidad.fecha_inicio],
                      ['Vencimiento', entidad.fecha_fin || 'Tiempo indeterminado'],
                      ['Giro autorizado', entidad.giro_autorizado],
                      ['Cuenta BBVA', entidad.cuenta_banco_pago],
                      ['CLABE', entidad.clabe_interbancaria],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ fontSize: '13px' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  {entidad.fiador_nombre && (
                    <div style={{ padding: '14px', background: '#FFF8F0', borderRadius: '10px', border: '1px solid #FBBF24' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '6px' }}><Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />Fiador / Aval</div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{entidad.fiador_nombre}</div>
                      {entidad.fiador_rfc && <div style={{ fontSize: '12px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{entidad.fiador_rfc}</div>}
                    </div>
                  )}
                  {entidad.archivo_contrato_url && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <a href={entidad.archivo_contrato_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--color-primary)', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                        <Eye size={14} /> Ver contrato firmado (PDF)
                      </a>
                      <a href={entidad.archivo_contrato_url} download style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#F3F4F6', color: 'var(--color-text)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                        <Download size={14} /> Descargar
                      </a>
                    </div>
                  )}
                  {!entidad.archivo_contrato_url && (
                    <div style={{ padding: '16px', background: '#FEF3C7', borderRadius: '10px', border: '1px dashed #FBBF24', textAlign: 'center', fontSize: '13px', color: '#D97706' }}>
                      ⚠️ El contrato firmado (PDF) aún no ha sido adjuntado
                    </div>
                  )}
                  {/* Botón Elaborar Contrato */}
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                    <button
                      onClick={() => setShowElaborar(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      <Download size={15} /> Elaborar Contrato Word + Pagarés
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-light)' }}>
                  <FileText size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                  <div style={{ fontWeight: 700 }}>Sin contrato activo</div>
                  <div style={{ marginTop: '16px' }}>
                    <button
                      onClick={() => setShowElaborar(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      <Download size={15} /> Elaborar Contrato
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {showElaborar && (
            <ElaborarContratoModal
              prospecto={{
                nombre: entidad.nombre || '',
                apellidos: entidad.apellidos || '',
                domicilio: entidad.domicilio || '',
                rfc: entidad.rfc || '',
                telefono: entidad.telefono || '',
                giro_solicitado: entidad.giro_autorizado || '',
                fiador_nombre: entidad.fiador_nombre || '',
                fiador_telefono: '',
                fiador_domicilio: entidad.fiador_domicilio || '',
                monto_ofertado: entidad.renta_mensual || '',
              }}
              unidad={{ numero_local: entidad.unidad_numero || '' }}
              onClose={() => setShowElaborar(false)}
            />
          )}

          {/* ── COBRANZA ── */}
          {tab === 'cobranza' && (
            <CobranzaTab arrendatarioId={entidad.arrendatario_id} contratoId={entidad.contrato_id} />
          )}

          {/* ── DOCUMENTOS ── */}
          {tab === 'documentos' && (
            <div style={{ display: 'grid', gap: '8px' }}>
              {docsLoading
                ? <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><LoadingSpinner /></div>
                : tiposDocs.map(tipo => {
                    const doc = docs.find(d => d.tipo_doc === tipo.key)
                    const isUploading = uploading === tipo.key
                    const esMoral = entidad.tipo_persona === 'MORAL'
                    const soloMoral = ['ACTA_CONSTITUTIVA','PODER_NOTARIAL'].includes(tipo.key)
                    if (soloMoral && !esMoral) return null
                    return (
                      <div key={tipo.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: doc ? '#F0FDF4' : '#F9FAFB', borderRadius: '10px', border: `1px solid ${doc ? '#BBF7D0' : '#E5E7EB'}` }}>
                        <div style={{ fontSize: '22px', flexShrink: 0 }}>{tipo.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{tipo.label}</div>
                          {doc && <div style={{ fontSize: '11px', color: 'var(--color-text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre_archivo}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                          {doc && <EstatusDoc estatus={doc.estatus} />}
                          {doc && (
                            <>
                              <a href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'var(--color-primary)', color: 'white', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
                                <Eye size={12} />
                              </a>
                              {doc.estatus !== 'APROBADO' && (
                                <button onClick={() => cambiarEstatus(doc.id, 'APROBADO')} style={{ padding: '5px 8px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>✓</button>
                              )}
                            </>
                          )}
                          <input ref={el => fileRefs.current[tipo.key] = el} type="file" accept={tipo.acepta} style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) subirDoc(tipo.key, f) }} />
                          <button onClick={() => fileRefs.current[tipo.key]?.click()} disabled={isUploading} style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                            background: doc ? '#F3F4F6' : 'var(--color-primary)', color: doc ? 'var(--color-text)' : 'white',
                            border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          }}>
                            {isUploading ? '...' : doc ? <><Upload size={11} /> Reemplazar</> : <><Plus size={11} /> Subir</>}
                          </button>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Subcomponente: historial de cobros del arrendatario
function CobranzaTab({ arrendatarioId, contratoId }) {
  const [cobros, setCobros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contratoId) { setLoading(false); return }
    supabase.from('cobros_programados').select('*').eq('contrato_id', contratoId).order('anio', { ascending: false }).order('mes', { ascending: false })
      .then(({ data }) => { setCobros(data ?? []); setLoading(false) })
  }, [contratoId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><LoadingSpinner /></div>
  if (!contratoId) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-light)' }}>Sin contrato activo</div>
  if (!cobros.length) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-light)' }}>Sin cobros registrados</div>

  const COLORES = { PAGADO: '#057642', PENDIENTE: '#D97706', EN_MORA: '#B24020', VENCIDO: '#B24020' }
  const totalPagado = cobros.filter(c => c.estatus === 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totalPendiente = cobros.filter(c => c.estatus !== 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_total) || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#D1FAE5', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#057642', textTransform: 'uppercase' }}>Total pagado</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#057642' }}>${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</div>
        </div>
        <div style={{ background: totalPendiente > 0 ? '#FEE2E2' : '#F3F4F6', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: totalPendiente > 0 ? '#B24020' : '#9CA3AF', textTransform: 'uppercase' }}>Saldo pendiente</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: totalPendiente > 0 ? '#B24020' : '#9CA3AF' }}>${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</div>
        </div>
      </div>
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden' }}>
        {cobros.map(c => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: '14px', padding: '11px 16px', borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{c.referencia_pago}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Mes {c.mes}/{c.anio}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>${parseFloat(c.monto_total).toLocaleString()}</div>
              {c.fecha_pago_real && <div style={{ fontSize: '10px', color: 'var(--color-text-light)' }}>Pagado {c.fecha_pago_real}</div>}
            </div>
            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: (COLORES[c.estatus] || '#9CA3AF') + '20', color: COLORES[c.estatus] || '#9CA3AF' }}>{c.estatus}</span>
            {c.forma_pago && <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{c.forma_pago}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
