import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase, llamarFuncion } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { EnlacePrivado } from '../components/ui/ArchivoPrivado'
import { hoyISO, dinero, fecha, fechaCorta, MESES, Avatar, Etiqueta, Filas, Galeria, Barra, COLOR, botonGrande, Pantalla, Seccion, Kpi, Rejilla, Cargando, Vacio, Hoja } from './kit'
import Lista, { TarjetaFila } from './Lista'

// Pantallas de los roles con una sola función. Mismo criterio que el resto: consulta primero,
// y solo la acción mínima que ese rol hace en el día a día.

// ── Finanzas: validar depósitos ─────────────────────────────────────────────
const estIng = { VALIDADO: ['Validado', COLOR.verde], POR_VALIDAR: ['Por validar', COLOR.ambar], OBSERVADO: ['Observado', COLOR.rojo] }

function AccionesDeposito({ i, cerrar, recargar }) {
  const { perfil } = useApp()
  const [trabajando, setTrabajando] = useState(false)
  const cambiar = async (estatus) => {
    setTrabajando(true)
    const campos = estatus === 'VALIDADO'
      ? { estatus_validacion: 'VALIDADO', validado_por: perfil?.nombre || 'Finanzas', validado_en: new Date().toISOString() }
      : { estatus_validacion: 'OBSERVADO' }
    const { error } = await supabase.from('ingresos').update(campos).eq('id', i.id)
    setTrabajando(false)
    if (error) { toast.error('No se pudo guardar: ' + error.message); return }
    toast.success(estatus === 'VALIDADO' ? `Depósito de ${dinero(i.importe)} validado` : 'Marcado como observado')
    recargar(); cerrar()
  }
  if (i.estatus_validacion === 'VALIDADO') return null
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
      <button disabled={trabajando} onClick={() => cambiar('VALIDADO')} style={botonGrande(COLOR.verde)}>Validar depósito</button>
      {i.estatus_validacion !== 'OBSERVADO' && <button disabled={trabajando} onClick={() => cambiar('OBSERVADO')} style={botonGrande(COLOR.ambar, false)}>Marcar como observado</button>}
    </div>
  )
}

export const FinanzasMovil = () => (
  <Lista vista="prp_ingresos" titulo="Depósitos"
    buscar={['arrendatario_nombre', 'folio', 'locales_display', 'referencia_banco']}
    orden={{ col: 'fecha', asc: false }}
    filtros={[
      { id: 'porvalidar', label: 'Por validar', aplicar: q => q.eq('estatus_validacion', 'POR_VALIDAR') },
      { id: 'observados', label: 'Observados', aplicar: q => q.eq('estatus_validacion', 'OBSERVADO') },
      { id: 'validados', label: 'Validados', aplicar: q => q.eq('estatus_validacion', 'VALIDADO') },
    ]}
    tarjeta={(i, abrir) => {
      const [t, c] = estIng[i.estatus_validacion] || [i.estatus_validacion, COLOR.gris]
      return <TarjetaFila onClick={abrir} titulo={i.arrendatario_nombre || i.concepto_origen || i.tipo} subtitulo={`${fechaCorta(i.fecha)} · ${i.locales_display || i.tipo || '—'}`} derecha={dinero(i.importe_total || i.importe)} etiqueta={<Etiqueta texto={t} color={c} />} linea={i.comprobante_url ? '📎 con comprobante' : 'sin comprobante'} />
    }}
    detalle={(i, cerrar, recargar) => ({
      titulo: dinero(i.importe_total || i.importe), subtitulo: i.arrendatario_nombre || i.concepto_origen,
      contenido: <>
        {i.comprobante_url ? <Galeria bucket="facturas-cfdi" rutas={[i.comprobante_url]} /> : <Vacio texto="Sin comprobante adjunto" />}
        <div style={{ marginTop: 10 }}><Filas filas={[['Fecha', fecha(i.fecha)], ['Local(es)', i.locales_display], ['Contrato', i.folio], ['Forma de pago', i.forma_pago], ['Referencia', i.referencia_banco], ['Concepto', i.concepto_origen], ['Validó', i.validado_por], ['Nota', i.nota]]} /></div>
        <AccionesDeposito i={i} cerrar={cerrar} recargar={recargar} />
      </>,
    })} />
)

// ── Facturación: adjuntar CFDI a cobros validados ───────────────────────────
function DetalleFactura({ c, onActualizar }) {
  const [folio, setFolio] = useState(c.numero_factura || '')
  const [subiendo, setSubiendo] = useState(null)
  const pdf = useRef(), xml = useRef()

  const subir = async (file, campo) => {
    if (!file) return
    setSubiendo(campo)
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
      const ext = file.name.split('.').pop() || (campo === 'factura_url' ? 'pdf' : 'xml')
      const mime = file.type || (ext === 'zip' ? 'application/zip' : campo === 'factura_url' ? 'application/pdf' : 'application/xml')
      const resp = await llamarFuncion('subir-comprobante', { bucket: 'facturas-cfdi', path: `facturas/cargo-${c.id}/${campo === 'factura_url' ? 'factura' : 'cfdi'}.${ext}`, file_base64: b64, mime_type: mime, cargo_id: c.id, campo })
      if (!resp.ok) { const j = await resp.json().catch(() => ({})); toast.error('Error al subir: ' + (j.error || resp.status)) }
      else { toast.success(campo === 'factura_url' ? 'PDF adjunto' : 'ZIP/XML adjunto'); onActualizar() }
    } catch (e) { toast.error('Error: ' + e.message) }
    setSubiendo(null)
  }
  const guardarFolio = async () => {
    const { error } = await supabase.from('cargos_programados').update({ factura: folio.trim() || null }).eq('id', c.id)
    if (error) toast.error(error.message); else { toast.success('Folio guardado'); onActualizar() }
  }
  return (
    <>
      <Filas filas={[['Arrendatario', c.arrendatario_nombre], ['Local(es)', c.locales_display], ['Concepto', c.concepto], ['Periodo', c.periodo_mes ? `${MESES[c.periodo_mes - 1]} ${c.periodo_anio}` : null], ['Importe', dinero(c.importe)], ['Pagó', c.pago ? `${fecha(c.pago.fecha)} · ${c.pago.forma_pago || ''}` : null], ['Validó', c.pago?.validado_por]]} />
      <div style={{ margin: '14px 0 6px', fontSize: 12, fontWeight: 800, color: COLOR.gris, textTransform: 'uppercase' }}>Folio de factura</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={folio} onChange={e => setFolio(e.target.value)} placeholder="Folio" style={{ flex: 1, minWidth: 0, height: 46, border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '0 12px', fontSize: 16 }} />
        <button onClick={guardarFolio} disabled={folio === (c.numero_factura || '')} style={{ ...botonGrande(), width: 'auto', padding: '0 18px' }}>Guardar</button>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        <input ref={pdf} type="file" accept=".pdf,application/pdf" hidden onChange={e => { subir(e.target.files?.[0], 'factura_url'); e.target.value = '' }} />
        <input ref={xml} type="file" accept=".xml,.zip" hidden onChange={e => { subir(e.target.files?.[0], 'factura_xml_url'); e.target.value = '' }} />
        <button onClick={() => pdf.current.click()} disabled={!!subiendo} style={botonGrande(COLOR.azul, !c.factura_url)}>{subiendo === 'factura_url' ? 'Subiendo…' : c.factura_url ? 'Reemplazar PDF' : 'Adjuntar PDF'}</button>
        <button onClick={() => xml.current.click()} disabled={!!subiendo} style={botonGrande(COLOR.azul, !c.factura_xml_url)}>{subiendo === 'factura_xml_url' ? 'Subiendo…' : c.factura_xml_url ? 'Reemplazar ZIP/XML' : 'Adjuntar ZIP/XML'}</button>
        {(c.factura_url || c.factura_xml_url) && (
          <div style={{ display: 'flex', gap: 14, fontSize: 14 }}>
            {c.factura_url && <EnlacePrivado bucket="facturas-cfdi" valor={c.factura_url}>Ver PDF</EnlacePrivado>}
            {c.factura_xml_url && <EnlacePrivado bucket="facturas-cfdi" valor={c.factura_xml_url}>Ver ZIP/XML</EnlacePrivado>}
          </div>
        )}
      </div>
    </>
  )
}

export function FacturacionMovil() {
  const [cargos, setCargos] = useState(null)
  const [tab, setTab] = useState('PENDIENTES')
  const [sel, setSel] = useState(null)
  const [q, setQ] = useState('')

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('prp_cartera')
      .select('id, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, contrato_folio, arrendatario_nombre, locales_display, numero_factura, factura_url, factura_xml_url, tiene_factura')
      .in('estado', ['PAGADO', 'PARCIAL']).order('fecha_vencimiento', { ascending: false })
    if (error) { toast.error(error.message); setCargos([]); return }
    const ids = (data || []).map(c => c.id)
    const pagos = {}
    if (ids.length) {
      const { data: ap } = await supabase.from('aplicaciones_pago').select('cargo_id, ingresos(id, fecha, forma_pago, estatus_validacion, validado_por)').in('cargo_id', ids)
      for (const a of ap || []) if (a.ingresos && (!pagos[a.cargo_id] || a.ingresos.estatus_validacion === 'VALIDADO')) pagos[a.cargo_id] = a.ingresos
    }
    // Regla de negocio: solo se factura lo que Finanzas ya validó.
    setCargos((data || []).map(c => ({ ...c, pago: pagos[c.id] })).filter(c => c.pago?.estatus_validacion === 'VALIDADO'))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  if (!cargos) return <Pantalla><Cargando /></Pantalla>
  const f = q.trim().toLowerCase()
  const visibles = cargos.filter(c => (tab === 'PENDIENTES' ? !c.tiene_factura : c.tiene_factura) && (!f || `${c.arrendatario_nombre} ${c.locales_display} ${c.contrato_folio}`.toLowerCase().includes(f)))
  const pend = cargos.filter(c => !c.tiene_factura)
  const actual = sel ? cargos.find(c => c.id === sel) : null

  return (
    <Pantalla>
      <Rejilla>
        <Kpi etiqueta="Por facturar" valor={pend.length} sub={dinero(pend.reduce((s, c) => s + Number(c.importe || 0), 0))} color={COLOR.ambar} />
        <Kpi etiqueta="Facturados" valor={cargos.length - pend.length} color={COLOR.verde} />
      </Rejilla>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 8px' }}>
        {[['PENDIENTES', 'Por facturar'], ['FACTURADOS', 'Facturados']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, height: 38, borderRadius: 99, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid var(--color-primary)', background: tab === id ? 'var(--color-primary)' : 'white', color: tab === id ? 'white' : 'var(--color-primary)' }}>{l}</button>
        ))}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar arrendatario o local…" style={{ width: '100%', boxSizing: 'border-box', height: 44, border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '0 12px', fontSize: 16, marginBottom: 10 }} />
      {visibles.length === 0 && <Vacio />}
      <div style={{ display: 'grid', gap: 10 }}>
        {visibles.map(c => <TarjetaFila key={c.id} onClick={() => setSel(c.id)} titulo={c.arrendatario_nombre} subtitulo={`${c.locales_display || ''} · ${c.concepto} ${c.periodo_mes ? MESES[c.periodo_mes - 1] : ''}`} derecha={dinero(c.importe)} etiqueta={<Etiqueta texto={c.tiene_factura ? (c.numero_factura || 'Facturado') : 'Sin factura'} color={c.tiene_factura ? COLOR.verde : COLOR.ambar} />} />)}
      </div>
      {actual && <Hoja titulo={dinero(actual.importe)} subtitulo={actual.arrendatario_nombre} onCerrar={() => setSel(null)}><DetalleFactura c={actual} onActualizar={cargar} /></Hoja>}
    </Pantalla>
  )
}

// ── Restaurante: sus gastos, con foto del ticket ────────────────────────────
export const RestauranteMovil = () => {
  const ini = new Date(); ini.setDate(1)
  const desde = ini.toISOString().slice(0, 10)
  return (
    <Lista vista="restaurante_gastos" titulo="Gastos"
      buscar={['proveedor', 'descripcion', 'grupo_gasto', 'folio']}
      orden={{ col: 'fecha', asc: false }}
      filtros={[
        { id: 'mes', label: 'Este mes', aplicar: q => q.gte('fecha', desde) },
        { id: 'todos', label: 'Todos', aplicar: q => q },
      ]}
      resumen={filas => <div style={{ background: 'white', border: '1px solid #E5E7EB', borderLeft: `4px solid ${COLOR.rojo}`, borderRadius: 12, padding: '10px 14px', marginBottom: 10, fontSize: 13 }}>Suma de estos {filas.length}: <strong style={{ fontSize: 17 }}>{dinero(filas.reduce((a, g) => a + (Number(g.total) || 0), 0))}</strong></div>}
      tarjeta={(g, abrir) => <TarjetaFila onClick={abrir} titulo={g.proveedor || g.descripcion} subtitulo={`${fechaCorta(g.fecha)} · ${g.grupo_gasto || '—'}`} derecha={dinero(g.total)} etiqueta={g.tiene_factura ? <Etiqueta texto="Con factura" color={COLOR.verde} /> : null} />}
      detalle={g => ({
        titulo: dinero(g.total), subtitulo: g.proveedor,
        contenido: <>
          <Filas filas={[['Fecha', fecha(g.fecha)], ['Proveedor', g.proveedor], ['Razón social', g.razon_social], ['RFC', g.rfc], ['Folio', g.folio], ['Grupo', g.grupo_gasto], ['Descripción', g.descripcion], ['Subtotal', g.subtotal ? dinero(g.subtotal) : null], ['IVA', g.iva ? dinero(g.iva) : null], ['Notas', g.notas]]} />
          {g.ticket_url && <div style={{ marginTop: 12 }}><Galeria bucket="tickets-gastos" rutas={[g.ticket_url]} /></div>}
        </>,
      })} />
  )
}

// ── Expediente de un contrato (locatario: el suyo; staff: el que abra) ──────
export function ExpedienteMovil() {
  const { id: idRuta } = useParams()
  const { perfil } = useApp()
  const id = idRuta || perfil?.contrato_id
  const [c, setC] = useState(undefined)
  const [cargos, setCargos] = useState([])
  const [logo, setLogo] = useState(null)

  useEffect(() => {
    if (!id) return
    setC(undefined)
    Promise.all([
      supabase.from('prp_contratos').select('*').eq('id', id).maybeSingle(),
      supabase.from('prp_cartera').select('*').eq('contrato_id', id).order('fecha_vencimiento', { ascending: false }).limit(36),
      supabase.from('contratos').select('logo_url,arrendatario_id').eq('id', id).maybeSingle(),
    ]).then(async ([ct, ca, lg]) => {
      setC(ct.data || null); setCargos(ca.data || [])
      let l = lg.data?.logo_url
      if (!l && lg.data?.arrendatario_id) l = (await supabase.from('arrendatarios').select('logo_url').eq('id', lg.data.arrendatario_id).maybeSingle()).data?.logo_url
      setLogo(l || null)
    })
  }, [id])

  if (c === undefined) return <Pantalla><Cargando /></Pantalla>
  if (!c) return <Pantalla><Vacio texto="No se encontró el contrato" /></Pantalla>

  const hoy = hoyISO()
  const saldo = cargos.reduce((a, x) => a + Math.max(0, Number(x.saldo) || 0), 0)
  const vencido = cargos.filter(x => x.saldo > 0 && x.fecha_vencimiento < hoy).reduce((a, x) => a + Number(x.saldo), 0)
  const ini = c.fecha_inicio ? new Date(c.fecha_inicio).getTime() : null, fin = c.fecha_fin ? new Date(c.fecha_fin).getTime() : null
  const pct = ini && fin && fin > ini ? ((Date.now() - ini) / (fin - ini)) * 100 : 0

  return (
    <Pantalla>
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 18, padding: 16, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar src={logo} nombre={c.nombre_negocio || c.arrendatario_nombre} size={84} radio={22} /></div>
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 8 }}>{c.nombre_negocio || c.arrendatario_nombre}</div>
        <div style={{ fontSize: 13, color: COLOR.gris }}>{c.locales_display} · {c.folio}</div>
        <div style={{ margin: '12px 0 4px', fontSize: 26, fontWeight: 800, color: COLOR.azulOscuro }}>{dinero(c.renta_mensual)}<span style={{ fontSize: 13, color: COLOR.gris, fontWeight: 600 }}> / mes</span></div>
        <Barra pct={pct} color={c.dias_restantes != null && c.dias_restantes < 60 ? COLOR.ambar : COLOR.verde} />
        <div style={{ fontSize: 12, color: COLOR.gris, marginTop: 6 }}>{fecha(c.fecha_inicio)} → {fecha(c.fecha_fin)}{c.dias_restantes != null ? ` · ${c.dias_restantes} días restantes` : ''}</div>
      </div>

      <Seccion titulo="Mis pagos">
        <Rejilla>
          <Kpi etiqueta="Saldo por pagar" valor={dinero(saldo)} color={saldo ? COLOR.ambar : COLOR.verde} />
          <Kpi etiqueta="Vencido" valor={dinero(vencido)} color={vencido ? COLOR.rojo : COLOR.verde} alerta={!!vencido} />
        </Rejilla>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {cargos.map(x => {
            const venc = x.saldo > 0 && x.fecha_vencimiento < hoy
            const col = x.saldo <= 0 ? COLOR.verde : venc ? COLOR.rojo : COLOR.ambar
            return <TarjetaFila key={x.id} titulo={`${x.concepto} ${x.periodo_mes ? MESES[x.periodo_mes - 1] + ' ' + x.periodo_anio : ''}`} subtitulo={`Vence ${fechaCorta(x.fecha_vencimiento)}`} derecha={dinero(x.importe)} etiqueta={<Etiqueta texto={x.saldo <= 0 ? 'Pagado' : venc ? 'Vencido' : (x.estado === 'PARCIAL' ? 'Pago parcial' : 'Pendiente')} color={col} />} />
          })}
        </div>
      </Seccion>

      <Seccion titulo="Contrato">
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '4px 14px' }}>
          <Filas filas={[['Giro', c.giro_autorizado], ['Depósito', c.deposito_garantia ? dinero(c.deposito_garantia) : null], ['Día de pago', c.dia_pago], ['Penalización', c.penalizacion_pct != null ? `${c.penalizacion_pct}%` : null], ['Incremento anual', c.incremento_anual_pct != null ? `${c.incremento_anual_pct}%` : null]]} />
        </div>
      </Seccion>
    </Pantalla>
  )
}
