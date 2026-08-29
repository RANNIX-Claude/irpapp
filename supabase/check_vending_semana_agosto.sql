-- 1. Ver la semana Aug 15-21 y su estado actual
SELECT id, semana_inicio, semana_fin, estado, venta_pesos, venta_unidades
FROM vending_semanas
WHERE semana_inicio = '2026-08-15' AND semana_fin = '2026-08-21';

-- 2. Productos activos con sus precios
SELECT id, producto, precio_venta, costo_caja, unidades_caja, activo
FROM vending_productos
WHERE activo = true
ORDER BY producto;

-- 3. Movimientos ya registrados en esa semana
SELECT vm.tipo, vp.producto, vm.cantidad, vm.precio_unitario,
       (vm.cantidad * vm.precio_unitario) AS subtotal, vm.fecha
FROM vending_movimientos vm
JOIN vending_productos vp ON vp.id = vm.producto_id
JOIN vending_semanas vs ON vs.id = vm.semana_id
WHERE vs.semana_inicio = '2026-08-15'
ORDER BY vm.fecha, vp.producto;

-- 4. Totales actuales por producto en esa semana
SELECT vp.producto, vsp.qty_ventas, vsp.importe_ventas, vsp.qty_compras, vsp.importe_compras
FROM vending_semana_producto vsp
JOIN vending_semanas vs ON vs.id = vsp.semana_id
JOIN vending_productos vp ON vp.id = vsp.producto_id
WHERE vs.semana_inicio = '2026-08-15'
ORDER BY vp.producto;
