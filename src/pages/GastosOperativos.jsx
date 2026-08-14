import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect } from 'react'
import { Receipt, Plus, X, ChevronDown, Search, Filter } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }

const GRUPOS = [
  'Ferretería y materiales',
  'Limpieza e higiene',
  'Papelería y oficina',
  'Electricidad',
  'Plomería',
  'Herramienta y equipo',
  'Servicios externos',
  'Vending / Reabasto',
  'Combustible',
  'Seguridad',
  'Alimentación',
  'Otros',
]

const COLORS = {
  'Ferretería y materiales': '#0A66C2',
  'Limpieza e higiene': '#057642',
  'Papelería y oficina': '#E8A020',
  'Electricidad': '#F59E0B',
  'Plomería': '#3B82F6',
  'Herramienta y equipo': '#6366F1',
  'Servicios externos': '#8B5CF6',
  'Vending / Reabasto': '#EC4899',
  'Combustible': '#EF4444',
  'Seguridad': '#B24020',
  'Alimentación': '#10B981',
  'Otros': '#6B7280',
}

// Catálogo de conceptos frecuentes para sugerencia rápida
const CATALOGO_CONCEPTOS = [
  { concepto: 'Agua', grupo: 'Limpieza e higiene', proveedores: ['Oxxo', 'Dogo'] },
  { concepto: 'Bolsa', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Bolsa Grande', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Papel higienico', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Cloro', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Limpiador', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Atomizador', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Guante', grupo: 'Limpieza e higiene', proveedores: ['Dogo', 'Home Depot'] },
  { concepto: 'Mechudo', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Tapete antisalpicadura', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Desengrasante', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Fibra Verde', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Jabon Liq p/manos', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Pastilla WC', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Microfibra', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Cepillo', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Windex', grupo: 'Limpieza e higiene', proveedores: ['Wm'] },
  { concepto: 'Glade', grupo: 'Limpieza e higiene', proveedores: ['Sam\'s'] },
  { concepto: 'Salvo', grupo: 'Limpieza e higiene', proveedores: ['Sam\'s'] },
  { concepto: 'Garrafon', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
  { concepto: 'Cable 12', grupo: 'Ferretería y materiales', proveedores: ['Los Canarios'] },
  { concepto: 'Cable 14', grupo: 'Ferretería y materiales', proveedores: ['Los Canarios'] },
  { concepto: 'Taquete', grupo: 'Ferretería y materiales', proveedores: ['Los Canarios'] },
  { concepto: 'Cinta de aislar', grupo: 'Ferretería y materiales', proveedores: ['Los Canarios'] },
  { concepto: 'Broca', grupo: 'Ferretería y materiales', proveedores: ['Los Canarios'] },
  { concepto: 'Brocha', grupo: 'Ferretería y materiales', proveedores: ['Los Canarios'] },
  { concepto: 'Silicon', grupo: 'Ferretería y materiales', proveedores: ['Com Gao'] },
  { concepto: 'Thinner', grupo: 'Ferretería y materiales', proveedores: ['Comex'] },
  { concepto: 'Pintura', grupo: 'Ferretería y materiales', proveedores: ['Comex'] },
  { concepto: 'Rodillo', grupo: 'Ferretería y materiales', proveedores: ['Comex'] },
  { concepto: 'Extension electrica', grupo: 'Ferretería y materiales', proveedores: [] },
  { concepto: 'Hilo Podadora', grupo: 'Ferretería y materiales', proveedores: ['Ferre Frany'] },
  { concepto: 'No mas clavos', grupo: 'Ferretería y materiales', proveedores: ['Cravioto'] },
  { concepto: 'Cutter', grupo: 'Ferretería y materiales', proveedores: ['Moriyama'] },
  { concepto: 'Grapas', grupo: 'Ferretería y materiales', proveedores: ['Moriyama'] },
  { concepto: 'Diurex', grupo: 'Papelería y oficina', proveedores: ['Office Depot'] },
  { concepto: 'Libretas', grupo: 'Papelería y oficina', proveedores: ['Office Depot'] },
  { concepto: 'Marcatexto', grupo: 'Papelería y oficina', proveedores: ['Office Depot'] },
  { concepto: 'Hojas', grupo: 'Papelería y oficina', proveedores: ['Office Depot'] },
  { concepto: 'Letreros', grupo: 'Servicios externos', proveedores: ['Rojas', 'Imprenta', 'Moriyama'] },
  { concepto: 'Dictamen', grupo: 'Servicios externos', proveedores: ['Asigas'] },
  { concepto: 'Fumigacion', grupo: 'Servicios externos', proveedores: [] },
  { concepto: 'Total Play', grupo: 'Servicios externos', proveedores: ['Oxxo'] },
  { concepto: 'Recarga Cel', grupo: 'Servicios externos', proveedores: ['Oxxo'] },
  { concepto: 'Traslado y recepcion', grupo: 'Servicios externos', proveedores: ['Amazon'] },
  { concepto: 'Mix Barcel', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Florentinas', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Sabriminis', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Chocolate', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Coca', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Principe', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Nescafe', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Jarritos', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Gatorade', grupo: 'Vending / Reabasto', proveedores: ['Sam\'s'] },
  { concepto: 'Regulador', grupo: 'Herramienta y equipo', proveedores: ['Amazon'] },
  { concepto: 'Checador', grupo: 'Herramienta y equipo', proveedores: ['Amazon'] },
  { concepto: 'Mouse', grupo: 'Herramienta y equipo', proveedores: ['Cornelio Perichon'] },
  { concepto: 'Cargador', grupo: 'Herramienta y equipo', proveedores: ['Cornelio Perichon'] },
  { concepto: 'Cubeta', grupo: 'Limpieza e higiene', proveedores: ['Dogo'] },
]

// Proveedores únicos del catálogo
const PROVEEDORES_CAT = [...new Set(CATALOGO_CONCEPTOS.flatMap(c => c.proveedores))].sort()

function NuevoGastoModal({ onClose, onSaved, proveedoresDB = [] }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ fecha: today, proveedor: '', grupo_gasto: GRUPOS[0], descripcion: '', cantidad: '' })
  const [guardando, setGuardando] = useState(false)
  const [sugerencias, setSugerencias] = useState([])
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  // Lista combinada de proveedores para el datalist
  const allProveedores = [...new Set([...PROVEEDORES_CAT, ...proveedoresDB])].sort()

  // Autosugerencia de concepto desde catálogo
  const onDescChange = e => {
    const val = e.target.value
    setForm(p => ({ ...p, descripcion: val }))
    if (val.length >= 2) {
      const matches = CATALOGO_CONCEPTOS.filter(c =>
        c.concepto.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 6)
      setSugerencias(matches)
    } else {
      setSugerencias([])
    }
  }

  const aplicarSugerencia = (s) => {
    setForm(p => ({
      ...p,
      descripcion: s.concepto,
      grupo_gasto: s.grupo,
      proveedor: s.proveedores[0] || p.proveedor,
    }))
    setSugerencias([])
  }

  const guardar = async () => {
    if (!form.fecha || !form.cantidad || !form.grupo_gasto) return toast.error('Fecha, grupo y monto son obligatorios')
    setGuardando(true)
    const dt = new Date(form.fecha + 'T12:00:00')
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const { error } = await supabase.from('gastos_operativos').insert({
      fecha: form.fecha,
      proveedor: form.proveedor || null,
      grupo_gasto: form.grupo_gasto,
      descripcion: form.descripcion || null,
      cantidad: parseFloat(form.cantidad),
      anio: dt.getFullYear(),
      mes: MESES[dt.getMonth()],
      dia_semana: DIAS[dt.getDay()],
      semana: `S${Math.ceil(dt.getDate() / 7)}`,
    })
    if (error) {
      console.error('[GastosOperativos] insert error:', error)
      toast.error(error.message || 'Error al guardar. Verifica que tienes permisos de escritura.')
    } else {
      toast.success('Gasto registrado')
      onSaved()
    }
    setGuardando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '520px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="var(--color-primary)" /> Nuevo gasto operativo
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '5px' }}>Fecha</label>
            <input type="date" value={form.fecha} onChange={set('fecha')}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '5px' }}>Monto ($)</label>
            <input type="number" min="0" step="0.01" value={form.cantidad} onChange={set('cantidad')} placeholder="0.00"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '16px', fontWeight: 700, boxSizing: 'border-box', textAlign: 'right' }} />
          </div>
        </div>

        {/* Descripción con autosugerencia */}
        <div style={{ marginBottom: '14px', position: 'relative' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '5px' }}>
            Concepto <span style={{ fontWeight: 400, color: '#9CA3AF' }}>— empieza a escribir para sugerencias</span>
          </label>
          <input value={form.descripcion} onChange={onDescChange} placeholder="¿Qué se compró o pagó?"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          {sugerencias.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden' }}>
              {sugerencias.map(s => (
                <button key={s.concepto} onClick={() => aplicarSugerencia(s)}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F3F4F6', fontSize: '13px' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ fontWeight: 600 }}>{s.concepto}</span>
                  <span style={{ fontSize: '11px', color: COLORS[s.grupo] || '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>{s.grupo}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '5px' }}>Categoría</label>
          <select value={form.grupo_gasto} onChange={set('grupo_gasto')}
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', background: 'white' }}>
            {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '5px' }}>Proveedor / Lugar</label>
          <input value={form.proveedor} onChange={set('proveedor')} placeholder="Escribe o elige proveedor..." list="prov-list"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
          <datalist id="prov-list">
            {allProveedores.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ flex: 2, padding: '11px', border: 'none', borderRadius: '8px', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 700, opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GastosOperativos() {
  useModuleAudit('GASTOS_OPERATIVOS')
  const [modal, setModal] = useState(false)
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('Todos')
  const [expandMes, setExpandMes] = useState(null)
  const [proveedoresDB, setProveedoresDB] = useState([])

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gastos_operativos')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(500)
    setRegistros(data || [])
    setLoading(false)
    // Cargar lista de proveedores únicos del historial
    const { data: provs } = await supabase
      .from('gastos_operativos')
      .select('proveedor')
      .not('proveedor', 'is', null)
    if (provs) {
      const uniq = [...new Set(provs.map(r => r.proveedor).filter(Boolean))].sort()
      setProveedoresDB(uniq)
    }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = registros.filter(r => {
    const q = busqueda.toLowerCase()
    const matchQ = !q || (r.proveedor || '').toLowerCase().includes(q) || (r.descripcion || '').toLowerCase().includes(q)
    const matchG = filtroGrupo === 'Todos' || r.grupo_gasto === filtroGrupo
    return matchQ && matchG
  })

  // Totales por categoría (todo el historial filtrado por grupo pero sin búsqueda)
  const porGrupo = {}
  registros.filter(r => filtroGrupo === 'Todos' || r.grupo_gasto === filtroGrupo).forEach(r => {
    const g = r.grupo_gasto || 'Otros'
    porGrupo[g] = (porGrupo[g] || 0) + (parseFloat(r.cantidad) || 0)
  })
  const totalGeneral = Object.values(porGrupo).reduce((a, b) => a + b, 0)

  // Agrupar filtrados por mes
  const porMes = {}
  filtrados.forEach(r => {
    const key = r.fecha?.slice(0, 7) || 'desconocido'
    if (!porMes[key]) porMes[key] = { label: `${r.mes || key} ${r.anio || key}`, registros: [], total: 0 }
    porMes[key].registros.push(r)
    porMes[key].total += parseFloat(r.cantidad) || 0
  })
  const meses = Object.entries(porMes).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={22} color="var(--color-primary)" /> Gastos Operativos
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>
            Registro histórico de todos los gastos de operación de la plaza
          </p>
        </div>
        <button onClick={() => setModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo gasto
        </button>
      </div>

      {/* Resumen por categoría */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {Object.entries(porGrupo).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([grupo, total]) => (
          <div key={grupo} onClick={() => setFiltroGrupo(filtroGrupo === grupo ? 'Todos' : grupo)}
            style={{
              background: filtroGrupo === grupo ? COLORS[grupo] || '#0A66C2' : 'white',
              color: filtroGrupo === grupo ? 'white' : 'var(--color-text)',
              border: `2px solid ${filtroGrupo === grupo ? COLORS[grupo] || '#0A66C2' : '#E5E7EB'}`,
              borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
            <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', opacity: filtroGrupo === grupo ? 0.85 : 1, color: filtroGrupo === grupo ? 'rgba(255,255,255,0.8)' : 'var(--color-text-light)' }}>
              {grupo}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>{fmt(total)}</div>
            <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.7 }}>
              {totalGeneral > 0 ? ((total / totalGeneral) * 100).toFixed(0) + '%' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por proveedor o descripción..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        {filtroGrupo !== 'Todos' && (
          <button onClick={() => setFiltroGrupo('Todos')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1.5px solid', borderColor: COLORS[filtroGrupo] || 'var(--color-primary)', borderRadius: '8px', background: 'white', color: COLORS[filtroGrupo] || 'var(--color-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
            <Filter size={13} /> {filtroGrupo} <X size={13} />
          </button>
        )}
        <div style={{ fontSize: '13px', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center' }}>
          {filtrados.length} registros · Total: <strong style={{ marginLeft: '4px', color: 'var(--color-danger)' }}>{fmt(filtrados.reduce((a, b) => a + (parseFloat(b.cantidad) || 0), 0))}</strong>
        </div>
      </div>

      {/* Lista por mes */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {meses.map(([key, grupo]) => {
            const open = expandMes === key
            return (
              <div key={key} style={{ background: 'white', borderRadius: '10px', border: '1.5px solid #E5E7EB', overflow: 'hidden' }}>
                <div onClick={() => setExpandMes(open ? null : key)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ChevronDown size={16} color="var(--color-text-light)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{grupo.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{grupo.registros.length} gastos</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-danger)' }}>{fmt(grupo.total)}</div>
                </div>
                {open && (
                  <div style={{ borderTop: '1px solid #F3F4F6' }}>
                    {grupo.registros.map(r => (
                      <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', padding: '10px 18px', borderBottom: '1px solid #F9FAFB', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[r.grupo_gasto] || '#6B7280', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.proveedor || r.descripcion || '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                            {r.fecha} · {r.grupo_gasto}
                            {r.descripcion && r.proveedor ? ' · ' + r.descripcion : ''}
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-danger)' }}>{fmt(r.cantidad)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {meses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-light)', fontSize: '14px' }}>
              Sin gastos registrados{filtroGrupo !== 'Todos' ? ` en "${filtroGrupo}"` : ''}.
            </div>
          )}
        </div>
      )}

      {modal && <NuevoGastoModal onClose={() => setModal(false)} onSaved={() => { setModal(false); cargar() }} proveedoresDB={proveedoresDB} />}
    </div>
  )
}
