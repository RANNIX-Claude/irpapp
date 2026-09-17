import { useState, useRef } from 'react'
import { X, Edit2, RefreshCw, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Avatar, SemaforoContrato, fmt$ } from './rh-helpers'
import ModalRenovarContrato from './ModalRenovarContrato'
import ModalEditarEmpleado from './ModalEditarEmpleado'

// ── Avatar con upload (modal detalle) ────────────────────────────────────────
export function AvatarUploadSmall({ nombre, foto, uploading, inputRef, onChange }) {
  const [hovered, setHovered] = useState(false)
  const showOverlay = hovered || uploading
  return (
    <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0, width: 44, height: 44 }}
      onClick={() => inputRef.current?.click()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Cambiar foto">
      <Avatar nombre={nombre} foto={foto} size={44} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: showOverlay ? 1 : 0, transition: 'opacity .18s', pointerEvents: 'none' }}>
        {uploading
          ? <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          : <Upload size={13} color="white" />}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onChange} />
    </div>
  )
}

// ── Detalle de empleado ─────────────────────────────────────────────────────
export function DetalleEmpleado({ emp, onClose, onRefresh }) {
  const [subModal, setSubModal] = useState(null) // 'renovar' | 'editar'
  const [fotoUrl, setFotoUrl] = useState(emp.foto_url)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fotoInputRef = useRef(null)

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `${emp.id}_${Date.now()}.${ext}`
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { toast.error('Sin sesión activa'); return }
      const base = import.meta.env.VITE_SUPABASE_URL
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${base}/storage/v1/object/avatars/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: anon, 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) { const t = await res.text(); toast.error('Error foto: ' + t); return }
      const url = `${base}/storage/v1/object/public/avatars/${path}`
      await supabase.from('rh_empleados').update({ foto_url: url }).eq('id', emp.id)
      setFotoUrl(url)
      toast.success('Foto actualizada')
      onRefresh()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setUploadingFoto(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 12, width: 560, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, background: 'white' }}>
          {/* Avatar clickeable para cambiar foto */}
          <AvatarUploadSmall nombre={emp.nombre_completo} foto={fotoUrl} uploading={uploadingFoto} inputRef={fotoInputRef} onChange={handleFotoChange} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{emp.nombre_completo}</h2>
            <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>{emp.puesto} · {emp.numero_empleado}</div>
          </div>
          <SemaforoContrato valor={emp.semaforo_contrato} fechaFin={emp.contrato_fin} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}><X size={20} /></button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            {[
              ['Departamento', emp.departamento ?? emp.area],
              ['Fecha ingreso', emp.fecha_ingreso],
              ['Antigüedad', emp.dias_antiguedad != null ? Math.floor(emp.dias_antiguedad / 365) + ' años, ' + (Math.floor(emp.dias_antiguedad / 30) % 12) + ' meses' : null],
              ['Salario mensual', emp.salario_mensual ? fmt$(emp.salario_mensual) : null],
              ['Salario diario', emp.salario_diario ? fmt$(emp.salario_diario) : null],
              ['Horario', emp.horario_trabajo],
              ['Día de descanso', emp.dia_descanso],
              ['Forma de pago', emp.forma_pago === 'TRANSFERENCIA' ? 'Transferencia' : emp.forma_pago === 'EFECTIVO' ? 'Efectivo' : emp.forma_pago === 'MIXTO' ? 'Mixto' : emp.forma_pago],
              ['Email', emp.email], ['Celular', emp.celular],
              ['RFC', emp.rfc], ['CURP', emp.curp], ['NSS', emp.nss],
              ['Tipo contrato', emp.tipo_contrato_nombre],
              ['Vencimiento contrato', emp.contrato_fin ?? 'Tiempo indeterminado'],
            ].filter(([,v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, borderBottom: '1px solid #F3F4F6', paddingBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-light)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, fontFamily: ['RFC','CURP','NSS'].includes(label) ? 'monospace' : 'inherit' }}>{val}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setSubModal('editar')}
              style={{ padding: '7px 12px', background: '#FFF7ED', border: '1.5px solid #E8A020', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#92400E', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit2 size={13} /> Modificar
            </button>
            <button onClick={() => setSubModal('renovar')}
              style={{ padding: '7px 12px', background: '#F5F3FF', border: '1.5px solid #7B5EA7', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#7B5EA7', display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={13} /> Renovar Contrato
            </button>
          </div>
        </div>
      </div>
      {subModal === 'renovar' && (
        <RenovarContratoModal empleado={emp} onClose={() => setSubModal(null)} onSaved={() => { onRefresh(); setSubModal(null) }} />
      )}
      {subModal === 'editar' && (
        <EditarEmpleadoModal emp={emp} onClose={() => setSubModal(null)} onSaved={onRefresh} />
      )}
    </div>
  )
}
