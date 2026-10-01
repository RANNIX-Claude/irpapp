import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Key, UserCheck, UserX, Shield, RefreshCw, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const API = '/.netlify/functions/admin-usuarios'

async function getJwt() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token
}

async function callApi(accion, payload) {
  const jwt = await getJwt()
  if (!jwt) throw new Error('Sin sesión activa')
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ accion, ...payload }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error desconocido')
  return data
}

const ROLES_COLORES = {
  super_admin:         { bg: '#FEF3C7', color: '#92400E', label: 'Super Admin' },
  corporativo:         { bg: '#DBEAFE', color: '#1E40AF', label: 'Corporativo' },
  finanzas:            { bg: '#D1FAE5', color: '#065F46', label: 'Finanzas' },
  facturador:          { bg: '#EDE9FE', color: '#5B21B6', label: 'Facturador' },
  asistente:           { bg: '#FEE2E2', color: '#991B1B', label: 'Asistente' },
  central_mantenimiento: { bg: '#FFEDD5', color: '#9A3412', label: 'Mantenimiento' },
  locatario:           { bg: '#F1F5F9', color: '#475569', label: 'Locatario' },
  restaurante:         { bg: '#FDF2F8', color: '#9D174D', label: 'Restaurante' },
}

function RolBadge({ rol_id }) {
  const cfg = ROLES_COLORES[rol_id] || { bg: '#F3F4F6', color: '#374151', label: rol_id || '—' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11,
      fontWeight: 700, background: cfg.bg, color: cfg.color,
    }}>{cfg.label}</span>
  )
}

// ── Modal: Nuevo usuario ───────────────────────────────────────────────────
function ModalNuevo({ roles, onClose, onSave }) {
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellido: '', rol_id: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.email || !form.password || !form.rol_id) {
      toast.error('Email, contraseña y rol son obligatorios'); return
    }
    setSaving(true)
    try {
      await callApi('crear', form)
      toast.success('Usuario creado')
      onSave()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 12, padding: 28, width: 440, maxWidth: '94vw',
        boxShadow: '0 8px 32px rgba(0,0,0,.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nuevo usuario</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}><X size={18} /></button>
        </div>

        {[
          { label: 'Nombre', key: 'nombre', type: 'text' },
          { label: 'Apellido', key: 'apellido', type: 'text' },
          { label: 'Email *', key: 'email', type: 'email' },
          { label: 'Contraseña * (mín. 8 chars)', key: 'password', type: 'password' },
        ].map(({ label, key, type }) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={e => set(key, e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
                fontSize: 14, background: 'var(--color-bg)', color: 'var(--color-text)', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>Rol *</label>
          <select
            value={form.rol_id}
            onChange={e => set('rol_id', e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
              fontSize: 14, background: 'var(--color-bg)', color: 'var(--color-text)',
            }}
          >
            <option value="">— Seleccionar rol —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.id})</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 6, border: '1px solid var(--color-border)',
            background: 'none', cursor: 'pointer', fontSize: 14,
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: 'var(--color-primary)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600, opacity: saving ? .7 : 1,
          }}>{saving ? 'Creando…' : 'Crear usuario'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Cambiar contraseña ──────────────────────────────────────────────
function ModalPass({ usuario, onClose, onSave }) {
  const [pw, setPw] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (pw.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    setSaving(true)
    try {
      await callApi('cambiar_pass', { usuario_id: usuario.id, password: pw })
      toast.success('Contraseña actualizada')
      onSave()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 12, padding: 28, width: 380, maxWidth: '94vw',
        boxShadow: '0 8px 32px rgba(0,0,0,.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Cambiar contraseña</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}><X size={18} /></button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-muted)' }}>{usuario.email}</p>
        <input
          type="password"
          placeholder="Nueva contraseña (mín. 8 chars)"
          value={pw}
          onChange={e => setPw(e.target.value)}
          autoFocus
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
            fontSize: 14, background: 'var(--color-bg)', color: 'var(--color-text)', boxSizing: 'border-box', marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 6, border: '1px solid var(--color-border)',
            background: 'none', cursor: 'pointer', fontSize: 14,
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: 'var(--color-primary)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600, opacity: saving ? .7 : 1,
          }}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Cambiar rol ─────────────────────────────────────────────────────
function ModalRol({ usuario, roles, onClose, onSave }) {
  const [form, setForm] = useState({ rol_id: usuario.rol_id || '', nombre: usuario.nombre || '', apellido: usuario.apellido || '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.rol_id) { toast.error('Selecciona un rol'); return }
    setSaving(true)
    try {
      await callApi('cambiar_rol', { usuario_id: usuario.id, ...form })
      toast.success('Perfil actualizado')
      onSave()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 12, padding: 28, width: 420, maxWidth: '94vw',
        boxShadow: '0 8px 32px rgba(0,0,0,.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Editar perfil</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}><X size={18} /></button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-muted)' }}>{usuario.email}</p>

        {[
          { label: 'Nombre', key: 'nombre' },
          { label: 'Apellido', key: 'apellido' },
        ].map(({ label, key }) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
            <input
              type="text" value={form[key]}
              onChange={e => set(key, e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
                fontSize: 14, background: 'var(--color-bg)', color: 'var(--color-text)', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>Rol</label>
          <select
            value={form.rol_id}
            onChange={e => set('rol_id', e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
              fontSize: 14, background: 'var(--color-bg)', color: 'var(--color-text)',
            }}
          >
            <option value="">— Seleccionar —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.id})</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 6, border: '1px solid var(--color-border)',
            background: 'none', cursor: 'pointer', fontSize: 14,
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: 'var(--color-primary)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600, opacity: saving ? .7 : 1,
          }}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null) // null | { tipo, usuario? }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await callApi('listar', {})
      setUsuarios(data.usuarios || [])
      setRoles(data.roles || [])
    } catch (e) {
      toast.error('Error al cargar usuarios: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const toggleActivo = async (u) => {
    const accion = u.activo ? 'desactivar' : 'activar'
    try {
      await callApi(accion, { usuario_id: u.id })
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
      cargar()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const filtrados = usuarios.filter(u => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (u.email || '').toLowerCase().includes(q)
      || (u.nombre || '').toLowerCase().includes(q)
      || (u.apellido || '').toLowerCase().includes(q)
      || (u.rol_id || '').toLowerCase().includes(q)
  })

  const fmt = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Administración de Usuarios</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>Cuentas, roles y contraseñas</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={cargar} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 7, border: '1px solid var(--color-border)', background: 'none',
            cursor: 'pointer', fontSize: 13,
          }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => setModal({ tipo: 'nuevo' })} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 7, border: 'none', background: 'var(--color-primary)', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            <Plus size={14} /> Nuevo usuario
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 340 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, email o rol…"
          style={{
            width: '100%', padding: '7px 10px 7px 30px', borderRadius: 7,
            border: '1px solid var(--color-border)', fontSize: 13,
            background: 'var(--color-bg)', color: 'var(--color-text)', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tabla */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                {['Estado', 'Nombre', 'Email', 'Rol', 'Último acceso', 'Creado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: .4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--color-muted)' }}>Sin resultados</td></tr>
              )}
              {filtrados.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < filtrados.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: u.activo ? 1 : .55 }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: u.activo ? 'var(--color-success)' : '#9CA3AF',
                    }} />
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                    {u.nombre || u.apellido ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : <span style={{ color: 'var(--color-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-muted)' }}>{u.email}</td>
                  <td style={{ padding: '10px 12px' }}><RolBadge rol_id={u.rol_id} /></td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-muted)' }}>{fmt(u.ultimo_acceso)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-muted)' }}>{fmt(u.creado_en)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        title="Editar perfil / rol"
                        onClick={() => setModal({ tipo: 'rol', usuario: u })}
                        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      >
                        <Shield size={13} /> Rol
                      </button>
                      <button
                        title="Cambiar contraseña"
                        onClick={() => setModal({ tipo: 'pass', usuario: u })}
                        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      >
                        <Key size={13} /> Pass
                      </button>
                      <button
                        title={u.activo ? 'Desactivar' : 'Activar'}
                        onClick={() => toggleActivo(u)}
                        style={{
                          background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                          color: u.activo ? 'var(--color-danger)' : 'var(--color-success)',
                        }}
                      >
                        {u.activo ? <UserX size={13} /> : <UserCheck size={13} />}
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 10, fontSize: 12, color: 'var(--color-muted)' }}>
        {filtrados.length} de {usuarios.length} usuarios
      </p>

      {/* Modales */}
      {modal?.tipo === 'nuevo' && (
        <ModalNuevo roles={roles} onClose={() => setModal(null)} onSave={() => { setModal(null); cargar() }} />
      )}
      {modal?.tipo === 'pass' && (
        <ModalPass usuario={modal.usuario} onClose={() => setModal(null)} onSave={() => { setModal(null); cargar() }} />
      )}
      {modal?.tipo === 'rol' && (
        <ModalRol usuario={modal.usuario} roles={roles} onClose={() => setModal(null)} onSave={() => { setModal(null); cargar() }} />
      )}
    </div>
  )
}
