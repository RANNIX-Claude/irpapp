// tests/regresion/contrato_deposito_garantia.spec.ts
//
// Regresión de QA-Escenario01-H01: el constraint `cargos_programados_concepto_check`
// en QA no incluía `DEPOSITO_GARANTIA`, lo que rompía el alta de depósito en garantía
// (NuevoContratoModal.jsx, paso 15 de ESC-CONT-001). La corrección fue de
// infraestructura (aplicar supabase/migrations/20261001130000_deposito_garantia_concepto.sql
// a QA), no de código de aplicación — este spec cubre el camino feliz completo:
// crear contrato -> registrar depósito "ya cobrado" -> verificar las 3 filas resultantes.
//
// Antes de la corrección: el paso de "Registrar depósito" lanza
// `new row for relation "cargos_programados" violates check constraint
// "cargos_programados_concepto_check"` y el modal no cierra.
// Después de la corrección: el modal cierra sin error y las 3 filas (cargos_programados,
// ingresos, aplicaciones_pago) existen con concepto/tipo = 'DEPOSITO_GARANTIA'.
//
// Requiere `@playwright/test` instalado y un `playwright.config.ts` con `baseURL`
// apuntando al ambiente QA (https://irpapp-qa.netlify.app) — ninguno de los dos
// existe todavía en este repo (ver nota en el reporte de la corrida de corrección).

import { test, expect } from '@playwright/test'
import { Client } from 'pg'

const QA_DB = {
  host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co',
  user: 'postgres',
  password: process.env.QA_SUPABASE_DB_PASSWORD,
  port: 5432,
  database: 'postgres',
  ssl: { rejectUnauthorized: false } as const,
}

test.describe('ESC-CONT-001 / P15 — Alta de depósito en garantía (QA-Escenario01-H01)', () => {
  test('crea contrato, registra depósito cobrado y queda reflejado en cargos_programados / ingresos / aplicaciones_pago', async ({ page }) => {
    await page.goto('/contratos')
    await page.getByRole('button', { name: 'Nuevo Contrato' }).click()

    await page.getByLabel('Arrendatario *').selectOption({ index: 1 })
    await page.getByLabel('Local disponible *').selectOption({ index: 1 })
    await page.getByLabel('Renta mensual *').fill('10000')
    await page.getByLabel('Fecha inicio *').fill(new Date().toISOString().split('T')[0])

    await page.getByRole('button', { name: 'Crear Contrato' }).click()

    // Avanza a la pantalla de Depósito en Garantía dentro del mismo modal
    await expect(page.getByText('creado')).toBeVisible()
    await page.getByLabel('Fecha del depósito').fill(new Date().toISOString().split('T')[0])
    await page.getByLabel('Forma de cobro').selectOption('TRANSFERENCIA')
    await page.getByText('Ya fue cobrado').click()
    await page.getByRole('button', { name: 'Registrar depósito' }).click()

    // (a) el modal cierra sin error
    await expect(page.getByText('Registrando…')).toHaveCount(0)
    await expect(page.locator('text=/violates check constraint/')).toHaveCount(0)
    await expect(page.getByText('Nuevo Contrato')).toHaveCount(0)

    // Verificación en BD
    const c = new Client(QA_DB)
    await c.connect()
    try {
      const { rows: contratoRows } = await c.query(
        `SELECT id FROM public.contratos ORDER BY created_at DESC LIMIT 1`
      )
      const contratoId = contratoRows[0]?.id
      expect(contratoId).toBeTruthy()

      // (b) cargos_programados con concepto DEPOSITO_GARANTIA e importe = 2x renta
      const { rows: cargoRows } = await c.query(
        `SELECT id, concepto, importe FROM public.cargos_programados WHERE contrato_id = $1 AND concepto = 'DEPOSITO_GARANTIA'`,
        [contratoId]
      )
      expect(cargoRows).toHaveLength(1)
      expect(Number(cargoRows[0].importe)).toBeCloseTo(20000, 2)

      // (c) ingresos con tipo DEPOSITO_GARANTIA
      const { rows: ingresoRows } = await c.query(
        `SELECT id, tipo, importe FROM public.ingresos WHERE contrato_id = $1 AND tipo = 'DEPOSITO_GARANTIA'`,
        [contratoId]
      )
      expect(ingresoRows).toHaveLength(1)

      // (d) aplicaciones_pago que enlaza ambos
      const { rows: aplicacionRows } = await c.query(
        `SELECT importe_aplicado FROM public.aplicaciones_pago WHERE ingreso_id = $1 AND cargo_id = $2`,
        [ingresoRows[0].id, cargoRows[0].id]
      )
      expect(aplicacionRows).toHaveLength(1)
      expect(Number(aplicacionRows[0].importe_aplicado)).toBeCloseTo(20000, 2)
    } finally {
      await c.end()
    }
  })
})
