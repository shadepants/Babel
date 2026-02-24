/**
 * Babel Smoke Tests
 *
 * Covers the 6 items that were previously manual-only smoke checks:
 *   1. Gallery sprites render correctly
 *   2. Analytics sprites visible in header
 *   3. Configure preset border accent applied
 *   4. BABEL glitch event handler wired up in Layout
 *   5. Verdict persistence — Theater shows DB-fallback verdict
 *   6. SSE reconnect — Last-Event-ID replays history after disconnect
 *
 * Prerequisites: both servers must be running before executing.
 *   Backend:  .venv\Scripts\python.exe -m uvicorn server.app:app --reload --port 8000
 *   Frontend: (in ui/) npm run dev
 *
 * Run: npm run test:e2e
 */

import { test, expect } from '@playwright/test'
import { findAny, findCompleted, findWithVerdict, findRunning } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Gallery sprites render
// ─────────────────────────────────────────────────────────────────────────────
test('Gallery: sprite avatars render for experiment rows', async ({ page, request }) => {
  const exp = await findAny(request)
  if (!exp) {
    test.skip(true, 'No experiments in DB — run at least one experiment first')
    return
  }

  await page.goto('/gallery')

  // Wait for at least one experiment row to appear (not the loading state)
  await page.waitForSelector('.neural-row', { timeout: 10_000 })

  // Both sprite SVGs must be visible — aria-label starts with "Model A" / "Model B"
  await expect(page.locator('svg[aria-label^="Model A avatar"]').first()).toBeVisible()
  await expect(page.locator('svg[aria-label^="Model B avatar"]').first()).toBeVisible()

  // If a completed experiment with a verdict exists, a "winner" sprite should appear
  const withWinner = await findWithVerdict(request)
  if (withWinner) {
    // aria-label ends with "— winner" (em-dash U+2014)
    await expect(page.locator('svg[aria-label$="\u2014 winner"]').first()).toBeVisible()
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Analytics page sprites visible
// ─────────────────────────────────────────────────────────────────────────────
test('Analytics: sprite avatars visible in experiment header', async ({ page, request }) => {
  const exp = await findCompleted(request)
  if (!exp) {
    test.skip(true, 'No completed experiments — run and complete an experiment first')
    return
  }

  await page.goto(`/analytics/${exp.id}`)

  // Wait for page to settle (at least one stat card loads)
  await page.waitForSelector('.neural-card', { timeout: 10_000 })

  await expect(page.locator('svg[aria-label^="Model A avatar"]').first()).toBeVisible()
  await expect(page.locator('svg[aria-label^="Model B avatar"]').first()).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Configure preset border accent
// ─────────────────────────────────────────────────────────────────────────────
test('Configure: preset accent border applied to form card', async ({ page }) => {
  // Navigate to any named preset (conlang always exists)
  await page.goto('/configure/conlang')

  // Wait for the config form to finish loading (models dropdown appears)
  await page.waitForSelector('.neural-card', { timeout: 10_000 })

  // Read the *inline* style.borderTop — this is what Configure.tsx sets.
  // (Using getComputedStyle would include CSS class defaults and is less precise.)
  const inlineBorderTop = await page.locator('.neural-card').first().evaluate(
    (el) => (el as HTMLElement).style.borderTop
  )

  // Should be something like "2px solid rgba(139, 92, 246, 0.70)"
  expect(inlineBorderTop).toMatch(/solid/)
  expect(inlineBorderTop).toMatch(/rgba|rgb|#/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: BABEL glitch event handler wired up
// ─────────────────────────────────────────────────────────────────────────────
test('BABEL glitch: custom event triggers wordmark style change', async ({ page }) => {
  await page.goto('/')

  // Ensure Layout has mounted and the BABEL nav link is present
  await page.waitForSelector('nav a', { timeout: 5_000 })

  // Use a MutationObserver inside the browser to detect the inline style change
  // that the glitch effect applies to the BABEL wordmark (first nav <a>).
  const glitchFired = await page.evaluate(async () => {
    return new Promise<boolean>((resolve) => {
      const nav = document.querySelector('nav a') as HTMLElement | null
      if (!nav) { resolve(false); return }

      const observer = new MutationObserver(() => {
        // Glitch frames set transform and/or filter on the element's inline style
        if (nav.style.transform || nav.style.filter) {
          observer.disconnect()
          resolve(true)
        }
      })
      observer.observe(nav, { attributes: true, attributeFilter: ['style'] })

      // Safety: resolve false after 600ms if no style change is observed
      setTimeout(() => { observer.disconnect(); resolve(false) }, 600)

      // Dispatch the event — Layout's useEffect handler fires synchronously
      window.dispatchEvent(new CustomEvent('babel-glitch'))
    })
  })

  expect(glitchFired).toBe(true)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Verdict persistence — Theater DB fallback
// ─────────────────────────────────────────────────────────────────────────────
test('Theater: verdict panel visible from DB for completed experiment', async ({ page, request }) => {
  const exp = await findWithVerdict(request)
  if (!exp) {
    test.skip(true, 'No completed experiment with verdict — run one with enable_verdict=true')
    return
  }

  await page.goto(`/theater/${exp.id}`)

  // Theater pre-loads verdict from DB when experiment is completed.
  // The verdict panel shows the section label "// final_verdict".
  await expect(page.locator('text=// final_verdict')).toBeVisible({ timeout: 10_000 })

  if (exp.winner === 'tie') {
    await expect(page.locator('text=TIE')).toBeVisible()
  } else {
    // "winner: " label appears in the verdict heading
    await expect(page.locator('text=winner:')).toBeVisible()
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: SSE reconnect / Last-Event-ID history replay
// ─────────────────────────────────────────────────────────────────────────────
test('SSE reconnect: history replayed after connection drop', async ({ page, request }) => {
  const exp = await findRunning(request)
  if (!exp) {
    test.skip(true, 'No running experiment — start one and run this test while it is live')
    return
  }

  await page.goto(`/theater/${exp.id}`)

  // Turn bubbles use the "animate-fade-in" class and live inside [aria-live] scroll areas.
  // Wait for at least one to confirm SSE is delivering events.
  const turnBubbles = page.locator('[aria-live="polite"] .animate-fade-in')
  await expect(turnBubbles.first()).toBeVisible({ timeout: 15_000 })
  const countBefore = await turnBubbles.count()

  // Drop the SSE connection by aborting all /stream requests
  await page.route('**/api/relay/stream*', (route) => route.abort())
  await page.waitForTimeout(2_000)   // EventSource fires error; useSSE schedules restart

  // Restore — remove the abort intercept so the reconnect can succeed
  await page.unroute('**/api/relay/stream*')

  // After reconnect the hub replays history via Last-Event-ID.
  // Turn count should be >= what we had before the drop.
  await page.waitForTimeout(3_000)
  const countAfter = await turnBubbles.count()

  expect(countAfter).toBeGreaterThanOrEqual(countBefore)
})
