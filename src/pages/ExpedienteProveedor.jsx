import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BarChart2, Info, Receipt, Package, HardHat, Hash, FileText, Phone, Mail, Calendar,
  ShoppingCart, TrendingUp, Camera, Plus, Edit2, Power,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useModuleAudit, logAudit } from '../hooks/useAudit'
import { supabase } from '../lib/supabase'
import LogoEditable from '../components/ui/LogoEditable'
import TicketModal from '../components/ui/TicketModal'
import TicketDetalle from '../components/compras/TicketDetalle'
import GridTickets from '../components/compras/GridTickets'
import { ModalProveedor, CATEGORIAS } from './Proveedores'
import { AMBITOS, pesos, pesos2, fecha, traerVista, agrupar } from '../lib/compras'
import {
  C, Badge, Campo, Card, Section, Empty, BtnSecondary, Anillo, GridExpediente, Etiqueta,
  Indicadores, ListaDatos, SideCard, SideItem, Acciones, PaginaExpediente,
} from '../components/expediente/ExpedienteUI'

const catLabel = (id) => CATEGORIAS.find(c => c.id === id)?.label || id

export default function ExpedienteProveedor() {
  useModuleAudit('PROVEEDORES')
  const { id } = useParams()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'resumen'
  const ticketSel = sp.get('ticket')
  const ir = (t, ticket) => setSp(ticket ? { tab: t, ticket } : { tab: t })

  const [p, setP] = useState(null)
  const [tickets, setTickets] = useState([])
  const [lineas, setLineas] = useState([])
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // 'editar' | 'ticket'

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: prov }, tk, ln, cp] = await Promise.all([
        supabase.from('cat_proveedores').select('*').eq('id', id).single(),
        traerVista('prp_gastos', q => q.eq('proveedor_id', id).order('fecha', { ascending: false })),
        traerVista('prp_compras_productos', q => q.eq('proveedor_id', id)),
        traerVista('prp_compras', q => q.eq('proveedor_id', id).order('fecha', { ascending: false })),
      ])
      setP(prov); setTickets(tk); setLineas(ln); setCompras(cp)
    } catch (e) { toast.error('No se pudo cargar el expediente: ' + e.message) }
    setLoading(false)
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  const productos = useMemo(() => agrupar(lineas, 'producto_id', 'producto'), [lineas])
  const proyectos = compras.filter(c => c.origen === 'PROYECTO')

  if (loading && !p) return <div style={{ padding: 60, textAlign: 'center', color: C.muted }}>Cargando expediente…</div>
  if (!p) return <div style={{ padding: 60, textAlign: 'center', color: C.muted }}>Proveedor no encontrado</div>

  const total = compras.reduce((s, c) => s + Number(c.monto || 0), 0)
  const primera = compras.length ? compras[compras.length - 1].fecha : null
  const ultima = compras[0]?.fecha
  const conDetalle = tickets.filter(t => t.num_lineas > 0).length
  const pct = tickets.length ? Math.round(conDetalle / tickets.length * 100) : 0
  const porAmbito = AMBITOS.map(a => ({ ...a, monto: compras.filter(c => c.ambito === a.id).reduce((s, c) => s + Number(c.monto || 0), 0) })).filter(a => a.monto)
  const porAnio = Object.entries(compras.reduce((m, c) => {
    const y = c.anio; m[y] = m[y] || { monto: 0, n: 0 }; m[y].monto += Number(c.monto || 0); m[y].n++; return m
  }, {})).sort((a, b) => b[0] - a[0])
  const maxAnio = Math.max(1, ...porAnio.map(([, v]) => v.monto))
  const toggleActivo = async () => {
    const { error } = await supabase.from('cat_proveedores').update({ activo: !p.activo }).eq('id', p.id)
    if (error) return toast.error(error.message)
    logAudit({ modulo: 'PROVEEDORES', accion: 'EDITAR', entidad: 'proveedor', entidad_id: p.id, descripcion: `Proveedor "${p.nombre}" ${p.activo ? 'desactivado' : 'activado'}` })
    setP(x => ({ ...x, activo: !x.activo }))
  }

  const TABS = [
    { id: 'resumen', label: 'Resumen', icon: BarChart2 },
    { id: 'datos', label: 'Datos generales', icon: Info },
    { id: 'compras', label: 'Compras', icon: Receipt, n: tickets.length },
    { id: 'productos', label: 'Productos', icon: Package, n: productos.length },
    ...(proyectos.length ? [{ id: 'proyectos', label: 'Proyectos', icon: HardHat, n: proyectos.length }] : []),
  ]

  return (
    <PaginaExpediente
      migas={[{ label: 'Proveedores', onClick: () => navigate('/proveedores') }, { label: p.nombre }]}
      estado={<Badge label={p.activo ? 'Activo' : 'Inactivo'} color={p.activo ? C.success : C.danger} />}
      avatar={<LogoEditable prefijo="proveedores" tabla="cat_proveedores" columna="logo_url" registroId={p.id} url={p.logo_url} nombre={p.nombre} size={72} onSubido={url => setP(x => ({ ...x, logo_url: url }))} />}
      titulo={p.nombre}
      badge={<Badge label={p.activo ? 'Activo' : 'Inactivo'} color={p.activo ? C.success : C.danger} bg={C.surface} />}
      subtitulo={[p.categoria ? catLabel(p.categoria) : 'Proveedor', p.razon_social].filter(Boolean).join(' · ')}
      meta={[[Hash, p.clave], [FileText, p.rfc && 'RFC ' + p.rfc], [Phone, p.telefono], [Mail, p.email], [Calendar, primera && 'Cliente desde ' + fecha(primera)]]}
      derecha={<Anillo pct={pct} titulo="Tickets" detalle={`${conDetalle}/${tickets.length} con productos`} />}
      tabs={TABS} tab={tab} setTab={t => ir(t)}
      lateral={<>
        <SideCard titulo="Tickets recientes" onVerTodos={() => ir('compras')}>
          {!tickets.length ? <div style={{ fontSize: 12, color: C.muted }}>Sin tickets</div> : tickets.slice(0, 5).map((t, i) => (
            <SideItem key={t.id} primero={i === 0} icono={t.ticket_url ? Camera : Receipt} color={t.ticket_url ? C.success : C.primary}
              titulo={t.grupo_gasto || 'Ticket'} sub={fecha(t.fecha) + (t.num_lineas ? ` · ${t.num_lineas} productos` : '')}
              derecha={pesos(t.ticket_total ?? t.monto)} onClick={() => ir('compras', t.id)} />
          ))}
        </SideCard>
        <SideCard titulo="Productos más comprados" onVerTodos={productos.length ? () => ir('productos') : null}>
          {!productos.length ? <div style={{ fontSize: 12, color: C.muted }}>Sin detalle de productos</div> : productos.slice(0, 5).map((x, i) => (
            <SideItem key={x.k} primero={i === 0} icono={Package} color={C.gold} titulo={x.nombre}
              sub={`${x.cantidad.toLocaleString('es-MX')} ${x.unidad || ''} · últ. ${pesos2(x.ultimoPrecio)}`} derecha={pesos(x.total)}
              onClick={x.id ? () => navigate(`/productos/${x.id}`) : undefined} />
          ))}
        </SideCard>
        <Acciones items={[
          [Plus, 'Registrar ticket', () => setModal('ticket')],
          [Edit2, 'Editar datos', () => setModal('editar')],
          [Power, p.activo ? 'Desactivar proveedor' : 'Activar proveedor', toggleActivo],
        ]} />
      </>}
    >
      {/* ── RESUMEN ── */}
      {tab === 'resumen' && <>
        <Indicadores items={[
          [ShoppingCart, 'Total comprado', pesos(total), `${compras.length} compras`, C.primary],
          [Receipt, 'Tickets', tickets.length, `${conDetalle} con productos`, C.blue],
          [Calendar, 'Última compra', fecha(ultima), primera ? 'Primera: ' + fecha(primera) : '—', C.gold],
          [TrendingUp, 'Compra promedio', pesos(compras.length ? total / compras.length : 0), porAmbito.map(a => a.label).join(' · ') || '—', C.success],
        ]} />

        <Card>
          <Section title="Datos generales" icon={Info} action={<BtnSecondary onClick={() => ir('datos')}>Ver más</BtnSecondary>}>
            <ListaDatos filas={[
              ['Nombre comercial', p.nombre], ['Razón social', p.razon_social], ['RFC', p.rfc], ['Categoría', p.categoria && catLabel(p.categoria)],
              ['Contacto', p.contacto], ['Teléfono', p.telefono], ['Email', p.email], ['Clave', p.clave],
            ]} />
          </Section>
        </Card>

        <Card>
          <Section title="Compras por año" icon={BarChart2}>
            {!porAnio.length ? <Empty icon={ShoppingCart} msg="Sin compras registradas" /> : <>
              {porAmbito.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${porAmbito.length}, 1fr)`, gap: 12, marginBottom: 16 }}>
                  {porAmbito.map(a => (
                    <div key={a.id} style={{ textAlign: 'center', padding: 10, background: a.color + '10', borderRadius: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: a.color }}>{pesos(a.monto)}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{a.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {porAnio.map(([y, v]) => (
                <div key={y} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 110px 70px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{y}</span>
                  <div style={{ height: 10, background: C.light, borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${v.monto / maxAnio * 100}%`, height: '100%', background: C.primary, borderRadius: 5 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{pesos(v.monto)}</span>
                  <span style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>{v.n} compras</span>
                </div>
              ))}
            </>}
          </Section>
        </Card>

        <Card>
          <Section title="Últimos tickets" icon={Receipt} action={<BtnSecondary onClick={() => ir('compras')}>Ver todos</BtnSecondary>}>
            <GridTickets tickets={tickets.slice(0, 5)} onVer={t => ir('compras', t.id)} onCambio={cargar} />
          </Section>
        </Card>
      </>}

      {/* ── DATOS GENERALES ── */}
      {tab === 'datos' && (
        <Card>
          <Section title="Datos generales" icon={Info} action={<BtnSecondary onClick={() => setModal('editar')}><Edit2 size={12} /> Editar</BtnSecondary>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px 24px' }}>
              <Campo label="Nombre comercial" value={p.nombre} />
              <Campo label="Razón social" value={p.razon_social} />
              <Campo label="RFC" value={p.rfc} mono />
              <Campo label="Clave" value={p.clave} mono />
              <Campo label="Categoría" value={p.categoria && catLabel(p.categoria)} />
              <Campo label="Estatus" value={p.activo ? 'Activo' : 'Inactivo'} />
              <Campo label="Contacto" value={p.contacto} />
              <Campo label="Teléfono" value={p.telefono} />
              <Campo label="Email" value={p.email} />
              <Campo label="Alta en catálogo" value={fecha(p.created_at?.slice(0, 10))} />
            </div>
            {p.alias?.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>También aparece en tickets como</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{p.alias.map(a => <Badge key={a} label={a} color={C.muted} />)}</div>
              </div>
            )}
            {p.notas && <div style={{ marginTop: 18, padding: '12px 14px', background: C.light, borderRadius: 8, fontSize: 13, color: C.muted }}>{p.notas}</div>}
          </Section>
        </Card>
      )}

      {/* ── COMPRAS (tickets) ── */}
      {tab === 'compras' && (ticketSel
        ? <TicketDetalle gastoId={ticketSel} onVolver={() => ir('compras')} volverLabel="Volver a compras" />
        : (
          <Card>
            <Section title={`Historial de compras (${tickets.length}) · ${pesos(tickets.reduce((s, t) => s + Number(t.ticket_total ?? t.monto ?? 0), 0))}`} icon={Receipt}
              action={<BtnSecondary onClick={() => setModal('ticket')}><Plus size={12} /> Registrar ticket</BtnSecondary>}>
              <GridTickets tickets={tickets} onVer={t => ir('compras', t.id)} onCambio={cargar} />
            </Section>
          </Card>
        ))}

      {/* ── PRODUCTOS ── */}
      {tab === 'productos' && (
        <Card>
          <Section title={`Productos que se le compran · ${productos.length}`} icon={Package}>
            <GridExpediente
              filas={productos} rowKey="k" ordenInicial={{ key: 'total', dir: 'desc' }}
              vacio="Todavía no hay tickets con detalle de productos para este proveedor."
              columnas={[
                { key: 'prod', label: 'Producto', orden: x => x.nombre, filtro: x => x.nombre,
                  render: x => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {x.imagen ? <img src={x.imagen} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} /> : <Package size={16} color="#CBD5E1" />}
                      <span style={{ fontWeight: 700 }}>{x.nombre}</span>
                    </div>) },
                { key: 'clas', label: 'Clasificación', filtro: x => x.clasificacion, render: x => x.clasificacion ? <Etiqueta>{x.clasificacion}</Etiqueta> : <span style={{ color: C.border }}>—</span> },
                { key: 'tk', label: 'Tickets', align: 'right', orden: x => x.tickets.size, render: x => x.tickets.size },
                { key: 'cant', label: 'Cantidad', align: 'right', mono: true, orden: x => x.cantidad, render: x => `${x.cantidad.toLocaleString('es-MX')} ${x.unidad || ''}` },
                { key: 'rango', label: 'Precio mín–máx', align: 'right', mono: true, render: x => `${pesos2(x.min)} – ${pesos2(x.max)}` },
                { key: 'ult', label: 'Último', align: 'right', mono: true, orden: x => x.ultimoPrecio, render: x => pesos2(x.ultimoPrecio) },
                { key: 'total', label: 'Total', align: 'right', mono: true, orden: x => x.total, render: x => pesos2(x.total) },
              ]}
              acciones={{ onVer: x => x.id && navigate(`/productos/${x.id}`), titulos: { ver: 'Ver expediente del producto' } }}
            />
          </Section>
        </Card>
      )}

      {/* ── PROYECTOS ── */}
      {tab === 'proyectos' && (
        <Card>
          <Section title="Pagos de proyectos" icon={HardHat}>
            <GridExpediente
              filas={proyectos} rowKey="registro_id" ordenInicial={{ key: 'fecha', dir: 'desc' }}
              columnas={[
                { key: 'fecha', label: 'Fecha', nowrap: true, orden: x => x.fecha, filtro: x => fecha(x.fecha), render: x => <b>{fecha(x.fecha)}</b> },
                { key: 'proy', label: 'Proyecto', orden: x => x.grupo, filtro: x => x.grupo, render: x => <Etiqueta color={C.gold}>{x.grupo}</Etiqueta> },
                { key: 'conc', label: 'Concepto', filtro: x => x.concepto, render: x => <span style={{ color: C.muted }}>{x.concepto}</span> },
                { key: 'monto', label: 'Monto', align: 'right', mono: true, orden: x => Number(x.monto), render: x => pesos2(x.monto) },
              ]}
              acciones={{ onVer: () => navigate('/proyectos'), titulos: { ver: 'Ir a Proyectos' } }}
            />
          </Section>
        </Card>
      )}

      {modal === 'editar' && <ModalProveedor proveedor={p} onClose={() => setModal(null)} onSaved={() => { setModal(null); cargar() }} />}
      {modal === 'ticket' && (
        <TicketModal gasto={{ proveedor_id: p.id, proveedor_txt: p.nombre }} onClose={() => setModal(null)} onSaved={() => { setModal(null); cargar() }} />
      )}
    </PaginaExpediente>
  )
}

