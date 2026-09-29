# Guía de operación — Módulo Vending

IRP · Ruta `/vending` · Versión 2026-09-29

Guía práctica para operar el módulo semana a semana. Para el detalle de cálculos y ejemplos, ver `manual-vending.md`.

**Regla de oro:** cuenta → compra → vende → corta. La semana va de **sábado a viernes**.

---

## A. Antes de empezar (una sola vez)

- [ ] **Catálogo → Nuevo producto** para cada producto: nombre, costo por caja, unidades por caja, precio de venta, proveedor.
- [ ] Verifica que todos tengan **costo por caja**. Sin costo, la utilidad sale igual a la venta.
- [ ] En **Control Semanal**, elige la semana actual. Si dice "Semana sin datos", pulsa **Iniciar semana**.
- [ ] Haz el **Conteo físico** inicial (ver B1).

---

## B. Cada semana

### B1. Sábado — abrir la semana y contar

1. Entra a **Vending → Control Semanal** y elige la semana en curso (botón **Hoy**).
2. Pulsa **📦 Conteo físico**.
3. Cuenta lo que hay en la máquina y la bodega. Captura el número en **Conteo físico**.
4. Revisa la columna **Diferencia**:
   - negativa (rojo) = falta producto (merma);
   - positiva (verde) = sobra producto (compra o conteo sin registrar).
5. Si hay diferencias, escribe el **motivo** (merma, caducidad, robo, error de captura).
6. Pulsa **Confirmar conteo físico**. Los productos contados quedan con ✓.

> El botón solo existe mientras la semana está **abierta**.

### B2. Cuando llega mercancía — registrar compra

1. **+ Movimiento** → pestaña **Compra**.
2. Producto, fecha, **cantidad** (unidades, no cajas) y **costo por unidad**.
3. Si esta compra salió más cara o barata que el catálogo, **cambia el costo**: así el costo promedio de la semana refleja lo real.
4. Proveedor y nota (opcional) → **Guardar COMPRA**.

### B3. Durante y al final de la semana — registrar ventas

**Carga en Bloque** (la forma normal):
1. Pulsa **Carga en Bloque**.
2. Sube la **foto del reporte** de la máquina (📷) o escribe las unidades vendidas por producto.
3. Revisa los productos que el sistema no reconoció (aviso "Sin match").
4. **Registrar unidades**.

**Venta suelta:** **+ Movimiento** → **Venta**, con producto, cantidad y precio.

> Si cambió el precio de venta esta semana, captúralo en la venta. Solo afecta a esta semana; el catálogo no cambia.

### B4. Revisar el control

Mira **Vista Extendida** en Control Semanal:

| Revisa | Señal de problema |
|---|---|
| **Inventario** | Negativo → falta una compra o un conteo |
| **Costo prom.** | Muy distinto al costo del catálogo → revisa el costo capturado en la compra |
| **Util sem** | Igual a la venta → el producto no tiene costo |
| **Semanas** (cobertura) | Menor a 1 en rojo → hay que comprar ya |

### B5. Viernes — hacer el corte

1. Verifica que estén todas las compras y ventas de la semana.
2. Pulsa **Hacer Corte**. La semana queda **cerrada** y sus números se congelan.
3. Se muestra la **lista de compras sugerida** (los productos con menos semanas de cobertura primero). Úsala para el pedido.
4. La semana siguiente se abre sola con el inventario y el costo arrastrados.

> Si nadie hace el corte, el sistema cierra las semanas vencidas al entrar al módulo.

---

## C. Corregir errores

| Qué pasó | Qué hacer |
|---|---|
| Capturé mal una compra o venta | **Movimientos** → ✏️ editar o 🗑 eliminar (semana abierta). El sistema revierte el efecto. |
| Conté mal el inventario inicial | **📦 Conteo físico** → vuelve a capturar y confirmar (semana abierta). |
| Se me pasó una compra | Regístrala con su fecha real dentro de la semana. |
| Error en una semana **cerrada** | No se edita. Corrígelo con el **Conteo físico** de la semana siguiente y anota el motivo. |
| Inventario negativo | Falta una compra o conteo. Registra la compra o cuenta de nuevo. |
| Producto nuevo a mitad de semana | **+ Producto** en el catálogo; aparece en la semana abierta. |
| Producto que ya no se vende | **Catálogo** → 🗑 (lo da de baja, no borra su historial). |

---

## D. Calendario resumido

| Día | Acción |
|---|---|
| Sábado | Conteo físico y confirmar |
| Durante la semana | Registrar cada compra al recibirla |
| Cuando se recolecta el reporte | Carga en Bloque de ventas |
| Viernes | Revisar → Hacer Corte → usar lista de compras |

---

## E. Qué números se ven en otros módulos

Al cerrar y sincronizar la semana, la venta y la utilidad de Vending alimentan **Resumen Semanal** y el **EDR**. Por eso conviene capturar completo antes del corte.

---

## F. Permisos

Todo el personal con acceso administrativo puede operar el módulo. El rol `restaurante` y los locatarios **no** tienen acceso.
