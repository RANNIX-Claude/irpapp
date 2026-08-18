import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes ─────────────────────────────────────────────────────────────
const ETAPAS = [
  { id: 'CONTACTO',       label: 'Contacto',       color: '#6B7280' },
  { id: 'CANDIDATO',      label: 'Candidato',       color: '#0A66C2' },
  { id: 'DOCS_PENDIENTES',label: 'Docs pendientes', color: '#F59E0B' },
  { id: 'DOCS_COMPLETOS', label: 'Docs completos',  color: '#8B5CF6' },
  { id: 'INVESTIGACION',  label: 'Investigación',   color: '#E8A020' },
  { id: 'APROBADO',       label: 'Aprobado',        color: '#057642' },
  { id: 'RECHAZADO',      label: 'Rechazado',       color: '#B24020' },
  { id: 'CONTRATO',       label: 'Contrato',        color: '#1A3C5E' },
]

const TIPOS_PERSONA = {
  INQUILINO:         'Inquilino / Arrendatario',
  OBLIGADO_SOLIDARIO:'Obligado Solidario',
  FIADOR:            'Fiador',
}

const LABEL_DOC = {
  INE_FRENTE:               'INE (frente)',
  INE_REVERSO:              'INE (reverso)',
  PASAPORTE:                'Pasaporte',
  COMPROBANTE_INGRESOS_1:   'Comprobante ingresos (mes 1)',
  COMPROBANTE_INGRESOS_2:   'Comprobante ingresos (mes 2)',
  COMPROBANTE_INGRESOS_3:   'Comprobante ingresos (mes 3)',
  COMPROBANTE_DOMICILIO:    'Comprobante de domicilio',
  ESCRITURA_INMUEBLE:       'Escritura inmueble en garantía',
  SOLICITUD_FIRMADA:        'Solicitud de arrendamiento firmada',
}

const ESTADO_DOC_COLOR = {
  PENDIENTE:  { bg: '#FEF3C7', text: '#92400E' },
  SUBIDO:     { bg: '#DBEAFE', text: '#1E40AF' },
  APROBADO:   { bg: '#D1FAE5', text: '#065F46' },
  RECHAZADO:  { bg: '#FEE2E2', text: '#991B1B' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const etapaInfo = (id) => ETAPAS.find(e => e.id === id) || ETAPAS[0]

const Badge = ({ etapa }) => {
  const info = etapaInfo(etapa)
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: info.color + '22', color: info.color, border: `1px solid ${info.color}44`
    }}>{info.label}</span>
  )
}

// ─── Modal: Nuevo Prospecto ──────────────────────────────────────────────────
function ModalNuevoProspecto({ onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre_negocio: '', renta_propuesta: '', notas: '',
    // primera persona (inquilino)
    persona_nombre: '', persona_email: '', persona_cel: '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    if (!form.persona_nombre || !form.persona_email) {
      alert('Nombre y email del inquilino son obligatorios')
      return
    }
    setLoading(true)
    try {
      const { data: pros, error: e1 } = await supabase
        .from('prospectos')
        .insert({ nombre_negocio: form.nombre_negocio, renta_propuesta: form.renta_propuesta || null, notas: form.notas })
        .select().single()
      if (e1) throw e1

      const { error: e2 } = await supabase.from('prospecto_personas').insert({
        prospecto_id: pros.id,
        tipo: 'INQUILINO',
        nombre_completo: form.persona_nombre,
        email: form.persona_email,
        cel: form.persona_cel,
      })
      if (e2) throw e2

      onSaved()
      onClose()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#0006', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'white', borderRadius:12, width:500, padding:28, boxShadow:'0 20px 60px #0003' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:700 }}>Nuevo Prospecto</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9CA3AF' }}>×</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Nombre / Giro del negocio</label>
            <input value={form.nombre_negocio} onChange={e => set('nombre_negocio', e.target.value)}
              style={inputStyle} placeholder="Ej: Farmacia del Ahorro, Locutorio, etc." />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Renta propuesta ($)</label>
            <input type="number" value={form.renta_propuesta} onChange={e => set('renta_propuesta', e.target.value)}
              style={inputStyle} placeholder="0.00" />
          </div>

          <div style={{ borderTop:'1px solid #E5E7EB', paddingTop:12, marginTop:4 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#0A66C2', margin:'0 0 10px' }}>DATOS DEL INQUILINO PRINCIPAL</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={form.persona_nombre} onChange={e => set('persona_nombre', e.target.value)}
                style={inputStyle} placeholder="Nombre completo *" />
              <input type="email" value={form.persona_email} onChange={e => set('persona_email', e.target.value)}
                style={inputStyle} placeholder="Correo electrónico *" />
              <input value={form.persona_cel} onChange={e => set('persona_cel', e.target.value)}
                style={inputStyle} placeholder="Celular" />
            </div>
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
              style={{ ...inputStyle, height:70, resize:'vertical' }} placeholder="Observaciones iniciales..." />
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={onClose} style={btnSecundario}>Cancelar</button>
          <button onClick={guardar} disabled={loading} style={btnPrimario}>
            {loading ? 'Guardando...' : 'Crear Prospecto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel de detalle del prospecto ──────────────────────────────────────────
function PanelDetalle({ prospecto, onClose, onRefresh, onMagicLink }) {
  const [personas, setPersonas] = useState([])
  const [docs, setDocs] = useState([])
  const [tab, setTab] = useState('personas')
  const [modalPersona, setModalPersona] = useState(false)
  const [enviandoLink, setEnviandoLink] = useState(null)

  const cargar = useCallback(async () => {
    const { data: p } = await supabase.from('prospecto_personas')
      .select('*').eq('prospecto_id', prospecto.id).order('tipo')
    setPersonas(p || [])

    if (p?.length) {
      const ids = p.map(x => x.id)
      const { data: d } = await supabase.from('prospecto_documentos')
        .select('*').in('persona_id', ids).order('tipo_doc')
      setDocs(d || [])
    }
  }, [prospecto.id])

  useEffect(() => { cargar() }, [cargar])

  const avanzarEtapa = async (nueva) => {
    await supabase.from('prospectos').update({ etapa: nueva, updated_at: new Date().toISOString() }).eq('id', prospecto.id)
    await supabase.from('prospecto_historial').insert({ prospecto_id: prospecto.id, etapa_anterior: prospecto.etapa, etapa_nueva: nueva })
    onRefresh()
  }

  const aprobarDoc = async (docId) => {
    await supabase.from('prospecto_documentos').update({ estado: 'APROBADO', revisado_at: new Date().toISOString() }).eq('id', docId)
    cargar()
  }

  const rechazarDoc = async (docId) => {
    const nota = prompt('Motivo del rechazo:')
    if (!nota) return
    await supabase.from('prospecto_documentos').update({ estado: 'RECHAZADO', nota_rechazo: nota, revisado_at: new Date().toISOString() }).eq('id', docId)
    cargar()
  }

  const enviarMagicLink = async (persona) => {
    setEnviandoLink(persona.id)
    try {
      const { data: link, error } = await supabase.from('prospecto_magic_links').insert({
        persona_id: persona.id,
        email_destino: persona.email,
      }).select().single()
      if (error) throw error
      const url = `${import.meta.env.VITE_APP_URL}/portal/prospecto/${link.token}`
      onMagicLink({ url, persona })
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setEnviandoLink(null)
    }
  }

  const docsPersona = (personaId) => docs.filter(d => d.persona_id === personaId)

  const etapaSig = () => {
    const idx = ETAPAS.findIndex(e => e.id === prospecto.etapa)
    return idx < ETAPAS.length - 2 ? ETAPAS[idx + 1] : null
  }
  const siguiente = etapaSig()

  return (
    <div style={{ position:'fixed', inset:0, background:'#0006', zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
      <div style={{ background:'white', width:700, height:'100%', overflow:'auto', boxShadow:'-4px 0 30px #0002' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #E5E7EB', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:12, color:'#6B7280', fontWeight:600, marginBottom:4 }}>
              {prospecto.folio || `PROS-${prospecto.id.substr(0,8)}`}
            </div>
            <h2 style={{ margin:'0 0 6px', fontSize:20, fontWeight:800 }}>{prospecto.nombre_negocio || 'Sin nombre'}</h2>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Badge etapa={prospecto.etapa} />
              {prospecto.renta_propuesta && (
                <span style={{ fontSize:13, color:'#057642', fontWeight:700 }}>
                  ${Number(prospecto.renta_propuesta).toLocaleString('es-MX')} / mes
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF' }}>×</button>
        </div>

        {/* Pipeline visual */}
        <div style={{ padding:'12px 24px', background:'#F8FAFC', borderBottom:'1px solid #E5E7EB', display:'flex', gap:4, flexWrap:'wrap' }}>
          {ETAPAS.filter(e => e.id !== 'RECHAZADO').map((e, i) => {
            const activa = e.id === prospecto.etapa
            const pasada = ETAPAS.findIndex(x => x.id === prospecto.etapa) > i
            return (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{
                  padding:'4px 10px', borderRadius:99, fontSize:11, fontWeight:700,
                  background: activa ? e.color : pasada ? e.color + '33' : '#F3F4F6',
                  color: activa ? 'white' : pasada ? e.color : '#9CA3AF',
                }}>{e.label}</div>
                {i < ETAPAS.filter(e => e.id !== 'RECHAZADO').length - 1 && (
                  <span style={{ color:'#D1D5DB', fontSize:10 }}>›</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'2px solid #E5E7EB', padding:'0 24px' }}>
          {[['personas','Personas'], ['documentos','Documentos'], ['notas','Historial']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background:'none', border:'none', padding:'12px 16px', fontSize:13, fontWeight:700, cursor:'pointer',
              color: tab === id ? '#0A66C2' : '#6B7280',
              borderBottom: tab === id ? '2px solid #0A66C2' : '2px solid transparent',
              marginBottom: -2,
            }}>{label}</button>
          ))}
        </div>

        <div style={{ padding:24 }}>
          {/* ── TAB: Personas ── */}
          {tab === 'personas' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <h4 style={{ margin:0, fontSize:15, fontWeight:700 }}>Personas del expediente</h4>
                <button onClick={() => setModalPersona(true)} style={btnPrimario}>+ Agregar persona</button>
              </div>
              {personas.length === 0 && <p style={{ color:'#9CA3AF', textAlign:'center', marginTop:40 }}>Sin personas registradas</p>}
              {personas.map(p => {
                const dsp = docsPersona(p.id)
                const aprobados = dsp.filter(d => d.estado === 'APROBADO').length
                const subidos   = dsp.filter(d => d.estado === 'SUBIDO').length
                const pendientes= dsp.filter(d => d.estado === 'PENDIENTE').length
                const pct = dsp.length ? Math.round((aprobados / dsp.length) * 100) : 0
                return (
                  <div key={p.id} style={{ border:'1px solid #E5E7EB', borderRadius:10, padding:16, marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'#0A66C2', marginBottom:2 }}>
                          {TIPOS_PERSONA[p.tipo]}
                        </div>
                        <div style={{ fontSize:15, fontWeight:700 }}>{p.nombre_completo || '(sin nombre)'}</div>
                        <div style={{ fontSize:12, color:'#6B7280' }}>{p.email} {p.cel ? `· ${p.cel}` : ''}</div>
                      </div>
                      <button
                        onClick={() => enviarMagicLink(p)}
                        disabled={!p.email || enviandoLink === p.id}
                        style={{ ...btnPrimario, fontSize:11, padding:'5px 12px' }}>
                        {enviandoLink === p.id ? 'Enviando...' : '📧 Enviar link'}
                      </button>
                    </div>
                    {/* Barra de progreso docs */}
                    <div style={{ marginTop:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#6B7280', marginBottom:4 }}>
                        <span>Documentos: {aprobados}/{dsp.length} aprobados</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height:6, background:'#E5E7EB', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background: pct === 100 ? '#057642' : '#0A66C2', borderRadius:99 }} />
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:6, fontSize:11 }}>
                        {pendientes > 0 && <span style={{ color:'#F59E0B', fontWeight:600 }}>⏳ {pendientes} pendientes</span>}
                        {subidos   > 0 && <span style={{ color:'#0A66C2', fontWeight:600 }}>📎 {subidos} por revisar</span>}
                        {aprobados > 0 && <span style={{ color:'#057642', fontWeight:600 }}>✓ {aprobados} aprobados</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TAB: Documentos ── */}
          {tab === 'documentos' && (
            <div>
              <h4 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700 }}>Revisión de documentos</h4>
              {personas.map(p => (
                <div key={p.id} style={{ marginBottom:24 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0A66C2', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>
                    {TIPOS_PERSONA[p.tipo]} — {p.nombre_completo || p.email}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {docsPersona(p.id).map(doc => {
                      const col = ESTADO_DOC_COLOR[doc.estado] || ESTADO_DOC_COLOR.PENDIENTE
                      return (
                        <div key={doc.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, border:'1px solid #E5E7EB' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontSize:16 }}>
                              {doc.estado === 'APROBADO' ? '✅' : doc.estado === 'RECHAZADO' ? '❌' : doc.estado === 'SUBIDO' ? '📎' : '⬜'}
                            </span>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600 }}>{LABEL_DOC[doc.tipo_doc]}</div>
                              {doc.nota_rechazo && <div style={{ fontSize:11, color:'#B24020' }}>↳ {doc.nota_rechazo}</div>}
                              {doc.nombre_archivo && <div style={{ fontSize:11, color:'#6B7280' }}>{doc.nombre_archivo}</div>}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700, background: col.bg, color: col.text }}>
                              {doc.estado}
                            </span>
                            {doc.estado === 'SUBIDO' && (
                              <>
                                <button onClick={() => aprobarDoc(doc.id)} style={{ ...btnMini, background:'#D1FAE5', color:'#065F46' }}>✓ Aprobar</button>
                                <button onClick={() => rechazarDoc(doc.id)} style={{ ...btnMini, background:'#FEE2E2', color:'#991B1B' }}>✗ Rechazar</button>
                              </>
                            )}
                            {doc.storage_path && (
                              <a href={doc.storage_path} target="_blank" rel="noreferrer"
                                style={{ ...btnMini, background:'#EFF6FF', color:'#0A66C2', textDecoration:'none' }}>Ver</a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: Historial ── */}
          {tab === 'notas' && (
            <div>
              <h4 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700 }}>Historial de etapas</h4>
              <HistorialProspecto prospectoId={prospecto.id} />
              {prospecto.notas && (
                <div style={{ marginTop:16, padding:12, background:'#F8FAFC', borderRadius:8, border:'1px solid #E5E7EB' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:4 }}>NOTAS</div>
                  <p style={{ margin:0, fontSize:13 }}>{prospecto.notas}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — acciones de etapa */}
        <div style={{ borderTop:'1px solid #E5E7EB', padding:'16px 24px', display:'flex', gap:8, justifyContent:'space-between' }}>
          {prospecto.etapa === 'RECHAZADO' ? (
            <button
              onClick={() => avanzarEtapa('CONTACTO')}
              style={{ ...btnSecundario, color:'#0A66C2', borderColor:'#BFDBFE' }}>
              ↺ Reactivar prospecto
            </button>
          ) : (
            <button
              onClick={() => {
                const motivo = prompt('Motivo del rechazo (requerido):')
                if (motivo) avanzarEtapa('RECHAZADO')
              }}
              style={{ ...btnSecundario, color:'#B24020', borderColor:'#FECACA' }}>
              Rechazar
            </button>
          )}
          {siguiente && prospecto.etapa !== 'RECHAZADO' && (
            <button onClick={() => avanzarEtapa(siguiente.id)} style={btnPrimario}>
              Avanzar a {siguiente.label} →
            </button>
          )}
        </div>
      </div>

      {modalPersona && (
        <ModalAgregarPersona
          prospectoId={prospecto.id}
          onClose={() => setModalPersona(false)}
          onSaved={cargar}
        />
      )}
    </div>
  )
}

// ─── Modal: Agregar Persona ──────────────────────────────────────────────────
function ModalAgregarPersona({ prospectoId, onClose, onSaved }) {
  const [tipo, setTipo] = useState('FIADOR')
  const [form, setForm] = useState({ nombre_completo:'', email:'', cel:'', rfc:'', curp:'' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    if (!form.nombre_completo || !form.email) { alert('Nombre y email obligatorios'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('prospecto_personas').insert({ prospecto_id: prospectoId, tipo, ...form })
      if (error) throw error
      onSaved(); onClose()
    } catch (err) { alert('Error: ' + err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#0005', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'white', borderRadius:12, width:420, padding:24 }}>
        <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700 }}>Agregar Persona</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputStyle}>
              {Object.entries(TIPOS_PERSONA).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <input style={inputStyle} placeholder="Nombre completo *" value={form.nombre_completo} onChange={e => set('nombre_completo', e.target.value)} />
          <input style={inputStyle} placeholder="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <input style={inputStyle} placeholder="Celular" value={form.cel} onChange={e => set('cel', e.target.value)} />
          <input style={inputStyle} placeholder="RFC" value={form.rfc} onChange={e => set('rfc', e.target.value)} />
          <input style={inputStyle} placeholder="CURP" value={form.curp} onChange={e => set('curp', e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={onClose} style={btnSecundario}>Cancelar</button>
          <button onClick={guardar} disabled={loading} style={btnPrimario}>{loading ? 'Guardando...' : 'Agregar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Historial de etapas ─────────────────────────────────────────────────────
function HistorialProspecto({ prospectoId }) {
  const [items, setItems] = useState([])
  useEffect(() => {
    supabase.from('prospecto_historial')
      .select('*').eq('prospecto_id', prospectoId).order('created_at', { ascending: false })
      .then(({ data }) => setItems(data || []))
  }, [prospectoId])

  if (!items.length) return <p style={{ color:'#9CA3AF', fontSize:13 }}>Sin cambios de etapa registrados.</p>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {items.map(h => (
        <div key={h.id} style={{ display:'flex', gap:10, fontSize:12 }}>
          <span style={{ color:'#9CA3AF', whiteSpace:'nowrap' }}>{new Date(h.created_at).toLocaleDateString('es-MX')}</span>
          <span>
            {h.etapa_anterior && <><Badge etapa={h.etapa_anterior} /> → </>}
            <Badge etapa={h.etapa_nueva} />
          </span>
          {h.nota && <span style={{ color:'#6B7280' }}>— {h.nota}</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
// ─── Modal: Compartir link (WhatsApp + Email + Copiar) ───────────────────────
function ModalCompartirLink({ link, onClose }) {
  const { url, persona } = link
  const [copiado, setCopiado] = useState(false)

  const nombre   = persona.nombre_completo || 'Estimado(a)'
  const primerNombre = nombre.split(' ')[0]

  const mensajeBase = `Hola ${primerNombre}, te envío el enlace para que subas tu documentación del proceso de arrendamiento. Tienes 7 días para completarla:\n${url}`

  const copiar = () => {
    navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const abrirWhatsApp = () => {
    const tel = (persona.cel || '').replace(/\D/g, '')
    const num = tel.startsWith('52') ? tel : `52${tel}`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(mensajeBase)}`, '_blank')
  }

  const abrirEmail = () => {
    const asunto = 'Expediente de arrendamiento — sube tus documentos'
    const cuerpo = `${mensajeBase}\n\nEste enlace expira en 7 días.\nCualquier duda, comunícate con el administrador.`
    window.open(`mailto:${persona.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`, '_blank')
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#0006', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:440, padding:28, boxShadow:'0 20px 60px #0003' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>Enviar enlace al prospecto</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9CA3AF' }}>×</button>
        </div>

        <div style={{ background:'#F8FAFC', borderRadius:10, padding:12, marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:4 }}>DESTINATARIO</div>
          <div style={{ fontWeight:700 }}>{persona.nombre_completo || '—'}</div>
          <div style={{ fontSize:12, color:'#6B7280' }}>
            {persona.email && <span>✉ {persona.email}</span>}
            {persona.email && persona.cel && <span> · </span>}
            {persona.cel && <span>📱 {persona.cel}</span>}
          </div>
        </div>

        <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:8 }}>ENVIAR POR</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {/* WhatsApp */}
          <button onClick={abrirWhatsApp} disabled={!persona.cel}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10, border:'none',
              cursor: persona.cel ? 'pointer' : 'not-allowed',
              background: persona.cel ? '#25D366' : '#E5E7EB', color: persona.cel ? 'white' : '#9CA3AF',
              fontSize:14, fontWeight:700, textAlign:'left' }}>
            <span style={{ fontSize:22 }}>💬</span>
            <div>
              <div>Enviar por WhatsApp</div>
              {!persona.cel && <div style={{ fontSize:11, fontWeight:400, opacity:0.8 }}>Sin número de celular registrado</div>}
            </div>
          </button>

          {/* Email */}
          <button onClick={abrirEmail} disabled={!persona.email}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10, border:'none',
              cursor: persona.email ? 'pointer' : 'not-allowed',
              background: persona.email ? '#0A66C2' : '#E5E7EB', color: persona.email ? 'white' : '#9CA3AF',
              fontSize:14, fontWeight:700, textAlign:'left' }}>
            <span style={{ fontSize:22 }}>✉️</span>
            <div>
              <div>Enviar por correo electrónico</div>
              {persona.email && <div style={{ fontSize:11, fontWeight:400, opacity:0.8 }}>{persona.email}</div>}
            </div>
          </button>
        </div>

        {/* Copiar link */}
        <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:6 }}>O COPIAR ENLACE</div>
        <div style={{ display:'flex', gap:8 }}>
          <input readOnly value={url}
            style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1.5px solid #E5E7EB', fontSize:11, color:'#6B7280', fontFamily:'monospace', background:'#F8FAFC', outline:'none' }} />
          <button onClick={copiar}
            style={{ padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer',
              background: copiado ? '#057642' : '#374151', color:'white', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
            {copiado ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        <div style={{ fontSize:11, color:'#9CA3AF', marginTop:14, textAlign:'center' }}>
          El enlace expira en 7 días · El prospecto sube sus docs y los de su fiador/aval
        </div>
      </div>
    </div>
  )
}

export default function Prospectos() {
  const [prospectos, setProspectos] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtroEtapa, setFiltroEtapa] = useState('ALL')
  const [busqueda, setBusqueda]     = useState('')
  const [seleccionado, setSeleccionado] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalLink, setModalLink]   = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('prospectos')
      .select('*').order('created_at', { ascending: false })
    setProspectos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar, refreshKey])

  const refresh = () => setRefreshKey(k => k + 1)

  const filtrados = prospectos.filter(p => {
    const matchEtapa = filtroEtapa === 'ALL' || p.etapa === filtroEtapa
    const matchBusq  = !busqueda || p.nombre_negocio?.toLowerCase().includes(busqueda.toLowerCase())
    return matchEtapa && matchBusq
  })

  // KPIs
  const kpis = ETAPAS.reduce((acc, e) => {
    acc[e.id] = prospectos.filter(p => p.etapa === e.id).length
    return acc
  }, {})

  return (
    <div style={{ padding:24, fontFamily:'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800 }}>Prospectos / CRM</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'#6B7280' }}>
            Pipeline de arrendamiento — {prospectos.length} prospectos
          </p>
        </div>
        <button onClick={() => setModalNuevo(true)} style={btnPrimario}>+ Nuevo Prospecto</button>
      </div>

      {/* KPIs por etapa */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {ETAPAS.map(e => (
          <div key={e.id} onClick={() => setFiltroEtapa(filtroEtapa === e.id ? 'ALL' : e.id)}
            style={{ padding:'8px 14px', borderRadius:8, cursor:'pointer', border:`2px solid`, userSelect:'none',
              borderColor: filtroEtapa === e.id ? e.color : '#E5E7EB',
              background: filtroEtapa === e.id ? e.color + '15' : 'white',
            }}>
            <div style={{ fontSize:18, fontWeight:800, color: e.color }}>{kpis[e.id] || 0}</div>
            <div style={{ fontSize:10, color:'#6B7280', fontWeight:600 }}>{e.label}</div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ marginBottom:16 }}>
        <input
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre / giro..."
          style={{ ...inputStyle, maxWidth:340 }}
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🏢</div>
          <p>Sin prospectos{filtroEtapa !== 'ALL' ? ' en esta etapa' : ''}.</p>
          <button onClick={() => setModalNuevo(true)} style={btnPrimario}>+ Crear el primero</button>
        </div>
      ) : (
        <div style={{ border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Folio','Negocio / Local','Renta propuesta','Etapa','Fecha contacto',''].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#374151', borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < filtrados.length-1 ? '1px solid #E5E7EB' : 'none', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding:'10px 14px', color:'#6B7280', fontFamily:'monospace', fontSize:11 }}>
                    {`PROS-${p.id.substr(0,8)}`}
                  </td>
                  <td style={{ padding:'10px 14px', fontWeight:600 }}>{p.nombre_negocio || '—'}</td>
                  <td style={{ padding:'10px 14px', color:'#057642', fontWeight:700 }}>
                    {p.renta_propuesta ? `$${Number(p.renta_propuesta).toLocaleString('es-MX')}` : '—'}
                  </td>
                  <td style={{ padding:'10px 14px' }}><Badge etapa={p.etapa} /></td>
                  <td style={{ padding:'10px 14px', color:'#6B7280' }}>
                    {new Date(p.fecha_contacto).toLocaleDateString('es-MX')}
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <button onClick={() => setSeleccionado(p)}
                      style={{ ...btnMini, background:'#EFF6FF', color:'#0A66C2' }}>Ver →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      {modalNuevo && (
        <ModalNuevoProspecto onClose={() => setModalNuevo(false)} onSaved={refresh} />
      )}
      {seleccionado && (
        <PanelDetalle
          prospecto={prospectos.find(p => p.id === seleccionado.id) || seleccionado}
          onClose={() => setSeleccionado(null)}
          onRefresh={refresh}
          onMagicLink={setModalLink}
        />
      )}
      {modalLink && (
        <ModalCompartirLink link={modalLink} onClose={() => setModalLink(null)} />
      )}
    </div>
  )
}

// ─── Estilos base ────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid #E5E7EB', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }
const btnPrimario = {
  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#0A66C2', color: 'white', fontSize: 13, fontWeight: 700,
}
const btnSecundario = {
  padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB',
  cursor: 'pointer', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600,
}
const btnMini = {
  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
  fontSize: 11, fontWeight: 700,
}
