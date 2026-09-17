import { useState } from 'react'
import { Plus, X, UserPlus, Link, Calendar, Phone, Mail, ChevronDown, Save } from 'lucide-react'
import { usePRP } from '../../hooks/usePRP'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { fmt$, Avatar, TIPOS_CONTRATO, ETAPAS_CANDIDATO, ETAPA_COLOR, MOTIVOS_RECHAZO } from './rh-helpers'

// ── Modal nueva vacante ─────────────────────────────────────────────────────
function NuevaVacanteModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ titulo: '', area: '', num_plazas: 1, descripcion: '', perfil_requerido: '', salario_min: '', salario_max: '', tipo_contrato: 'TEMPORAL_3SEM', fecha_cierre: '' })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const guardar = async () => {
    if (!form.titulo) return toast.error('El título es obligatorio')
    setSaving(true)
    const { error } = await supabase.from('rh_vacantes').insert({
      titulo: form.titulo, area: form.area || null, num_plazas: +form.num_plazas || 1,
      descripcion: form.descripcion || null, perfil_requerido: form.perfil_requerido || null,
      salario_min: form.salario_min ? +form.salario_min : null,
      salario_max: form.salario_max ? +form.salario_max : null,
      tipo_contrato: form.tipo_contrato, fecha_cierre: form.fecha_cierre || null, status: 'ABIERTA',
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Vacante publicada')
    onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nueva Vacante</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['Puesto / Título', 'titulo', 'text', '1 / -1'], ['Área', 'area', 'text', null], ['# Plazas', 'num_plazas', 'number', null]].map(([l, k, t, span]) => (
            <div key={k} style={span ? { gridColumn: span } : {}}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{l}</label>
              <input type={t} value={form[k]} onChange={set(k)} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Descripción del puesto</label>
            <textarea value={form.descripcion} onChange={set('descripcion')} rows={3}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Perfil requerido</label>
            <textarea value={form.perfil_requerido} onChange={set('perfil_requerido')} rows={2} placeholder="Experiencia, estudios, habilidades..."
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          {[['Salario mínimo ($)', 'salario_min', 'number'], ['Salario máximo ($)', 'salario_max', 'number']].map(([l, k, t]) => (
            <div key={k}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{l}</label>
              <input type={t} value={form[k]} onChange={set(k)} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Tipo contrato</label>
            <select value={form.tipo_contrato} onChange={set('tipo_contrato')} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, background: 'white' }}>
              {TIPOS_CONTRATO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha cierre</label>
            <input type="date" value={form.fecha_cierre} onChange={set('fecha_cierre')} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',fontWeight:600 }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex:2,padding:10,border:'none',borderRadius:8,background:'#7B5EA7',color:'white',cursor:'pointer',fontWeight:700 }}>
            {saving ? 'Guardando…' : 'Publicar vacante'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta candidato con pipeline ─────────────────────────────────────────
function TarjetaCandidato({ c, vacantes, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [etapa, setEtapa] = useState(c.etapa)
  const [showRechazo, setShowRechazo] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [fechaEntrevista, setFechaEntrevista] = useState('')
  const [saving, setSaving] = useState(false)

  const linkCandidato = `${window.location.origin}/candidato/${c.token_docs}`

  const copiarLink = () => {
    navigator.clipboard.writeText(linkCandidato)
    toast.success('Link copiado al portapapeles')
  }

  const moverEtapa = async (nueva) => {
    if (nueva === 'RECHAZADO') { setShowRechazo(true); return }
    setSaving(true)
    const upd = { etapa: nueva }
    if (nueva === 'ACEPTADO') upd.fecha_respuesta = new Date().toISOString().split('T')[0]
    if (nueva === 'ENTREVISTA' && fechaEntrevista) upd.fecha_entrevista = fechaEntrevista
    await supabase.from('rh_candidatos').update(upd).eq('id', c.id)
    setEtapa(nueva)
    setSaving(false)
    toast.success('Etapa actualizada')
    onRefresh()
  }

  const rechazar = async () => {
    if (!motivoRechazo) return toast.error('Indica el motivo')
    setSaving(true)
    await supabase.from('rh_candidatos').update({ etapa: 'RECHAZADO', motivo_rechazo: motivoRechazo, fecha_respuesta: new Date().toISOString().split('T')[0] }).eq('id', c.id)
    setSaving(false)
    setShowRechazo(false)
    toast('Candidato rechazado')
    onRefresh()
  }

  const color = ETAPA_COLOR[etapa] || '#6B7280'

  return (
    <div style={{ background: 'white', border: `1.5px solid ${color}44`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <Avatar nombre={`${c.nombre} ${c.apellidos || ''}`} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nombre} {c.apellidos}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-light)' }}>{c.vacante_puesto || 'Candidato general'} · {c.fecha_aplicacion}</div>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: color + '18', color, flexShrink: 0 }}>{etapa}</span>
        <ChevronDown size={16} style={{ color: '#9CA3AF', transform: expanded ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px', background: '#FAFAFA' }}>
          {/* Datos de contacto */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            {c.email && <a href={`mailto:${c.email}`} style={{ display:'flex',gap:5,alignItems:'center',fontSize:12,color:'#7B5EA7',textDecoration:'none' }}><Mail size={13} />{c.email}</a>}
            {c.telefono && <a href={`tel:${c.telefono}`} style={{ display:'flex',gap:5,alignItems:'center',fontSize:12,color:'#7B5EA7',textDecoration:'none' }}><Phone size={13} />{c.telefono}</a>}
          </div>

          {/* Link para docs */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, background: '#F5F3FF', borderRadius: 8, padding: '8px 12px' }}>
            <Link size={14} color="#7B5EA7" />
            <span style={{ flex:1, fontSize:11, color:'#5A4080', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{linkCandidato}</span>
            <button onClick={copiarLink} style={{ padding:'4px 10px',border:'none',borderRadius:5,background:'#7B5EA7',color:'white',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0 }}>Copiar</button>
          </div>

          {/* Pipeline de etapas */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {ETAPAS_CANDIDATO.filter(e => e !== etapa).map(e => (
              <button key={e} onClick={() => moverEtapa(e)} disabled={saving}
                style={{ padding: '5px 10px', border: `1.5px solid ${ETAPA_COLOR[e]}44`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: ETAPA_COLOR[e] + '12', color: ETAPA_COLOR[e] }}>
                → {e}
              </button>
            ))}
          </div>

          {/* Fecha entrevista si aplica */}
          {etapa === 'ENTREVISTA' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <Calendar size={14} />
              <input type="datetime-local" value={fechaEntrevista} onChange={e => setFechaEntrevista(e.target.value)}
                style={{ padding: '5px 10px', border: '1.5px solid #E5E7EB', borderRadius: 6, fontSize: 12 }} />
              <button onClick={() => moverEtapa('ENTREVISTA')} style={{ padding:'5px 10px',border:'none',borderRadius:6,background:'#7B5EA7',color:'white',fontSize:11,fontWeight:700,cursor:'pointer' }}>Guardar fecha</button>
            </div>
          )}

          {/* Motivo rechazo */}
          {c.motivo_rechazo && (
            <div style={{ fontSize: 12, color: '#B24020', background: '#FFF1F0', borderRadius: 6, padding: '6px 10px' }}>
              Rechazado: {c.motivo_rechazo}
            </div>
          )}
        </div>
      )}

      {/* Mini modal rechazo */}
      {showRechazo && (
        <div style={{ padding: '14px', borderTop: '1px solid #FEE2E2', background: '#FFF9F9' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#B24020' }}>Motivo de rechazo</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MOTIVOS_RECHAZO.map(m => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name={`rechazo-${c.id}`} value={m} onChange={e => setMotivoRechazo(e.target.value)} />
                {m}
              </label>
            ))}
            {motivoRechazo === 'Otro' && (
              <input placeholder="Especifica el motivo..." value={motivoRechazo === 'Otro' ? '' : motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}
                style={{ padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: 6, fontSize: 13 }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowRechazo(false)} style={{ flex:1,padding:8,border:'1.5px solid #E5E7EB',borderRadius:6,background:'white',cursor:'pointer',fontSize:12,fontWeight:600 }}>Cancelar</button>
            <button onClick={rechazar} disabled={saving} style={{ flex:1,padding:8,border:'none',borderRadius:6,background:'#B24020',color:'white',cursor:'pointer',fontSize:12,fontWeight:700 }}>Confirmar rechazo</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab Reclutamiento ────────────────────────────────────────────────────────
function TabReclutamiento() {
  const [showNuevaVacante, setShowNuevaVacante] = useState(false)
  const [showNuevoCandidato, setShowNuevoCandidato] = useState(false)
  const [vacSeleccionada, setVacSeleccionada] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey(k => k+1)
  const { data: vacantes, loading: vLoad } = usePRP('prp_vacantes', { order: { col: 'fecha_apertura', asc: false }, refreshKey })
  const { data: candidatos, loading: cLoad } = usePRP('prp_candidatos', { order: { col: 'created_at', asc: false }, refreshKey })
  const [formCand, setFormCand] = useState({ nombre: '', apellidos: '', email: '', telefono: '', vacante_id: '' })
  const [savingCand, setSavingCand] = useState(false)

  const lista_v = vacantes ?? []
  const lista_c = candidatos ?? []

  const agregarCandidato = async () => {
    if (!formCand.nombre) return toast.error('El nombre es obligatorio')
    setSavingCand(true)
    const { error } = await supabase.from('rh_candidatos').insert({
      nombre: formCand.nombre, apellidos: formCand.apellidos || null,
      email: formCand.email || null, telefono: formCand.telefono || null,
      vacante_id: formCand.vacante_id || null, etapa: 'NUEVO',
    })
    setSavingCand(false)
    if (error) return toast.error(error.message)
    toast.success('Candidato agregado — link generado')
    setShowNuevoCandidato(false)
    setFormCand({ nombre: '', apellidos: '', email: '', telefono: '', vacante_id: '' })
    refresh()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
      {/* Columna vacantes */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Vacantes Abiertas <span style={{ color: '#7B5EA7' }}>({lista_v.filter(v=>v.status==='ABIERTA').length})</span></h3>
          <button onClick={() => setShowNuevaVacante(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: '#7B5EA7', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={12} /> Vacante
          </button>
        </div>

        {lista_v.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 13 }}>Sin vacantes abiertas</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lista_v.map(v => (
              <div key={v.id} onClick={() => setVacSeleccionada(vacSeleccionada?.id === v.id ? null : v)}
                style={{ background: 'white', border: `1.5px solid ${vacSeleccionada?.id===v.id ? '#7B5EA7' : '#E5E7EB'}`, borderRadius: 10, padding: 14, cursor: 'pointer', transition: '.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{v.titulo}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-light)', marginTop: 2 }}>{v.area || '—'} · {v.num_plazas} plaza{v.num_plazas > 1 ? 's' : ''}</div>
                  </div>
                  <span style={{ fontSize: 11, background: v.status==='ABIERTA'?'#dcfce7':'#F3F4F6', color: v.status==='ABIERTA'?'#166534':'#6B7280', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{v.status}</span>
                </div>
                {(v.salario_min || v.salario_max) && (
                  <div style={{ fontSize: 12, color: '#057642', fontWeight: 600, marginTop: 6 }}>
                    {v.salario_min ? fmt$(v.salario_min) : ''} – {v.salario_max ? fmt$(v.salario_max) : ''}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-light)' }}>{TIPOS_CONTRATO.find(t=>t.id===v.tipo_contrato)?.label || v.tipo_contrato}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#7B5EA7' }}>{v.candidatos_activos || 0} candidatos</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Columna candidatos */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
            {vacSeleccionada ? `Candidatos — ${vacSeleccionada.titulo}` : 'Todos los candidatos'}
            <span style={{ color: '#7B5EA7', marginLeft: 6 }}>({lista_c.filter(c => !vacSeleccionada || c.vacante_id===vacSeleccionada.id).length})</span>
          </h3>
          <button onClick={() => setShowNuevoCandidato(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: '#057642', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <UserPlus size={12} /> Candidato
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cLoad ? <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Cargando…</div>
          : lista_c.filter(c => !vacSeleccionada || c.vacante_id === vacSeleccionada.id).length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 13 }}>Sin candidatos registrados</div>
          : lista_c.filter(c => !vacSeleccionada || c.vacante_id === vacSeleccionada.id).map(c => (
            <TarjetaCandidato key={c.id} c={c} vacantes={lista_v} onRefresh={refresh} />
          ))}
        </div>
      </div>

      {/* Modales */}
      {showNuevaVacante && <NuevaVacanteModal onClose={() => setShowNuevaVacante(false)} onSaved={refresh} />}

      {showNuevoCandidato && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowNuevoCandidato(false)}>
          <div style={{ background: 'white', borderRadius: 12, width: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nuevo Candidato</h3>
              <button onClick={() => setShowNuevoCandidato(false)} style={{ background:'none',border:'none',cursor:'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Nombre(s)','nombre','text','1/-1'],['Apellidos','apellidos','text','1/-1'],['Email','email','email',null],['Teléfono','telefono','text',null]].map(([l,k,t,span]) => (
                <div key={k} style={span ? { gridColumn: span } : {}}>
                  <label style={{ fontSize:11,fontWeight:700,color:'var(--color-text-light)',display:'block',marginBottom:4,textTransform:'uppercase' }}>{l}</label>
                  <input type={t} value={formCand[k]} onChange={e => setFormCand(p=>({...p,[k]:e.target.value}))} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize:11,fontWeight:700,color:'var(--color-text-light)',display:'block',marginBottom:4,textTransform:'uppercase' }}>Vacante</label>
                <select value={formCand.vacante_id} onChange={e => setFormCand(p=>({...p,vacante_id:e.target.value}))} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,background:'white' }}>
                  <option value="">Sin vacante específica</option>
                  {lista_v.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
                </select>
              </div>
            </div>
            <div style={{ background: '#F5F3FF', borderRadius: 8, padding: 12, marginTop: 14, fontSize: 12, color: '#7B5EA7' }}>
              Al guardar se generará automáticamente un link único para que el candidato suba sus documentos.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowNuevoCandidato(false)} style={{ flex:1,padding:10,border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',fontWeight:600 }}>Cancelar</button>
              <button onClick={agregarCandidato} disabled={savingCand} style={{ flex:2,padding:10,border:'none',borderRadius:8,background:'#057642',color:'white',cursor:'pointer',fontWeight:700 }}>
                {savingCand ? 'Guardando…' : 'Agregar y generar link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { NuevaVacanteModal, TarjetaCandidato }
export default TabReclutamiento