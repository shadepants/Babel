import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '@/api/client'
import type { Preset } from '@/api/types'
import { HudBrackets } from '@/components/common/HudBrackets'

/** Map emoji to sci-fi geometric symbols */
const SYMBOL_MAP: Record<string, string> = {
  '🧠': '◈', '⚙️': '⊕', '🎭': '✦', '📊': '⬡', '🌱': '◉',
  '🤝': '⟡', '🔬': '⌬', '💡': '◇', '🎯': '⊗', '🤖': '⧖',
  '🌍': '◉', '⚖️': '⊗', '🎪': '✦', '🔮': '◈', '🗺️': '⬡',
  '🌐': '⬡', '🧬': '◈', '⚡': '⊕', '🌊': '◉', '🔥': '✦',
}

/** Fallback symbols by index for unmapped emojis */
const FALLBACK_SYMBOLS = ['◈', '⬡', '◉', '✦', '⊕', '⟡', '⌬', '◇', '⊗', '⧖']

function getSymbol(emoji: string, index: number): string {
  return SYMBOL_MAP[emoji] ?? FALLBACK_SYMBOLS[index % FALLBACK_SYMBOLS.length]
}

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.10, delayChildren: 0.15 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const headingVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function SeedLab() {
  const navigate = useNavigate()
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getPresets()
      .then((res) => setPresets(res.presets))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load presets'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div className="text-center space-y-3" variants={headingVariants} initial="hidden" animate="show">
        <h1 className="font-display font-black tracking-widest text-3xl text-text-primary uppercase">
          Seed Lab
        </h1>
        <p className="font-mono text-xs text-text-dim tracking-wider">
          <span className="text-accent/60">// </span>select experiment protocol — or define your own
        </p>
      </motion.div>

      {loading && <p className="text-center font-mono text-xs text-text-dim animate-pulse-slow">initializing...</p>}
      {error && <p className="text-center text-danger font-mono text-xs">{error}</p>}

      {!loading && !error && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={gridVariants}
          initial="hidden"
          animate="show"
        >
          {presets.map((preset, i) => (
            <motion.div
              key={preset.id}
              variants={cardVariants}
              style={{ position: 'relative' }}
              whileHover={{ scale: 1.025, boxShadow: '0 0 28px rgba(139,92,246,0.30)', transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
            >
              <HudBrackets />
              <div
                className="neural-card h-full cursor-pointer group"
                onClick={() => navigate(`/configure/${preset.id}`)}
              >
                {/* Top accent bar */}
                <div className="neural-card-bar" />

                <div className="p-5 space-y-3">
                  {/* Symbol + tags row */}
                  <div className="flex items-start justify-between">
                    <span
                      className="font-display text-xl leading-none text-accent/45 group-hover:text-accent/75 transition-colors select-none"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.3))' }}
                    >
                      {getSymbol(preset.emoji, i)}
                    </span>
                    <div className="flex gap-2">
                      {preset.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="font-mono text-[10px] tracking-wider text-accent/70 border border-accent/25 px-1.5 py-0.5 rounded-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Title + description */}
                  <div>
                    <h3 className="font-display text-sm font-bold tracking-wider text-text-primary uppercase group-hover:text-accent transition-colors">
                      {preset.name}
                    </h3>
                    <p className="text-xs text-text-dim mt-1.5 leading-relaxed line-clamp-2">
                      {preset.description}
                    </p>
                  </div>

                  {/* Metadata — terminal data row */}
                  <div className="font-mono text-[10px] text-text-dim/70 flex items-center gap-3 pt-1 border-t border-border-custom/40">
                    <span><span className="text-accent/50">RND</span> {String(preset.defaults.rounds).padStart(2, '0')}</span>
                    <span className="text-accent/25">·</span>
                    <span className="truncate">
                      <span className="text-accent/50">A</span> {preset.suggested_models.a.split('/').pop()}
                      <span className="text-accent/25 mx-1">vs</span>
                      <span className="text-accent/50">B</span> {preset.suggested_models.b.split('/').pop()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Custom card */}
          <motion.div
            variants={cardVariants}
            style={{ position: 'relative' }}
            whileHover={{ scale: 1.025, boxShadow: '0 0 28px rgba(139,92,246,0.20)', transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <HudBrackets />
            <div
              className="neural-card neural-card--custom h-full cursor-pointer group"
              onClick={() => navigate('/configure/custom')}
            >
              <div className="neural-card-bar neural-card-bar--dim" />
              <div className="p-5 flex flex-col items-center justify-center min-h-[160px] space-y-3">
                <span className="font-display text-3xl text-accent/35 group-hover:text-accent/75 transition-colors select-none">✦</span>
                <div className="text-center space-y-1">
                  <h3 className="font-display text-sm font-bold tracking-wider text-text-dim group-hover:text-accent transition-colors uppercase">
                    Custom
                  </h3>
                  <p className="font-mono text-[10px] text-text-dim/60 tracking-wide">
                    define your own protocol
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
