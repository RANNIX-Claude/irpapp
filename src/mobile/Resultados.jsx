import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Pantalla, Seccion, Cargando, Vacio, Barra, Kpi, COLOR, dinero, dineroK, fechaCorta, MESES } from './kit'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Resumen semanal: ingresos y gastos por día. */
export function ResumenSemanal() {
  const [semana, setSemana] = useState(0)   // 0 = esta semana, -1 = la anterior…
  const [d, setD] = useState(null)

  useEffect(() => {
    setD(null)
    const lun = new Date(); lun.setDate(lun.getDate() - ((lun.getDay() + 6) % 7) + semana * 7)
    const dom = new Date(lun); dom.setDate(dom.getDate() + 6)
    const a = lun.toISOString().slice(0, 10), b = dom.toISOString().slice(0, 10)
    Promise.all([
      supabase.from('prp_ingresos').select('fecha,importe').gte('fecha', a).lte('fecha', b),
      supabase.from('prp_gastos').select('fecha,monto').gte('fecha', a).lte('fecha', b),
    ]).then(([i, g]) => {
      const dias = DIAS.map((n, k) => {
        const f = new Date(lun); f.setDate(f.getDate() + k); const iso = f.toISOString().slice(0, 10)
        return {
          n,
          ing: (i.data || []).filter(x => x.fecha === iso).reduce((s, x) => s + (Number(x.importe) || 0), 0),
          gas: (g.data || []).filter(x => x.fecha === iso).reduce((s, x) => s + (Number(x.monto) || 0), 0),
        }
      })
      setD({ a, b, dias })
    })
  }, [semana])

  const ing = d?.dias.reduce((s, x) => s + x.ing, 0) || 0
  const gas = d?.dias.reduce((s, x) => s + x.gas, 0) || 0
  const max = Math.max(...(d?.dias || []).flatMap(x => [x.ing, x.gas]), 1)
  return (
    <Pantalla>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 6 }}>
        <button onClick={() => setSemana(s => s - 1)} style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer' }}><ChevronLeft /></button>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{d ? `${fechaCorta(d.a)} – ${fechaCorta(d.b)}` : '…'}</div>
        <button onClick={() => setSemana(s => Math.min(0, s + 1))} disabled={semana === 0} style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer', opacity: semana === 0 ? 0.3 : 1 }}><ChevronRight /></button>
      </div>
      {!d ? <Cargando /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <Kpi etiqueta="Ingresos" valor={dineroK(ing)} color={COLOR.verde} />
            <Kpi etiqueta="Gastos" valor={dineroK(gas)} color={COLOR.ambar} />
          </div>
          <Seccion titulo="Por día">
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '14px 12px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150 }}>
                {d.dias.map(x => (
                  <div key={x.n} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }}>
                    <div title={dinero(x.ing)} style={{ flex: 1, height: `${(x.ing / max) * 100}%`, minHeight: x.ing ? 3 : 0, background: COLOR.verde, borderRadius: '4px 4px 0 0' }} />
                    <div title={dinero(x.gas)} style={{ flex: 1, height: `${(x.gas / max) * 100}%`, minHeight: x.gas ? 3 : 0, background: COLOR.ambar, borderRadius: '4px 4px 0 0' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {d.dias.map(x => <div key={x.n} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLOR.gris }}>{x.n}</div>)}
              </div>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, fontSize: 12 }}>
                <span style={{ color: COLOR.verde }}>■ Ingresos</span><span style={{ color: COLOR.ambar }}>■ Gastos</span>
              </div>
            </div>
          </Seccion>
        </>
      )}
    </Pantalla>
  )
}

const INGRESOS = [
  ['Rentas', 'calc_real_total_rentas'], ['Estacionamiento', 'calc_real_total_estac'], ['Pensiones', 'calc_real_total_pension'],
  ['Vending', 'calc_real_total_maq'], ['Agua', 'calc_real_total_agua_i'],
]
const GASTOS = [
  ['Sueldos', 'real_sueldos'], ['Fondo revolvente', 'real_fondo_revolvente'], ['Excedente', 'real_gasto_excedente'],
  ['Luz', 'real_luz'], ['Agua', 'real_agua_gastos'], ['Otros', 'real_otros_gastos'],
]

function Bloque({ titulo, filas, total, color, r }) {
  const max = Math.max(...filas.map(([, c]) => Number(r[c]) || 0), 1)
  return (
    <Seccion titulo={titulo}>
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '6px 14px 12px' }}>
        {filas.map(([n, c]) => {
          const v = Number(r[c]) || 0
          return (
            <div key={c} style={{ padding: '9px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}><span>{n}</span><strong>{dinero(v)}</strong></div>
              <Barra pct={(v / max) * 100} color={color} alto={6} />
            </div>
          )
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontSize: 15, fontWeight: 800, color }}><span>Total</span><span>{dinero(total)}</span></div>
      </div>
    </Seccion>
  )
}

/** Estado de resultados del mes, de solo lectura, por bloques con barras. */
export default function Resultados() {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [r, setR] = useState(undefined)

  useEffect(() => {
    setR(undefined)
    supabase.from('er_mensual').select('*').eq('anio', anio).eq('mes', mes).maybeSingle().then(({ data }) => setR(data || null))
  }, [anio, mes])

  const mover = d => {
    let m = mes + d, a = anio
    if (m < 1) { m = 12; a-- } else if (m > 12) { m = 1; a++ }
    setMes(m); setAnio(a)
  }
  const util = r ? Number(r.calc_real_util_neta) || 0 : 0

  return (
    <Pantalla>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 6 }}>
        <button onClick={() => mover(-1)} style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer' }}><ChevronLeft /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{MESES[mes - 1]} {anio}</div>
          {r?.status && <div style={{ fontSize: 11, color: COLOR.gris, textTransform: 'uppercase' }}>{r.status}</div>}
        </div>
        <button onClick={() => mover(1)} style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer' }}><ChevronRight /></button>
      </div>

      {r === undefined && <Cargando />}
      {r === null && <Vacio texto="Este mes todavía no tiene estado de resultados" />}
      {r && (
        <>
          <div style={{ marginTop: 12, borderRadius: 18, padding: 16, color: 'white', background: util >= 0 ? COLOR.verde : COLOR.rojo }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>UTILIDAD NETA</div>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{dinero(util)}</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Ingresos {dinero(r.calc_real_total_ing)} · Gastos {dinero(r.calc_real_total_gastos)}</div>
          </div>
          <Bloque titulo="Ingresos" filas={INGRESOS} total={r.calc_real_total_ing} color={COLOR.verde} r={r} />
          <Bloque titulo="Gastos" filas={GASTOS} total={r.calc_real_total_gastos} color={COLOR.rojo} r={r} />
        </>
      )}
    </Pantalla>
  )
}
