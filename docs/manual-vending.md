# Manual de operación — Vending

IRP · RANNIX Consulting · Actualizado 2026-09-29

Este manual explica cómo se lleva el control de la máquina de vending, semana por semana: desde la carga inicial hasta el corte. Al final está el detalle de cómo se calculan el costo y la utilidad.

---

## 1. Idea general

- La semana de vending va de **sábado a viernes**. Cada semana tiene un renglón por producto.
- Cada renglón sigue una sola fórmula: **Inventario final = Inicial + Compras − Ventas**.
- El **inventario final de una semana es el inicial de la siguiente**. Se arrastra solo, pero **el conteo físico manda** sobre el arrastre.
- El **precio de venta** y el **costo** son propios de cada semana. Cambiar el catálogo no modifica semanas pasadas.
- La **utilidad** depende de lo que realmente se vendió y del costo promedio de esa semana.

```
Semana N (cerrada)              Semana N+1 (abierta)
┌──────────────────┐            ┌──────────────────────────────┐
│ inicial          │            │ inicial  ← final de N        │
│ + compras        │  arrastre  │          ← ajustado por el   │
│ − ventas         │ ─────────► │            conteo físico     │
│ = FINAL          │  (qty+costo)│ + compras − ventas = FINAL  │
│ costo promedio   │            │ costo inicial ← costo prom N │
└──────────────────┘            └──────────────────────────────┘
```

---

## 2. Carga inicial (arranque del sistema o de un producto nuevo)

Se hace **una sola vez**, al empezar a usar el módulo o al dar de alta un producto.

1. **Catálogo → Nuevo producto.** Captura nombre, costo por caja, unidades por caja, precio de venta y proveedor. El sistema calcula el costo por unidad y el margen.
2. Abre **Control Semanal** y elige la semana actual. Si no existe, pulsa **Iniciar semana**: se crea un renglón por cada producto activo.
3. Pulsa **📦 Conteo físico**. Cuenta lo que hay realmente en la máquina y en la bodega, y captura la cantidad de cada producto.
4. Confirma. Ese conteo queda como **inventario inicial** de la semana y el sistema toma el costo de catálogo como costo de arranque.

> Si un producto no tiene costo en el catálogo, la utilidad de sus ventas sale igual a la venta. Captura el costo por caja antes de empezar.

---

## 3. Ciclo semanal (lo que se hace cada semana)

### Paso 1 — Abrir la semana y contar (sábado)

La semana nueva se crea sola con el corte de la anterior. Cada producto arranca con el **inventario teórico**, es decir, el final de la semana pasada.

1. Entra a **Control Semanal** → **📦 Conteo físico**.
2. Cuenta lo que hay y captura el **Conteo físico** de cada producto. La columna **Diferencia** muestra la variación contra el teórico.
3. Si hay diferencias, escribe un **motivo** (merma, caducidad, error de captura, robo).
4. Pulsa **Confirmar conteo físico**.

Resultado:
- El inicial queda con el número contado y se marca con ✓.
- La diferencia queda guardada como ajuste de esa semana. Es el registro de mermas y sobrantes.
- Ya no se sobrescribe si la semana anterior se corrige después.

### Paso 2 — Registrar compras (durante la semana)

Cada vez que llega mercancía:

1. **+ Movimiento** → tipo **Compra**.
2. Elige producto, fecha, cantidad, **costo por unidad** y proveedor. El costo se sugiere del catálogo; **captúralo real** si esta compra salió más cara o más barata.
3. Guarda. El inventario sube y el **costo promedio** de la semana se recalcula.

### Paso 3 — Registrar ventas

Hay dos formas:

- **Carga en Bloque:** para el reporte de la máquina. Puedes **importar la foto del reporte** (lectura automática) o escribir las unidades vendidas por producto. Es la forma normal.
- **+ Movimiento → Venta:** para una venta suelta.

El **precio de venta** lo define el administrador y es el que se guarda en la venta. Si cambia el precio esta semana, se captura el nuevo precio y solo afecta a esta semana.

### Paso 4 — Revisar el control

En **Control Semanal** revisa por producto:

| Columna | Qué significa |
|---|---|
| Inv. inicial | Con lo que abrió la semana (✓ = contado físicamente) |
| Compras | Unidades compradas |
| Costo prom. | Costo promedio ponderado de la semana |
| Vta Uds | Unidades vendidas |
| Inventario | Inventario final |
| Venta $$ | Ingreso de la semana |
| Util sem | Utilidad de la semana |
| % Inv | Inventario contra la capacidad de una caja |
| Semanas | Cuántas semanas alcanza el inventario al ritmo de venta |

Un inventario **negativo** casi siempre significa una compra o un conteo sin registrar. El sistema avisa al guardar.

### Paso 5 — Corte (viernes / al cierre)

1. Pulsa **Hacer Corte**. La semana pasa a **Cerrada**: sus números quedan congelados.
2. Aparece la **lista de compras sugerida**, ordenada por cuántas semanas de inventario quedan.
3. Se abre la semana siguiente, con el final de esta como inicial y el costo promedio como costo inicial.

Si nadie pulsa el corte, el sistema cierra automáticamente las semanas vencidas al entrar al módulo.

---

## 4. Cómo se calculan el costo y la utilidad

Los productos se compran a precios distintos con el tiempo (una remesa de galletas a $10, otra a $11). No se puede saber qué lote se vendió, así que se usa el **costo promedio ponderado**:

```
Costo promedio = (inicial × costo inicial + importe de compras) ÷ (inicial + compras)
Utilidad       = venta real − unidades vendidas × costo promedio
```

**Ejemplo (galletas).** Abren con 10 piezas a $10. Compras 20 a $11.
- Costo promedio = (10 × 10 + 20 × 11) ÷ 30 = **$10.67**.
- Vendes 25 a $20 → venta $500, costo $266.7, **utilidad $233.3**.
- Sobran 5 piezas, que pasan a la semana siguiente con costo **$10.67**.

Así el costo se va "diluyendo" de forma natural, sin rastrear lotes.

**Qué NO hace:** no reescribe semanas cerradas. Si hoy cambias el costo o el precio en el catálogo, solo cuenta para compras y semanas nuevas.

---

## 5. Mermas y diferencias

- Cada conteo físico registra su **diferencia** contra el teórico y el motivo.
- Una diferencia **negativa** es merma (falta producto). Una **positiva** es sobrante (hubo una compra sin registrar o un conteo previo mal hecho).
- Si aparecen mermas seguidas del mismo producto, revisa robo, caducidad o fallas de la máquina.

---

## 6. Errores comunes

| Situación | Qué hacer |
|---|---|
| Inventario negativo | Falta registrar una compra o el conteo inicial. Registra la compra o cuenta de nuevo. |
| Me equivoqué en un movimiento | En **Movimientos**, edita (✏️) o elimina (🗑) mientras la semana esté abierta. El sistema revierte el efecto. |
| Conté mal el inventario inicial | Vuelve a **Conteo físico** y confirma de nuevo (solo mientras la semana esté abierta). |
| La semana ya está cerrada | Los números quedan congelados. Cualquier ajuste va como diferencia en el conteo de la semana siguiente. |
| Utilidad igual a la venta | El producto no tiene costo. Captúralo en el catálogo o en la compra. |

---

## 7. Resumen en una línea

**Cuenta → compra → vende → corta.** El conteo físico ancla la semana; el costo promedio congela el margen; el corte lo cierra y lo arrastra.
