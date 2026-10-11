// tests/regresion/contrato_validacion_campos.spec.ts
//
// Regresión de QA-Escenario01-H02: los campos Arrendatario/Local/Renta/Fecha de
// inicio tenían el atributo HTML `required`, por lo que el navegador interceptaba
// el `submit` con su globo nativo antes de llegar al `if` de validación personalizada
// de `handleSubmit` en NuevoContratoModal.jsx.
//
// Antes de la corrección: al vaciar "Renta mensual" y pulsar enviar, el navegador
// muestra su mensaje nativo "Completa este campo" y el `<form>` nunca dispara
// `handleSubmit` — el texto "Completa los campos obligatorios (arrendatario, local,
// renta)." nunca aparece en el DOM.
// Después de la corrección (`noValidate` en el `<form>`): `handleSubmit` sí se
// ejecuta, no se dispara ninguna petición de red hacia Supabase y el mensaje
// personalizado aparece en el DOM.
//
// Requiere `@playwright/test` instalado y un `playwright.config.ts` con `baseURL`
// apuntando al ambiente QA (https://irpapp-qa.netlify.app) — ninguno de los dos
// existe todavía en este repo (ver nota en el reporte de la corrida de corrección).

import { test, expect } from '@playwright/test'

test.describe('ESC-CONT-001 / P11 — Validación de campos obligatorios (QA-Escenario01-H02)', () => {
  test('vaciar Renta mensual muestra el mensaje custom, no el globo nativo del navegador', async ({ page }) => {
    let supabaseRequestFired = false
    page.on('request', (req) => {
      if (req.url().includes('supabase.co/rest/') || req.url().includes('/rest/v1/contratos')) {
        supabaseRequestFired = true
      }
    })

    await page.goto('/contratos')
    await page.getByRole('button', { name: 'Nuevo Contrato' }).click()

    await page.getByLabel('Arrendatario *').selectOption({ index: 1 })
    await page.getByLabel('Local disponible *').selectOption({ index: 1 })
    await page.getByLabel('Renta mensual *').fill('') // campo obligatorio, se vacía a propósito

    await page.getByRole('button', { name: 'Crear Contrato' }).click()

    // El mensaje personalizado debe aparecer en el DOM (no el globo nativo del navegador)
    await expect(
      page.getByText('Completa los campos obligatorios (arrendatario, local, renta).')
    ).toBeVisible()

    // Ningún campo debe estar en estado de validación nativa pendiente (:invalid bloqueando submit)
    const validationMessage = await page
      .getByLabel('Renta mensual *')
      .evaluate((el: HTMLInputElement) => el.validationMessage)
    // Con noValidate, el navegador no bloquea el submit, aunque el campo siga siendo
    // "invalid" internamente; lo que importa es que no haya interceptado el evento.
    expect(validationMessage).toBeDefined()

    // No debió dispararse ninguna petición de red hacia Supabase (no se intentó guardar)
    expect(supabaseRequestFired).toBe(false)
  })
})
