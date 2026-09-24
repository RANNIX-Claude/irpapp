import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BarChart2, Image as ImageIcon, History, Wrench, Calendar, MapPin, User, AlertTriangle,
  CheckCircle, XCircle, Play, Flag, RotateCcw, Edit2, Truck, Phone, DollarSign, Clock, Plus, ClipboardList, Receipt, Link2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useModuleAudit } from '../hooks/useAudit'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { fecha, pesos2 } from '../lib/compras'
import { ESTATUS, TIPOS, ROLES_AUTORIZAN, subirFotos } from '../lib/mantenimiento'
import {
  C, Card, Section, Empty, BtnSecondary, Indicadores, ListaDatos, SideCard, SideItem, PaginaExpediente, Badge,
} from '../components/expediente/ExpedienteUI'
import {
  BadgeEstatus, Stepper, GaleriaFotos, ModalSolicitud, ModalAutorizar, ModalRechazar, ModalCerrar, cambiarEstatus,
  ModalLigarTicket, ticketDeMantenimiento,
} from '../components/mantenimiento/MantenimientoUI'
import GridTickets from '../components/compras/GridTickets'
import TicketDetalle from '../components/compras/TicketDetalle'
import TicketModal from '../components/ui/TicketModal'
import { traerVista } from '../lib/compras'

const fechaHora = (ts) => ts ? new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function BotonPaso({ icono: Icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: `1.5px solid ${color}`, borderRadius: 8, background: color + '10', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color, width: '100%' }}>
      <Icon size={14} /> {label}
    </button>
  )
}

// Botón para agregar fotos a una etapa ya guardada.
function AgregarFotos({ s, etapa, onHecho }) {
  const ref = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const subir = async (files) => {
    if (!files?.length) return
    setSubiendo(true)
    const { subidas, errores } = await subirFotos(s.id, etapa, files)
    errores.forEach(e => toast.error(e))
    if (subidas.length) {
      const campo = etapa === 'resultado' ? 'fotos_resultado' : 'fotos_solicitud'
      const { error } = await supabase.from('mantenimiento_solicitudes').update({ [campo]: [...(s[campo] || []), ...subidas] }).eq('id', s.id)
      if (error) toast.error(error.message); else toast.success(`${subidas.length} foto${subidas.length === 1 ? '' : 's'} agregada${subidas.length === 1 ? '' : 's'}`)
    }
    setSubiendo(false)
    onHecho()
  }
  return (
    <>
      <BtnSecondary onClick={() => ref.current.click()}><Plus size={12} /> {subiendo ? 'Subiendo…' : 'Agregar fotos'}</BtnSecondary>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={e => { subir(e.target.files); e.target.value = '' }} />
    </>
  )
}

export default function ExpedienteMantenimiento() {
  useModuleAudit('MANTENIMIENTO')
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil, user } = useApp()
  const rol = perfil?.rol_id || user?.user_metadata?.rol_id
  const puedeAutorizar = ROLES_AUTORIZAN.includes(rol)
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'resumen'

  const [s, setS] = useState(null)
  const [hist, setHist] = useState([])
  const [gastos, setGastos] = useState([])
  const [ticket, setTicket] = useState(null)   // { gasto, extra } para TicketModal
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // editar | autorizar | rechazar | cerrar

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: h }] = await Promise.all([
      supabase.from('prp_mantenimiento').select('*').eq('id', id).single(),
      supabase.from('mantenimiento_historial').select('*').eq('solicitud_id', id).order('fecha', { ascending: false }),
    ])
    if (error) toast.error('No se pudo cargar la solicitud: ' + error.message)
    setS(data); setHist(h || []); setLoading(false)
    traerVista('prp_gastos', q => q.eq('mantenimiento_id', id)).then(setGastos).catch(() => setGastos([]))
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  if (loading && !s) return <div style={{ padding: 60, textAlign: 'center', color: C.muted }}>Cargando solicitud…</div>
  if (!s) return <div style={{ padding: 60, textAlign: 'center', color: C.muted }}>Solicitud no encontrada</div>

  const est = ESTATUS[s.estatus]
  const tipo = TIPOS[s.tipo]
  const catColor = s.categoria_color || C.primary
  const listo = () => { setModal(null); cargar() }
  const gastoTotal = Number(s.gasto_total) || 0
  const costoMostrado = gastoTotal > 0 ? gastoTotal : s.costo_real != null ? Number(s.costo_real) : null
  const registrarGasto = (monto) => setTicket(ticketDeMantenimiento(s, monto))
  const paso = async (estatus, pregunta) => {
    const nota = pregunta ? window.prompt(pregunta, '') : ''
    if (nota === null) return
    if (await cambiarEstatus(s, estatus, nota)) cargar()
  }

  const acciones = []
  if (s.estatus === 'SOLICITADO') {
    if (puedeAutorizar) {
      acciones.push(<BotonPaso key="a" icono={CheckCircle} label="Autorizar y asignar" color={ESTATUS.AUTORIZADO.color} onClick={() => setModal('autorizar')} />)
      acciones.push(<BotonPaso key="r" icono={XCircle} label="Rechazar" color={C.danger} onClick={() => setModal('rechazar')} />)
    }
    acciones.push(<BotonPaso key="e" icono={Edit2} label="Editar solicitud" color={C.muted} onClick={() => setModal('editar')} />)
  } else if (s.estatus === 'AUTORIZADO') {
    acciones.push(<BotonPaso key="i" icono={Play} label="Iniciar trabajo" color={ESTATUS.EN_PROCESO.color} onClick={() => paso('EN_PROCESO', 'Comentario (opcional):')} />)
    acciones.push(<BotonPaso key="c" icono={Flag} label="Cerrar trabajo" color={ESTATUS.CERRADO.color} onClick={() => setModal('cerrar')} />)
    if (puedeAutorizar) acciones.push(<BotonPaso key="x" icono={XCircle} label="Cancelar autorización" color={C.danger} onClick={() => setModal('rechazar')} />)
  } else if (s.estatus === 'EN_PROCESO') {
    acciones.push(<BotonPaso key="c" icono={Flag} label="Cerrar trabajo" color={ESTATUS.CERRADO.color} onClick={() => setModal('cerrar')} />)
  } else if (s.estatus === 'CERRADO') {
    acciones.push(<BotonPaso key="o" icono={RotateCcw} label="Reabrir (quedó pendiente algo)" color={ESTATUS.EN_PROCESO.color} onClick={() => paso('EN_PROCESO', '¿Por qué se reabre?')} />)
  } else if (s.estatus === 'RECHAZADO') {
    acciones.push(<BotonPaso key="o" icono={RotateCcw} label="Volver a solicitar" color={ESTATUS.SOLICITADO.color} onClick={() => paso('SOLICITADO', 'Comentario (opcional):')} />)
    acciones.push(<BotonPaso key="e" icono={Edit2} label="Editar solicitud" color={C.muted} onClick={() => setModal('editar')} />)
  }

  const TABS = [
    { id: 'resumen', label: 'Resumen', icon: BarChart2 },
    { id: 'fotos', label: 'Fotografías', icon: ImageIcon, n: (s.n_fotos_solicitud || 0) + (s.n_fotos_resultado || 0) },
    { id: 'costos', label: 'Costos', icon: Receipt, n: s.n_gastos || 0 },
    { id: 'historial', label: 'Historial', icon: History, n: hist.length },
  ]

  return (
    <PaginaExpediente
      migas={[{ label: 'Mantenimiento', onClick: () => navigate('/mantenimiento') }, { label: s.folio }]}
      estado={<BadgeEstatus e={s.estatus} />}
      avatar={
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: catColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wrench size={32} color={catColor} />
        </div>}
      titulo={s.titulo}
      badge={<Badge label={est.label} color={est.color} bg={C.surface} />}
      subtitulo={`${s.folio} · ${s.categoria_nombre}`}
      meta={[[AlertTriangle, tipo?.label], [Calendar, 'Solicitada ' + fecha(s.fecha_solicitud)], [MapPin, s.ubicacion], [User, s.solicitante_nombre && 'Por ' + s.solicitante_nombre]]}
      derecha={
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{s.estatus === 'CERRADO' ? 'Resuelta en' : 'Días abierta'}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: s.tipo === 'URGENTE' && s.estatus !== 'CERRADO' ? C.danger : C.text }}>{s.dias ?? 0}<span style={{ fontSize: 13, color: C.muted }}> días</span></div>
        </div>}
      tabs={TABS} tab={tab} setTab={t => setSp({ tab: t })}
      lateral={<>
        <SideCard titulo="Siguiente paso">
          <div style={{ display: 'grid', gap: 8 }}>
            {acciones.length ? acciones : <div style={{ fontSize: 12, color: C.muted }}>Sin acciones pendientes</div>}
            {s.estatus === 'SOLICITADO' && !puedeAutorizar && (
              <div style={{ fontSize: 11.5, color: C.muted, background: C.light, padding: '8px 10px', borderRadius: 7 }}>Esperando que gerencia la autorice y asigne a un responsable.</div>
            )}
          </div>
        </SideCard>
        <SideCard titulo="Responsable">
          {s.asignado_nombre ? (
            <SideItem primero icono={Truck} titulo={s.asignado_nombre} sub={s.asignado_telefono || 'Ver expediente del proveedor'}
              onClick={() => navigate(`/proveedores/${s.asignado_proveedor_id}`)} />
          ) : <div style={{ fontSize: 12, color: C.muted }}>Sin asignar</div>}
          {s.asignado_telefono && <a href={`tel:${s.asignado_telefono}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: C.primary, fontWeight: 600, textDecoration: 'none' }}><Phone size={12} /> Llamar</a>}
        </SideCard>
        <SideCard titulo="Fechas">
          {[
            [Calendar, 'Solicitada', fecha(s.fecha_solicitud), ESTATUS.SOLICITADO.color],
            [CheckCircle, s.estatus === 'RECHAZADO' ? 'Rechazada' : 'Autorizada', s.fecha_autorizacion ? fechaHora(s.fecha_autorizacion) : null, s.estatus === 'RECHAZADO' ? C.danger : ESTATUS.AUTORIZADO.color],
            [Clock, 'Programada', s.fecha_programada ? fecha(s.fecha_programada) : null, C.gold],
            [Play, 'Inicio', s.fecha_inicio ? fecha(s.fecha_inicio) : null, ESTATUS.EN_PROCESO.color],
            [Flag, 'Terminada', s.fecha_cierre ? fecha(s.fecha_cierre) : null, ESTATUS.CERRADO.color],
          ].map(([I, l, v, col], i) => <SideItem key={l} primero={i === 0} icono={I} color={v ? col : C.border} titulo={l} sub={v || 'Pendiente'} />)}
        </SideCard>
      </>}
    >
      {/* ── RESUMEN ── */}
      {tab === 'resumen' && <>
        <Card><Stepper estatus={s.estatus} /></Card>

        <Indicadores items={[
          [AlertTriangle, 'Tipo', tipo?.label, s.categoria_nombre, tipo?.color || C.muted],
          [Truck, 'Asignado a', s.asignado_nombre || 'Sin asignar', s.autorizado_por_nombre ? 'Autorizó ' + s.autorizado_por_nombre : 'Pendiente de autorizar', C.primary],
          [Calendar, 'Programada', s.fecha_programada ? fecha(s.fecha_programada) : '—', s.fecha_inicio ? 'Inició ' + fecha(s.fecha_inicio) : 'Sin iniciar', C.gold],
          [DollarSign, 'Costo', s.con_costo === false ? 'Sin costo' : costoMostrado != null ? pesos2(costoMostrado) : s.costo_estimado != null ? '~' + pesos2(s.costo_estimado) : '—', s.con_costo === false ? 'Personal interno' : gastoTotal > 0 ? `${s.n_gastos} ticket${s.n_gastos === 1 ? '' : 's'} ligado${s.n_gastos === 1 ? '' : 's'}` : s.costo_estimado != null ? 'Estimado' : '', C.success],
        ]} />

        <Card>
          <Section title="Solicitud" icon={ClipboardList} action={['SOLICITADO', 'RECHAZADO'].includes(s.estatus) && <BtnSecondary onClick={() => setModal('editar')}><Edit2 size={12} /> Editar</BtnSecondary>}>
            <ListaDatos filas={[
              ['Folio', s.folio], ['Fecha', fecha(s.fecha_solicitud)], ['Categoría', s.categoria_nombre], ['Tipo', tipo?.label],
              ['Ubicación', s.ubicacion], ['Solicitó', s.solicitante_nombre],
            ]} />
            {s.descripcion && <div style={{ marginTop: 14, padding: '12px 14px', background: C.light, borderRadius: 8, fontSize: 13, color: C.text, whiteSpace: 'pre-wrap' }}>{s.descripcion}</div>}
            {(s.fotos_solicitud || []).length > 0 && <div style={{ marginTop: 14 }}><GaleriaFotos fotos={s.fotos_solicitud} /></div>}
          </Section>
        </Card>

        {s.estatus === 'RECHAZADO' && (
          <Card>
            <Section title="Rechazo" icon={XCircle}>
              <ListaDatos filas={[['Rechazó', s.autorizado_por_nombre], ['Fecha', fechaHora(s.fecha_autorizacion)]]} />
              <div style={{ marginTop: 12, padding: '12px 14px', background: ESTATUS.RECHAZADO.bg, color: ESTATUS.RECHAZADO.color, borderRadius: 8, fontSize: 13 }}>{s.motivo_rechazo}</div>
            </Section>
          </Card>
        )}

        {s.autorizado_por_nombre && s.estatus !== 'RECHAZADO' && (
          <Card>
            <Section title="Autorización y asignación" icon={CheckCircle}>
              <ListaDatos filas={[
                ['Autorizó', s.autorizado_por_nombre], ['Fecha', fechaHora(s.fecha_autorizacion)],
                ['Asignado a', s.asignado_nombre], ['Programada', s.fecha_programada && fecha(s.fecha_programada)],
                ['Costo estimado', s.costo_estimado != null && pesos2(s.costo_estimado)],
              ]} />
            </Section>
          </Card>
        )}

        {s.estatus === 'CERRADO' && (
          <Card>
            <Section title="Resultado" icon={Flag}>
              <div style={{ padding: '12px 14px', background: ESTATUS.CERRADO.bg, borderRadius: 8, fontSize: 13, color: C.text, whiteSpace: 'pre-wrap', marginBottom: 14 }}>{s.resultado}</div>
              <ListaDatos filas={[['Inicio', fecha(s.fecha_inicio)], ['Terminada', fecha(s.fecha_cierre)], ['¿Tuvo costo?', s.con_costo ? 'Sí' : 'No — personal interno'], ['Costo', s.con_costo && costoMostrado != null && pesos2(costoMostrado)], ['Duración', `${s.dias} días desde la solicitud`]]} />
              {(s.fotos_resultado || []).length > 0 && <div style={{ marginTop: 14 }}><GaleriaFotos fotos={s.fotos_resultado} /></div>}
            </Section>
          </Card>
        )}
      </>}

      {/* ── FOTOGRAFÍAS ── */}
      {tab === 'fotos' && <>
        <Card>
          <Section title={`Fotos de la solicitud (${s.n_fotos_solicitud || 0})`} icon={ImageIcon} action={<AgregarFotos s={s} etapa="solicitud" onHecho={cargar} />}>
            <GaleriaFotos fotos={s.fotos_solicitud} vacio="Sin fotos de la solicitud" />
          </Section>
        </Card>
        <Card>
          <Section title={`Fotos del resultado (${s.n_fotos_resultado || 0})`} icon={Flag}
            action={['EN_PROCESO', 'CERRADO'].includes(s.estatus) && <AgregarFotos s={s} etapa="resultado" onHecho={cargar} />}>
            <GaleriaFotos fotos={s.fotos_resultado} vacio={['EN_PROCESO', 'CERRADO'].includes(s.estatus) ? 'Sin fotos del resultado' : 'Se agregan cuando el trabajo está en proceso o al cerrarlo'} />
          </Section>
        </Card>
      </>}

      {/* ── COSTOS ── */}
      {tab === 'costos' && (
        <Card>
          <Section title={`Gastos de este mantenimiento · ${pesos2(gastoTotal)}`} icon={Receipt} action={
            <div style={{ display: 'flex', gap: 6 }}>
              <BtnSecondary onClick={() => setModal('ligar')}><Link2 size={12} /> Ligar ticket existente</BtnSecondary>
              <BtnSecondary onClick={() => registrarGasto(null)}><Plus size={12} /> Registrar gasto</BtnSecondary>
            </div>}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              Pagos al proveedor o material comprado (p. ej. una llave pagada con caja chica). Cada ticket es un gasto de la plaza y aparece también en Gastos Operativos.
              {s.con_costo === false && <b style={{ color: C.text }}> Este trabajo se cerró como "sin costo".</b>}
            </div>
            {sp.get('ticket')
              ? <TicketDetalle gastoId={sp.get('ticket')} onVolver={() => setSp({ tab: 'costos' })} volverLabel="Volver a costos" />
              : <GridTickets tickets={gastos} conProveedor onVer={g => setSp({ tab: 'costos', ticket: g.id })} onCambio={cargar} />}
          </Section>
        </Card>
      )}

      {/* ── HISTORIAL ── */}
      {tab === 'historial' && (
        <Card>
          <Section title="Historial de la solicitud" icon={History}>
            {!hist.length ? <Empty icon={History} msg="Sin movimientos" /> : hist.map((h, i) => {
              const e = ESTATUS[h.estatus_nuevo] || { color: C.muted, label: h.estatus_nuevo }
              return (
                <div key={h.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? `1px solid ${C.border}` : undefined }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: e.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Wrench size={13} color={e.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: C.text }}>
                      {h.estatus_anterior ? <><b>{ESTATUS[h.estatus_anterior]?.label}</b> → </> : 'Registrada como '}<b style={{ color: e.color }}>{e.label}</b>
                    </div>
                    {h.nota && <div style={{ fontSize: 12, color: C.muted, marginTop: 2, whiteSpace: 'pre-wrap' }}>{h.nota}</div>}
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{fechaHora(h.fecha)}{h.usuario_nombre ? ' · ' + h.usuario_nombre : ''}</div>
                  </div>
                </div>
              )
            })}
          </Section>
        </Card>
      )}

      {modal === 'editar' && <ModalSolicitud solicitud={s} onClose={() => setModal(null)} onSaved={listo} />}
      {modal === 'autorizar' && <ModalAutorizar s={s} onClose={() => setModal(null)} onSaved={listo} />}
      {modal === 'rechazar' && <ModalRechazar s={s} onClose={() => setModal(null)} onSaved={listo} />}
      {modal === 'cerrar' && <ModalCerrar s={s} onClose={() => setModal(null)} onSaved={g => { listo(); if (g) registrarGasto(g.monto) }} />}
      {modal === 'ligar' && <ModalLigarTicket s={s} onClose={() => setModal(null)} onSaved={listo} />}
      {ticket && <TicketModal gasto={ticket.gasto} extra={ticket.extra} onClose={() => setTicket(null)} onSaved={() => { setTicket(null); cargar(); setSp({ tab: 'costos' }) }} />}
    </PaginaExpediente>
  )
}
