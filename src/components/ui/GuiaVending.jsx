// Guía de operación del módulo Vending, dentro de la app (misma información que docs/guia-operacion-vending.md).
const AZUL = 'var(--color-primary-dark)'

const PASOS_SEMANA = [
  { n: 1, dia: 'Sábado', titulo: 'Abrir la semana y contar', color: '#0A66C2', items: [
    'Control Semanal → elige la semana en curso (botón Hoy).',
    'Pulsa “📦 Conteo físico” y captura lo que realmente hay en la máquina y la bodega.',
    'Revisa la columna Diferencia: negativa = merma, positiva = sobrante. Escribe el motivo.',
    'Pulsa “Confirmar conteo físico”. Los productos contados quedan con ✓.',
  ] },
  { n: 2, dia: 'Al recibir mercancía', titulo: 'Registrar compras', color: '#057642', items: [
    '+ Movimiento → Compra.',
    'Producto, fecha, cantidad en unidades (no cajas) y costo por unidad.',
    'Si salió más cara o barata que el catálogo, cambia el costo: así el costo promedio refleja lo real.',
  ] },
  { n: 3, dia: 'Al recolectar el reporte', titulo: 'Registrar ventas', color: '#057642', items: [
    'Carga en Bloque: sube la foto del reporte de la máquina o escribe las unidades por producto.',
    'Revisa los productos que el sistema no reconoció (“Sin match”).',
    'Si cambió el precio esta semana, captúralo en la venta; solo afecta a esta semana.',
  ] },
  { n: 4, dia: 'Antes del corte', titulo: 'Revisar el control', color: '#6B7280', items: [
    'Vista Extendida: sin inventarios negativos, Costo prom. razonable, Util sem distinta de la venta.',
    'Semanas de cobertura menor a 1 (rojo): hay que comprar ya.',
  ] },
  { n: 5, dia: 'Viernes', titulo: 'Hacer el corte', color: '#B45309', items: [
    'Pulsa “Hacer Corte”: la semana se cierra y sus números se congelan.',
    'Usa la lista de compras sugerida para el pedido.',
    'La semana siguiente abre sola con el inventario y el costo arrastrados.',
  ] },
]

const ERRORES = [
  ['Capturé mal una compra o venta', 'Movimientos → ✏️ editar o 🗑 eliminar (semana abierta). El sistema revierte el efecto.'],
  ['Conté mal el inventario inicial', 'Vuelve a “Conteo físico” y confirma de nuevo (semana abierta).'],
  ['Error en una semana cerrada', 'No se edita. Corrígelo en el conteo físico de la semana siguiente y anota el motivo.'],
  ['Inventario negativo', 'Falta una compra o un conteo: regístrala o cuenta de nuevo.'],
  ['Utilidad igual a la venta', 'El producto no tiene costo: captúralo en el catálogo o en la compra.'],
  ['Producto que ya no se vende', 'Catálogo → 🗑 (lo da de baja; el historial se conserva).'],
]

const card = { background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden' }

export default function GuiaVending() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div style={{ ...card, padding: '16px 20px', borderLeft: '4px solid var(--color-secondary)' }}>
        <div style={{ fontWeight: 800, fontSize: '15px', color: AZUL, marginBottom: '4px' }}>Cuenta → compra → vende → corta</div>
        <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.6 }}>
          La semana va de <strong>sábado a viernes</strong>. El inventario final de una semana es el inicial de la siguiente,
          pero <strong>el conteo físico manda</strong> sobre el arrastre. El precio y el costo son propios de cada semana:
          cambiar el catálogo no modifica semanas pasadas.
        </div>
      </div>

      <div style={card}>
        <div style={{ padding: '12px 16px', background: '#1A3C5E', color: 'white', fontWeight: 800, fontSize: '13px' }}>Para arrancar (una sola vez)</div>
        <ul style={{ margin: 0, padding: '14px 16px 14px 34px', fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
          <li>Catálogo: cada producto con <strong>costo por caja</strong>, unidades por caja y precio de venta. Sin costo, la utilidad sale igual a la venta.</li>
          <li>Control Semanal: si la semana dice “Semana sin datos”, pulsa <strong>Iniciar semana</strong>.</li>
          <li>Haz el <strong>Conteo físico</strong> inicial: corrige los negativos que arrastra el sistema.</li>
          <li>Registra las compras y ventas de la semana que ya transcurrió, salvo las anteriores al conteo (ya están incluidas en él).</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
        {PASOS_SEMANA.map(p => (
          <div key={p.n} style={{ ...card, borderTop: `3px solid ${p.color}` }}>
            <div style={{ padding: '12px 16px 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: p.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>{p.n}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#111827' }}>{p.titulo}</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>{p.dia}</div>
              </div>
            </div>
            <ul style={{ margin: 0, padding: '8px 16px 14px 34px', fontSize: '12.5px', color: '#374151', lineHeight: 1.65 }}>
              {p.items.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ padding: '12px 16px', background: '#1A3C5E', color: 'white', fontWeight: 800, fontSize: '13px' }}>Cómo se calcula la utilidad</div>
        <div style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
          <div style={{ fontFamily: 'Consolas, monospace', fontSize: '12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px' }}>
            Costo prom. = (inicial × costo + importe de compras) ÷ (inicial + compras)<br />
            Utilidad = venta real − unidades vendidas × costo prom.
          </div>
          Ejemplo: abren con 10 galletas a $10 y compras 20 a $11 → costo promedio <strong>$10.67</strong>. Vendes 25 a $20:
          venta $500, costo $266.7, utilidad <strong>$233.3</strong>. Las 5 que sobran pasan a la semana siguiente a $10.67.
        </div>
      </div>

      <div style={card}>
        <div style={{ padding: '12px 16px', background: '#1A3C5E', color: 'white', fontWeight: 800, fontSize: '13px' }}>Si algo sale mal</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {ERRORES.map(([q, a], i) => (
              <tr key={q} style={{ background: i % 2 ? '#FAFAFA' : 'white', borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 16px', fontWeight: 700, color: '#374151', width: '32%', verticalAlign: 'top' }}>{q}</td>
                <td style={{ padding: '10px 16px', color: '#4B5563' }}>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
