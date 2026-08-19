import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Phone, Mail, MapPin, User, Pencil, Save, X, Trash2, FileText, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Formulario de despacho ───────────────────────────────────────────────────
function FormDespacho({ inicial = {}, onSave, onCancel, saving }) {
  const [f, setF] = useState({
    nombre: '', titular: '', rfc: '', email: '', telefono: '', celular: '',
    domicilio: '', ciudad: 'Hermosillo', estado: 'Sonora', especialidad: '', notas: '',
    ...inicial,
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }
  const Col = ({ label, children }) => (
    <div><label style={lbl}>{label}</label>{children}</div>
  )

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Col label="Nombre del despacho *">
          <input value={f.nombre} onChange={e => set('nombre', e.target.value)} style={inp} placeholder="Ej: Abogados Ortiz & Asociados" />
        </Col>
        <Col label="Titular / Abogado responsable">
          <input value={f.titular} onChange={e => set('titular', e.target.value)} style={inp} placeholder="Lic. Juan Ortiz Ruiz" />
        </Col>
        <Col label="RFC">
          <input value={f.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())} style={inp} placeholder="XAXX010101000" />
        </Col>
        <Col label="Especialidad">
          <input value={f.especialidad} onChange={e => set('especialidad', e.target.value)} style={inp} placeholder="Arrendamiento, Litigio civil..." />
        </Col>
        <Col label="Email">
          <input type="email" value={f.email} onChange={e => set('email', e.target.value)} style={inp} placeholder="contacto@despacho.mx" />
        </Col>
        <Col label="Teléfono">
          <input value={f.telefono} onChange={e => set('telefono', e.target.value)} style={inp} placeholder="662 123 4567" />
        </Col>
        <Col label="Celular">
          <input value={f.celular} onChange={e => set('celular', e.target.value)} style={inp} placeholder="662 987 6543" />
        </Col>
        <Col label="Ciudad">
          <input value={f.ciudad} onChange={e => set('ciudad', e.target.value)} style={inp} />
        </Col>
        <div style={{ gridColumn: '1 / -1' }}>
          <Col label="Domicilio completo">
            <input value={f.domicilio} onChange={e => set('domicilio', e.target.value)} style={inp} placeholder="Calle, No., Colonia, CP" />
          </Col>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Col label="Notas">
            <textarea value={f.notas} onChange={e => set('notas', e.target.value)} rows={2}
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Honorarios, condiciones, contacto alterno..." />
          </Col>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onSave(f)} disabled={saving || !f.nombre.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: saving ? '#9CA3AF' : 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: saving ? 'default' : 'pointer', opacity: !f.nombre.trim() ? 0.5 : 1 }}>
          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar despacho'}
        </button>
        <button onClick={onCancel} style={{ padding: '9px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  )
}

// ─── Tarjeta de despacho ──────────────────────────────────────────────────────
function CardDespacho({ d, contratos, onEdit, onDelete, onVer }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Building2 size={16} color="var(--color-primary)" />
            <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)' }}>{d.nombre}</span>
            {!d.activo && <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#991B1B', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>INACTIVO</span>}
          </div>
          {d.especialidad && <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600 }}>{d.especialidad}</div>}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onEdit} style={{ padding: '5px 10px', background: '#EFF6FF', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)' }}>
            <Pencil size={11} /> Editar
          </button>
          <button onClick={onDelete} style={{ padding: '5px 8px', background: '#FEE2E2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#991B1B' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
        {d.titular && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
            <User size={12} color="#9CA3AF" /> {d.titular}
          </div>
        )}
        {d.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
            <Mail size={12} color="#9CA3AF" />
            <a href={`mailto:${d.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{d.email}</a>
          </div>
        )}
        {(d.telefono || d.celular) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
            <Phone size={12} color="#9CA3AF" /> {d.telefono || d.celular}
          </div>
        )}
        {d.domicilio && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}>
            <MapPin size={12} color="#9CA3AF" /> {d.domicilio}
          </div>
        )}
      </div>

      {d.notas && (
        <div style={{ fontSize: '12px', color: '#6B7280', background: '#F9FAFB', borderRadius: '6px', padding: '8px 10px' }}>
          {d.notas}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
          <FileText size={13} color="#9CA3AF" />
          <span><strong style={{ color: 'var(--color-primary)' }}>{contratos}</strong> contrato{contratos !== 1 ? 's' : ''} elaborado{contratos !== 1 ? 's' : ''}</span>
        </div>
        {contratos > 0 && (
          <button onClick={onVer} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#EFF6FF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)' }}>
            Ver contratos <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function Despachos() {
  const [despachos, setDespachos] = useState([])
  const [contratos, setContratos] = useState({}) // { despacho_id: count }
  const [loading, setLoading] = useState(true)
  const [showNuevo, setShowNuevo] = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: d } = await supabase.from('cat_despachos').select('*').order('nombre')
    setDespachos(d || [])

    // Contar contratos por despacho
    const { data: c } = await supabase.from('contratos').select('despacho_id').not('despacho_id', 'is', null)
    const cnt = {}
    ;(c || []).forEach(r => { cnt[r.despacho_id] = (cnt[r.despacho_id] || 0) + 1 })
    setContratos(cnt)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async (f) => {
    setSaving(true)
    const payload = {
      nombre: f.nombre.trim(),
      titular: f.titular || null,
      rfc: f.rfc || null,
      email: f.email || null,
      telefono: f.telefono || null,
      celular: f.celular || null,
      domicilio: f.domicilio || null,
      ciudad: f.ciudad || 'Hermosillo',
      estado: f.estado || 'Sonora',
      especialidad: f.especialidad || null,
      notas: f.notas || null,
      updated_at: new Date().toISOString(),
    }
    if (editando) {
      await supabase.from('cat_despachos').update(payload).eq('id', editando.id)
      setEditando(null)
    } else {
      await supabase.from('cat_despachos').insert(payload)
      setShowNuevo(false)
    }
    setSaving(false)
    cargar()
  }

  const eliminar = async (d) => {
    if (contratos[d.id] > 0) {
      alert(`Este despacho tiene ${contratos[d.id]} contrato(s). Primero reasigna o elimina esos contratos.`)
      return
    }
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return
    await supabase.from('cat_despachos').delete().eq('id', d.id)
    cargar()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Despachos Jurídicos</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>
            {despachos.length} despacho{despachos.length !== 1 ? 's' : ''} registrado{despachos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => { setShowNuevo(true); setEditando(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo Despacho
        </button>
      </div>

      {/* Formulario nuevo */}
      {showNuevo && (
        <div style={{ background: 'white', borderRadius: '12px', border: '2px solid var(--color-primary)', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>Nuevo Despacho Jurídico</h3>
          <FormDespacho onSave={guardar} onCancel={() => setShowNuevo(false)} saving={saving} />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>Cargando...</div>
      ) : despachos.length === 0 && !showNuevo ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: '#9CA3AF' }}>
          <Building2 size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Sin despachos registrados</p>
          <p style={{ fontSize: '13px', margin: '0 0 20px' }}>Agrega los despachos jurídicos que elaboran contratos de arrendamiento.</p>
          <button onClick={() => setShowNuevo(true)} style={{ padding: '10px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            + Agregar primer despacho
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {despachos.map(d => (
            editando?.id === d.id ? (
              <div key={d.id} style={{ background: 'white', borderRadius: '12px', border: '2px solid #7C3AED', padding: '20px', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#7C3AED' }}>Editar: {d.nombre}</h3>
                  <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
                </div>
                <FormDespacho inicial={d} onSave={guardar} onCancel={() => setEditando(null)} saving={saving} />
              </div>
            ) : (
              <CardDespacho
                key={d.id}
                d={d}
                contratos={contratos[d.id] || 0}
                onEdit={() => { setEditando(d); setShowNuevo(false) }}
                onDelete={() => eliminar(d)}
                onVer={() => window.location.href = `/contratos?despacho=${d.id}`}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}
