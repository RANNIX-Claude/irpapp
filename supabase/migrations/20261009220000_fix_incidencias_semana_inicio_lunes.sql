-- Fix datos: incidencias registradas en lunes cuyo semana_inicio quedó
-- una semana atrás por el bug de zona horaria en getLunes().
-- El error ocurre cuando fecha es lunes (isodow=1) y semana_inicio
-- apunta al lunes anterior (fecha - 7 días).

UPDATE rh_incidencias
SET semana_inicio = fecha
WHERE EXTRACT(isodow FROM fecha::date) = 1
  AND semana_inicio = (fecha::date - INTERVAL '7 days')::date;
