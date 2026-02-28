/**
 * Features 1-6 E2E Tests (Sessions 27-28)
 *
 * Tests the six features shipped in sessions 27-28:
 *   1. Recursive Audit Loop          -- audit endpoint + Configure UI toggle
 *   2. Linguistic Evolution Tree     -- /evolution-tree endpoint + Dictionary tab
 *   3. Echo Chamber Detector         -- Configure UI section present
 *   4. Collaboration Chemistry Card  -- /chemistry endpoint contract + Analytics render
 *   5. Model Pairing Oracle          -- /pairing-oracle endpoint + Configure UI
 *   6. Recursive Adversarial Mode    -- Configure UI section + /agendas endpoint contract
 *
 * These tests use static DB data (no LLM calls required).
 * Prerequisites: both servers running.
 *   Backend:  .venv\Scripts\python.exe -m uvicorn server.app:app --reload --port 8000
 *   Frontend: (in ui/) npm run dev
 *
 * Run: npm run test:e2e -- features-1-6
 *
 * Selector notes:
 *   - text=// foo  is treated by Playwright as a regex (// = delimiters, foo = flags).
 *     Use :has-text("foo") on the element class instead.
 *   - Dictionary has no .neural-card; wait for the tab buttons to confirm page load.
 */

import { test, expect } from '@playwright/test'
import { findAny, findCompleted } from './helpers'

const API = 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Feature 5: Model Pairing Oracle -- API contract
// ---------------------------------------------------------------------------
test('Oracle API: /pairing-oracle returns an array (even when empty)', async ({ request }) => {
  const res = await request.get(`${API}/experiments/pairing-oracle`)
  // 200 with an array -- empty is fine when no paired chemistry data exists yet
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
})

test('Oracle API: /pairing-oracle accepts preset filter without erroring', async ({ request }) => {
  const res = await request.get(`${API}/experiments/pairing-oracle?preset=conlang`)
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
})

// ---------------------------------------------------------------------------
// Feature 2: Linguistic Evolution Tree -- API contract
// ---------------------------------------------------------------------------
test('Evolution tree API: returns {tree, depth} for any experiment', async ({ request }) => {
  const exp = await findAny(request)
  if (!exp) {
    test.skip(true, 'No experiments in DB')
    return
  }

  const res = await request.get(`${API}/experiments/${exp.id}/evolution-tree`)
  expect(res.ok()).toBeTruthy()
  const body = await res.json()

  // Must have a tree array and a numeric depth
  expect(Array.isArray(body.tree)).toBe(true)
  expect(typeof body.depth).toBe('number')

  // Root node is always the experiment itself
  expect(body.tree.length).toBeGreaterThanOrEqual(1)
  expect(body.tree[0].id).toBe(exp.id)
})

// ---------------------------------------------------------------------------
// Feature 4: Collaboration Chemistry Card -- API contract
// ---------------------------------------------------------------------------
test('Chemistry API: returns 200 or 404 (not 500) for a completed experiment', async ({ request }) => {
  const exp = await findCompleted(request)
  if (!exp) {
    test.skip(true, 'No completed experiments')
    return
  }

  const res = await request.get(`${API}/experiments/${exp.id}/chemistry`)

  if (res.ok()) {
    // Chemistry was computed -- validate shape
    const body = await res.json()
    expect(typeof body.initiative_a).toBe('number')
    expect(typeof body.initiative_b).toBe('number')
    expect(typeof body.influence_a_on_b).toBe('number')
    expect(typeof body.influence_b_on_a).toBe('number')
    expect(typeof body.convergence_rate).toBe('number')
    expect(typeof body.surprise_index).toBe('number')
  } else {
    // Not computed yet -- must be 404, never 500
    expect(res.status()).toBe(404)
  }
})

// ---------------------------------------------------------------------------
// Feature 1: Recursive Audit Loop -- API contract
// ---------------------------------------------------------------------------
test('Audit API: returns 200 or 404 (not 500) for a completed experiment', async ({ request }) => {
  const exp = await findCompleted(request)
  if (!exp) {
    test.skip(true, 'No completed experiments')
    return
  }

  const res = await request.get(`${API}/experiments/${exp.id}/audit`)
  expect([200, 404]).toContain(res.status())

  if (res.ok()) {
    const body = await res.json()
    expect(typeof body.audit_experiment_id).toBe('string')
  }
})

// ---------------------------------------------------------------------------
// Feature 6: Recursive Adversarial Mode -- API contract
// ---------------------------------------------------------------------------
test('Agendas API: returns 200/403/404 (not 500) for completed experiments', async ({ request }) => {
  const exp = await findCompleted(request)
  if (!exp) {
    test.skip(true, 'No completed experiments')
    return
  }

  const res = await request.get(`${API}/experiments/${exp.id}/agendas`)
  // Non-adversarial -> 404 | pre-revelation -> 403 | post-revelation -> 200
  expect([200, 403, 404]).toContain(res.status())

  if (res.ok()) {
    const body = await res.json()
    expect(Array.isArray(body.hidden_goals)).toBe(true)
  }
})

// ---------------------------------------------------------------------------
// Configure page: Features 3, 6, 1, 5 -- UI sections present
// NOTE: text='// label' triggers Playwright regex parsing; use :has-text() instead.
// ---------------------------------------------------------------------------
test('Configure: echo_detection section is present', async ({ page }) => {
  await page.goto('/configure/conlang')
  await page.waitForSelector('.neural-card', { timeout: 10_000 })
  await expect(
    page.locator('.neural-section-label:has-text("echo_detection")')
  ).toBeVisible()
})

test('Configure: adversarial_mode section is present', async ({ page }) => {
  await page.goto('/configure/conlang')
  await page.waitForSelector('.neural-card', { timeout: 10_000 })
  await expect(
    page.locator('.neural-section-label:has-text("adversarial_mode")')
  ).toBeVisible()
})

test('Configure: audit section and Recursive audit toggle are present', async ({ page }) => {
  await page.goto('/configure/conlang')
  await page.waitForSelector('.neural-card', { timeout: 10_000 })
  await expect(
    page.locator('.neural-section-label:has-text("audit")')
  ).toBeVisible()
  await expect(page.locator('text=Recursive audit')).toBeVisible()
})

test('Configure: oracle_suggestions collapsible button is present', async ({ page }) => {
  await page.goto('/configure/conlang')
  await page.waitForSelector('.neural-card', { timeout: 10_000 })
  // The oracle section renders as a <button> containing the label text
  await expect(
    page.locator('button:has-text("oracle_suggestions")')
  ).toBeVisible()
})

// ---------------------------------------------------------------------------
// Feature 2: Dictionary -- evolution tab present and clickable
// NOTE: Dictionary has no .neural-card; wait for the tab buttons instead.
// ---------------------------------------------------------------------------
test('Dictionary: evolution tab renders without crash', async ({ page, request }) => {
  const exp = await findAny(request)
  if (!exp) {
    test.skip(true, 'No experiments in DB')
    return
  }

  await page.goto(`/dictionary/${exp.id}`)

  // Wait for the tab row -- Dictionary has no .neural-card
  await page.waitForSelector('button:has-text("evolution")', { timeout: 10_000 })

  const evolutionTab = page.locator('button', { hasText: 'evolution' })
  await expect(evolutionTab).toBeVisible()

  // Click it -- must not crash; shows chain or empty-state prompt
  await evolutionTab.click()

  const showsChain = await page.locator('[class*="border-accent"]').count()
  const showsEmpty = await page.locator('text=Seed a new experiment').count()
  expect(showsChain + showsEmpty).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// Feature 4: Analytics -- chemistry null does NOT crash the page (regression)
// Reproduces the radarRes.models null-deref bug fixed in Analytics.tsx line 74.
// ---------------------------------------------------------------------------
test('Analytics: page renders without crash when chemistry is null', async ({ page, request }) => {
  const exp = await findCompleted(request)
  if (!exp) {
    test.skip(true, 'No completed experiments')
    return
  }

  await page.goto(`/analytics/${exp.id}`)
  await page.waitForSelector('.neural-card', { timeout: 10_000 })

  // Sprites must be visible -- page rendered successfully
  await expect(page.locator('svg[aria-label^="Model A avatar"]').first()).toBeVisible()
  await expect(page.locator('svg[aria-label^="Model B avatar"]').first()).toBeVisible()

  // No JS error panel (text-danger paragraph with error message)
  const errorParagraph = page.locator('p.text-danger')
  expect(await errorParagraph.count()).toBe(0)
})
