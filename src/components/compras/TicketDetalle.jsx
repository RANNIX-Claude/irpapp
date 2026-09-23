import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Receipt, Package, Truck, ExternalLink, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ImagenPrivada, EnlacePrivado } from '../ui/ArchivoPrivado'
import TicketModal from '../ui/TicketModal'
import { pesos2, fecha, traerVista } from '../../lib/compras'
import { C, Card, Section, Empty, Badge, BtnSecondary, GridExpediente, Etiqueta } from '../expediente/ExpedienteUI'
import { ticketParaEditar } from './GridTickets'

/**
 * Contenido de un ticket dentro de un expediente: encabezado, foto y los
 * productos que trae. El proveedor y cada producto llevan a su expediente.
 */
export default function TicketDetalle({ gastoId, onVolver, volverLabel = 'Volver' }) {
  const navigate = useNavigate()
  const [t, setT] = useState(null)
  const [lineas, setLineas] = useState([])
  const [editar, setEditar] = useState(false)
  const [rev, setRev] = useState(0)

  useEffect(() => {
    supabase.from('prp_gastos').select('*').eq('id', gastoId).single().then(({ data }) => setT(data))
    traerVista('prp_compras_productos', q => q.eq('gasto_id', gastoId)).then(setLineas).catch(() => {})
  }, [gastoId, rev])

  if (!t) return <Card><Empty icon={Receipt} msg="Cargando ticket…" /></Card>

  const suma = lineas.reduce((s, l) => s + Number(l.subtotal || 0), 0)
  const total = Number(t.ticket_total ?? t.monto) || 0
  const prov = t.proveedor_nombre || t.proveedor_txt || 'Sin proveedor'

  return (
    <Card>
      <Section title={`Ticket del ${fecha(t.fecha)}`} icon={Receipt} action={
        <div style={{ display: 'flex', gap: 6 }}>
          <BtnSecondary onClick={async () => { const g = await ticketParaEditar(t.id); if (g) setEditar(g) }}><Pencil size={12} /> Editar ticket</BtnSecondary>
          <BtnSecondary onClick={onVolver}><ArrowLeft size={12} /> {volverLabel}</BtnSecondary>
        </div>
      }>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {t.proveedor_id
                ? <span onClick={() => navigate(`/proveedores/${t.proveedor_id}`)} style={{ color: C.primary, cursor: 'pointer' }}><Truck size={14} style={{ verticalAlign: -2, marginRight: 5 }} />{prov}</span>
                : <span style={{ color: C.muted }}>{prov}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {t.grupo_gasto && <Badge label={t.grupo_gasto} color={C.blue} />}
              {t.tiene_factura && <Badge label="Con factura" color={C.success} />}
              {t.descripcion && <span style={{ fontSize: 12, color: C.muted }}>{t.descripcion}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Total del ticket</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.primary }}>{pesos2(total)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: t.ticket_url ? 'minmax(160px, 240px) minmax(0, 1fr)' : '1fr', gap: 20 }}>
          {t.ticket_url && (
            <div>
              <ImagenPrivada bucket="tickets-gastos" valor={t.ticket_url} alt="Ticket" style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.border}`, minHeight: 200 }} />
              <EnlacePrivado bucket="tickets-gastos" valor={t.ticket_url} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 600, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <ExternalLink size={12} /> Ver foto completa
              </EnlacePrivado>
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Contenido del ticket · {lineas.length} producto{lineas.length === 1 ? '' : 's'}</div>
            <GridExpediente
              filas={lineas} rowKey="detalle_id" vacio="Este ticket no tiene capturado el detalle de productos."
              columnas={[
                { key: 'prod', label: 'Producto', orden: l => l.producto || l.descripcion, filtro: l => `${l.producto} ${l.descripcion}`,
                  render: l => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {l.imagen_url ? <img src={l.imagen_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} /> : <Package size={16} color="#CBD5E1" />}
                      <div>
                        <div style={{ fontWeight: 700, color: C.text }}>{l.producto || l.descripcion}</div>
                        {l.producto && l.descripcion !== l.producto && <div style={{ fontSize: 10.5, color: C.muted }}>{l.descripcion}</div>}
                      </div>
                    </div>) },
                { key: 'clas', label: 'Clasificación', filtro: l => l.clasificacion, render: l => l.clasificacion ? <Etiqueta>{l.clasificacion}</Etiqueta> : <span style={{ color: C.border }}>—</span> },
                { key: 'cant', label: 'Cant.', align: 'right', mono: true, orden: l => Number(l.cantidad), render: l => Number(l.cantidad).toLocaleString('es-MX') },
                { key: 'pu', label: 'Precio', align: 'right', mono: true, orden: l => Number(l.precio_unit), render: l => pesos2(l.precio_unit) },
                { key: 'sub', label: 'Subtotal', align: 'right', mono: true, orden: l => Number(l.subtotal), render: l => pesos2(l.subtotal) },
              ]}
              acciones={{ onVer: l => l.producto_id && navigate(`/productos/${l.producto_id}`), titulos: { ver: 'Ver expediente del producto' } }}
            />
            {lineas.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '10px 12px', fontSize: 12, color: C.muted }}>
                <span>Suma de productos{Math.abs(suma - total) > 0.5 ? ` · diferencia de ${pesos2(total - suma)} contra el total` : ''}</span>
                <b style={{ color: C.text, fontFamily: 'monospace' }}>{pesos2(suma)}</b>
              </div>
            )}
          </div>
        </div>
      </Section>

      {editar && (
        <TicketModal
          gasto={editar}
          onClose={() => setEditar(false)}
          onSaved={() => { setEditar(false); setRev(r => r + 1) }}
        />
      )}
    </Card>
  )
}
