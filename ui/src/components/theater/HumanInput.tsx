import { useState, useCallback } from 'react'
import { api } from '@/api/client'

interface HumanInputProps {
  matchId: string
  isEnabled: boolean
  speaker?: string
}

/**
 * RPG command input bar.
 * Anchored at the bottom of RPGTheater. Glows emerald when the
 * engine is waiting for human input; disabled otherwise.
 */
export function HumanInput({ matchId, isEnabled, speaker = 'Player' }: HumanInputProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || !isEnabled || sending) return

    setSending(true)
    try {
      await api.injectTurn(matchId, trimmed, speaker)
      setText('')
    } catch (err) {
      console.error('Inject failed:', err)
    } finally {
      setSending(false)
    }
  }, [text, isEnabled, sending, matchId, speaker])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className="border-t px-4 py-3 transition-colors duration-300"
      style={{
        borderColor: isEnabled ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.15)',
        background: isEnabled
          ? 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(10,15,30,0.9) 100%)'
          : 'rgba(10,15,30,0.6)',
      }}
    >
      {isEnabled && (
        <div className="text-emerald-400/70 text-xs font-mono mb-2 animate-pulse">
          {'> Awaiting your action...'}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isEnabled || sending}
          placeholder={isEnabled ? 'Describe your action...' : 'Waiting for your turn...'}
          rows={2}
          className="flex-1 bg-slate-900/60 border border-slate-700/40 rounded px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none focus:border-emerald-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={!isEnabled || sending || !text.trim()}
          className="px-4 py-2 rounded font-mono text-sm font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-emerald-600/80 hover:bg-emerald-500/90 text-white self-end"
        >
          {sending ? '...' : 'Act'}
        </button>
      </div>
    </div>
  )
}
