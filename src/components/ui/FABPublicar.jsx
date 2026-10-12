import { useState, useRef, useContext } from 'react'
import { Plus, X, Camera, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const CATS = {
  MANTENIMIENTO: { emoji: '🔧', color: '#D97706', bg: '#FEF3C7', label: 'Mantenimiento' },
  MEJORA:        { emoji: '✨', color: '#7B5EA7', bg: '#F5F3FF', label: 'Mejora'        },
  OPERACION:     { emoji: '⚙️', color: '#2563EB', bg: '#EFF6FF', label: 'Operación'     },
  PROYECTO:      { emoji: '🏗️', color: '#059669', bg: '#ECFDF5', label: 'Proyecto'      },
  INCIDENCIA:    { emoji: '🚨', color: '#DC2626', bg: '#FEF2F2', label: 'Incidencia'    },
}

function ModalNuevaPublicacion({ onClose }) {
  const { perfil } = useContext(AppContext)
  const fileRef = useRef()
  const [titulo, setTitulo]     = useState('')
  const [desc, setDesc]         = useState('')
  const [cat, setCat]           = useState('MANTENIMIENTO')
  const [fotos, setFotos]       = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError]       = useState('')

  const agregarFotos = e => {
    const files = Array.from(e.target.files || [])
    const nuevas = files.slice(0, 10 - fotos.length).map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setFotos(prev => [...prev, ...nuevas])
    e.target.value = ''
  }

  const quitarFoto = i => setFotos(prev => prev.filter((_, idx) => idx !== i))

  const publicar = async () => {
    if (!titulo.trim()) { setError('Escribe un título'); return }
    setEnviando(true); setError('')
    try {
      const paths = await Promise.all(fotos.map(async ({ file }) => {
        const ext  = file.name.split('.').pop()
        const path = `feed/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('ot-evidencias').upload(path, file, { upsert: false })
        if (upErr) throw upErr
        return path
      }))

      const autorNombre = perfil ? `${perfil.nombre || ''}${perfil.apellido ? ' ' + perfil.apellido : ''}`.trim() : null

      const { error: dbErr } = await supabase.from('publicaciones').insert({
        titulo: titulo.trim(),
        descripcion: desc.trim() || null,
        categoria: cat,
        fotos: paths,
        autor_nombre: autorNombre || undefined,
        autor_foto_url: perfil?.foto_url || undefined,
      })
      if (dbErr) throw dbErr
      toast.success('Publicado en el feed ✓')
      onClose()
    } catch (e) {
      setError(e.message || 'Error al publicar')
      setEnviando(false)
    }
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:520,maxHeight:'92vh',overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 6px' }}>
          <div style={{ width:40,height:4,borderRadius:2,background:'#D1D5DB' }}/>
        </div>

        <div style={{ padding:'4px 20px 32px' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
            <div style={{ fontSize:17,fontWeight:900,color:'#1E293B' }}>📸 Nueva publicación</div>
            <button onClick={onClose} style={{ background:'#F3F4F6',border:'none',borderRadius:8,padding:'6px 8px',cursor:'pointer' }}><X size={16}/></button>
          </div>

          {/* Fotos */}
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={agregarFotos} style={{ display:'none' }}/>
          {fotos.length > 0 ? (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:8 }}>
                {fotos.map((f, i) => (
                  <div key={i} style={{ position:'relative',borderRadius:10,overflow:'hidden' }}>
                    <img src={f.preview} style={{ width:'100%',height:90,objectFit:'cover',display:'block' }} alt="" />
                    <button onClick={() => quitarFoto(i)}
                      style={{ position:'absolute',top:4,right:4,background:'rgba(0,0,0,.6)',border:'none',borderRadius:6,
                        padding:'2px 5px',cursor:'pointer',color:'white',fontSize:10,display:'flex',alignItems:'center' }}>
                      <X size={10}/>
                    </button>
                  </div>
                ))}
                {fotos.length < 10 && (
                  <button onClick={() => fileRef.current.click()}
                    style={{ height:90,background:'#F8FAFC',border:'2px dashed #CBD5E1',borderRadius:10,cursor:'pointer',
                      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,color:'#94A3B8' }}>
                    <Plus size={18}/>
                    <span style={{ fontSize:9,fontWeight:600 }}>MÁS</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current.click()}
              style={{ width:'100%',padding:'18px',background:'#F8FAFC',border:'2px dashed #CBD5E1',borderRadius:14,cursor:'pointer',
                display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginBottom:14,color:'#64748B' }}>
              <Camera size={28} color="#94A3B8"/>
              <span style={{ fontSize:14,fontWeight:600 }}>Agregar fotos (hasta 10)</span>
              <span style={{ fontSize:12 }}>Toca para abrir cámara o galería</span>
            </button>
          )}

          {/* Categoría */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:14 }}>
            {Object.entries(CATS).map(([k, v]) => (
              <button key={k} onClick={() => setCat(k)}
                style={{ padding:'8px 4px',border:`2px solid ${cat===k?v.color:'#E5E7EB'}`,borderRadius:10,
                  background:cat===k?v.bg:'white',cursor:'pointer',textAlign:'center' }}>
                <div style={{ fontSize:18 }}>{v.emoji}</div>
                <div style={{ fontSize:9,fontWeight:700,color:cat===k?v.color:'#9CA3AF',marginTop:2 }}>{v.label.toUpperCase()}</div>
              </button>
            ))}
          </div>

          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            placeholder="¿Qué se hizo? ej: Cambio de jaboneras"
            style={{ width:'100%',border:'1.5px solid #E5E7EB',borderRadius:12,padding:'12px 14px',fontSize:15,outline:'none',marginBottom:10,boxSizing:'border-box',fontFamily:'inherit' }}/>

          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Detalles adicionales (opcional)…"
            style={{ width:'100%',minHeight:70,border:'1.5px solid #E5E7EB',borderRadius:12,padding:'12px 14px',fontSize:14,resize:'none',outline:'none',marginBottom:14,boxSizing:'border-box',fontFamily:'inherit' }}/>

          {error && <div style={{ color:'#DC2626',fontSize:13,marginBottom:10 }}>⚠️ {error}</div>}

          <button onClick={publicar} disabled={enviando || !titulo.trim()}
            style={{ width:'100%',padding:'14px',background:titulo.trim()&&!enviando?'#7B5EA7':'#E5E7EB',border:'none',borderRadius:14,
              color:titulo.trim()&&!enviando?'white':'#9CA3AF',fontSize:16,fontWeight:900,cursor:titulo.trim()&&!enviando?'pointer':'default',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
            {enviando ? 'Publicando…' : <><Send size={16}/> Publicar en el feed</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FABPublicar() {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button onClick={() => setAbierto(true)}
        style={{ position:'fixed', bottom:24, right:24, width:56, height:56,
          background:'linear-gradient(135deg,#5A4080,#7B5EA7)',
          border:'none', borderRadius:'50%', cursor:'pointer',
          boxShadow:'0 6px 24px rgba(91,64,128,.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
        <Plus size={26} color="white" strokeWidth={2.5}/>
      </button>

      {abierto && <ModalNuevaPublicacion onClose={() => setAbierto(false)} />}
    </>
  )
}
