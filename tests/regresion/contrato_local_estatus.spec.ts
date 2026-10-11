// tests/regresion/contrato_local_estatus.spec.ts
//
// Regresión de QA-Escenario01-H04: al dar de alta un contrato con NuevoContratoModal,
// cat_locales.estatus del local usado no pasaba a 'OCUPADO' (ni se poblaba
// contrato_activo_id), a diferencia de renovar_contrato y guardarEdit (DetalleModal),
// que sí lo hacen. Decisión de negocio (PN-02, 2026-10-11): sí debe actualizarse.
//
// Antes de la corrección: tras el alta, `cat_locales.estatus` sigue en 'DISPONIBLE'
// y el local vuelve a aparecer en el select de "Local disponible" de un segundo
// "Nuevo Contrato".
// Después de la corrección: `cat_locales.estatus = 'OCUPADO'` y
// `contrato_activo_id` = id del contrato nuevo; el local ya no aparece en ese select.
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

test.describe('ESC-CONT-001 / P16 — cat_locales.estatus tras alta de contrato (QA-Escenario01-H04)', () => {
  test('el local usado queda OCUPADO y ya no aparece en el select de un segundo alta', async ({ page }) => {
    await page.goto('/contratos')
    await page.getByRole('button', { name: 'Nuevo Contrato' }).click()

    await page.getByLabel('Arrendatario *').selectOption({ index: 1 })
    const localSelect = page.getByLabel('Local disponible *')
    await localSelect.selectOption({ index: 1 })
    const localTexto = await localSelect.locator('option:checked').textContent()

    await page.getByLabel('Renta mensual *').fill('10000')
    await page.getByLabel('Fecha inicio *').fill(new Date().toISOString().split('T')[0])
    await page.getByRole('button', { name: 'Crear Contrato' }).click()
    await expect(page.getByText('creado')).toBeVisible()

    // Omitir el depósito (no es objeto de esta prueba) y cerrar el modal
    await page.getByRole('button', { name: 'Omitir' }).click()

    const c = new Client(QA_DB)
    await c.connect()
    try {
      const { rows: contratoRows } = await c.query(
        `SELECT id FROM public.contratos ORDER BY created_at DESC LIMIT 1`
      )
      const contratoId = contratoRows[0]?.id
      expect(contratoId).toBeTruthy()

      const { rows: localRows } = await c.query(
        `SELECT cl.estatus, cl.contrato_activo_id
         FROM public.cat_locales cl
         JOIN public.contratos_locales clc ON clc.local_id = cl.id_local
         WHERE clc.contrato_id = $1`,
        [contratoId]
      )
      expect(localRows).toHaveLength(1)
      expect(localRows[0].estatus).toBe('OCUPADO')
      expect(localRows[0].contrato_activo_id).toBe(contratoId)
    } finally {
      await c.end()
    }

    // Abrir un segundo "Nuevo Contrato": el local recién usado ya no debe aparecer
    await page.getByRole('button', { name: 'Nuevo Contrato' }).click()
    const opciones = await page.getByLabel('Local disponible *').locator('option').allTextContents()
    expect(opciones.some((o) => localTexto && o.trim() === localTexto.trim())).toBe(false)
  })
})
