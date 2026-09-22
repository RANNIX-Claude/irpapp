import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CalendarDays, Plus, X, Trash2, Camera, LayoutGrid, List,
  Play, ChevronLeft, ChevronRight, Clock, Image as ImageIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const fmtFecha = d => d
  ? new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
  : '—'
const fmtCorta = d => d
  ? new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
  : '—'

/* ── Upload helper ──────────────────────────────────────────────────────────── */
const BUCKET = 'eventos-fotos'

async function uploadFoto(file, eventoId) {
  const ext  = file.name.split('.').pop()
  const path = `evento-${eventoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) { toast.error('Error subiendo foto: ' + error.message); return null }
  return path
}

async function firmar(path) {
  if (!path) return null
  const clean = path.includes('/storage/') ? path.split('/').slice(-3).join('/') : path
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(clean, 600)
  return data?.signedUrl || null
}

/* ── Helpers UI ──────────────────────────────────────────────────────────── */
const inp = { width:'100%', padding:'8px 10px', border:'1.5px solid #E5E7EB', borderRadius:'7px',
  fontSize:'13px', boxSizing:'border-box', outline:'none', background:'white', color:'#111827' }
const lbl = { display:'block', fontSize:'11px', fontWeight:700, color:'#6B7280',
  textTransform:'uppercase', marginBottom:'3px', letterSpacing:'.04em' }
function Field({ label, children }) {
  return <div style={{ marginBottom:'12px' }}><label style={lbl}>{label}</label>{children}</div>
}

/* ── Detectar video embed ─────────────────────────────────────────────────── */
function videoEmbedUrl(url) {
  if (!url) return null
  // YouTube
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

/* ── Galería lightbox ────────────────────────────────────────────────────── */
function Lightbox({ fotos, idx, onClose }) {
  const [cur, setCur] = useState(idx)
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setCur(c => Math.min(c+1, fotos.length-1)); if (e.key === 'ArrowLeft') setCur(c => Math.max(c-1, 0)) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [fotos.length, onClose])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:2000,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none',
        border:'none', color:'white', cursor:'pointer', fontSize:28, lineHeight:1 }}>×</button>
      {cur > 0 && (
        <button onClick={() => setCur(c => c-1)}
          style={{ position:'absolute', left:16, background:'rgba(255,255,255,.15)', border:'none',
            color:'white', cursor:'pointer', borderRadius:'50%', width:44, height:44,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ChevronLeft size={22} />
        </button>
      )}
      <img src={fotos[cur]?.url} alt=""
        style={{ maxWidth:'90vw', maxHeight:'88vh', objectFit:'contain', borderRadius:8 }} />
      {cur < fotos.length - 1 && (
        <button onClick={() => setCur(c => c+1)}
          style={{ position:'absolute', right:16, background:'rgba(255,255,255,.15)', border:'none',
            color:'white', cursor:'pointer', borderRadius:'50%', width:44, height:44,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ChevronRight size={22} />
        </button>
      )}
      <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)',
        fontSize:'13px', color:'rgba(255,255,255,.6)' }}>{cur+1} / {fotos.length}</div>
    </div>
  )
}

/* ── Tarjeta mosaico ─────────────────────────────────────────────────────── */
function MosaicCard({ ev, fotos, onClick }) {
  const portada = fotos[0]
  return (
    <div onClick={onClick}
      style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'12px',
        overflow:'hidden', cursor:'pointer', transition:'box-shadow .15s', display:'flex', flexDirection:'column' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
      <div style={{ width:'100%', height:160, background:'#F3F4F6', overflow:'hidden', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        {portada?.url
          ? <img src={portada.url} alt={ev.titulo} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : ev.video_url
            ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, color:'#9CA3AF' }}>
                <Play size={32} /><span style={{ fontSize:'11px' }}>Video</span>
              </div>
            : <CalendarDays size={32} color="#D1D5DB" />
        }
        {fotos.length > 1 && (
          <div style={{ position:'absolute', bottom:6, right:8, background:'rgba(0,0,0,.55)',
            color:'white', fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:10 }}>
            +{fotos.length - 1} fotos
          </div>
        )}
      </div>
      <div style={{ padding:'12px 14px', flex:1, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ fontWeight:700, fontSize:'13px', color:'#111827', lineHeight:1.3 }}>{ev.titulo}</div>
        <div style={{ fontSize:'11px', color:'#9CA3AF', display:'flex', alignItems:'center', gap:4 }}>
          <Clock size={10} /> {fmtCorta(ev.fecha_evento)}
        </div>
        {ev.descripcion && (
          <div style={{ fontSize:'11px', color:'#6B7280', marginTop:2,
            overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {ev.descripcion}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Tarjeta Feed (tipo red social) ──────────────────────────────────────── */
function FeedCard({ ev, fotos, onDelete, onReload }) {
  const [lightbox, setLightbox] = useState(null)
  const fileRef  = useRef()
  const embedUrl = videoEmbedUrl(ev.video_url)

  const addFotos = async (files) => {
    for (const f of Array.from(files)) {
      const path = await uploadFoto(f, ev.id)
      if (path) await supabase.from('evento_fotos').insert({ evento_id: ev.id, foto_url: path, orden: fotos.length })
    }
    onReload()
  }
  const delFoto = async (fotoId) => {
    await supabase.from('evento_fotos').delete().eq('id', fotoId)
    onReload()
  }

  // Layout foto: 1 = full, 2 = mitad, 3 = 1 grande + 2 pequeñas, 4+ = 2x2 + overlay
  const grid = fotos.slice(0, 4)
  const extra = fotos.length - 4

  return (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'14px',
      overflow:'hidden', maxWidth:680 }}>

      {/* Header del evento */}
      <div style={{ padding:'16px 18px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'15px', color:'#111827', marginBottom:2 }}>{ev.titulo}</div>
          <div style={{ fontSize:'11px', color:'#9CA3AF', display:'flex', alignItems:'center', gap:4 }}>
            <Clock size={10} /> {fmtFecha(ev.fecha_evento)}
          </div>
        </div>
        <button onClick={() => { if (window.confirm('¿Eliminar este evento?')) onDelete() }}
          style={{ padding:'5px 7px', border:'1.5px solid #FEE2E2', borderRadius:'6px',
            background:'white', cursor:'pointer', color:'#B91C1C' }}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Descripción */}
      {ev.descripcion && (
        <div style={{ padding:'10px 18px', fontSize:'13px', color:'#374151', lineHeight:1.6 }}>
          {ev.descripcion}
        </div>
      )}
      {ev.notas && (
        <div style={{ padding:'0 18px 10px', fontSize:'12px', color:'#6B7280', fontStyle:'italic' }}>
          {ev.notas}
        </div>
      )}

      {/* Galería de fotos */}
      {fotos.length > 0 && (
        <div style={{ margin:'0 0 0', position:'relative' }}>
          {fotos.length === 1 && (
            <img src={fotos[0].url} alt="" onClick={() => setLightbox(0)}
              style={{ width:'100%', maxHeight:420, objectFit:'cover', cursor:'pointer', display:'block' }} />
          )}
          {fotos.length === 2 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
              {fotos.map((f, i) => (
                <img key={f.id} src={f.url} alt="" onClick={() => setLightbox(i)}
                  style={{ width:'100%', height:240, objectFit:'cover', cursor:'pointer', display:'block' }} />
              ))}
            </div>
          )}
          {fotos.length === 3 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
              <img src={fotos[0].url} alt="" onClick={() => setLightbox(0)}
                style={{ width:'100%', height:280, objectFit:'cover', cursor:'pointer', display:'block', gridRow:'span 2' }} />
              <img src={fotos[1].url} alt="" onClick={() => setLightbox(1)}
                style={{ width:'100%', height:139, objectFit:'cover', cursor:'pointer', display:'block' }} />
              <img src={fotos[2].url} alt="" onClick={() => setLightbox(2)}
                style={{ width:'100%', height:139, objectFit:'cover', cursor:'pointer', display:'block' }} />
            </div>
          )}
          {fotos.length >= 4 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
              {grid.map((f, i) => (
                <div key={f.id} style={{ position:'relative' }}>
                  <img src={f.url} alt="" onClick={() => setLightbox(i)}
                    style={{ width:'100%', height:180, objectFit:'cover', cursor:'pointer', display:'block' }} />
                  {i === 3 && extra > 0 && (
                    <div onClick={() => setLightbox(3)}
                      style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.55)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'24px', fontWeight:800, color:'white', cursor:'pointer' }}>
                      +{extra}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video embed */}
      {embedUrl && (
        <div style={{ position:'relative', paddingBottom:'56.25%', height:0,
          margin: fotos.length > 0 ? '2px 0 0' : '0' }}>
          <iframe src={embedUrl} title="Video" allowFullScreen
            style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }} />
        </div>
      )}
      {ev.video_url && !embedUrl && (
        <div style={{ padding:'10px 18px' }}>
          <a href={ev.video_url} target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'12px',
              color:'#0A66C2', fontWeight:600 }}>
            <Play size={14} /> Ver video
          </a>
        </div>
      )}

      {/* Footer: agregar más fotos */}
      <div style={{ padding:'10px 18px', borderTop:'1px solid #F3F4F6',
        display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={() => fileRef.current.click()}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
            border:'1.5px solid #E5E7EB', borderRadius:'6px', background:'white',
            fontSize:'11px', fontWeight:600, color:'#374151', cursor:'pointer' }}>
          <Camera size={12} /> Agregar fotos
        </button>
        <span style={{ fontSize:'11px', color:'#D1D5DB' }}>
          {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
        </span>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }}
          onChange={e => addFotos(e.target.files)} />
      </div>

      {lightbox !== null && <Lightbox fotos={fotos} idx={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════════════════════════ */
export default function Eventos() {
  useModuleAudit('Eventos')

  const [eventos,  setEventos]  = useState([])
  const [fotosMap, setFotosMap] = useState({})   // { evento_id: [{id, url, ...}] }
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState('feed') // 'feed' | 'mosaic' | 'list'

  /* ── Carga ─────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    const { data: evs } = await supabase.from('eventos')
      .select('*').order('fecha_evento', { ascending: false })
    if (!evs) { setLoading(false); return }

    // Cargar fotos de todos los eventos y firmar URLs
    const { data: rawFotos } = await supabase.from('evento_fotos')
      .select('*').in('evento_id', evs.map(e => e.id))
      .order('orden').order('created_at')

    const signedMap = {}
    for (const ev of evs) signedMap[ev.id] = []
    for (const f of (rawFotos || [])) {
      const url = await firmar(f.foto_url)
      if (url) signedMap[f.evento_id].push({ ...f, url })
    }

    setEventos(evs)
    setFotosMap(signedMap)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await supabase.from('eventos').delete().eq('id', id)
    toast.success('Evento eliminado')
    load()
  }

  /* ── Vista ─────────────────────────────────────────────────────────────── */
  const VIEWS = [
    { id:'feed',   label:'Feed',    icon: CalendarDays },
    { id:'mosaic', label:'Mosaico', icon: LayoutGrid   },
    { id:'list',   label:'Lista',   icon: List         },
  ]

  return (
    <div style={{ padding:'24px', maxWidth:'760px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:'20px', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:'20px', fontWeight:700, margin:'0 0 3px',
            display:'flex', alignItems:'center', gap:8, color:'var(--color-text)' }}>
            <CalendarDays size={20} color="var(--color-primary)" /> Eventos
          </h1>
          <p style={{ fontSize:'12px', color:'var(--color-text-light)', margin:0 }}>
            Comunicación de avances y momentos hacia Dirección General
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Toggle de vista */}
          <div style={{ display:'flex', border:'1.5px solid #E5E7EB', borderRadius:'8px', overflow:'hidden' }}>
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setViewMode(id)} title={label}
                style={{ padding:'7px 10px', border:'none', cursor:'pointer',
                  background: viewMode === id ? 'var(--color-primary)' : 'white',
                  color: viewMode === id ? 'white' : '#6B7280',
                  display:'flex', alignItems:'center', gap:4, fontSize:'11px', fontWeight:600 }}>
                <Icon size={14} />
                <span style={{ display: viewMode === id ? 'inline' : 'none' }}>{label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
              background:'var(--color-primary)', color:'white', border:'none',
              borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
            <Plus size={14} /> Nuevo Evento
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>Cargando…</div>
      ) : eventos.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>
          <CalendarDays size={40} style={{ marginBottom:12, opacity:.3 }} />
          <div style={{ fontSize:'14px' }}>Sin eventos registrados</div>
          <div style={{ fontSize:'12px', marginTop:4 }}>Crea el primer evento para compartir con Dirección</div>
        </div>
      ) : viewMode === 'feed' ? (
        /* ── FEED ─────────────────────────────────────────────────────── */
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {eventos.map(ev => (
            <FeedCard key={ev.id}
              ev={ev}
              fotos={fotosMap[ev.id] || []}
              onDelete={() => handleDelete(ev.id)}
              onReload={load} />
          ))}
        </div>
      ) : viewMode === 'mosaic' ? (
        /* ── MOSAICO ──────────────────────────────────────────────────── */
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:14 }}>
          {eventos.map(ev => (
            <MosaicCard key={ev.id}
              ev={ev}
              fotos={fotosMap[ev.id] || []}
              onClick={() => setViewMode('feed')} />
          ))}
        </div>
      ) : (
        /* ── LISTA ────────────────────────────────────────────────────── */
        <div style={{ display:'grid', gap:10 }}>
          {eventos.map(ev => {
            const fotos = fotosMap[ev.id] || []
            return (
              <div key={ev.id}
                style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'10px',
                  padding:'14px 18px', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'center' }}>
                {/* Miniatura */}
                <div style={{ width:56, height:56, borderRadius:8, overflow:'hidden',
                  background:'#F3F4F6', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {fotos[0]?.url
                    ? <img src={fotos[0].url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : ev.video_url
                      ? <Play size={20} color="#9CA3AF" />
                      : <ImageIcon size={20} color="#D1D5DB" />
                  }
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'#111827' }}>{ev.titulo}</div>
                  <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:2 }}>
                    {fmtCorta(ev.fecha_evento)} · {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
                    {ev.video_url && ' · 🎬 video'}
                  </div>
                  {ev.descripcion && (
                    <div style={{ fontSize:'11px', color:'#6B7280', marginTop:2,
                      overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:400 }}>
                      {ev.descripcion}
                    </div>
                  )}
                </div>
                <button onClick={() => { if (window.confirm('¿Eliminar?')) handleDelete(ev.id) }}
                  style={{ padding:'5px 7px', border:'1.5px solid #FEE2E2', borderRadius:'6px',
                    background:'white', cursor:'pointer', color:'#B91C1C' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <NuevoEventoModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />
      )}
    </div>
  )
}

/* ── Modal Nuevo Evento ──────────────────────────────────────────────────── */
function NuevoEventoModal({ onClose, onSaved }) {
  const [form,   setForm]   = useState({ fecha_evento: new Date().toISOString().slice(0,16) })
  const [fotos,  setFotos]  = useState([])    // File[]
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }))

  const handleSave = async () => {
    if (!form.titulo?.trim()) { toast.error('El título es requerido'); return }
    setSaving(true)

    // Crear evento
    const { data: ev, error } = await supabase.from('eventos').insert({
      titulo:       form.titulo,
      descripcion:  form.descripcion  || null,
      notas:        form.notas        || null,
      fecha_evento: form.fecha_evento || new Date().toISOString(),
      video_url:    form.video_url    || null,
    }).select().single()

    if (error) { toast.error(error.message); setSaving(false); return }

    // Subir fotos
    for (let i = 0; i < fotos.length; i++) {
      const path = await uploadFoto(fotos[i], ev.id)
      if (path) await supabase.from('evento_fotos').insert({ evento_id: ev.id, foto_url: path, orden: i })
    }

    setSaving(false)
    toast.success('Evento creado')
    onSaved()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:'12px', width:'100%', maxWidth:540,
        maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        {/* Header modal */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'16px 20px', borderBottom:'1px solid #E5E7EB' }}>
          <span style={{ fontWeight:700, fontSize:'15px', display:'flex', alignItems:'center', gap:7 }}>
            <CalendarDays size={16} color="var(--color-primary)" /> Nuevo Evento
          </span>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#6B7280' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding:'20px' }}>
          <Field label="Título *">
            <input style={inp} value={form.titulo||''} onChange={e => f('titulo', e.target.value)}
              placeholder="Ej: Inauguración pantalla publicitaria exterior" />
          </Field>

          <Field label="Fecha del evento">
            <input style={inp} type="datetime-local" value={form.fecha_evento||''}
              onChange={e => f('fecha_evento', e.target.value)} />
          </Field>

          <Field label="Descripción">
            <textarea style={{ ...inp, minHeight:80, resize:'vertical', fontFamily:'inherit' }}
              value={form.descripcion||''} onChange={e => f('descripcion', e.target.value)}
              placeholder="Descripción del evento para compartir con Dirección General…" />
          </Field>

          <Field label="Notas internas">
            <textarea style={{ ...inp, minHeight:50, resize:'vertical', fontFamily:'inherit' }}
              value={form.notas||''} onChange={e => f('notas', e.target.value)} />
          </Field>

          <Field label="URL de video (YouTube, Vimeo, Drive…)">
            <input style={inp} type="url" value={form.video_url||''}
              onChange={e => f('video_url', e.target.value)}
              placeholder="https://youtu.be/..." />
            {form.video_url && !videoEmbedUrl(form.video_url) && (
              <div style={{ fontSize:'10px', color:'#D97706', marginTop:3 }}>
                URL no reconocida como YouTube/Vimeo — se mostrará como enlace externo.
              </div>
            )}
          </Field>

          <Field label="Fotografías del evento">
            <input type="file" accept="image/*" multiple style={{ fontSize:'12px' }}
              onChange={e => setFotos(Array.from(e.target.files))} />
            {fotos.length > 0 && (
              <div style={{ fontSize:'11px', color:'#6B7280', marginTop:4 }}>
                {fotos.length} foto{fotos.length !== 1 ? 's' : ''} seleccionada{fotos.length !== 1 ? 's' : ''}
              </div>
            )}
            {/* Previews */}
            {fotos.length > 0 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                {fotos.map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt=""
                    style={{ width:60, height:60, objectFit:'cover', borderRadius:6,
                      border:'1px solid #E5E7EB' }} />
                ))}
              </div>
            )}
          </Field>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
            <button onClick={onClose}
              style={{ padding:'8px 16px', border:'1.5px solid #E5E7EB', borderRadius:'7px',
                background:'white', fontSize:'13px', cursor:'pointer' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'8px 18px', background:'var(--color-primary)', color:'white',
                border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
              {saving ? 'Guardando…' : 'Publicar Evento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
