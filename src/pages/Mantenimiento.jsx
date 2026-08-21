import { useModuleAudit } from '../hooks/useAudit'
import { useState, useRef, useEffect } from 'react'
import { Wrench, Plus, Search, AlertTriangle, CheckCircle, Clock, TrendingUp, Calendar, User, MapPin, X, Users, Image, FileText, Printer, ChevronDown } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'

const PRIORIDAD_STYLE = {
  ALTA: { bg: '#FEF2F2', text: '#B24020', label: 'Alta' },
  MEDIA: { bg: '#FFF7ED', text: '#B45309', label: 'Media' },
  BAJA: { bg: '#F0FDF4', text: '#057642', label: 'Baja' },
  URGENTE: { bg: '#FEF2F2', text: '#7F1D1D', label: 'Urgente' },
}

const TECNICOS_CATALOGO = [
  { id: 't1', nombre: 'Ing. López Garza', especialidad: 'Eléctrico', telefono: '55 1234 5678' },
  { id: 't2', nombre: 'Tec. Hernández R.', especialidad: 'Climatización', telefono: '55 9876 5432' },
  { id: 't3', nombre: 'Plo. Martínez J.', especialidad: 'Plomería', telefono: '55 5555 1111' },
  { id: 't4', nombre: 'Tec. Sánchez P.', especialidad: 'Seguridad CCTV', telefono: '55 4321 8765' },
  { id: 't5', nombre: 'Pint. Reyes A.', especialidad: 'Pintura y Acabados', telefono: '55 7777 3333' },
  { id: 't6', nombre: 'Jard. Cruz M.', especialidad: 'Jardinería', telefono: '55 2222 9999' },
  { id: 't7', nombre: 'Elec. Vargas T.', especialidad: 'Eléctrico Industrial', telefono: '55 6666 4444' },
  { id: 't8', nombre: 'Tec. Morales B.', especialidad: 'Redes y Telecomunicaciones', telefono: '55 8888 2222' },
]

const ORDENES_INICIAL = [
  { id: 'OT-2026-0312', tipo: 'Correctivo', categoria: 'Eléctrico', inmueble: 'Plaza Reforma Norte', area: 'Área común P1', descripcion: 'Falla en tablero eléctrico sector B — sin luz en pasillos', prioridad: 'URGENTE', asignado: 'Ing. López Garza', estado: 'EN_PROCESO', fecha_apertura: '2026-06-28', fecha_cierre_est: '2026-07-01', costo_est: 8500, evidencias: [] },
  { id: 'OT-2026-0313', tipo: 'Preventivo', categoria: 'Climatización', inmueble: 'Torre Corporativa Insurgentes', area: 'Piso 4 completo', descripcion: 'Mantenimiento semestral de sistemas HVAC — revisión filtros y carga de gas', prioridad: 'MEDIA', asignado: 'Tec. Hernández R.', estado: 'PENDIENTE', fecha_apertura: '2026-07-01', fecha_cierre_est: '2026-07-05', costo_est: 12000, evidencias: [] },
  { id: 'OT-2026-0308', tipo: 'Correctivo', categoria: 'Plomería', inmueble: 'Clínica Especialidades Satélite', area: 'Baño consultorio C12', descripcion: 'Fuga en tubería de agua fría — mancha en pared', prioridad: 'ALTA', asignado: 'Plo. Martínez J.', estado: 'COMPLETADO', fecha_apertura: '2026-06-20', fecha_cierre_est: '2026-06-22', costo_est: 3200, costo_real: 2950, fecha_cierre_real: '2026-06-21', evidencias: [] },
  { id: 'OT-2026-0310', tipo: 'Preventivo', categoria: 'Seguridad', inmueble: 'Plaza del Valle Monterrey', area: 'Estacionamiento subterráneo', descripcion: 'Revisión y calibración de cámaras CCTV y control de acceso', prioridad: 'MEDIA', asignado: 'Tec. Sánchez P.', estado: 'PENDIENTE', fecha_apertura: '2026-07-03', fecha_cierre_est: '2026-07-04', costo_est: 5500, evidencias: [] },
  { id: 'OT-2026-0307', tipo: 'Mejora', categoria: 'Pintura', inmueble: 'Nave Industrial Vallejo', area: 'Nave principal', descripcion: 'Repintura de señalización de seguridad industrial en piso y paredes', prioridad: 'BAJA', asignado: 'Pint. Reyes A.', estado: 'COMPLETADO', fecha_apertura: '2026-06-15', fecha_cierre_est: '2026-06-18', costo_est: 7800, costo_real: 8100, fecha_cierre_real: '2026-06-19', evidencias: [] },
  { id: 'OT-2026-0315', tipo: 'Correctivo', categoria: 'Jardinería', inmueble: 'Plaza Reforma Norte', area: 'Jardín entrada principal', descripcion: 'Poda de árboles y restitución de plantas dañadas por lluvia', prioridad: 'BAJA', asignado: 'Jard. Cruz M.', estado: 'PENDIENTE', fecha_apertura: '2026-07-01', fecha_cierre_est: '2026-07-08', costo_est: 4200, evidencias: [] },
]

const TIPOS = ['Todos', 'Correctivo', 'Preventivo', 'Mejora']
const PRIORIDADES = ['Todas', 'URGENTE', 'ALTA', 'MEDIA', 'BAJA']

// ── Reasignar técnico ──────────────────────────────────────────────────────────
function ReasignarModal({ ot, onClose, onReasignar }) {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const lista = TECNICOS_CATALOGO.filter(t =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.especialidad.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '480px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Reasignar técnico</div>
            <h2 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700 }}>{ot.id}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '8px' }}>Técnico actual: <strong>{ot.asignado}</strong></div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o especialidad..."
              style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
          {lista.map(t => (
            <div key={t.id} onClick={() => setSelected(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px',
              cursor: 'pointer', borderBottom: '1px solid #F9FAFB',
              background: selected === t.id ? '#EFF6FF' : 'white',
              borderLeft: selected === t.id ? '3px solid var(--color-primary)' : '3px solid transparent',
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: selected === t.id ? 'var(--color-primary)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={16} color={selected === t.id ? 'white' : '#9CA3AF'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{t.nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{t.especialidad} · {t.telefono}</div>
              </div>
              {selected === t.id && <CheckCircle size={16} color="var(--color-primary)" />}
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '10px' }}>
          <button onClick={() => { if (selected) { onReasignar(TECNICOS_CATALOGO.find(t => t.id === selected)); onClose() } }}
            disabled={!selected}
            style={{ flex: 1, padding: '10px', background: selected ? 'var(--color-primary)' : '#E5E7EB', color: selected ? 'white' : '#9CA3AF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: selected ? 'pointer' : 'default' }}>
            Confirmar reasignación
          </button>
          <button onClick={onClose} style={{ padding: '10px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Adjuntar evidencias ────────────────────────────────────────────────────────
function EvidenciaPanel({ ot, onUpdate, onClose }) {
  const fileRef = useRef()
  const [previews, setPreviews] = useState(ot.evidencias || [])
  const [dragging, setDragging] = useState(false)

  const addFiles = (files) => {
    const nuevas = Array.from(files).map(f => ({
      id: Date.now() + Math.random(),
      nombre: f.name,
      url: URL.createObjectURL(f),
      tipo: f.type,
      fecha: new Date().toLocaleDateString('es-MX'),
    }))
    const updated = [...previews, ...nuevas]
    setPreviews(updated)
    onUpdate(updated)
  }

  const eliminar = (id) => {
    const updated = previews.filter(p => p.id !== id)
    setPreviews(updated)
    onUpdate(updated)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Evidencias fotográficas</div>
            <h2 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700 }}>{ot.id} — {ot.descripcion.substring(0, 50)}...</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--color-primary)' : '#D1D5DB'}`,
              borderRadius: '10px', padding: '28px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#EFF6FF' : '#F9FAFB', marginBottom: '20px', transition: 'all 0.15s',
            }}>
            <Image size={28} color={dragging ? 'var(--color-primary)' : '#9CA3AF'} style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: dragging ? 'var(--color-primary)' : 'var(--color-text)' }}>
              Arrastra imágenes o haz clic para seleccionar
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>JPG, PNG, PDF · Máx 10 MB por archivo</div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
          </div>

          {/* Grid de previews */}
          {previews.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {previews.map(p => (
                <div key={p.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                  {p.tipo?.startsWith('image/') ? (
                    <img src={p.url} alt={p.nombre} style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ height: '110px', background: '#F3F4F6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <FileText size={24} color="#9CA3AF" />
                      <div style={{ fontSize: '10px', color: 'var(--color-text-light)', padding: '0 6px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{p.nombre}</div>
                    </div>
                  )}
                  <button onClick={() => eliminar(p.id)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} color="white" />
                  </button>
                  <div style={{ padding: '5px 6px', fontSize: '10px', color: 'var(--color-text-light)', background: 'white' }}>{p.fecha}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-text-light)', fontSize: '13px', padding: '20px 0' }}>
              Sin evidencias adjuntas. Agrega fotografías del estado del equipo o área.
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{previews.length} archivo{previews.length !== 1 ? 's' : ''} adjunto{previews.length !== 1 ? 's' : ''}</span>
          <button onClick={onClose} style={{ padding: '9px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            Guardar y cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Generar Orden de Compra ────────────────────────────────────────────────────
function GenerarOCModal({ ot, onClose }) {
  const folio = `OC-${ot.id.replace('OT-', '')}`
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=600')
    w.document.write(`<!DOCTYPE html><html><head><title>${folio}</title><style>
      body{font-family:Arial,sans-serif;margin:40px;color:#1A1A1A;font-size:13px}
      h1{margin:0;font-size:20px;color:#0A66C2} h2{font-size:14px;margin:0}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0A66C2}
      .empresa{color:#6B7280;font-size:12px;margin-top:4px}
      .folio{text-align:right}
      .badge{background:#FFF7ED;color:#B45309;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;display:inline-block}
      .section{margin-bottom:20px}
      .section-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#6B7280;letter-spacing:.05em;margin-bottom:8px;border-bottom:1px solid #E5E7EB;padding-bottom:4px}
      .grid{display:grid;grid-template-columns:160px 1fr;gap:6px 12px}
      .label{color:#6B7280;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#F3F4F6;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#6B7280}
      td{padding:8px 10px;border-bottom:1px solid #F3F4F6}
      .total-row td{font-weight:700;background:#F9FAFB}
      .firma{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
      .firma-box{border-top:1px solid #374151;padding-top:8px;text-align:center;font-size:11px;color:#6B7280}
      @media print{body{margin:20px}}
    </style></head><body>
      <div class="header">
        <div><h1>INMOBILIARIA ALCEDINES DEL NORTE</h1><div class="empresa">Orden de Compra / Servicio</div></div>
        <div class="folio"><h2 style="color:#0A66C2">${folio}</h2><div style="font-size:11px;color:#6B7280">Fecha: ${fecha}</div><div class="badge" style="margin-top:6px">Vinculada a ${ot.id}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Datos de la OT vinculada</div>
        <div class="grid">
          <span class="label">OT:</span><span>${ot.id} — ${ot.tipo} / ${ot.categoria}</span>
          <span class="label">Inmueble:</span><span>${ot.inmueble}</span>
          <span class="label">Área:</span><span>${ot.area}</span>
          <span class="label">Descripción:</span><span>${ot.descripcion}</span>
          <span class="label">Proveedor/Técnico:</span><span>${ot.asignado}</span>
          <span class="label">Prioridad:</span><span>${ot.prioridad}</span>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Partidas de la orden</div>
        <table>
          <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>U.M.</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>Servicio de ${ot.categoria.toLowerCase()} — ${ot.tipo.toLowerCase()}</td><td>1</td><td>Servicio</td><td style="text-align:right">$${(ot.costo_est * 0.862).toLocaleString('es-MX',{maximumFractionDigits:0})}</td><td style="text-align:right">$${(ot.costo_est * 0.862).toLocaleString('es-MX',{maximumFractionDigits:0})}</td></tr>
            <tr><td>2</td><td>Materiales y refacciones estimados</td><td>1</td><td>Global</td><td style="text-align:right">$${(ot.costo_est * 0.138 * 0.862).toLocaleString('es-MX',{maximumFractionDigits:0})}</td><td style="text-align:right">$${(ot.costo_est * 0.138 * 0.862).toLocaleString('es-MX',{maximumFractionDigits:0})}</td></tr>
            <tr class="total-row"><td colspan="5" style="text-align:right">Subtotal</td><td style="text-align:right">$${(ot.costo_est * 0.862).toLocaleString('es-MX',{maximumFractionDigits:0})}</td></tr>
            <tr class="total-row"><td colspan="5" style="text-align:right">IVA (16%)</td><td style="text-align:right">$${(ot.costo_est * 0.138).toLocaleString('es-MX',{maximumFractionDigits:0})}</td></tr>
            <tr class="total-row"><td colspan="5" style="text-align:right;font-size:15px;color:#0A66C2">TOTAL</td><td style="text-align:right;font-size:15px;color:#0A66C2">$${ot.costo_est.toLocaleString('es-MX')}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="section">
        <div class="section-title">Condiciones</div>
        <div class="grid">
          <span class="label">Forma de pago:</span><span>Transferencia bancaria — a 30 días de factura</span>
          <span class="label">Vigencia OC:</span><span>15 días naturales a partir de la firma</span>
          <span class="label">Garantía:</span><span>6 meses sobre mano de obra</span>
        </div>
      </div>
      <div class="firma">
        <div class="firma-box">Elaboró<br><strong>Administración IMAN</strong></div>
        <div class="firma-box">Autoriza<br><strong>Dirección General</strong></div>
      </div>
    </body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Generar Orden de Compra</div>
            <h2 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700 }}>{folio}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'grid', gap: '12px' }}>
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '4px' }}>OT vinculada</div>
            <div style={{ fontWeight: 700 }}>{ot.id} — {ot.tipo}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '2px' }}>{ot.inmueble} · {ot.area}</div>
          </div>
          {[
            ['Proveedor / Técnico', ot.asignado],
            ['Concepto', `${ot.tipo} ${ot.categoria} — ${ot.descripcion.substring(0,60)}...`],
            ['Monto estimado', `$${ot.costo_est.toLocaleString('es-MX')} (incluye IVA)`],
            ['Fecha OC', fecha],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>{l}</span>
              <span style={{ fontSize: '13px' }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '10px' }}>
          <button onClick={handlePrint} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            <Printer size={15} /> Imprimir / Descargar PDF
          </button>
          <button onClick={onClose} style={{ padding: '10px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── OT Card ────────────────────────────────────────────────────────────────────
function OTCard({ ot, onClick }) {
  const p = PRIORIDAD_STYLE[ot.prioridad] || {}
  const esCompletada = ot.estado === 'COMPLETADO'

  return (
    <div
      onClick={() => onClick(ot)}
      style={{
        background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB',
        padding: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s',
        borderLeft: `4px solid ${esCompletada ? 'var(--color-success)' : ot.prioridad === 'URGENTE' ? 'var(--color-danger)' : ot.prioridad === 'ALTA' ? '#F59E0B' : 'var(--color-primary)'}`,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>{ot.id}</span>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#F3F4F6', color: 'var(--color-text-light)', fontWeight: 600 }}>{ot.tipo}</span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#EFF6FF', color: 'var(--color-primary)', fontWeight: 600 }}>{ot.categoria}</span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: p.bg, color: p.text, fontWeight: 700 }}>{p.label}</span>
          </div>
        </div>
        <StatusBadge status={ot.estado} />
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: '0 0 12px', lineHeight: 1.4 }}>{ot.descripcion}</p>

      <div style={{ display: 'grid', gap: '5px', marginBottom: '12px' }}>
        {[
          { icon: MapPin, val: `${ot.inmueble} · ${ot.area}` },
          { icon: User, val: ot.asignado },
          { icon: Calendar, val: `Apertura: ${ot.fecha_apertura} · Cierre est: ${ot.fecha_cierre_est}` },
        ].map(({ icon: Icon, val }) => (
          <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--color-text-light)' }}>
            <Icon size={11} /> {val}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
        <div style={{ fontSize: '12px' }}>
          <span style={{ color: 'var(--color-text-light)' }}>Costo est. </span>
          <span style={{ fontWeight: 700 }}>${ot.costo_est.toLocaleString()}</span>
          {ot.costo_real && (
            <span style={{ color: ot.costo_real > ot.costo_est ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700, marginLeft: '6px' }}>
              → Real ${ot.costo_real.toLocaleString()}
            </span>
          )}
        </div>
        {ot.evidencias?.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Image size={11} /> {ot.evidencias.length}
          </span>
        )}
      </div>
    </div>
  )
}

// ── OT Modal principal ─────────────────────────────────────────────────────────
function OTModal({ ot, onClose, onUpdate }) {
  if (!ot) return null
  const p = PRIORIDAD_STYLE[ot.prioridad] || {}
  const [subModal, setSubModal] = useState(null) // 'reasignar' | 'evidencias' | 'oc'

  const marcarCompletada = () => {
    onUpdate({ ...ot, estado: 'COMPLETADO', fecha_cierre_real: new Date().toISOString().split('T')[0], costo_real: ot.costo_est })
    onClose()
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
        <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '580px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Orden de Trabajo</div>
              <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>{ot.id}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-light)' }}>✕</button>
          </div>
          <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <StatusBadge status={ot.estado} />
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: p.bg, color: p.text }}>Prioridad {p.label}</span>
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: '#F3F4F6', color: 'var(--color-text)' }}>{ot.tipo}</span>
            </div>
            <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '14px', fontSize: '13px', lineHeight: 1.6 }}>{ot.descripcion}</div>
            {[
              ['Inmueble', ot.inmueble], ['Área', ot.area], ['Categoría', ot.categoria],
              ['Técnico asignado', ot.asignado],
              ['Fecha apertura', ot.fecha_apertura],
              ['Fecha cierre estimada', ot.fecha_cierre_est],
              ...(ot.fecha_cierre_real ? [['Fecha cierre real', ot.fecha_cierre_real]] : []),
              ['Costo estimado', `$${ot.costo_est.toLocaleString()}`],
              ...(ot.costo_real ? [['Costo real', `$${ot.costo_real.toLocaleString()}`]] : []),
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '13px' }}>{val}</span>
              </div>
            ))}

            {/* Evidencias miniaturas */}
            {ot.evidencias?.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Evidencias adjuntas ({ot.evidencias.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ot.evidencias.map(e => (
                    e.tipo?.startsWith('image/') ? (
                      <img key={e.id} src={e.url} alt={e.nombre} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                    ) : (
                      <div key={e.id} style={{ width: '70px', height: '70px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color="#9CA3AF" />
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px' }}>
              {ot.estado !== 'COMPLETADO' && (
                <button onClick={marcarCompletada} style={{ padding: '8px 14px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Marcar completada
                </button>
              )}
              <button onClick={() => setSubModal('reasignar')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: '#F3F4F6', color: 'var(--color-text)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <Users size={13} /> Reasignar técnico
              </button>
              <button onClick={() => setSubModal('evidencias')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: '#F3F4F6', color: 'var(--color-text)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <Image size={13} /> Evidencias {ot.evidencias?.length > 0 ? `(${ot.evidencias.length})` : ''}
              </button>
              <button onClick={() => setSubModal('oc')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <FileText size={13} /> Generar OC
              </button>
            </div>
          </div>
        </div>
      </div>

      {subModal === 'reasignar' && (
        <ReasignarModal
          ot={ot}
          onClose={() => setSubModal(null)}
          onReasignar={(tecnico) => onUpdate({ ...ot, asignado: tecnico.nombre })}
        />
      )}
      {subModal === 'evidencias' && (
        <EvidenciaPanel
          ot={ot}
          onClose={() => setSubModal(null)}
          onUpdate={(evidencias) => onUpdate({ ...ot, evidencias })}
        />
      )}
      {subModal === 'oc' && (
        <GenerarOCModal ot={ot} onClose={() => setSubModal(null)} />
      )}
    </>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function Mantenimiento() {
  useModuleAudit('MANTENIMIENTO')
  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [prioFiltro, setPrioFiltro] = useState('Todas')
  const [selected, setSelected] = useState(null)

  const fetchOrdenes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ordenes_trabajo')
      .select('*')
      .order('fecha_apertura', { ascending: false })
    setOrdenes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrdenes() }, [])

  const updateOT = async (updated) => {
    await supabase.from('ordenes_trabajo').update({
      estado:           updated.estado,
      costo_real:       updated.costo_real || null,
      fecha_cierre_real: updated.fecha_cierre_real || null,
      asignado:         updated.asignado,
      evidencias:       undefined, // evidencias se manejan en Storage
      updated_at:       new Date().toISOString(),
    }).eq('id', updated.id)
    setOrdenes(prev => prev.map(o => o.id === updated.id ? updated : o))
    setSelected(updated.estado !== 'COMPLETADO' ? updated : null)
  }

  const filtradas = ordenes.filter(ot => {
    const q = search.toLowerCase()
    const match = ot.id.toLowerCase().includes(q) || ot.descripcion.toLowerCase().includes(q) || ot.inmueble.toLowerCase().includes(q) || ot.asignado.toLowerCase().includes(q)
    const tipo = tipoFiltro === 'Todos' || ot.tipo === tipoFiltro
    const prio = prioFiltro === 'Todas' || ot.prioridad === prioFiltro
    return match && tipo && prio
  })

  const abiertas = ordenes.filter(o => o.estado !== 'COMPLETADO').length
  const urgentes = ordenes.filter(o => o.prioridad === 'URGENTE' && o.estado !== 'COMPLETADO').length
  const completadas = ordenes.filter(o => o.estado === 'COMPLETADO').length
  const costoTotal = ordenes.reduce((a, b) => a + (b.costo_real || b.costo_est), 0)

  if (loading) return <div style={{ padding: '60px', textAlign: 'center' }}><LoadingSpinner /></div>

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>Mantenimiento y Órdenes de Trabajo</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{ordenes.length} órdenes registradas</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nueva OT
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="OT Abiertas" value={abiertas} icon={Clock} color="var(--color-warning)" />
        <KPICard title="Urgentes" value={urgentes} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Completadas" value={completadas} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Costo Total" value={`$${(costoTotal / 1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OT, descripción o inmueble..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TIPOS.map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)} style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: tipoFiltro === t ? 'var(--color-primary)' : '#E5E7EB',
              background: tipoFiltro === t ? 'var(--color-primary)' : 'white',
              color: tipoFiltro === t ? 'white' : 'var(--color-text-light)',
            }}>{t}</button>
          ))}
          <div style={{ width: '1px', background: '#E5E7EB', margin: '0 4px' }} />
          {PRIORIDADES.map(p => (
            <button key={p} onClick={() => setPrioFiltro(p)} style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: prioFiltro === p ? (PRIORIDAD_STYLE[p]?.text || 'var(--color-primary)') : '#E5E7EB',
              background: prioFiltro === p ? (PRIORIDAD_STYLE[p]?.bg || 'var(--color-primary-light)') : 'white',
              color: prioFiltro === p ? (PRIORIDAD_STYLE[p]?.text || 'var(--color-primary)') : 'var(--color-text-light)',
            }}>{p === 'Todas' ? 'Todas' : PRIORIDAD_STYLE[p]?.label}</button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState title="Sin órdenes" description="No hay órdenes de trabajo que coincidan con los filtros." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filtradas.map(ot => <OTCard key={ot.id} ot={ot} onClick={setSelected} />)}
        </div>
      )}

      <OTModal ot={selected} onClose={() => setSelected(null)} onUpdate={updateOT} />
    </div>
  )
}
