-- ═══════════════════════════════════════════════════════════════
-- IRP — Histórico vending_semanas (45 registros)
-- Fuente: ingresos_estacionamiento_vending.xlsx
-- RANNIX Consulting · 2026-08-14
-- ═══════════════════════════════════════════════════════════════

-- ── Vending Machine semanal (45 registros) ───────────────────
INSERT INTO public.vending_semanas (semana_label, fecha_inicio, producto, venta_pesos, nota)
VALUES
  ('Semana 28','2025-06-28','CORTE_SEMANAL',1128,'Histórico Excel'),
  ('Semana 29','2025-07-05','CORTE_SEMANAL',668,'Histórico Excel'),
  ('Semana 30','2025-07-12','CORTE_SEMANAL',649,'Histórico Excel'),
  ('Semana 31','2025-07-26','CORTE_SEMANAL',1331,'Histórico Excel'),
  ('Semana 32','2025-08-02','CORTE_SEMANAL',837,'Histórico Excel'),
  ('Semana 33','2025-08-09','CORTE_SEMANAL',1221,'Histórico Excel'),
  ('Semana 34','2025-08-16','CORTE_SEMANAL',825,'Histórico Excel'),
  ('Semana 35','2025-08-23','CORTE_SEMANAL',770,'Histórico Excel'),
  ('Semana 36','2025-08-30','CORTE_SEMANAL',461,'Histórico Excel'),
  ('Semana 37','2025-09-06','CORTE_SEMANAL',603,'Histórico Excel'),
  ('Semana 38','2025-09-13','CORTE_SEMANAL',766,'Histórico Excel'),
  ('Semana 39','2025-09-20','CORTE_SEMANAL',803,'Histórico Excel'),
  ('Semana 41','2025-10-11','CORTE_SEMANAL',907,'Histórico Excel'),
  ('Semana 42','2025-10-18','CORTE_SEMANAL',135,'Histórico Excel'),
  ('Semana 43','2025-10-25','CORTE_SEMANAL',153,'Histórico Excel'),
  ('Semana 44','2025-11-01','CORTE_SEMANAL',932,'Histórico Excel'),
  ('Semana 45','2025-11-08','CORTE_SEMANAL',756,'Histórico Excel'),
  ('Semana 46','2025-11-15','CORTE_SEMANAL',287,'Histórico Excel'),
  ('Semana 47','2025-11-22','CORTE_SEMANAL',514,'Histórico Excel'),
  ('Semana 48','2025-11-29','CORTE_SEMANAL',314,'Histórico Excel'),
  ('Semana 49','2025-12-06','CORTE_SEMANAL',304,'Histórico Excel'),
  ('Semana 50','2025-12-13','CORTE_SEMANAL',218,'Histórico Excel'),
  ('Semana 51','2025-12-20','CORTE_SEMANAL',216,'Histórico Excel'),
  ('Semana 52','2025-12-27','CORTE_SEMANAL',474,'Histórico Excel'),
  ('Semana 1','2026-01-03','CORTE_SEMANAL',519,'Histórico Excel'),
  ('Semana 2','2026-01-10','CORTE_SEMANAL',636,'Histórico Excel'),
  ('Semana 3','2026-01-17','CORTE_SEMANAL',745,'Histórico Excel'),
  ('Semana 4','2026-01-24','CORTE_SEMANAL',399,'Histórico Excel'),
  ('Semana 5','2026-01-31','CORTE_SEMANAL',869,'Histórico Excel'),
  ('Semana 6','2026-02-07','CORTE_SEMANAL',546,'Histórico Excel'),
  ('Semana 7','2026-02-14','CORTE_SEMANAL',505,'Histórico Excel'),
  ('Semana 8','2026-02-21','CORTE_SEMANAL',563,'Histórico Excel'),
  ('Semana 9','2026-02-28','CORTE_SEMANAL',547,'Histórico Excel'),
  ('Semana 10','2026-03-07','CORTE_SEMANAL',636,'Histórico Excel'),
  ('Semana 11','2026-03-14','CORTE_SEMANAL',755,'Histórico Excel'),
  ('Semana 12','2026-03-21','CORTE_SEMANAL',738,'Histórico Excel'),
  ('Semana 13','2026-03-28','CORTE_SEMANAL',399,'Histórico Excel'),
  ('Semana 14','2026-04-04','CORTE_SEMANAL',585,'Histórico Excel'),
  ('Semana 15','2026-04-11','CORTE_SEMANAL',674,'Histórico Excel'),
  ('Semana 16','2026-04-18','CORTE_SEMANAL',1085,'Histórico Excel'),
  ('Semana 18','2026-05-02','CORTE_SEMANAL',804,'Histórico Excel'),
  ('Semana 19','2026-05-09','CORTE_SEMANAL',737,'Histórico Excel'),
  ('Semana 21','2026-05-23','CORTE_SEMANAL',458,'Histórico Excel'),
  ('Semana 22','2026-05-30','CORTE_SEMANAL',1285,'Histórico Excel'),
  ('Semana 23','2026-06-06','CORTE_SEMANAL',1445,'Histórico Excel')
ON CONFLICT DO NOTHING;