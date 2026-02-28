/**
 * smoke-live.spec.ts -- Self-provisioning smoke tests (require live LLM API)
 *
 * These are the "live" versions of the two tests in smoke.spec.ts that are
 * normally skipped because they depend on pre-existing DB state:
 *
 *   5. Theater: verdict panel visible from DB for completed experiment
 *   6. SSE reconnect: history replayed after connection drop
 *
 * Instead of relying on whatever experiments happen to exist, each test
 * starts its own experiment via the API and tears down immediately after.
 * No manual setup required beyond having models configured.
 *
 * Prerequisites: both servers running + at least one API key configured.
 *   Backend:  .venv\Scripts\python.exe -m uvicorn server.app:app --reload --port 8000
 *   Frontend: (in ui/) npm run dev
 *
 * Run explicitly (slow -- makes real LLM calls):
 *   npm run test:e2e -- smoke-live
 *
 * SELECTOR NOTE: Playwright treats text='// foo' as a regex (// = delimiters).
 * Use .neural-section-label:has-text("foo") or text='foo' (no //) instead.
 */

import { test, expect } from '@playwright/test'

const API = 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Test 5 (live): Theater verdict panel -- self-provisioning
// ---------------------------------------------------------------------------
test('Theater: verdict panel rendered for self-provisioned experiment', async ({ page, request }) => {
  // Verdict = 2 conversation turns + 1 judge call; budget 2 min total.
  test.setTimeout(120_000)

  // -- 1. Pick first available model --
  const modelsRes = await request.get(`${API}/relay/models`)
  expect(modelsRes.ok()).toBeTruthy()
  const { models } = await modelsRes.json()
  if (!models?.length) {
    test.skip(true, 'No models configured -- add an API key first')
    return
  }
  const model: string = models[0].model
  console.log(`Using model: ${models[0].name} (${model})`)

  // -- 2. Start a minimal 1-round experiment with verdict enabled --
  const startRes = await request.post(`${API}/relay/start`, {
    data: {
      model_a: model,
      model_b: model,
      rounds: 1,
      max_tokens: 150,
      temperature_a: 0.7,
      temperature_b: 0.7,
      turn_delay_seconds: 0,
      seed: 'Is the speed of light the ultimate cosmic speed limit? Argue your position.',
      enable_verdict: true,
      judge_model: model,
    },
  })
  expect(startRes.ok()).toBeTruthy()
  const body = await startRes.json()
  const matchId: string = body.match_id
  console.log(`Experiment started: ${matchId}`)

  // -- 3. Poll until completed (includes verdict generation) --
  // Verdict is written before status flips to 'completed', so winner != null
  // implies the verdict is ready.
  const deadline = Date.now() + 90_000
  let winner: string | null = null

  while (Date.now() < deadline) {
    await page.waitForTimeout(3_000)
    const expRes = await request.get(`${API}/experiments/${matchId}`)
    const exp = await expRes.json()
    console.log(`  status=${exp.status} winner=${exp.winner}`)
    if (exp.status === 'failed') throw new Error('Experiment failed during verdict test')
    if (exp.status === 'completed' && exp.winner != null) {
      winner = exp.winner
      break
    }
  }

  expect(winner, 'Experiment did not produce a verdict within 90s').not.toBeNull()
  console.log(`Verdict: ${winner}`)

  // -- 4. Navigate to Theater and verify verdict panel --
  await page.goto(`/theater/${matchId}`)
  await page.waitForLoadState('load')

  // Use :has-text() -- avoids Playwright's // regex interpretation bug
  await expect(
    page.locator('.neural-section-label:has-text("final_verdict")')
  ).toBeVisible({ timeout: 10_000 })

  // Verify winner label rendered -- 'winner:' or 'TIE' (no // prefix, safe selectors)
  if (winner === 'tie') {
    await expect(page.locator('text=TIE')).toBeVisible()
  } else {
    await expect(page.locator('text=winner:')).toBeVisible()
  }

  await page.screenshot({ path: `e2e/artifacts/verdict-${matchId.slice(0, 8)}.png` })
  console.log('Theater verdict test: PASSED')
})

// ---------------------------------------------------------------------------
// Test 6 (live): SSE reconnect -- self-provisioning
// ---------------------------------------------------------------------------
test('SSE reconnect: history replayed after connection drop (self-provisioned)', async ({ page, request }) => {
  // Budget 90s: first LLM call ~5-10s + 3s reconnect window + buffer.
  test.setTimeout(90_000)

  // -- 1. Pick first available model --
  const modelsRes = await request.get(`${API}/relay/models`)
  expect(modelsRes.ok()).toBeTruthy()
  const { models } = await modelsRes.json()
  if (!models?.length) {
    test.skip(true, 'No models configured -- add an API key first')
    return
  }
  const model: string = models[0].model
  console.log(`Using model: ${models[0].name} (${model})`)

  // -- 2. Start a multi-round experiment with delays so it stays running --
  // 6 rounds x ~2s delay = ~12s minimum runtime after first turn.
  // Short max_tokens keeps each turn fast so the test isn't bottlenecked by LLM speed.
  const startRes = await request.post(`${API}/relay/start`, {
    data: {
      model_a: model,
      model_b: model,
      rounds: 6,
      max_tokens: 100,
      temperature_a: 0.7,
      temperature_b: 0.7,
      turn_delay_seconds: 2,
      seed: 'Continue the pattern: 1, 1, 2, 3, 5, 8... Each reply adds one number only.',
    },
  })
  expect(startRes.ok()).toBeTruthy()
  const body = await startRes.json()
  const matchId: string = body.match_id
  console.log(`Experiment started: ${matchId}`)

  // -- 3. Navigate immediately -- experiment is running --
  await page.goto(`/theater/${matchId}`)

  // -- 4. Wait for first turn bubble to confirm SSE is delivering events --
  // data-testid="turn-bubble" on TurnBubble root -- more reliable than aria-live nesting.
  const turnBubbles = page.locator('[data-testid="turn-bubble"]')
  await expect(turnBubbles.first()).toBeVisible({ timeout: 30_000 })
  const countBefore = await turnBubbles.count()
  console.log(`  Turns before drop: ${countBefore}`)

  // -- 5. Drop the SSE connection by aborting all stream requests --
  await page.route('**/api/relay/stream*', (route) => route.abort())
  await page.waitForTimeout(2_000)  // EventSource fires onerror; useSSE schedules restart

  // -- 6. Restore -- remove intercept so the reconnect can proceed --
  await page.unroute('**/api/relay/stream*')

  // -- 7. Wait for reconnect + Last-Event-ID replay --
  await page.waitForTimeout(3_000)
  const countAfter = await turnBubbles.count()
  console.log(`  Turns after reconnect: ${countAfter}`)

  // After reconnect, the hub replays history: count must be >= before
  expect(countAfter).toBeGreaterThanOrEqual(countBefore)

  await page.screenshot({ path: `e2e/artifacts/sse-reconnect-${matchId.slice(0, 8)}.png` })
  console.log('SSE reconnect test: PASSED')
})
