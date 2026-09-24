import { useState, useEffect, useRef } from 'react'
import { Camera, Image as ImageIcon, X, Wrench, CheckCircle, XCircle, Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../hooks/useAudit'
import { ImagenPrivada, useUrlFirmada } from '../ui/ArchivoPrivado'
import { ESTATUS, FLUJO, TIPOS, subirFotos } from '../../lib/mantenimiento'
import { C, Modal, ModalFooter, Campo2, inputStyle, Badge } from '../expediente/ExpedienteUI'

export const BadgeEstatus = ({ e }) => {
  const s = ESTATUS[e] || { label: e, color: C.muted, bg: C.light }
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
}
export const BadgeTipo = ({ t }) => {
  const s = TIPOS[t] || { label: t, color: C.muted }
  return <Badge label={s.label} color={s.color} />
}

/** Pasos del flujo, con el actual resaltado (Rechazado se muestra aparte). */
export function Stepper({ estatus }) {
  if (estatus === 'RECHAZADO') return <div style={{ padding: '10px 14px', background: ESTATUS.RECHAZADO.bg, color: ESTATUS.RECHAZADO.color, borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={16} /> Solicitud rechazada</div>
  const actual = FLUJO.indexOf(estatus)
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {FLUJO.map((e, i) => {
        const hecho = i <= actual
        const s = ESTATUS[e]
        return (
          <div key={e} style={{ display: 'flex', alignItems: 'center', flex: i < FLUJO.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: hecho ? s.color : C.surface, color: hecho ? '#fff' : C.muted, border: `2px solid ${hecho ? s.color : C.border}`, boxShadow: i === actual ? `0 0 0 4px ${s.color}25` : undefined }}>
                {i < actual ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10.5, fontWeight: i === actual ? 800 : 600, color: hecho ? s.color : C.muted, whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < FLUJO.length - 1 && <div style={{ flex: 1, height: 2, background: i < actual ? ESTATUS[FLUJO[i + 1]].color : C.border, margin: '0 4px 18px' }} />}
          </div>
        )
      })}
    </div>
  )
}

/** Elige fotos nuevas (galería o cámara del celular) con vista previa local. */
export function SelectorFotos({ files, setFiles, label = 'Fotografías' }) {
  const galeria = useRef(null)
  const camara = useRef(null)
  const previews = files.map(f => ({ f, url: URL.createObjectURL(f) }))
  useEffect(() => () => previews.forEach(p => URL.revokeObjectURL(p.url)))
  const agregar = (lista) => setFiles(prev => [...prev, ...Array.from(lista || []).filter(f => f.type.startsWith('image/'))])
  const btn = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: `1.5px dashed ${C.border}`, borderRadius: 7, background: C.light, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.primary }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => galeria.current.click()} style={btn}><ImageIcon size={14} /> Elegir fotos</button>
        <button type="button" onClick={() => camara.current.click()} style={btn}><Camera size={14} /> Tomar foto</button>
        <span style={{ fontSize: 11, color: C.muted }}>{files.length ? `${files.length} ${label.toLowerCase()}` : 'JPG o PNG · máx 10 MB c/u'}</span>
        <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={e => { agregar(e.target.files); e.target.value = '' }} />
        <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={e => { agregar(e.target.files); e.target.value = '' }} />
      </div>
      {previews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginTop: 10 }}>
          {previews.map((p, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={p.url} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 7, border: `1px solid ${C.border}` }} />
              <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Miniatura({ foto, onAbrir }) {
  return (
    <div onClick={() => onAbrir(foto)} style={{ cursor: 'zoom-in' }}>
      <ImagenPrivada bucket="ot-evidencias" valor={foto.path} alt={foto.nombre} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
      <div style={{ fontSize: 10, color: C.muted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{foto.nombre}</div>
    </div>
  )
}

function Visor({ foto, onCerrar }) {
  const url = useUrlFirmada('ot-evidencias', foto.path)
  return (
    <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
      {url ? <img src={url} alt={foto.nombre} style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 8 }} /> : <span style={{ color: '#fff' }}>Cargando…</span>}
    </div>
  )
}

/** Fotos ya guardadas (rutas en ot-evidencias). */
export function GaleriaFotos({ fotos, vacio = 'Sin fotografías' }) {
  const [abierta, setAbierta] = useState(null)
  if (!fotos?.length) return <div style={{ fontSize: 12, color: C.muted, padding: '14px 0' }}>{vacio}</div>
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
        {fotos.map(f => <Miniatura key={f.path} foto={f} onAbrir={setAbierta} />)}
      </div>
      {abierta && <Visor foto={abierta} onCerrar={() => setAbierta(null)} />}
    </>
  )
}

// ─── Alta / edición de la solicitud ─────────────────────────────────────────
export function ModalSolicitud({ solicitud, onClose, onSaved }) {
  const esNueva = !solicitud
  const [cats, setCats] = useState([])
  const [form, setForm] = useState({
    fecha_solicitud: solicitud?.fecha_solicitud || new Date().toISOString().slice(0, 10),
    categoria: solicitud?.categoria || '',
    tipo: solicitud?.tipo || 'NO_PLANEADO',
    titulo: solicitud?.titulo || '',
    descripcion: solicitud?.descripcion || '',
    ubicacion: solicitud?.ubicacion || '',
  })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase.from('cat_categoria_mantenimiento').select('*').eq('activo', true).order('orden').then(({ data }) => setCats(data || []))
  }, [])

  const guardar = async () => {
    if (!form.categoria) return toast.error('Elige la categoría')
    if (!form.titulo.trim()) return toast.error('Escribe qué hay que reparar')
    setSaving(true)
    try {
      const payload = { ...form, titulo: form.titulo.trim(), descripcion: form.descripcion.trim() || null, ubicacion: form.ubicacion.trim() || null }
      let row
      if (esNueva) {
        const { data, error } = await supabase.from('mantenimiento_solicitudes').insert(payload).select('id, folio, fotos_solicitud').single()
        if (error) throw error
        row = data
      } else {
        const { data, error } = await supabase.from('mantenimiento_solicitudes').update(payload).eq('id', solicitud.id).select('id, folio, fotos_solicitud').single()
        if (error) throw error
        row = data
      }
      if (files.length) {
        const { subidas, errores } = await subirFotos(row.id, 'solicitud', files)
        errores.forEach(e => toast.error(e))
        if (subidas.length) await supabase.from('mantenimiento_solicitudes').update({ fotos_solicitud: [...(row.fotos_solicitud || []), ...subidas] }).eq('id', row.id)
      }
      logAudit({ modulo: 'MANTENIMIENTO', accion: esNueva ? 'CREAR' : 'EDITAR', entidad: 'mantenimiento', entidad_id: row.id, descripcion: `${row.folio} — ${payload.titulo}` })
      toast.success(esNueva ? `Solicitud ${row.folio} registrada` : 'Solicitud actualizada')
      onSaved(row.id)
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  const tipoBtn = (id) => {
    const t = TIPOS[id]; const on = form.tipo === id
    return <button key={id} type="button" onClick={() => set('tipo', id)} style={{ flex: 1, padding: '8px 6px', borderRadius: 7, border: `1.5px solid ${t.color}`, background: on ? t.color : C.surface, color: on ? '#fff' : t.color, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{t.label}</button>
  }

  return (
    <Modal title={esNueva ? 'Nueva solicitud de mantenimiento' : `Editar ${solicitud.folio}`} icon={Wrench} onClose={onClose} width={560}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Campo2 label="Fecha de la solicitud">
          <input type="date" value={form.fecha_solicitud} onChange={e => set('fecha_solicitud', e.target.value)} style={inputStyle} />
        </Campo2>
        <Campo2 label="Categoría *">
          <select value={form.categoria} onChange={e => set('categoria', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">— Seleccionar —</option>
            {cats.map(c => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
          </select>
        </Campo2>
        <Campo2 label="Tipo" span>
          <div style={{ display: 'flex', gap: 8 }}>{Object.keys(TIPOS).map(tipoBtn)}</div>
        </Campo2>
        <Campo2 label="¿Qué hay que reparar? *" span>
          <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ej: Pintar muro que se despintó con la lluvia" style={inputStyle} />
        </Campo2>
        <Campo2 label="Ubicación" span>
          <input value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} placeholder="Ej: Muro norte, estacionamiento, local L12" style={inputStyle} />
        </Campo2>
        <Campo2 label="Descripción" span>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} placeholder="Qué pasó, qué tan grave es, qué se necesita…" style={{ ...inputStyle, resize: 'vertical' }} />
        </Campo2>
        <Campo2 label="Fotografías de la solicitud" span>
          <SelectorFotos files={files} setFiles={setFiles} />
        </Campo2>
      </div>
      <ModalFooter onClose={onClose} onSave={guardar} saving={saving} label={esNueva ? 'Registrar solicitud' : 'Guardar cambios'} />
    </Modal>
  )
}

// ─── Autorizar y asignar ─────────────────────────────────────────────────────
export function ModalAutorizar({ s, onClose, onSaved }) {
  const [provs, setProvs] = useState([])
  const [form, setForm] = useState({ asignado_proveedor_id: s.asignado_proveedor_id || '', fecha_programada: s.fecha_programada || '', costo_estimado: s.costo_estimado ?? '', nota_cambio: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  useEffect(() => {
    supabase.from('cat_proveedores').select('id,nombre,categoria').eq('activo', true).order('nombre').then(({ data }) => setProvs(data || []))
  }, [])
  // Primero los de mantenimiento/mixto, que son los que suelen hacer estos trabajos.
  const orden = [...provs].sort((a, b) => (['MANTENIMIENTO', 'MIXTO'].includes(b.categoria) ? 1 : 0) - (['MANTENIMIENTO', 'MIXTO'].includes(a.categoria) ? 1 : 0))

  const guardar = async () => {
    if (!form.asignado_proveedor_id) return toast.error('Asigna a quién hará el trabajo')
    setSaving(true)
    const { error } = await supabase.from('mantenimiento_solicitudes').update({
      estatus: 'AUTORIZADO', asignado_proveedor_id: form.asignado_proveedor_id,
      fecha_programada: form.fecha_programada || null, costo_estimado: form.costo_estimado === '' ? null : Number(form.costo_estimado),
      nota_cambio: form.nota_cambio.trim() || null,
    }).eq('id', s.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    logAudit({ modulo: 'MANTENIMIENTO', accion: 'EDITAR', entidad: 'mantenimiento', entidad_id: s.id, descripcion: `${s.folio} autorizada` })
    toast.success('Solicitud autorizada y asignada')
    onSaved()
  }

  return (
    <Modal title={`Autorizar ${s.folio}`} icon={CheckCircle} onClose={onClose}>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 14 }}>{s.titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Campo2 label="Asignar a *" span>
          <select value={form.asignado_proveedor_id} onChange={e => set('asignado_proveedor_id', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">— Seleccionar del catálogo de proveedores —</option>
            {orden.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.categoria ? ` · ${p.categoria.toLowerCase()}` : ''}</option>)}
          </select>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>¿No está? Dalo de alta en Compras → Proveedores (p. ej. "Juan Pérez — plomero", categoría Mantenimiento).</div>
        </Campo2>
        <Campo2 label="Fecha programada">
          <input type="date" value={form.fecha_programada} onChange={e => set('fecha_programada', e.target.value)} style={inputStyle} />
        </Campo2>
        <Campo2 label="Costo estimado">
          <input type="number" min="0" step="0.01" value={form.costo_estimado} onChange={e => set('costo_estimado', e.target.value)} placeholder="$" style={inputStyle} />
        </Campo2>
        <Campo2 label="Indicaciones" span>
          <textarea value={form.nota_cambio} onChange={e => set('nota_cambio', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </Campo2>
      </div>
      <ModalFooter onClose={onClose} onSave={guardar} saving={saving} label="Autorizar y asignar" color={ESTATUS.AUTORIZADO.color} />
    </Modal>
  )
}

export function ModalRechazar({ s, onClose, onSaved }) {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const guardar = async () => {
    if (!motivo.trim()) return toast.error('Indica el motivo')
    setSaving(true)
    const { error } = await supabase.from('mantenimiento_solicitudes').update({ estatus: 'RECHAZADO', motivo_rechazo: motivo.trim(), nota_cambio: null }).eq('id', s.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    logAudit({ modulo: 'MANTENIMIENTO', accion: 'EDITAR', entidad: 'mantenimiento', entidad_id: s.id, descripcion: `${s.folio} rechazada: ${motivo.trim()}` })
    toast.success('Solicitud rechazada')
    onSaved()
  }
  return (
    <Modal title={`Rechazar ${s.folio}`} icon={XCircle} onClose={onClose}>
      <Campo2 label="Motivo del rechazo *">
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} autoFocus style={{ ...inputStyle, resize: 'vertical' }} />
      </Campo2>
      <ModalFooter onClose={onClose} onSave={guardar} saving={saving} label="Rechazar" color={C.danger} />
    </Modal>
  )
}

export function ModalCerrar({ s, onClose, onSaved }) {
  const [form, setForm] = useState({
    resultado: s.resultado || '', fecha_cierre: new Date().toISOString().slice(0, 10),
    con_costo: s.con_costo ?? (s.gasto_total > 0 ? true : null),
    costo_real: s.costo_real ?? s.costo_estimado ?? '', registrar_gasto: !(s.n_gastos > 0),
  })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const guardar = async () => {
    if (!form.resultado.trim()) return toast.error('Describe el resultado del trabajo')
    if (form.con_costo == null) return toast.error('Indica si el trabajo tuvo costo')
    setSaving(true)
    try {
      let fotos = s.fotos_resultado || []
      if (files.length) {
        const { subidas, errores } = await subirFotos(s.id, 'resultado', files)
        errores.forEach(e => toast.error(e))
        fotos = [...fotos, ...subidas]
      }
      const costo = form.con_costo && form.costo_real !== '' ? Number(form.costo_real) : null
      const { error } = await supabase.from('mantenimiento_solicitudes').update({
        estatus: 'CERRADO', resultado: form.resultado.trim(), fecha_cierre: form.fecha_cierre || null,
        con_costo: form.con_costo, costo_real: form.con_costo ? costo : 0, fotos_resultado: fotos, nota_cambio: null,
      }).eq('id', s.id)
      if (error) throw error
      logAudit({ modulo: 'MANTENIMIENTO', accion: 'EDITAR', entidad: 'mantenimiento', entidad_id: s.id, descripcion: `${s.folio} cerrada${form.con_costo ? ' con costo' : ' sin costo'}` })
      toast.success('Trabajo cerrado')
      // Si hubo costo y no está registrado, se abre el ticket para cargarlo a la plaza.
      onSaved(form.con_costo && form.registrar_gasto ? { monto: costo } : null)
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }
  const opcion = (valor, titulo, sub, color) => {
    const on = form.con_costo === valor
    return (
      <button type="button" onClick={() => set('con_costo', valor)} style={{ flex: 1, textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${on ? color : C.border}`, background: on ? color + '12' : C.surface, cursor: 'pointer' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: on ? color : C.text }}>{titulo}</div>
        <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>
      </button>
    )
  }
  return (
    <Modal title={`Cerrar ${s.folio}`} icon={Flag} onClose={onClose} width={580}>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 14 }}>{s.titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Campo2 label="¿Cuál fue el resultado? *" span>
          <textarea value={form.resultado} onChange={e => set('resultado', e.target.value)} rows={3} placeholder="Qué se hizo y cómo quedó" style={{ ...inputStyle, resize: 'vertical' }} />
        </Campo2>
        <Campo2 label="Fecha de terminación">
          <input type="date" value={form.fecha_cierre} onChange={e => set('fecha_cierre', e.target.value)} style={inputStyle} />
        </Campo2>
        <div />
        <Campo2 label="¿Tuvo costo? *" span>
          <div style={{ display: 'flex', gap: 8 }}>
            {opcion(false, 'Sin costo', 'Lo hizo personal interno', C.muted)}
            {opcion(true, 'Sí, tuvo costo', 'Proveedor externo o material comprado', C.danger)}
          </div>
        </Campo2>
        {form.con_costo && <>
          <Campo2 label="Costo total">
            <input type="number" min="0" step="0.01" value={form.costo_real} onChange={e => set('costo_real', e.target.value)} placeholder="$" style={inputStyle} />
          </Campo2>
          <Campo2 label="Gasto de la plaza">
            {s.n_gastos > 0
              ? <div style={{ fontSize: 12, color: C.success, paddingTop: 8 }}>Ya tiene {s.n_gastos} ticket{s.n_gastos === 1 ? '' : 's'} ligado{s.n_gastos === 1 ? '' : 's'}</div>
              : <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, paddingTop: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.registrar_gasto} onChange={e => set('registrar_gasto', e.target.checked)} /> Registrar el ticket al cerrar
                </label>}
          </Campo2>
        </>}
        <Campo2 label="Fotografías del resultado" span>
          <SelectorFotos files={files} setFiles={setFiles} />
        </Campo2>
      </div>
      <ModalFooter onClose={onClose} onSave={guardar} saving={saving} label="Cerrar trabajo" color={ESTATUS.CERRADO.color} />
    </Modal>
  )
}

/** Datos para abrir el TicketModal ya ligado a la solicitud. */
export const ticketDeMantenimiento = (s, monto) => ({
  gasto: {
    proveedor_id: s.asignado_proveedor_id || '', proveedor_txt: s.asignado_nombre || '',
    grupo_gasto: 'Mantenimiento', descripcion: `${s.folio} · ${s.titulo}`, ticket_total: monto ?? '',
  },
  extra: { mantenimiento_id: s.id },
})

/** Liga un ticket ya capturado (Gastos / fondo revolvente) a la solicitud. */
export function ModalLigarTicket({ s, onClose, onSaved }) {
  const [rows, setRows] = useState([])
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(new Set())
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    const desde = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10)
    supabase.from('prp_gastos').select('*').is('mantenimiento_id', null).gte('fecha', desde).order('fecha', { ascending: false }).limit(500)
      .then(({ data }) => setRows(data || []))
  }, [])
  const q = busca.toLowerCase()
  const lista = rows.filter(r => !q || [r.proveedor_nombre, r.proveedor_txt, r.grupo_gasto, r.descripcion].some(v => (v || '').toLowerCase().includes(q)))
  const toggle = id => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const guardar = async () => {
    if (!sel.size) return toast.error('Elige al menos un ticket')
    setSaving(true)
    const { error } = await supabase.from('gastos_operativos').update({ mantenimiento_id: s.id }).in('id', [...sel])
    setSaving(false)
    if (error) return toast.error(error.message)
    logAudit({ modulo: 'MANTENIMIENTO', accion: 'EDITAR', entidad: 'mantenimiento', entidad_id: s.id, descripcion: `${s.folio}: ${sel.size} ticket(s) ligado(s)` })
    toast.success(`${sel.size} ticket${sel.size === 1 ? '' : 's'} ligado${sel.size === 1 ? '' : 's'}`)
    onSaved()
  }
  const fmt = n => '$' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
  return (
    <Modal title={`Ligar tickets a ${s.folio}`} icon={Flag} onClose={onClose} width={640}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Tickets de los últimos 4 meses que no están ligados a otra solicitud (compras de material, pago al proveedor, caja chica).</div>
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar proveedor, grupo o descripción…" style={inputStyle} />
      <div style={{ maxHeight: 340, overflow: 'auto', marginTop: 10, border: `1px solid ${C.border}`, borderRadius: 8 }}>
        {!lista.length ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: C.muted }}>Sin tickets</div> : lista.map(r => (
          <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderTop: `1px solid ${C.border}`, cursor: 'pointer', background: sel.has(r.id) ? C.primary + '10' : C.surface }}>
            <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.proveedor_nombre || r.proveedor_txt || 'Sin proveedor'} <span style={{ fontWeight: 400, color: C.muted }}>· {r.grupo_gasto}</span></div>
              <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-MX')} {r.descripcion ? '· ' + r.descripcion : ''}</div>
            </div>
            <b style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{fmt(r.ticket_total ?? r.monto)}</b>
          </label>
        ))}
      </div>
      <ModalFooter onClose={onClose} onSave={guardar} saving={saving} label={`Ligar ${sel.size || ''} ticket${sel.size === 1 ? '' : 's'}`} />
    </Modal>
  )
}

/** Cambio simple de estatus (iniciar, reabrir) con comentario opcional. */
export async function cambiarEstatus(s, estatus, nota) {
  const { error } = await supabase.from('mantenimiento_solicitudes').update({ estatus, nota_cambio: nota || null }).eq('id', s.id)
  if (error) { toast.error(error.message); return false }
  logAudit({ modulo: 'MANTENIMIENTO', accion: 'EDITAR', entidad: 'mantenimiento', entidad_id: s.id, descripcion: `${s.folio} → ${ESTATUS[estatus].label}` })
  toast.success(`${s.folio}: ${ESTATUS[estatus].label}`)
  return true
}

