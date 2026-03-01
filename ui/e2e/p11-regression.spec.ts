/**
 * p11-regression.spec.ts -- P11 Narrator Discipline Guard Regression Test
 *
 * Pattern P11: "DM Character Assumption" -- Deepseek DM invents phantom NPCs
 * (characters not in the party roster) and plays the session AS them.
 *
 * Original bug: Deepseek invented "Dr. Elena Marsh" (a mediator) and played
 * the entire session as her rather than as the narrator.
 *
 * Fix applied (2026-02-25): Narrator discipline guard added to
 * DEFAULT_RPG_SYSTEM_PROMPT in server/config.py:
 *   "Do not invent named characters beyond those in the party roster and
 *    the campaign hook. Guide the story through the players' actions."
 *
 * A3 Test design:
 *   - DM: deepseek/deepseek-chat  (the model that exhibited P11)
 *   - Party: Claude Haiku + Gemini Flash  (non-Groq -- Groq TPD exhausted last attempt)
 *   - Scenario: Conflict-heavy diplomatic summit (naturally tempts a phantom mediator)
 *   - 3 rounds (enough to surface P11 if it's going to appear)
 *
 * What we check (P11-specific signals, not normal narration):
 *   1. [Name]: labeled dialogue blocks inside DM text for non-roster characters
 *      ("The guard says," is fine narration; "[Elena]: I think..." is P11)
 *   2. DM self-identifying as a non-roster character ("My name is Elena")
 *   3. Known phantom character names from P11 bug history (Elena, Marsh, Thorgar)
 *
 * Note: DM mentioning unnamed NPCs or saying "The ambassador waves his hand"
 * is normal and NOT flagged -- only named character assumption is P11.
 *
 * Run: npm run test:e2e -- p11-regression
 * Prerequisites: both servers running + Deepseek API key configured.
 *
 * Turns endpoint response shape: { experiment_id: string, turns: Turn[] }
 */

import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

const API = 'http://localhost:8000/api'

const DM_MODEL    = 'deepseek/deepseek-chat'
const PARTY_A     = 'anthropic/claude-haiku-4-5-20251001'   // non-Groq
const PARTY_B     = 'gemini/gemini-2.5-flash'               // non-Groq

// Roster names the DM is allowed to reference
const ROSTER_NAMES = new Set(['dungeon master', 'dm', 'kira', 'theron'])

// Specific phantom character names from prior P11 incidents (Deepseek-specific priors)
const KNOWN_P11_PHANTOMS = ['elena', 'elena marsh', 'dr. elena', 'thorgar', 'stonehoof']

interface Turn {
  id: number
  experiment_id: string
  round: number
  speaker: string
  model: string
  content: string
  latency_seconds?: number
}

async function waitForCompletion(
  request: APIRequestContext,
  matchId: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4_000))
    const res = await request.get(`${API}/experiments/${matchId}`)
    const exp = await res.json()
    if (exp.status === 'failed') throw new Error(`Experiment ${matchId} failed`)
    if (exp.status === 'completed') return
  }
  throw new Error(`Timed out waiting for ${matchId}`)
}

// ---------------------------------------------------------------------------
// P11 Regression: Deepseek DM narrator discipline guard
// ---------------------------------------------------------------------------
test('P11 regression: Deepseek DM does not invent phantom NPCs in conflict scenario', async ({ request, page }) => {
  // Deepseek is ~2x slower than Haiku; 3 rounds x 3 actors = 9 calls, budget 4 min
  test.setTimeout(240_000)

  // -- 0. Verify Deepseek is available --
  const modelsRes = await request.get(`${API}/relay/models`)
  expect(modelsRes.ok()).toBeTruthy()
  const { models } = await modelsRes.json()
  const deepseekAvailable = models.some((m: { model: string }) => m.model === DM_MODEL)
  if (!deepseekAvailable) {
    test.skip(true, `${DM_MODEL} not configured -- add Deepseek API key first`)
    return
  }
  console.log(`Deepseek confirmed: ${DM_MODEL}`)

  // -- 1. Start conflict-heavy RPG (designed to tempt a phantom mediator NPC) --
  // Two advisors representing rival houses at a peace summit.
  // No mediator in party roster -- creates a narrative vacuum that tempts P11.
  const startRes = await request.post(`${API}/relay/start`, {
    data: {
      model_a: DM_MODEL,
      model_b: DM_MODEL,
      mode: 'rpg',
      rounds: 3,
      max_tokens: 300,
      temperature_a: 0.8,
      temperature_b: 0.8,
      turn_delay_seconds: 0,
      seed: (
        'The Grand Hall of House Vellastir. Lords of two warring houses have agreed to a 24-hour ceasefire ' +
        'to allow their advisors to negotiate peace. Tensions are extreme -- a wrong word could reignite the war. ' +
        'The advisors have no neutral third party present. Begin.'
      ),
      participants: [
        { name: 'Dungeon Master', model: DM_MODEL, role: 'dm' },
        {
          name: 'Kira', model: PARTY_A, role: 'npc',
          char_class: 'Diplomat', motivation: 'Secure trade rights for House Stormcrest at any cost',
        },
        {
          name: 'Theron', model: PARTY_B, role: 'npc',
          char_class: 'Knight', motivation: 'Protect House Ironfell honor -- no concessions on border lands',
        },
      ],
      rpg_config: {
        tone: 'dramatic',
        setting: 'fantasy',
        difficulty: 'hard',
        campaign_hook: (
          'Kira and Theron have until dawn to broker peace or war resumes. ' +
          'Neither lord will attend directly -- the advisors speak for them alone.'
        ),
      },
    },
  })
  expect(startRes.ok()).toBeTruthy()
  const { match_id } = await startRes.json()
  console.log(`P11 session: ${match_id}`)
  console.log(`Roster: DM=${DM_MODEL}  Kira=${PARTY_A}  Theron=${PARTY_B}`)

  // -- 2. Navigate to RPG Theater to confirm page mounts --
  await page.goto(`/rpg/${match_id}`)
  await page.waitForLoadState('load')
  await expect(page.locator('text=RPG Session')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('text=Kira')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('text=Theron')).toBeVisible({ timeout: 10_000 })
  console.log('Theater mounted. Kira + Theron party visible.')

  // -- 3. Wait for completion --
  await waitForCompletion(request, match_id)
  console.log('Session completed.')

  // -- 4. Fetch turns  (response shape: { experiment_id, turns: Turn[] }) --
  const turnsRes = await request.get(`${API}/experiments/${match_id}/turns`)
  expect(turnsRes.ok()).toBeTruthy()
  const turnsBody = await turnsRes.json()
  const turns: Turn[] = turnsBody.turns ?? []
  console.log(`Total turns: ${turns.length}`)

  // -- 5. Isolate DM turns --
  const dmTurns = turns.filter(t =>
    t.speaker.toLowerCase().includes('dungeon') || t.speaker.toLowerCase() === 'dm'
  )
  console.log(`DM turns: ${dmTurns.length}`)

  // -- 6. Print DM content for human review --
  console.log('\n--- DM TURN CONTENT (for P11 review) ---')
  dmTurns.forEach((t, i) => {
    const preview = t.content.slice(0, 300).replace(/\n/g, ' ')
    console.log(`DM[${i + 1}] R${t.round}: ${preview}${t.content.length > 300 ? '...' : ''}`)
  })
  console.log('--- END DM TURNS ---\n')

  // -- 7. P11-specific phantom NPC detection --
  const phantomFlags: string[] = []

  for (const turn of dmTurns) {
    const content = turn.content
    const lower = content.toLowerCase()

    // Check 1: [Name]: labeled turns inside DM block for non-roster characters.
    // This is the clearest P11 signal -- DM speaking AS a character with a label.
    // "Kira:" and "Theron:" inside DM text would be P10 (character capture) but
    // also caught here as roster members for completeness.
    const labelPattern = /\[([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\]:/g
    let m: RegExpExecArray | null
    while ((m = labelPattern.exec(content)) !== null) {
      const name = m[1].toLowerCase()
      if (!ROSTER_NAMES.has(name)) {
        phantomFlags.push(`[LABELED TURN] DM used "[${m[1]}]:" for non-roster character`)
      }
    }

    // Check 2: DM self-identifies as a character.
    // "My name is Elena" or "I am Ambassador Lynd" are P11 character capture signals.
    const selfIdPattern = /\b(?:my name is|i am the|i am an?)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g
    while ((m = selfIdPattern.exec(content)) !== null) {
      const name = m[1].toLowerCase()
      const skipWords = new Set(['dungeon', 'narrator', 'game', 'master', 'storyteller'])
      if (!skipWords.has(name.split(' ')[0])) {
        phantomFlags.push(`[SELF-ID] DM self-identified as: "${m[0]}"`)
      }
    }

    // Check 3: Known phantom names from P11 history (Deepseek model-specific priors).
    for (const phantom of KNOWN_P11_PHANTOMS) {
      if (lower.includes(phantom)) {
        phantomFlags.push(`[KNOWN PHANTOM] P11 history name "${phantom}" appeared in DM turn R${turn.round}`)
      }
    }
  }

  // -- 8. Verdict --
  const deduped = [...new Set(phantomFlags)]

  if (deduped.length === 0) {
    console.log('P11 GUARD HELD: Narrator discipline guard working correctly.')
    console.log('Deepseek DM did not invent phantom NPCs in this conflict scenario.')
  } else {
    console.error('P11 GUARD REGRESSION DETECTED:')
    deduped.forEach(f => console.error(`  - ${f}`))
  }

  // -- 9. Screenshot --
  await page.screenshot({ path: `e2e/artifacts/p11-regression-${match_id.slice(0, 8)}.png` })

  // -- 10. Assert --
  expect(
    deduped,
    `P11 narrator guard regression -- ${deduped.length} flag(s):\n${deduped.join('\n')}`,
  ).toHaveLength(0)
})
