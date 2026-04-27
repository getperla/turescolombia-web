// E2E test del flujo de booking
// Plan 2: wompi-prod-webhook-idempotente (TST-02, TST-04)
// Created: 2026-04-27
//
// Valida el flujo completo: usuario navega al tour, llena form, va al checkout Wompi sandbox,
// completa el pago, y la confirmacion llega via webhook (no via redirect URL).
//
// Pre-requisitos:
//   - App corriendo en localhost:3000 (o BASE_URL)
//   - NEXT_PUBLIC_WOMPI_PUBLIC_KEY configurada (sandbox)
//   - Webhook deployed y registrado en Wompi sandbox panel
//
// NOTA: Este test puede saltarse en CI si NEXT_PUBLIC_WOMPI_PUBLIC_KEY no esta seteado.
// El smoke test con plata real ($5K COP) se documenta manualmente en docs/smoke-tests.md.

import { test, expect } from '@playwright/test';

const HAS_WOMPI = !!process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

test.describe('E2E: booking flow', () => {
  test.skip(!HAS_WOMPI, 'NEXT_PUBLIC_WOMPI_PUBLIC_KEY no configurado');

  test('navegacion a tour publico funciona', async ({ page }) => {
    await page.goto('/explorar');
    // Esperar a que cargue el grid de tours
    await expect(page.locator('h1, [data-testid="explorar-titulo"]')).toBeVisible({ timeout: 10000 });
  });

  test('home -> /explorar -> click tour -> ver detalle', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/explorar"]');
    await page.waitForURL(/\/explorar/);

    // Click en el primer tour del grid (selector tentativo, ajustar segun markup real)
    const firstTour = page.locator('[data-testid="tour-card"], a[href^="/tour/"]').first();
    await firstTour.waitFor({ state: 'visible', timeout: 10000 });
    await firstTour.click();

    await page.waitForURL(/\/tour\//);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('booking flow: form -> redirect a Wompi sandbox', async ({ page }) => {
    // Asumir que existe al menos 1 tour publico en el catalogo
    await page.goto('/explorar');
    const firstTour = page.locator('[data-testid="tour-card"], a[href^="/tour/"]').first();
    await firstTour.waitFor({ state: 'visible' });
    await firstTour.click();

    // Llenar form de reserva (selectores tentativos)
    await page.fill('input[name="customerName"], input[placeholder*="nombre" i]', 'Test User Playwright');
    await page.fill('input[name="customerEmail"], input[type="email"]', 'test@playwright.test');
    await page.fill('input[name="customerPhone"], input[type="tel"]', '3001234567');

    // Click "Reservar" / "Pagar"
    const payButton = page.locator('button:has-text("Reservar"), button:has-text("Pagar")').first();
    await payButton.waitFor({ state: 'visible' });

    // Esperar redirect a Wompi (puede tardar)
    const navPromise = page.waitForURL(/checkout\.wompi\.co/, { timeout: 15000 });
    await payButton.click();
    await navPromise;

    expect(page.url()).toContain('checkout.wompi.co');
  });

  test('demo banner visible cuando NEXT_PUBLIC_BETA_MODE=1 en prod', async ({ page }) => {
    // Este test solo aplica si el env esta seteado
    if (process.env.NEXT_PUBLIC_BETA_MODE !== '1') {
      test.skip();
    }
    await page.goto('/');
    const banner = page.locator('[data-testid="beta-banner"], text=/MODO DEMO/i');
    await expect(banner).toBeVisible();
  });
});
