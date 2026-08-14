import { useModuleAudit } from '../hooks/useAudit'
import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, User, Phone, Mail, Calendar, FileText, CreditCard, Building2, X, Hash, AlertCircle, CheckCircle } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

// ─── Paleta de estatus ───────────────────────────────────────
const EST = {
  OCUPADO:    { bg: '#E8F5EE', border: '#A7D7B8', dot: '#057642', text: '#057642', label: 'Ocupado' },
  DISPONIBLE: { bg: '#F3F4F6', border: '#D1D5DB', dot: '#9CA3AF', text: '#6B7280', label: 'Disponible' },
}
function getEst(local) { return EST[local?.estatus] || EST.DISPONIBLE }

// ─── Helpers ─────────────────────────────────────────────────
const fmtRenta = n => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtFecha = d => d ? new Date(d + 'T12:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── LAYOUT DEL CROQUIS ──────────────────────────────────────
// Cada celda: { tipo:'local'|'comun'|'vacio', clave?, label?, col, row, colSpan?, rowSpan? }
// col/row son posiciones CSS Grid (1-indexed).
// El grid de Zona 1 usa 12 columnas × 9 filas.
// El grid de Zona 2 usa 12 columnas × 9 filas.

const ZONA1 = {
  id: 'zona1',
  label: 'Zona 1',
  cols: 12,
  rows: 9,
  celdas: [
    // ── Fila superior ──────────────────────────────────────
    { tipo: 'comun',  label: 'Bodega\nWC ♀♂',   col: 1,  row: 1, colSpan: 1 },
    { tipo: 'local',  clave: 'L10', col: 2,  row: 1 },
    { tipo: 'local',  clave: 'L11', col: 3,  row: 1 },
    { tipo: 'local',  clave: 'L12', col: 4,  row: 1 },
    { tipo: 'local',  clave: 'L13', col: 5,  row: 1 },
    { tipo: 'local',  clave: 'L14', col: 6,  row: 1 },
    { tipo: 'local',  clave: 'L15', col: 7,  row: 1 },
    { tipo: 'local',  clave: 'L16', col: 8,  row: 1 },
    { tipo: 'local',  clave: 'L17', col: 9,  row: 1 },
    { tipo: 'local',  clave: 'L18', col: 10, row: 1 },
    { tipo: 'local',  clave: 'L19', col: 11, row: 1 },
    // ── Columna izquierda ──────────────────────────────────
    // VORWERK: franja vertical col 1, filas 2-4
    { tipo: 'comun',  label: 'VORWERK\nThermomix', col: 1, row: 2, rowSpan: 3 },
    { tipo: 'local',  clave: 'L9',  col: 2, row: 2 },   // CYPRO Spinning
    { tipo: 'local',  clave: 'L8',  col: 2, row: 3 },   // ALEXAR Uñas y Pestañas
    { tipo: 'local',  clave: 'L7',  col: 2, row: 4 },
    { tipo: 'local',  clave: 'L6',  col: 2, row: 5 },
    { tipo: 'local',  clave: 'L5',  col: 2, row: 6 },   // Restaurante
    // ── Anda Tú (ocupa col 1-2, fila 7) ───────────────────
    { tipo: 'local',  clave: 'L1',  col: 1, row: 7, colSpan: 2, rowSpan: 2 },
    // ── Explanada (área central) ───────────────────────────
    { tipo: 'comun',  label: '◯\nEXPLANADA', col: 3, row: 2, colSpan: 9, rowSpan: 4 },
    // ── Locales inferiores ─────────────────────────────────
    { tipo: 'local',  clave: 'L4',  col: 3, row: 6 },
    { tipo: 'local',  clave: 'L3',  col: 4, row: 6 },
    { tipo: 'local',  clave: 'L2',  col: 4, row: 7 },
    // ── Jaula (extremo derecho) ────────────────────────────
    { tipo: 'comun',  label: 'JAULA 🔐', col: 11, row: 7, rowSpan: 2 },
    // ── Caseta (fondo) ─────────────────────────────────────
    { tipo: 'comun',  label: '← CASETA →', col: 5, row: 9, colSpan: 5 },
  ],
}

const ZONA2 = {
  id: 'zona2',
  label: 'Zona 2',
  cols: 12,
  rows: 9,
  celdas: [
    // ── LOCAL 39 ADMON (col 1, filas 1-2) ─────────────────
    { tipo: 'local',  clave: 'L39', col: 1, row: 1, rowSpan: 2 },
    // ── Fila superior ──────────────────────────────────────
    { tipo: 'local',  clave: 'L29', col: 2,  row: 1 },   // AVAXO TECH
    { tipo: 'local',  clave: 'L30', col: 3,  row: 1 },   // Consultorio Dental Dulce Michelle
    // OAKLIFE: L31+L32 agrupados
    { tipo: 'local',  clave: 'L31', col: 4,  row: 1, colSpan: 2 },  // GRUPO OAKLIFE (L31+L32)
    { tipo: 'local',  clave: 'L33', col: 6,  row: 1 },   // PRO ART
    { tipo: 'local',  clave: 'L34', col: 7,  row: 1 },   // ENRIQUE GARCIA
    { tipo: 'local',  clave: 'L35', col: 8,  row: 1 },   // ANDREA CASTILLO Pilates
    { tipo: 'local',  clave: 'L36', col: 9,  row: 1 },   // NANCY GALLADO Herbalife
    // LEO VIÑAS: L37+L38 agrupados
    { tipo: 'local',  clave: 'L37', col: 10, row: 1, colSpan: 2 },  // LEO VIÑAS (L37+L38)
    // ── Columna izquierda ──────────────────────────────────
    { tipo: 'local',  clave: 'L28', col: 2, row: 2 },
    { tipo: 'local',  clave: 'L27', col: 2, row: 3 },   // CARLOS MICHELLE Neurorehabilitación
    { tipo: 'local',  clave: 'L26', col: 2, row: 4 },
    { tipo: 'local',  clave: 'L25', col: 2, row: 5 },
    { tipo: 'local',  clave: 'L24', col: 2, row: 6 },
    { tipo: 'local',  clave: 'L23', col: 2, row: 7 },   // VANESSA ACERO
    // ── Área interior + Elevador ───────────────────────────
    { tipo: 'comun',  label: '',           col: 3,  row: 2, colSpan: 9, rowSpan: 4 },
    { tipo: 'comun',  label: '⬆\nElevador', col: 5, row: 3, colSpan: 2, rowSpan: 2 },
    // ── Fila inferior ──────────────────────────────────────
    { tipo: 'local',  clave: 'L22', col: 1, row: 8, rowSpan: 2 },
    // L20+L21: AMPLIACIÓN ANDA TÚ (agrupados)
    { tipo: 'local',  clave: 'L20', col: 2, row: 8, colSpan: 2, rowSpan: 2 },
  ],
}

// ─── LocalBox ────────────────────────────────────────────────

function LocalBox({ clave, local, selected, onClick, colSpan = 1, rowSpan = 1 }) {
  const st = getEst(local)
  const isSel = selected === clave
  const esGrupo = colSpan > 1 || rowSpan > 1

  return (
    <button
      onClick={() => onClick(clave)}
      title={clave}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow:    `span ${rowSpan}`,
        borderRadius: 8,
        border: isSel ? '2.5px solid var(--color-primary)' : `1.5px solid ${st.border}`,
        background: isSel ? '#F2EEFA' : st.bg,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        padding: '4px 6px',
        transition: 'all 0.15s',
        outline: 'none',
        boxShadow: isSel ? '0 0 0 3px rgba(123,94,167,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
        minHeight: esGrupo ? 'auto' : 'unset',
      }}
    >
      {/* dot */}
      <div style={{
        position: 'absolute', top: 5, right: 5,
        width: 6, height: 6, borderRadius: '50%',
        background: isSel ? 'var(--color-primary)' : st.dot,
      }} />
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.03em',
        color: isSel ? 'var(--color-primary)' : st.text,
      }}>
        {clave}
      </div>
      {local?.inquilino && (
        <div style={{
          fontSize: 8, fontWeight: 500, textAlign: 'center', lineHeight: 1.2,
          color: isSel ? 'var(--color-primary)' : st.text, opacity: 0.85,
          overflow: 'hidden', maxWidth: '100%',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {local.inquilino.split(' ')[0]}
        </div>
      )}
      {local?.giro && (
        <div style={{
          fontSize: 7, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.1,
          overflow: 'hidden', maxWidth: '100%',
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        }}>
          {local.giro}
        </div>
      )}
    </button>
  )
}

// ─── CeldaComun ──────────────────────────────────────────────

function CeldaComun({ label, colSpan = 1, rowSpan = 1 }) {
  const isExplanada = label.includes('EXPLANADA')
  const isInterior  = label === ''
  return (
    <div style={{
      gridColumn: `span ${colSpan}`,
      gridRow:    `span ${rowSpan}`,
      borderRadius: 8,
      border: isInterior ? 'none' : '1px dashed #D1D5DB',
      background: isExplanada ? '#F0F4FF' : isInterior ? 'transparent' : '#F9FAFB',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 600, color: '#9CA3AF',
      textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3,
      userSelect: 'none',
    }}>
      {label}
    </div>
  )
}

// ─── Grid de zona ─────────────────────────────────────────────

const CELL_W = 74
const CELL_H = 64
const GAP = 5

function ZonaGrid({ zona, localesMap, selected, onSelect }) {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${zona.cols}, ${CELL_W}px)`,
    gridAutoRows: `${CELL_H}px`,
    gap: GAP,
    width: 'fit-content',
  }

  return (
    <div style={gridStyle}>
      {zona.celdas.map((c, i) => {
        const colSpan = c.colSpan || 1
        const rowSpan = c.rowSpan || 1
        const style = {
          gridColumnStart: c.col,
          gridRowStart:    c.row,
        }

        if (c.tipo === 'local') {
          return (
            <div key={i} style={style}>
              <LocalBox
                clave={c.clave}
                local={localesMap[c.clave]}
                selected={selected}
                onClick={onSelect}
                colSpan={colSpan}
                rowSpan={rowSpan}
              />
            </div>
          )
        }
        if (c.tipo === 'comun') {
          return (
            <div key={i} style={style}>
              <CeldaComun label={c.label} colSpan={colSpan} rowSpan={rowSpan} />
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

// ─── Panel de detalle ─────────────────────────────────────────

function LocalDetallePanel({ clave, local, onClose }) {
  const [tab, setTab]         = useState('resumen')
  const [contrato, setContrato] = useState(null)
  const [pagos, setPagos]     = useState([])
  const [loadingC, setLoadingC] = useState(false)
  const navigate = useNavigate()

  // Al cambiar de local → cargar contrato vigente + últimos pagos
  useEffect(() => {
    if (!clave) { setContrato(null); setPagos([]); return }
    setLoadingC(true)
    setContrato(null); setPagos([])

    supabase
      .from('prp_contratos')
      .select('*')
      .eq('unidad_numero', clave)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setContrato(data)
        if (data?.id_contrato || data?.folio) {
          // Últimos 8 ingresos del contrato
          supabase
            .from('ingresos')
            .select('fecha, importe, origen, concepto_origen')
            .eq('id_contrato', data.id_contrato ?? data.folio)
            .order('fecha', { ascending: false })
            .limit(8)
            .then(({ data: pg }) => setPagos(pg ?? []))
        }
        setLoadingC(false)
      })
  }, [clave])

  if (!clave) {
    return (
      <div style={{ flex: '0 0 320px', background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', padding: '40px 20px', minHeight: 300 }}>
        <MapPin size={30} strokeWidth={1.5} style={{ marginBottom: 10 }} />
        <p style={{ fontSize: 13, textAlign: 'center', fontWeight: 500 }}>Selecciona un local<br/>para ver su información</p>
      </div>
    )
  }

  const st = getEst(local)
  const disponible = !local || local.estatus !== 'OCUPADO'
  const dias = contrato?.dias_restantes ?? local?.dias_para_vencer
  const diasAlerta = dias != null && dias < 60

  const TABS = ['resumen', 'pagos', 'expediente']

  return (
    <div style={{ flex: '0 0 320px', background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden', alignSelf: 'flex-start' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', background: disponible ? '#F9FAFB' : 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 18, color: disponible ? '#1D1D1F' : 'white' }}>{clave}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: disponible ? '#E5E7EB' : 'rgba(255,255,255,0.2)', color: disponible ? '#6B7280' : 'white' }}>
              {st.label}
            </span>
            {contrato?.estado && !disponible && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: contrato.estado === 'VIGENTE' ? 'rgba(5,118,66,0.2)' : 'rgba(178,64,32,0.2)', color: contrato.estado === 'VIGENTE' ? '#E8F5EE' : '#FFD0C0' }}>
                {contrato.estado}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, marginTop: 3, color: disponible ? '#6B7280' : 'rgba(255,255,255,0.85)' }}>
            {local?.giro || contrato?.giro_autorizado || (disponible ? 'Local disponible' : '—')}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: disponible ? '#9CA3AF' : 'rgba(255,255,255,0.7)', padding: 2 }}>
          <X size={17} />
        </button>
      </div>

      {!disponible && (
        <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: tab === t ? 700 : 500, background: 'transparent',
              color: tab === t ? 'var(--color-primary)' : '#6B7280',
              borderBottom: tab === t ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loadingC && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><LoadingSpinner /></div>}

        {!loadingC && disponible && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <Building2 size={26} style={{ color: '#9CA3AF', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>Local disponible para arrendar</div>
              {local?.metros_cuadrados && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{local.metros_cuadrados} m² · {fmtRenta(local.renta_base)}/mes base</div>}
            </div>
            <button onClick={() => navigate('/prospectos')} style={{ padding: 12, borderRadius: 8, background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Asignar inquilino →
            </button>
          </div>
        )}

        {/* ── TAB RESUMEN ── */}
        {!loadingC && !disponible && tab === 'resumen' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <Sec titulo="Arrendatario">
              <IR icon={<User size={13} />}  label="Nombre"   value={contrato?.arrendatario_nombre || local?.inquilino || '—'} />
              <IR icon={<Hash size={13} />}  label="RFC"      value={contrato?.arrendatario_rfc || '—'} />
              <IR icon={<Phone size={13} />} label="Teléfono" value={contrato?.arrendatario_telefono || local?.telefono || '—'} />
              <IR icon={<Mail size={13} />}  label="Email"    value={local?.email || '—'} />
            </Sec>
            <Sec titulo="Contrato vigente">
              <IR icon={<FileText size={13} />}  label="Folio"   value={contrato?.folio || '—'} />
              <IR icon={<Calendar size={13} />}  label="Inicio"  value={fmtFecha(contrato?.fecha_inicio || local?.fecha_inicio)} />
              <IR icon={<Calendar size={13} />}  label="Vence"   value={fmtFecha(contrato?.fecha_fin || local?.fecha_fin)} warn={diasAlerta} />
              {dias != null && (
                <div style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: diasAlerta ? '#FEF3C7' : '#E8F5EE', color: diasAlerta ? '#92400E' : '#057642' }}>
                  {dias <= 0 ? `Vencido hace ${Math.abs(dias)}d` : `Vence en ${dias} días`}
                </div>
              )}
            </Sec>
            <Sec titulo="Financiero">
              <IR icon={<CreditCard size={13} />} label="Renta"     value={fmtRenta(contrato?.renta_mensual || local?.renta_mensual) + '/mes'} bold />
              <IR icon={<CreditCard size={13} />} label="Depósito"  value={contrato?.deposito_garantia ? fmtRenta(contrato.deposito_garantia) : '—'} />
              <IR icon={<Building2 size={13} />}  label="m²"        value={local?.metros_cuadrados ? `${local.metros_cuadrados} m²` : '—'} />
            </Sec>
          </div>
        )}

        {/* ── TAB PAGOS ── */}
        {!loadingC && !disponible && tab === 'pagos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pagos.length === 0
              ? <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, fontSize: 12, color: '#6B7280', textAlign: 'center' }}>Sin pagos registrados en el sistema</div>
              : pagos.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F9FAFB', borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#374151' }}>{p.concepto_origen || 'Renta'}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{fmtFecha(p.fecha)} · {p.origen}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#057642', fontFamily: 'monospace' }}>{fmtRenta(p.importe)}</span>
                  </div>
                ))
            }
            <button onClick={() => navigate('/ingresos')} style={{ padding: 10, borderRadius: 8, background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, marginTop: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><CreditCard size={13} /> Ver todos en Ingresos</span>
            </button>
          </div>
        )}

        {/* ── TAB EXPEDIENTE ── */}
        {!loadingC && !disponible && tab === 'expediente' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#F0F9FF', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#0A66C2', textTransform: 'uppercase', marginBottom: 8 }}>Datos del contrato</div>
              <div style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                <div><span style={{ color: '#6B7280' }}>Folio: </span><strong>{contrato?.folio || '—'}</strong></div>
                <div><span style={{ color: '#6B7280' }}>Tipo: </span>{contrato?.tipo_contrato || '—'}</div>
                <div><span style={{ color: '#6B7280' }}>Estado: </span>
                  <span style={{ fontWeight: 700, color: contrato?.estado === 'VIGENTE' ? '#057642' : '#B91C1C' }}>
                    {contrato?.estado || '—'}
                  </span>
                </div>
                <div><span style={{ color: '#6B7280' }}>Duración: </span>{contrato?.duracion_meses ? `${contrato.duracion_meses} meses` : '—'}</div>
              </div>
            </div>
            <button onClick={() => navigate('/contratos')} style={{ padding: 10, borderRadius: 8, background: '#1A3C5E', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><FileText size={13} /> Abrir expediente completo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Sec({ titulo, children }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{titulo}</div>
      <div style={{ display: 'grid', gap: 6 }}>{children}</div>
    </div>
  )
}

function IR({ icon, label, value, bold, warn }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: warn ? '#D97706' : '#9CA3AF', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 10, color: '#6B7280', flexShrink: 0, minWidth: 64 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: bold ? 700 : 500, color: warn ? '#92400E' : '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────

export default function MapaLocales() {
  useModuleAudit('MAPA_LOCALES')
  const [zonaActiva, setZonaActiva] = useState('zona1')
  const [seleccionado, setSeleccionado] = useState(null)
  const navigate = useNavigate()

  const { data: localesDB, loading } = usePRP('prp_mapa_locales')

  const localesMap = useMemo(() => {
    const m = {}
    ;(localesDB || []).forEach(l => { m[l.clave] = l })
    return m
  }, [localesDB])

  const { ocupados, disponibles, total } = useMemo(() => {
    const all = localesDB || []
    const ocu = all.filter(l => l.estatus === 'OCUPADO').length
    return { ocupados: ocu, disponibles: all.length - ocu, total: all.length }
  }, [localesDB])

  const zona = zonaActiva === 'zona1' ? ZONA1 : ZONA2

  function cambiarZona(id) { setZonaActiva(id); setSeleccionado(null) }
  function seleccionar(clave) { setSeleccionado(p => p === clave ? null : clave) }

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 2px' }}>Mapa de Locales</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-light)', margin: 0 }}>
            Plaza IWOL · {total} locales · {ocupados} ocupados · {disponibles} disponibles
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Chip bg="#E8F5EE" color="#057642" label="Ocupados"    value={ocupados} />
          <Chip bg="#F3F4F6" color="#6B7280" label="Disponibles" value={disponibles} />
        </div>
      </div>

      {/* Tabs zona */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[ZONA1, ZONA2].map(z => (
          <button key={z.id} onClick={() => cambiarZona(z.id)} style={{
            padding: '9px 20px', borderRadius: 20, fontSize: 13,
            fontWeight: zonaActiva === z.id ? 700 : 500,
            border: '1.5px solid',
            borderColor: zonaActiva === z.id ? 'var(--color-primary)' : '#D1D5DB',
            background: zonaActiva === z.id ? 'var(--color-primary)' : 'white',
            color: zonaActiva === z.id ? 'white' : '#6B7280',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {z.label}
          </button>
        ))}
        {/* Leyenda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 12 }}>
          {Object.entries(EST).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.dot }} />
              <span style={{ fontSize: 11, color: '#6B7280' }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Mapa */}
        <div style={{
          flex: 1, background: 'white', borderRadius: 14,
          border: '1px solid #E5E7EB', padding: 20, overflowX: 'auto',
        }}>
          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner /></div>
            : <ZonaGrid zona={zona} localesMap={localesMap} selected={seleccionado} onSelect={seleccionar} />
          }
          <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF' }}>
            Haz clic en un local para ver su detalle · Doble clic para deseleccionar
          </div>
        </div>

        {/* Panel */}
        <LocalDetallePanel
          clave={seleccionado}
          local={seleccionado ? localesMap[seleccionado] : null}
          onClose={() => setSeleccionado(null)}
        />
      </div>
    </div>
  )
}

function Chip({ bg, color, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: bg, borderRadius: 20, padding: '6px 14px' }}>
      <span style={{ fontSize: 16, fontWeight: 900, color }}>{value}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.8 }}>{label}</span>
    </div>
  )
}
