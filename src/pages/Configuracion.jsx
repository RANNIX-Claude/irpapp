import { useState } from 'react'
import { Settings, Building2, Users, Bell, Shield, CreditCard, FileText, Globe, ChevronRight } from 'lucide-react'

const SECTIONS = [
  {
    id: 'empresa',
    icon: Building2,
    label: 'Datos de la Empresa',
    desc: 'Razón social, RFC, domicilio fiscal y logo',
    fields: [
      { label: 'Razón Social', type: 'text', value: 'Administradora Inmobiliaria del Pacífico SA de CV' },
      { label: 'RFC', type: 'text', value: 'AIP950314KL2' },
      { label: 'Domicilio Fiscal', type: 'text', value: 'Blvd. Culiacán 1234, Col. Centro, Culiacán, Sinaloa' },
      { label: 'Régimen Fiscal', type: 'select', value: '612 — Personas Físicas con Actividades Empresariales', options: ['612 — Personas Físicas con Actividades Empresariales', '626 — Régimen Simplificado de Confianza', '601 — General de Ley Personas Morales'] },
      { label: 'CP Fiscal', type: 'text', value: '80000' },
    ]
  },
  {
    id: 'usuarios',
    icon: Users,
    label: 'Usuarios y Roles',
    desc: 'Gestión de accesos, roles y permisos por módulo',
    fields: []
  },
  {
    id: 'notificaciones',
    icon: Bell,
    label: 'Notificaciones',
    desc: 'Alertas de contratos, cobranza, mantenimiento y vencimientos',
    fields: [
      { label: 'Días previos alerta vencimiento contrato', type: 'number', value: '60' },
      { label: 'Días de gracia cobranza', type: 'number', value: '5' },
      { label: 'Notificaciones por email', type: 'toggle', value: true },
      { label: 'Notificaciones por WhatsApp', type: 'toggle', value: false },
    ]
  },
  {
    id: 'fiscal',
    icon: FileText,
    label: 'Configuración Fiscal',
    desc: 'CFDI 4.0, PAC, retenciones y método de pago',
    fields: [
      { label: 'PAC (Proveedor de Certificación)', type: 'select', value: 'Finkok', options: ['Finkok', 'SIFEI', 'Edicom', 'SW SAPIEN'] },
      { label: 'Serie de facturas', type: 'text', value: 'A' },
      { label: 'Folio inicial', type: 'number', value: '1' },
      { label: 'Tasa IVA', type: 'select', value: '16%', options: ['16%', '8%', '0%'] },
      { label: 'Retención ISR (%)', type: 'number', value: '10' },
      { label: 'Retención IVA (%)', type: 'number', value: '0' },
    ]
  },
  {
    id: 'cobranza',
    icon: CreditCard,
    label: 'Reglas de Cobranza',
    desc: 'Día de cobro, penalizaciones y depósito en garantía',
    fields: [
      { label: 'Día de generación de cargos', type: 'number', value: '1' },
      { label: 'Días de gracia', type: 'number', value: '5' },
      { label: 'Penalización por mora (%)', type: 'number', value: '5' },
      { label: 'Depósito en garantía (meses de renta)', type: 'number', value: '2' },
      { label: 'Incremento anual automático (%)', type: 'number', value: '5' },
    ]
  },
  {
    id: 'seguridad',
    icon: Shield,
    label: 'Seguridad',
    desc: 'Contraseñas, 2FA, sesiones y auditoría',
    fields: [
      { label: 'Tiempo de sesión (minutos)', type: 'number', value: '480' },
      { label: 'Doble factor (2FA)', type: 'toggle', value: true },
      { label: 'Log de auditoría', type: 'toggle', value: true },
      { label: 'Permitir login con Google', type: 'toggle', value: true },
    ]
  },
  {
    id: 'integraciones',
    icon: Globe,
    label: 'Integraciones',
    desc: 'Conexiones con bancos, PAC, Google y otros servicios',
    fields: []
  },
]

const USERS_DEMO = [
  { nombre: 'Roberto Aguilar Cota', email: 'roberto.aguilar.cota@gmail.com', rol: 'Super Administrador', estado: 'ACTIVO', ultimo_acceso: '2026-07-03 09:15' },
  { nombre: 'Ana García Hernández', email: 'ana.garcia@inmobpac.mx', rol: 'Administrador', estado: 'ACTIVO', ultimo_acceso: '2026-07-02 17:30' },
  { nombre: 'Carlos Martínez López', email: 'carlos.martinez@inmobpac.mx', rol: 'Supervisor de Operaciones', estado: 'ACTIVO', ultimo_acceso: '2026-07-01 11:45' },
  { nombre: 'Patricia Ramírez Soto', email: 'patricia.ramirez@inmobpac.mx', rol: 'Recepcionista', estado: 'ACTIVO', ultimo_acceso: '2026-07-03 08:00' },
]

export default function Configuracion() {
  const [activeSection, setActiveSection] = useState('empresa')
  const [formValues, setFormValues] = useState({})

  const section = SECTIONS.find(s => s.id === activeSection)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      {/* Sidebar config */}
      <div style={{ width: '240px', flexShrink: 0, background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Configuración</span>
          </div>
        </div>
        {SECTIONS.map(s => {
          const Icon = s.icon
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: activeSection === s.id ? '#EFF6FF' : 'white',
              borderLeft: activeSection === s.id ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeSection === s.id ? 'var(--color-primary)' : 'var(--color-text)',
            }}>
              <Icon size={15} />
              <span style={{ fontSize: '13px', fontWeight: activeSection === s.id ? 700 : 500 }}>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>{section.label}</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{section.desc}</p>
        </div>

        {section.id === 'usuarios' ? (
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Usuarios del sistema</span>
              <button style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Invitar usuario</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Nombre', 'Email', 'Rol', 'Último acceso', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {USERS_DEMO.map(u => (
                  <tr key={u.email} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.nombre}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-light)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', background: '#EFF6FF', color: 'var(--color-primary)', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{u.rol}</span></td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-light)' }}>{u.ultimo_acceso}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', background: '#DCFCE7', color: 'var(--color-success)', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{u.estado}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <button style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', background: '#F3F4F6', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : section.id === 'integraciones' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {[
              { nombre: 'Finkok PAC', desc: 'Timbrado CFDI 4.0', estado: 'Conectado', color: 'var(--color-success)' },
              { nombre: 'Supabase', desc: 'Base de datos y autenticación', estado: 'Conectado', color: 'var(--color-success)' },
              { nombre: 'Google OAuth', desc: 'Login con Google Workspace', estado: 'Pendiente', color: 'var(--color-warning)' },
              { nombre: 'WhatsApp Business', desc: 'Notificaciones automáticas', estado: 'No configurado', color: 'var(--color-text-light)' },
              { nombre: 'Banorte Open Banking', desc: 'Conciliación bancaria automática', estado: 'No configurado', color: 'var(--color-text-light)' },
              { nombre: 'Claude AI', desc: 'Agentes IA operativo y analítico', estado: 'Conectado', color: 'var(--color-success)' },
            ].map(int => (
              <div key={int.nombre} style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '18px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{int.nombre}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '12px' }}>{int.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: int.color }}>{int.estado}</span>
                  <button style={{ padding: '6px 14px', border: '1.5px solid var(--color-primary)', borderRadius: '6px', color: 'var(--color-primary)', background: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    {int.estado === 'Conectado' ? 'Configurar' : 'Conectar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '24px' }}>
            <div style={{ display: 'grid', gap: '18px', maxWidth: '560px' }}>
              {section.fields.map((field, i) => (
                <div key={i}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)' }}>{field.label}</label>
                  {field.type === 'toggle' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: field.value ? 'var(--color-primary)' : '#E5E7EB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                        <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: field.value ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-light)' }}>{field.value ? 'Activado' : 'Desactivado'}</span>
                    </div>
                  ) : field.type === 'select' ? (
                    <select defaultValue={field.value} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', background: 'white' }}>
                      {(field.options || []).map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} defaultValue={field.value} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              {section.fields.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                  <button style={{ padding: '10px 24px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Guardar cambios</button>
                  <button style={{ padding: '10px 24px', background: '#F3F4F6', color: 'var(--color-text)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
