import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BarChart2, Info, Receipt, Truck, Hash, Tag, Box, ShoppingCart, TrendingDown, TrendingUp,
  DollarSign, Edit2, Merge, X, Package, Award,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import { useModuleAudit, logAudit } from '../hooks/useAudit'
import { supabase } from '../lib/supabase'
import LogoEditable from '../components/ui/LogoEditable'
import TicketDetalle from '../components/compras/TicketDetalle'
import TicketModal from '../components/ui/TicketModal'
import { ticketParaEditar } from '../components/compras/GridTickets'
import { ProductoModal } from './Productos'
import { pesos, pesos2, fecha, traerVista, agrupar } from '../lib/compras'
import {
  C, Badge, Campo, Card, Section, Empty, BtnSecondary, GridExpediente, Etiqueta,
  Indicadores, ListaDatos, SideCard, SideItem, Acciones, PaginaExpediente,
} from '../components/expediente/ExpedienteUI'

// Junta este producto con otro: las líneas de ticket pasan al destino y el
// nombre queda como alias para los próximos tickets.
function ModalFusion({ p, onClose, onHecho }) {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [destino, setDestino] = useState(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    supabase.from('cat_productos').select('id,nombre,clave').eq('activo', true).neq('id', p.id).order('nombre').then(({ data }) => setLista(data || []))
  }, [p.id])
  const candidatos = lista.filter(x => !busca || x.nombre.toLowerCase().includes(busca.toLowerCase())).slice(0, 40)

  const fusionar = async () => {
    setSaving(true)
    const { data, error } = await supabase.rpc('fusionar_productos', { p_origen: p.id, p_destino: destino.id })
    setSaving(false)
    if (error) return toast.error(error.message)
    logAudit({ modulo: 'PRODUCTOS', accion: 'EDITAR', entidad: 'producto', entidad_id: destino.id, descripcion: `"${p.nombre}" fusionado en "${destino.nombre}" (${data} líneas de ticket)` })
    toast.success(`Fusionado en "${destino.nombre}"`)
    onHecho(destino.id)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 12, width: 480, maxWidth: '96vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Merge size={16} color={C.primary} /> Fusionar producto</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>Los tickets de <b style={{ color: C.text }}>{p.nombre}</b> pasan al producto que elijas; este nombre queda como alias para los próximos tickets.</div>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar el producto que se queda…" style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
          <div style={{ maxHeight: 240, overflow: 'auto', marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            {candidatos.map(x => (
              <div key={x.id} onClick={() => setDestino(x)} style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', background: destino?.id === x.id ? C.primary + '15' : C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: destino?.id === x.id ? 700 : 500 }}>{x.nombre}</span>
                <span style={{ fontSize: 10.5, color: C.muted, fontFamily: 'monospace' }}>{x.clave}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.light, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={fusionar} disabled={!destino || saving} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, background: C.primary, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !destino || saving ? .5 : 1 }}>
            {saving ? 'Fusionando…' : destino ? `Fusionar en "${destino.nombre}"` : 'Elige el destino'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExpedienteProducto() {
  useModuleAudit('PRODUCTOS')
  const { id } = useParams()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'resumen'
  const ticketSel = sp.get('ticket')
  const ir = (t, ticket) => setSp(ticket ? { tab: t, ticket } : { tab: t })

  const [p, setP] = useState(null)
  const [rows, setRows] = useState([])
  const [clasifs, setClasifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // 'editar' | 'fusion'
  const [editTicket, setEditTicket] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: prod }, r, { data: cl }] = await Promise.all([
        supabase.from('cat_productos').select('*').eq('id', id).single(),
        traerVista('prp_compras_productos', q => q.eq('producto_id', id).order('fecha', { ascending: false })),
        supabase.from('cat_clasificacion_producto').select('*').order('orden'),
      ])
      setP(prod); setRows(r); setClasifs(cl || [])
    } catch (e) { toast.error('No se pudo cargar el expediente: ' + e.message) }
    setLoading(false)
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  const provs = useMemo(() => agrupar(rows, 'proveedor_id', 'proveedor'), [rows])

  if (loading && !p) return <div style={{ padding: 60, textAlign: 'center', color: C.muted }}>Cargando expediente…</div>
  if (!p) return <div style={{ padding: 60, textAlign: 'center', color: C.muted }}>Producto no encontrado (pudo haberse fusionado con otro)</div>

  const c = clasifs.find(x => x.clave === p.categoria)
  const total = rows.reduce((s, r) => s + Number(r.subtotal || 0), 0)
  const cant = rows.reduce((s, r) => s + Number(r.cantidad || 0), 0)
  const tickets = new Set(rows.map(r => r.gasto_id)).size
  const ultimo = rows[0]
  const mejor = provs.filter(x => x.ultimoPrecio > 0).sort((a, b) => a.ultimoPrecio - b.ultimoPrecio)[0]
  const precios = rows.map(r => Number(r.precio_unit) || 0).filter(Boolean)
  const promedio = precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : 0
  const serie = [...rows].reverse().map(r => ({ fecha: fecha(r.fecha), precio: Number(r.precio_unit) || 0, proveedor: r.proveedor }))

  const clasificar = async (clave) => {
    const { error } = await supabase.from('cat_productos').update({ categoria: clave || null }).eq('id', p.id)
    if (error) return toast.error(error.message)
    setP(x => ({ ...x, categoria: clave || null }))
    toast.success('Clasificación actualizada')
  }

  const gridCompras = (lista) => (
    <GridExpediente
      filas={lista} rowKey="detalle_id" ordenInicial={{ key: 'fecha', dir: 'desc' }} vacio="Todavía no aparece en ningún ticket"
      columnas={[
        { key: 'fecha', label: 'Fecha', nowrap: true, orden: r => r.fecha, filtro: r => fecha(r.fecha), placeholder: 'Filtrar fecha', render: r => <b>{fecha(r.fecha)}</b> },
        { key: 'prov', label: 'Proveedor', orden: r => r.proveedor, filtro: r => r.proveedor, render: r => <Etiqueta>{r.proveedor}</Etiqueta> },
        { key: 'desc', label: 'Como venía en el ticket', filtro: r => r.descripcion, render: r => <span style={{ color: C.muted }}>{r.descripcion}</span> },
        { key: 'cant', label: 'Cant.', align: 'right', mono: true, orden: r => Number(r.cantidad), render: r => Number(r.cantidad).toLocaleString('es-MX') },
        { key: 'pu', label: 'Precio', align: 'right', mono: true, orden: r => Number(r.precio_unit), render: r => pesos2(r.precio_unit) },
        { key: 'sub', label: 'Subtotal', align: 'right', mono: true, orden: r => Number(r.subtotal), render: r => pesos2(r.subtotal) },
      ]}
      acciones={{
        onVer: r => ir('compras', r.gasto_id),
        onEditar: async r => { const g = await ticketParaEditar(r.gasto_id); if (g) setEditTicket(g) },
        titulos: { ver: 'Ver ticket y su contenido', editar: 'Editar ticket' },
      }}
    />
  )

  const TABS = [
    { id: 'resumen', label: 'Resumen', icon: BarChart2 },
    { id: 'datos', label: 'Datos del producto', icon: Info },
    { id: 'compras', label: 'Compras', icon: Receipt, n: tickets },
    { id: 'proveedores', label: 'Proveedores', icon: Truck, n: provs.length },
  ]

  return (
    <PaginaExpediente
      migas={[{ label: 'Productos', onClick: () => navigate('/productos') }, { label: p.nombre }]}
      estado={<Badge label={c ? c.nombre : 'Sin clasificar'} color={c?.color || C.warning} />}
      avatar={<LogoEditable prefijo="productos" tabla="cat_productos" columna="imagen_url" registroId={p.id} url={p.imagen_url} nombre={p.nombre} size={72} onSubido={url => setP(x => ({ ...x, imagen_url: url }))} />}
      titulo={p.nombre}
      badge={<Badge label={p.activo ? 'Activo' : 'Inactivo'} color={p.activo ? C.success : C.danger} bg={C.surface} />}
      subtitulo={c ? c.nombre : 'Sin clasificar'}
      meta={[[Hash, p.clave], [Box, p.unidad], [Tag, p.origen === 'TICKET' ? 'Alta desde ticket' : 'Alta manual'], [Receipt, ultimo && 'Última compra ' + fecha(ultimo.fecha)]]}
      tabs={TABS} tab={tab} setTab={t => ir(t)}
      lateral={<>
        <SideCard titulo="Clasificación">
          <select value={p.categoria || ''} onChange={e => clasificar(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${c?.color || C.warning}`, borderRadius: 7, fontSize: 13, fontWeight: 600, color: c?.color || '#92400E', background: c ? c.color + '10' : '#FEF3C7', cursor: 'pointer' }}>
            <option value="">— Sin clasificar —</option>
            {clasifs.filter(x => x.activo || x.clave === p.categoria).map(x => <option key={x.clave} value={x.clave}>{x.nombre}</option>)}
          </select>
        </SideCard>
        <SideCard titulo="Proveedores" onVerTodos={provs.length ? () => ir('proveedores') : null}>
          {!provs.length ? <div style={{ fontSize: 12, color: C.muted }}>Sin compras todavía</div> : provs.slice(0, 5).map((x, i) => (
            <SideItem key={x.k} primero={i === 0} icono={x === mejor ? Award : Truck} color={x === mejor ? C.success : C.primary}
              titulo={x.nombre} sub={`${x.tickets.size} tickets · últ. ${pesos2(x.ultimoPrecio)}`} derecha={pesos(x.total)}
              onClick={x.id ? () => navigate(`/proveedores/${x.id}`) : undefined} />
          ))}
        </SideCard>
        <SideCard titulo="Tickets recientes" onVerTodos={rows.length ? () => ir('compras') : null}>
          {!rows.length ? <div style={{ fontSize: 12, color: C.muted }}>Sin tickets</div> : rows.slice(0, 5).map((r, i) => (
            <SideItem key={r.detalle_id} primero={i === 0} icono={Receipt} titulo={r.proveedor}
              sub={`${fecha(r.fecha)} · ${Number(r.cantidad).toLocaleString('es-MX')} × ${pesos2(r.precio_unit)}`} derecha={pesos(r.subtotal)}
              onClick={() => ir('compras', r.gasto_id)} />
          ))}
        </SideCard>
        <Acciones items={[
          [Edit2, 'Editar producto', () => setModal('editar')],
          [Merge, 'Fusionar con otro producto', () => setModal('fusion')],
        ]} />
      </>}
    >
      {/* ── RESUMEN ── */}
      {tab === 'resumen' && <>
        <Indicadores items={[
          [ShoppingCart, 'Total comprado', pesos(total), `${tickets} tickets`, C.primary],
          [Package, 'Cantidad', cant.toLocaleString('es-MX'), p.unidad || 'unidades', C.blue],
          [DollarSign, 'Último precio', ultimo ? pesos2(ultimo.precio_unit) : '—', ultimo ? `${ultimo.proveedor} · ${fecha(ultimo.fecha)}` : '—', C.gold],
          [TrendingDown, 'Más barato', mejor ? mejor.nombre : '—', mejor ? pesos2(mejor.ultimoPrecio) + ' último precio' : '—', C.success],
        ]} />

        <Card>
          <Section title="Evolución del precio" icon={TrendingUp}>
            {serie.length < 2 ? <Empty icon={TrendingUp} msg="Hacen falta al menos dos compras para ver la tendencia" /> : <>
              <div style={{ display: 'flex', gap: 20, marginBottom: 10, fontSize: 12, color: C.muted }}>
                <span>Mínimo <b style={{ color: C.success }}>{pesos2(Math.min(...precios))}</b></span>
                <span>Promedio <b style={{ color: C.text }}>{pesos2(promedio)}</b></span>
                <span>Máximo <b style={{ color: C.danger }}>{pesos2(Math.max(...precios))}</b></span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={serie} margin={{ left: 0, right: 10, top: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="fecha" fontSize={10} />
                  <YAxis fontSize={10} tickFormatter={v => '$' + v} width={50} />
                  <Tooltip formatter={v => pesos2(v)} labelFormatter={(l, pl) => `${l} · ${pl?.[0]?.payload?.proveedor || ''}`} />
                  <Line type="monotone" dataKey="precio" stroke={C.primary} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </>}
          </Section>
        </Card>

        <Card>
          <Section title="Datos del producto" icon={Info} action={<BtnSecondary onClick={() => ir('datos')}>Ver más</BtnSecondary>}>
            <ListaDatos filas={[
              ['Nombre', p.nombre], ['Clave', p.clave], ['Clasificación', c?.nombre || 'Sin clasificar'], ['Unidad', p.unidad],
              ['Origen', p.origen === 'TICKET' ? 'Alta automática desde ticket' : 'Alta manual'], ['Proveedores', String(provs.length)],
            ]} />
          </Section>
        </Card>

        <Card>
          <Section title="Últimas compras" icon={Receipt} action={<BtnSecondary onClick={() => ir('compras')}>Ver todas</BtnSecondary>}>
            {gridCompras(rows.slice(0, 5))}
          </Section>
        </Card>
      </>}

      {/* ── DATOS ── */}
      {tab === 'datos' && (
        <Card>
          <Section title="Datos del producto" icon={Info} action={<BtnSecondary onClick={() => setModal('editar')}><Edit2 size={12} /> Editar</BtnSecondary>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px 24px' }}>
              <Campo label="Nombre" value={p.nombre} />
              <Campo label="Clave" value={p.clave} mono />
              <Campo label="Clasificación" value={c?.nombre || 'Sin clasificar'} />
              <Campo label="Unidad" value={p.unidad} />
              <Campo label="Código del proveedor" value={p.codigo_proveedor} mono />
              <Campo label="Precio de referencia" value={p.precio_ref != null ? pesos2(p.precio_ref) : null} />
              <Campo label="Origen" value={p.origen === 'TICKET' ? 'Alta automática desde ticket' : 'Alta manual'} />
              <Campo label="Estatus" value={p.activo ? 'Activo' : 'Inactivo'} />
              <Campo label="Alta en catálogo" value={fecha(p.created_at?.slice(0, 10))} />
            </div>
            {p.alias?.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>También llega en tickets como</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{p.alias.map(a => <Badge key={a} label={a} color={C.muted} />)}</div>
              </div>
            )}
          </Section>
        </Card>
      )}

      {/* ── COMPRAS ── */}
      {tab === 'compras' && (ticketSel
        ? <TicketDetalle gastoId={ticketSel} onVolver={() => ir('compras')} volverLabel="Volver a compras" />
        : (
          <Card>
            <Section title={`Historial de compras (${tickets}) · ${pesos(total)}`} icon={Receipt}>
              {gridCompras(rows)}
            </Section>
          </Card>
        ))}

      {/* ── PROVEEDORES ── */}
      {tab === 'proveedores' && (
        <Card>
          <Section title={`A quién se le compra · ${provs.length}`} icon={Truck}>
            <GridExpediente
              filas={provs} rowKey="k" ordenInicial={{ key: 'total', dir: 'desc' }} vacio="Sin proveedores todavía"
              resaltar={x => x === mejor}
              columnas={[
                { key: 'prov', label: 'Proveedor', orden: x => x.nombre, filtro: x => x.nombre,
                  render: x => <span style={{ fontWeight: 700 }}>{x.nombre}{x === mejor && <span style={{ marginLeft: 8 }}><Badge label="Más barato" color={C.success} /></span>}</span> },
                { key: 'tk', label: 'Tickets', align: 'right', orden: x => x.tickets.size, render: x => x.tickets.size },
                { key: 'cant', label: 'Cantidad', align: 'right', mono: true, orden: x => x.cantidad, render: x => x.cantidad.toLocaleString('es-MX') },
                { key: 'rango', label: 'Precio mín–máx', align: 'right', mono: true, render: x => `${pesos2(x.min)} – ${pesos2(x.max)}` },
                { key: 'ult', label: 'Último precio', align: 'right', mono: true, orden: x => x.ultimoPrecio, render: x => pesos2(x.ultimoPrecio) },
                { key: 'fecha', label: 'Última compra', nowrap: true, orden: x => x.ultima, render: x => fecha(x.ultima) },
                { key: 'total', label: 'Total', align: 'right', mono: true, orden: x => x.total, render: x => pesos2(x.total) },
              ]}
              acciones={{ onVer: x => x.id && navigate(`/proveedores/${x.id}`), titulos: { ver: 'Ver expediente del proveedor' } }}
            />
          </Section>
        </Card>
      )}

      {modal === 'editar' && <ProductoModal producto={p} clasifs={clasifs} onClose={() => setModal(null)} onSaved={cargar} />}
      {editTicket && <TicketModal gasto={editTicket} onClose={() => setEditTicket(null)} onSaved={() => { setEditTicket(null); cargar() }} />}
      {modal === 'fusion' && <ModalFusion p={p} onClose={() => setModal(null)} onHecho={destId => { setModal(null); navigate(`/productos/${destId}`, { replace: true }) }} />}
    </PaginaExpediente>
  )
}
