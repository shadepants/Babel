/**
 * Export helpers for Babel experiment data.
 * Each function fetches the required data, builds the output, and either
 * triggers a browser download or copies text to the clipboard.
 *
 * Callers are responsible for managing the `exporting` flag via the
 * `onStart` / `onEnd` callbacks so the UI can disable buttons while a
 * fetch is in flight.
 */

import { api } from '@/api/client'
import type { TurnRecord, VocabWord } from '@/api/types'
import { formatDuration, modelDisplayName } from '@/lib/format'

/** Trigger a browser file download for the given Blob. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Download a JSON bundle of the full experiment (metadata + turns + vocab). */
export async function downloadExperimentJson(
  experimentId: string,
  onStart: () => void,
  onEnd: () => void,
): Promise<void> {
  onStart()
  try {
    const [exp, turns, vocab] = await Promise.all([
      api.getExperiment(experimentId),
      api.getExperimentTurns(experimentId),
      api.getVocabulary(experimentId),
    ])
    const blob = new Blob(
      [JSON.stringify({ experiment: exp, turns: turns.turns, vocabulary: vocab.words }, null, 2)],
      { type: 'application/json' },
    )
    triggerDownload(blob, `babel-${experimentId}.json`)
  } catch {
    // silently fail -- user can retry
  } finally {
    onEnd()
  }
}

/** Download a CSV file containing all turns for the experiment. */
export async function downloadExperimentCsv(
  experimentId: string,
  onStart: () => void,
  onEnd: () => void,
): Promise<void> {
  onStart()
  try {
    const turnsRes = await api.getExperimentTurns(experimentId)
    const rows = [
      ['round', 'speaker', 'model', 'content', 'latency_seconds', 'token_count'],
      ...(turnsRes.turns as TurnRecord[]).map((t) => [
        String(t.round),
        t.speaker,
        t.model,
        `"${t.content.replace(/"/g, '""')}"`,
        t.latency_seconds != null ? String(t.latency_seconds) : '',
        t.token_count != null ? String(t.token_count) : '',
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    triggerDownload(new Blob([csv], { type: 'text/csv' }), `babel-${experimentId}.csv`)
  } catch {
    // silently fail -- user can retry
  } finally {
    onEnd()
  }
}

/**
 * Copy a Markdown-formatted transcript of the experiment to the clipboard.
 * Returns `'success'` or `'error'` so callers can update copy-status UI.
 */
export async function copyExperimentMarkdown(
  experimentId: string,
  onStart: () => void,
  onEnd: () => void,
): Promise<'success' | 'error'> {
  onStart()
  try {
    const [exp, turnsRes, vocabRes] = await Promise.all([
      api.getExperiment(experimentId),
      api.getExperimentTurns(experimentId),
      api.getVocabulary(experimentId),
    ])
    const lines = [
      `# Babel Experiment: ${modelDisplayName(exp.model_a)} vs ${modelDisplayName(exp.model_b)}`,
      '',
      `**Status:** ${exp.status} | **Rounds:** ${exp.rounds_completed}/${exp.rounds_planned} | **Elapsed:** ${exp.elapsed_seconds ? formatDuration(exp.elapsed_seconds) : '\u2014'}`,
      '',
      '## Conversation',
      '',
    ]
    let currentRound = 0
    for (const turn of turnsRes.turns as TurnRecord[]) {
      if (turn.round !== currentRound) {
        currentRound = turn.round
        lines.push(`### Round ${currentRound}`, '')
      }
      lines.push(`**${turn.speaker}** (${turn.latency_seconds?.toFixed(1) ?? '?'}s):`, '', turn.content, '')
    }
    if (vocabRes.words.length > 0) {
      lines.push('## Vocabulary', '')
      for (const w of vocabRes.words as VocabWord[]) {
        lines.push(
          `- **${w.word}**${w.meaning ? `: ${w.meaning}` : ''} _(coined by ${w.coined_by}, round ${w.coined_round})_`,
        )
      }
    }

    const text = lines.join('\n')
    let copied = false

    // Try modern Clipboard API first
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch {
        // fall through to execCommand fallback
      }
    }

    // Fallback: temporary textarea + execCommand
    if (!copied) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      copied = document.execCommand('copy')
      document.body.removeChild(ta)
    }

    return copied ? 'success' : 'error'
  } catch {
    return 'error'
  } finally {
    onEnd()
  }
}
