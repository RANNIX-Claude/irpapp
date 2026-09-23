import { useState, useMemo } from 'react'
import { X, Link2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../hooks/useAudit'
import { normNombre, pesos } from '../../lib/compras'

const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }

/**
 * Liga un nombre capturado como texto libre ("SAMS", "FERRETERA ARANDAS") a un
 * proveedor del catálogo —existente o nuevo—. El nombre queda como alias y
 * todas sus compras históricas se ligan en la base (vincular_nombre_proveedor).
 */
export default function VincularNombreModal({ nombre, monto, compras, proveedores, onClose, onHecho }) {
  const norm = normNombre(nombre)
  // Sugerencias: proveedores cuyo nombre contiene al texto o al revés.
  const sugeridos = useMemo(() => proveedores.filter(p => {
    const n = normNombre(p.nombre)
    return n && norm && (n.includes(norm) || norm.includes(n) || (p.alias || []).includes(norm))
  }), [proveedores, norm])

  const [modo, setModo] = useState(sugeridos.length ? 'existente' : 'nuevo')
  const [provId, setProvId] = useState(sugeridos[0]?.id || '')
  const [busca, setBusca] = useState('')
  const [nuevo, setNuevo] = useState({
    nombre: nombre.replace(/\s+/g, ' ').trim(),
    clave: norm.slice(0, 16),
    categoria: '',
    rfc: '',
  })
  const [saving, setSaving] = useState(false)

  const lista = proveedores.filter(p => !busca || p.nombre.toLowerCase().includes(busca.toLowerCase()))

  const guardar = async () => {
    setSaving(true)
    try {
      let id = provId
      if (modo === 'nuevo') {
        if (!nuevo.nombre.trim() || !nuevo.clave.trim()) throw new Error('Nombre y clave son obligatorios')
        const { data, error } = await supabase.from('cat_proveedores').insert({
          nombre: nuevo.nombre.trim(), clave: nuevo.clave.trim().toUpperCase(),
          categoria: nuevo.categoria || null, rfc: nuevo.rfc.trim().toUpperCase() || null, activo: true,
        }).select('id').single()
        if (error) throw new Error(error.code === '23505' ? 'Ya existe un proveedor con esa clave' : error.message)
        id = data.id
        logAudit({ modulo: 'PROVEEDORES', accion: 'CREAR', entidad: 'proveedor', entidad_id: id, descripcion: `Proveedor "${nuevo.nombre}" creado desde análisis de compras` })
      }
      if (!id) throw new Error('Elige un proveedor')
      const { data: n, error } = await supabase.rpc('vincular_nombre_proveedor', { p_texto: nombre, p_proveedor_id: id })
      if (error) throw error
      logAudit({ modulo: 'PROVEEDORES', accion: 'EDITAR', entidad: 'proveedor', entidad_id: id, descripcion: `Nombre "${nombre}" ligado al catálogo (${n} registros)` })
      toast.success(`${n} registro${n === 1 ? '' : 's'} ligado${n === 1 ? '' : 's'} al catálogo`)
      onHecho()
    } catch (e) {
      toast.error(e.message)
    } finally { setSaving(false) }
  }

  const tab = (id, label, Icon) => (
    <button onClick={() => setModo(id)} style={{ flex: 1, padding: '9px', border: 'none', borderBottom: `2.5px solid ${modo === id ? '#0A66C2' : 'transparent'}`, background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: modo === id ? '#0A66C2' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Icon size={14} /> {label}
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 500, maxWidth: '96vw', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A66C2' }}>Ligar al catálogo</h3>
            <div style={{ fontSize: 13, color: '#111827', fontWeight: 700, marginTop: 4 }}>"{nombre}"</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{compras} compra{compras === 1 ? '' : 's'} · {pesos(monto)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
          {tab('existente', 'Proveedor existente', Link2)}
          {tab('nuevo', 'Crear proveedor', Plus)}
        </div>

        <div style={{ padding: '16px 22px', display: 'grid', gap: 12 }}>
          {modo === 'existente' ? (
            <>
              {sugeridos.length > 0 && (
                <div>
                  <div style={lbl}>Sugeridos</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sugeridos.map(p => (
                      <button key={p.id} onClick={() => setProvId(p.id)} style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid #0A66C2', background: provId === p.id ? '#0A66C2' : 'white', color: provId === p.id ? 'white' : '#0A66C2', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{p.nombre}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={lbl}>Buscar en el catálogo</div>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nombre…" style={inp} />
                <div style={{ marginTop: 6, maxHeight: 220, overflow: 'auto', border: '1px solid #F3F4F6', borderRadius: 8 }}>
                  {lista.map(p => (
                    <div key={p.id} onClick={() => setProvId(p.id)} style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', background: provId === p.id ? '#EFF6FF' : 'white', borderBottom: '1px solid #F9FAFB', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: provId === p.id ? 700 : 500 }}>{p.nombre}</span>
                      <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{p.clave}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <div>
                  <label style={lbl}>Clave *</label>
                  <input value={nuevo.clave} onChange={e => setNuevo(n => ({ ...n, clave: e.target.value.toUpperCase() }))} style={{ ...inp, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={lbl}>Nombre *</label>
                  <input value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>RFC</label>
                  <input value={nuevo.rfc} onChange={e => setNuevo(n => ({ ...n, rfc: e.target.value.toUpperCase() }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Categoría</label>
                  <select value={nuevo.categoria} onChange={e => setNuevo(n => ({ ...n, categoria: e.target.value }))} style={{ ...inp, background: 'white' }}>
                    <option value="">—</option>
                    {['OPERACION', 'VENDING', 'MANTENIMIENTO', 'PROYECTOS', 'MIXTO'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
          <div style={{ fontSize: 11.5, color: '#6B7280', background: '#F8FAFC', padding: '8px 12px', borderRadius: 8 }}>
            El nombre "{nombre}" queda como alias: las compras futuras con ese nombre se ligan solas.
          </div>
        </div>

        <div style={{ padding: '12px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancelar</button>
          <button onClick={guardar} disabled={saving || (modo === 'existente' && !provId)} style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: '#0A66C2', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: saving || (modo === 'existente' && !provId) ? .6 : 1 }}>
            {saving ? 'Ligando…' : 'Ligar'}
          </button>
        </div>
      </div>
    </div>
  )
}
