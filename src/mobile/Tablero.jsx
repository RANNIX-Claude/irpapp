import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Building2, FileText, Wrench, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { menuMovil } from '../lib/menusMovil'
import { Pantalla, Kpi, Rejilla, Seccion, Cargando, Barra, COLOR, dineroK, dinero, MESES, hoyISO, inicioSemanaISO } from './kit'

const suma = (filas, col) => (filas || []).reduce((a, f) => a + (Number(f[col]) || 0), 0)

/** Tablero móvil: lo esencial de la plaza en mosaicos que llevan al detalle. */
export default function Tablero() {
  const navigate = useNavigate()
  const { perfil, user } = useApp()
  const rolId = perfil?.rol_id || user?.user_metadata?.rol_id
  const conChat = !!menuMovil(rolId, perfil).chat
  const [d, setD] = useState(null)

  useEffect(() => {
    const hoy = new Date(), anio = hoy.getFullYear(), mes = hoy.getMonth() + 1
    const iso = hoyISO(), lun = inicioSemanaISO()
    Promise.all([
      supabase.from('er_mensual').select('calc_real_total_ing,calc_real_total_gastos,calc_real_util_neta').eq('anio', anio).eq('mes', mes).maybeSingle(),
      supabase.from('prp_cartera').select('saldo,fecha_vencimiento').gt('saldo', 0).limit(2000),
      supabase.from('prp_mapa_locales').select('estatus'),
      supabase.from('prp_ingresos').select('importe').gte('fecha', lun).lte('fecha', iso),
      supabase.from('prp_gastos').select('monto').gte('fecha', lun).lte('fecha', iso),
      supabase.from('prp_contratos').select('dias_restantes').eq('estatus', 'VIGENTE').lte('dias_restantes', 60).gte('dias_restantes', 0),
      supabase.from('prp_mantenimiento').select('estatus').in('estatus', ['SOLICITADO', 'AUTORIZADO', 'EN_PROCESO']),
      supabase.from('prp_ingresos').select('importe').eq('estatus_validacion', 'POR_VALIDAR'),
    ]).then(([er, cart, mapa, ing, gas, venc, mant, porv]) => {
      const cartera = cart.data || []
      const vencida = cartera.filter(c => c.fecha_vencimiento && c.fecha_vencimiento < iso)
      const locales = mapa.data || []
      const ocupados = locales.filter(l => l.estatus === 'OCUPADO').length
      setD({
        mes, anio, er: er.data,
        porCobrar: suma(cartera, 'saldo'), vencida: suma(vencida, 'saldo'), nVencidos: vencida.length,
        ocupados, locales: locales.length,
        ingSemana: suma(ing.data, 'importe'), gasSemana: suma(gas.data, 'monto'),
        porVencer: (venc.data || []).length,
        mantAbiertas: (mant.data || []).length, porAutorizar: (mant.data || []).filter(m => m.estatus === 'SOLICITADO').length,
        porValidar: (porv.data || []).length, porValidarMonto: suma(porv.data, 'importe'),
      })
    })
  }, [])

  if (!d) return <Pantalla><Cargando /></Pantalla>

  const ing = Number(d.er?.calc_real_total_ing) || 0
  const gas = Number(d.er?.calc_real_total_gastos) || 0
  const util = Number(d.er?.calc_real_util_neta) ?? (ing - gas)
  const ocup = d.locales ? Math.round((d.ocupados / d.locales) * 100) : 0
  const ir = p => () => navigate(p)

  return (
    <Pantalla>
      {conChat && (
        <button onClick={ir('/')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, border: '1.5px solid var(--color-primary)', background: 'rgba(10,102,194,0.07)', borderRadius: 14, color: 'var(--color-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          <MessageCircle size={20} /> Pregúntale al asistente o mándale un documento
        </button>
      )}

      {/* Resultado del mes */}
      <button onClick={ir('/edr')} style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', border: 'none', borderRadius: 18, padding: 16, color: 'white', background: `linear-gradient(135deg, ${COLOR.azulOscuro}, ${COLOR.azul})` }}>
        <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 700 }}>{MESES[d.mes - 1].toUpperCase()} {d.anio} · UTILIDAD NETA</div>
        <div style={{ fontSize: 34, fontWeight: 800, margin: '4px 0 10px', color: util < 0 ? '#FCA5A5' : 'white' }}>{dinero(util)}</div>
        <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
          <span><TrendingUp size={13} style={{ verticalAlign: -2 }} /> Ingresos {dineroK(ing)}</span>
          <span><TrendingDown size={13} style={{ verticalAlign: -2 }} /> Gastos {dineroK(gas)}</span>
        </div>
        {ing > 0 && <div style={{ marginTop: 10 }}><Barra pct={(gas / ing) * 100} color="#FCD34D" /><div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Gastos = {Math.round((gas / ing) * 100)}% de los ingresos</div></div>}
      </button>

      <Seccion titulo="Cobranza">
        <Rejilla>
          <Kpi etiqueta="Por cobrar" valor={dineroK(d.porCobrar)} icono={Wallet} color={COLOR.azul} onClick={ir('/cobranza')} />
          <Kpi etiqueta="Vencido" valor={dineroK(d.vencida)} sub={`${d.nVencidos} cargos`} icono={AlertTriangle} color={d.vencida ? COLOR.rojo : COLOR.verde} alerta={!!d.vencida} onClick={ir('/cobranza')} />
        </Rejilla>
      </Seccion>

      <Seccion titulo="La semana">
        <Rejilla>
          <Kpi etiqueta="Ingresos" valor={dineroK(d.ingSemana)} icono={TrendingUp} color={COLOR.verde} onClick={ir('/ingresos')} />
          <Kpi etiqueta="Gastos" valor={dineroK(d.gasSemana)} icono={TrendingDown} color={COLOR.ambar} onClick={ir('/gastos-operativos')} />
        </Rejilla>
      </Seccion>

      <Seccion titulo="La plaza">
        <Rejilla>
          <Kpi etiqueta="Ocupación" valor={`${ocup}%`} sub={`${d.ocupados} de ${d.locales} locales`} icono={Building2} color={COLOR.azul} onClick={ir('/mapa-locales')} />
          <Kpi etiqueta="Contratos por vencer" valor={d.porVencer} sub="en 60 días" icono={FileText} color={d.porVencer ? COLOR.ambar : COLOR.verde} onClick={ir('/contratos')} />
          <Kpi etiqueta="Mantenimiento" valor={d.mantAbiertas} sub={d.porAutorizar ? `${d.porAutorizar} por autorizar` : 'abiertas'} icono={Wrench} color={d.porAutorizar ? COLOR.ambar : COLOR.azul} onClick={ir('/mantenimiento')} />
          <Kpi etiqueta="Por validar" valor={d.porValidar} sub={dineroK(d.porValidarMonto)} icono={Wallet} color={d.porValidar ? COLOR.ambar : COLOR.verde} onClick={ir('/ingresos')} />
        </Rejilla>
      </Seccion>
    </Pantalla>
  )
}
