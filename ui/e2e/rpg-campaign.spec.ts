/**
 * RPG Campaign E2E -- 4-round all-AI session
 *
 * Launches an RPG match directly via the API (avoids router-state navigation),
 * navigates to /rpg/:matchId, and watches the full campaign run to completion.
 *
 * Prerequisites: both servers must be running before executing.
 *   Backend:  .venv\Scripts\python.exe -m uvicorn server.app:app --reload --port 8000
 *   Frontend: (in ui/) npm run dev
 *
 * Run: npm run test:e2e -- rpg-campaign
 *
 * Selector notes (RPGTheater.tsx):
 *   DMTurnEntry:        <div className="animate-fade-in py-5">
 *   CompanionTurnEntry: <div className="animate-fade-in py-3">
 *   ThinkingIndicator:  <div className="... p-4 animate-fade-in"> -- no py-3/py-5
 *   Combined turn selector: '.animate-fade-in.py-5, .animate-fade-in.py-3'
 */

import { test, expect } from '@playwright/test'

const API = 'http://localhost:8000/api'

test('RPG Campaign: 4-round all-AI session runs to completion', async ({ page, request }) => {
  // LLM round-trips take 5-20s each; 4 rounds x 2 actors = 8 calls.
  // Budget 3 minutes total.
  test.setTimeout(180_000)

  // -- 1. Pick the first available model from the registry --
  const modelsRes = await request.get(`${API}/relay/models`)
  expect(modelsRes.ok()).toBeTruthy()
  const { models } = await modelsRes.json()

  if (!models || models.length === 0) {
    test.skip(true, 'No models configured in registry -- add an API key first')
    return
  }

  const dmModel: string = models[0].model
  console.log(`Using model: ${models[0].name} (${dmModel})`)

  // -- 2. Start the RPG match via POST /api/relay/start --
  const startRes = await request.post(`${API}/relay/start`, {
    data: {
      model_a: dmModel,
      model_b: dmModel,
      mode: 'rpg',
      rounds: 4,
      max_tokens: 400,
      temperature_a: 0.7,
      temperature_b: 0.7,
      turn_delay_seconds: 0,
      seed: 'The party stands at the entrance to a dungeon shrouded in mist. Begin the adventure.',
      participants: [
        { name: 'Dungeon Master', model: dmModel, role: 'dm' },
        { name: 'Aria', model: dmModel, role: 'npc', char_class: 'Ranger', motivation: 'Seeking a stolen artifact' },
      ],
      rpg_config: {
        tone: 'cinematic',
        setting: 'fantasy',
        difficulty: 'normal',
        campaign_hook: 'Recover the stolen crown from the dungeon depths.',
      },
    },
  })

  expect(startRes.ok()).toBeTruthy()
  const body = await startRes.json()
  const matchId: string = body.match_id
  expect(typeof matchId).toBe('string')
  console.log(`Match started: ${matchId}`)

  // -- 3. Navigate to the RPG Theater --
  await page.goto(`/rpg/${matchId}`)

  // Sidebar and header confirm the page mounted correctly
  await expect(page.locator('text=RPG Session')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('text=Party')).toBeVisible()

  // -- 4. Wait for all 8 turns to appear --
  // DMTurnEntry:        <div className="animate-fade-in py-5">  (4 DM turns)
  // CompanionTurnEntry: <div className="animate-fade-in py-3">  (4 Aria turns)
  // ThinkingIndicator uses p-4 (no py-3/py-5) -- excluded by this combined selector.
  const turnEntries = page.locator('.animate-fade-in.py-5, .animate-fade-in.py-3')
  await expect(turnEntries).toHaveCount(8, { timeout: 150_000 })
  console.log('All 8 turns received.')

  // -- 5. Round counter should show 4 / 4 --
  await expect(page.locator('text=Round 4 / 4')).toBeVisible({ timeout: 10_000 })

  // -- 6. Status should show completion, not error --
  // 'Campaign complete' and 'Error' are mutually exclusive status strings rendered
  // in the same sidebar div. Confirming 'Campaign complete' is sufficient proof
  // the status is not 'error'. Avoid page.locator('text=Error') -- DM dialogue
  // can contain the word "error" as plain prose and would cause a false positive.
  await expect(page.locator('text=Campaign complete')).toBeVisible({ timeout: 15_000 })

  // -- 7. "Campaign ended" footer confirms isDone branch rendered --
  await expect(page.locator('text=Campaign ended.')).toBeVisible()

  // -- 8. Verify turn structure: each turn has round labels R.1 through R.4 --
  // Each round produces 2 spans (one per actor: DM + Aria).
  // Use span.tabular-nums scoped filter + .first() to avoid strict-mode violations.
  const roundLabels = page.locator('span.tabular-nums')
  const labelCount = await roundLabels.count()
  expect(labelCount).toBeGreaterThanOrEqual(8)   // 2 actors x 4 rounds

  for (let r = 1; r <= 4; r++) {
    await expect(
      page.locator('span.tabular-nums').filter({ hasText: `R.${r}` }).first()
    ).toBeVisible()
  }

  // -- 9. Screenshot for visual record --
  await page.screenshot({ path: `e2e/artifacts/rpg-campaign-${matchId.slice(0, 8)}.png` })
  console.log('RPG Campaign E2E: PASSED')
})
