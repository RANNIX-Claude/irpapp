import { useState } from 'react'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../hooks/useAudit'
import { EnlacePrivado } from '../ui/ArchivoPrivado'
import TicketModal from '../ui/TicketModal'
import { pesos2, fecha } from '../../lib/compras'
import { C, GridExpediente, Etiqueta } from '../expediente/ExpedienteUI'

/** El TicketModal edita la fila base (gastos_operativos), no la vista. */
export async function ticketParaEditar(id) {
  const { data, error } = await supabase.from('gastos_operativos').select('*').eq('id', id).single()
  if (error) { toast.error('No se pudo abrir el ticket: ' + error.message); return null }
  return data
}

export async function eliminarTicket(t) {
  if (!window.confirm(`¿Eliminar el ticket del ${fecha(t.fecha)} por ${pesos2(t.ticket_total ?? t.monto)}?\nSe borran también sus productos.`)) return false
  const { error } = await supabase.from('gastos_operativos').delete().eq('id', t.id)
  if (error) { toast.error(error.message); return false }
  logAudit({ modulo: 'GASTOS_OPERATIVOS', accion: 'ELIMINAR', entidad: 'gasto', entidad_id: t.id, descripcion: { descripcion: t.descripcion || null, proveedor: t.proveedor_nombre || t.proveedor_txt || null, importe: t.monto, grupo: t.grupo_gasto, via: 'expediente' } })
  toast.success('Ticket eliminado')
  return true
}

/**
 * Tickets (filas de prp_gastos) en la rejilla de expediente: la cámara abre la
 * foto; Ver abre el ticket con su contenido; Editar y Eliminar como en Gastos.
 */
export default function GridTickets({ tickets, onVer, onCambio, conProveedor = false }) {
  const [editando, setEditando] = useState(null)

  const columnas = [
    { key: 'fecha', label: 'Fecha', nowrap: true, orden: t => t.fecha, filtro: t => fecha(t.fecha), placeholder: 'Filtrar fecha',
      render: t => <span style={{ fontWeight: 700 }}>{fecha(t.fecha)}</span> },
    ...(conProveedor ? [{ key: 'prov', label: 'Proveedor', orden: t => t.proveedor_nombre || t.proveedor_txt, filtro: t => t.proveedor_nombre || t.proveedor_txt,
      render: t => <span style={{ fontWeight: 600 }}>{t.proveedor_nombre || t.proveedor_txt || '—'}</span> }] : []),
    { key: 'grupo', label: 'Grupo', orden: t => t.grupo_gasto, filtro: t => t.grupo_gasto,
      render: t => t.grupo_gasto ? <Etiqueta>{t.grupo_gasto}</Etiqueta> : <span style={{ color: C.border }}>—</span> },
    { key: 'desc', label: 'Descripción', filtro: t => t.descripcion,
      render: t => <span style={{ color: C.muted }}>{t.descripcion || '—'}</span> },
    { key: 'foto', icono: Camera, align: 'center',
      render: t => t.ticket_url
        ? <EnlacePrivado bucket="tickets-gastos" valor={t.ticket_url} title="Ver foto del ticket" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}><Camera size={14} color={C.success} /></EnlacePrivado>
        : <Camera size={14} color={C.border} /> },
    { key: 'lineas', label: 'Productos', align: 'right', orden: t => Number(t.num_lineas) || 0,
      render: t => t.num_lineas > 0 ? <span style={{ fontWeight: 600 }}>{t.num_lineas}</span> : <span style={{ color: C.border }}>—</span> },
    { key: 'total', label: 'Total', align: 'right', mono: true, orden: t => Number(t.ticket_total ?? t.monto) || 0,
      render: t => pesos2(t.ticket_total ?? t.monto) },
  ]

  return (
    <>
      <GridExpediente
        filas={tickets} columnas={columnas} ordenInicial={{ key: 'fecha', dir: 'desc' }} vacio="Sin tickets"
        acciones={{
          onVer,
          onEditar: async t => { const g = await ticketParaEditar(t.id); if (g) setEditando(g) },
          onEliminar: async t => { if (await eliminarTicket(t)) onCambio?.() },
          titulos: { ver: 'Ver ticket y sus productos', editar: 'Editar ticket', eliminar: 'Eliminar ticket' },
        }}
      />
      {editando && (
        <TicketModal gasto={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); onCambio?.() }} />
      )}
    </>
  )
}
