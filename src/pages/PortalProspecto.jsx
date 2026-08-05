import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Building2, Upload, CheckCircle, AlertTriangle, FileText, User, Phone, Mail, CreditCard } from 'lucide-react'

const DOCS_REQUERIDOS = [
  { id: 'ine', label: 'INE / Identificación oficial', requerido: true },
  { id: 'curp', label: 'CURP', requerido: true },
  { id: 'rfc_doc', label: 'Constancia de situación fiscal (RFC)', requerido: true },
  { id: 'comprobante', label: 'Comprobante de domicilio (máx 3 meses)', requerido: true },
  { id: 'acta', label: 'Acta constitutiva (personas morales)', requerido: false },
  { id: 'estados_cuenta', label: 'Estados de cuenta bancarios (3 meses)', requerido: true },
  { id: 'declaracion', label: 'Declaración anual (último ejercicio)', requerido: false },
  { id: 'aval_ine', label: 'INE del aval / fiador', requerido: true },
]

function DocUploadRow({ doc, archivo, onChange }) {
  const fileRef = { current: null }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: archivo ? '#F0FDF4' : '#FAFAFA', border: `1.5px solid ${archivo ? '#86EFAC' : '#E5E7EB'}`, borderRadius: '10px', marginBottom: '8px', transition: 'all 0.15s' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 600 }}>
          {doc.label}
          {doc.requerido && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>*</span>}
        </div>
        {archivo && <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '2px' }}>✓ {archivo.name}</div>}
      </div>
      {archivo
        ? <CheckCircle size={20} color="var(--color-success)" />
        : (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--color-primary)', color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={13} /> Subir
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => onChange(doc.id, e.target.files[0])} />
          </label>
        )
      }
    </div>
  )
}

export default function PortalProspecto() {
  const { token } = useParams()
  const [step, setStep] = useState(1)
  const [archivos, setArchivos] = useState({})
  const [enviado, setEnviado] = useState(false)
  const [prospecto] = useState({
    nombre: 'Miguel Ángel Torres Soto',
    email: 'mtorres@ejemplo.com',
    telefono: '667-234-5678',
    local: 'Local L-07',
    inmueble: 'Plaza IWOL',
    renta: 12500,
    superficie: '38 m²',
    vigencia: '12 meses',
    expira: '2026-08-20',
  })

  const setArchivo = (id, file) => setArchivos(prev => ({ ...prev, [id]: file }))
  const requeridos = DOCS_REQUERIDOS.filter(d => d.requerido)
  const subidosRequeridos = requeridos.filter(d => archivos[d.id]).length
  const pctCompleto = Math.round((subidosRequeridos / requeridos.length) * 100)
  const puedeEnviar = subidosRequeridos === requeridos.length

  const enviar = () => {
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '48px 40px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="var(--color-success)" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 12px' }}>¡Documentos enviados!</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', lineHeight: 1.6, margin: '0 0 24px' }}>
            Tu expediente ha sido recibido. El administrador lo revisará y te notificará por correo en un plazo de 24-48 horas.
          </p>
          <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '16px', fontSize: '13px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-light)' }}>Local solicitado</span>
              <span style={{ fontWeight: 700 }}>{prospecto.local} · {prospecto.inmueble}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-light)' }}>Documentos enviados</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{Object.keys(archivos).length}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-primary-dark)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Building2 size={24} color="white" />
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>IRP — Inmueble Resource Planning</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Portal de Prospectos</div>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Bienvenida */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>Hola, {prospecto.nombre.split(' ')[0]}</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Completa tu expediente para continuar el proceso de arrendamiento del <strong>{prospecto.local}</strong> en <strong>{prospecto.inmueble}</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {[
              [Building2, 'Local', `${prospecto.local} · ${prospecto.superficie}`],
              [CreditCard, 'Renta mensual', `$${prospecto.renta.toLocaleString()} + IVA`],
              [FileText, 'Vigencia', prospecto.vigencia],
              [AlertTriangle, 'Expira en', prospecto.expira],
            ].map(([Icon, label, val]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#F9FAFB', borderRadius: '8px' }}>
                <Icon size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-light)', borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={13} />{prospecto.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={13} />{prospecto.telefono}</div>
          </div>
        </div>

        {/* Progreso */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Progreso del expediente</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: puedeEnviar ? 'var(--color-success)' : 'var(--color-primary)' }}>{pctCompleto}%</span>
          </div>
          <div style={{ height: '10px', background: '#F3F4F6', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${pctCompleto}%`, background: puedeEnviar ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: '6px', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
            {subidosRequeridos} de {requeridos.length} documentos obligatorios cargados
          </div>
        </div>

        {/* Documentos */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px' }}>Documentos requeridos</h2>
          {DOCS_REQUERIDOS.map(doc => (
            <DocUploadRow key={doc.id} doc={doc} archivo={archivos[doc.id]} onChange={setArchivo} />
          ))}
        </div>

        {/* Botón enviar */}
        <button
          onClick={enviar}
          disabled={!puedeEnviar}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px', border: 'none', fontSize: '15px', fontWeight: 800, cursor: puedeEnviar ? 'pointer' : 'not-allowed',
            background: puedeEnviar ? 'var(--color-primary)' : '#E5E7EB',
            color: puedeEnviar ? 'white' : '#9CA3AF',
            transition: 'all 0.15s',
          }}>
          {puedeEnviar ? 'Enviar expediente completo' : `Faltan ${requeridos.length - subidosRequeridos} documentos obligatorios`}
        </button>

        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-light)', marginTop: '16px', lineHeight: 1.5 }}>
          Al enviar autorizas el uso de tus datos para el proceso de arrendamiento.<br />
          Token de acceso: {token}
        </div>
      </div>
    </div>
  )
}
