import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/api/client'
import type { Preset, CampaignPreset } from '@/api/types'
import { CAMPAIGN_PRESETS } from '@/lib/presets'
import { HudBrackets } from '@/components/common/HudBrackets'
import { ScrambleText } from '@/components/common/ScrambleText'
import { getSymbol } from '@/lib/symbols'

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.10, delayChildren: 0.15 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

const headingVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const modalVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
}

export default function SeedLab() {
  const navigate = useNavigate()
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showPresetPicker, setShowPresetPicker] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'fantasy' | 'scifi' | 'historical' | 'competitive'>('fantasy')

  useEffect(() => {
    api.getPresets()
      .then((res) => setPresets(res.presets))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load presets'))
      .finally(() => setLoading(false))
  }, [])

  const allTags = Array.from(new Set(presets.flatMap((p) => p.tags))).sort()
  const visiblePresets = activeTag ? presets.filter((p) => p.tags.includes(activeTag)) : presets

  const handlePresetSelect = (preset: CampaignPreset) => {
    setShowPresetPicker(false)
    navigate(`/campaign/${preset.id}`, {
      state: {
        preset,
      },
    })
  }

  const categories = ['fantasy', 'scifi', 'historical', 'competitive'] as const
  const categoryPresets = CAMPAIGN_PRESETS.filter((p) => p.category === activeCategory)

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div className="text-center space-y-3" variants={headingVariants} initial="hidden" animate="show">
        <h1 className="font-display font-black tracking-widest text-3xl text-text-primary uppercase">
          <ScrambleText>Seed Lab</ScrambleText>
        </h1>
        <p className="font-mono text-xs text-text-dim tracking-wider">
          <span className="text-accent/60">// </span>select experiment protocol &mdash; or define your own
        </p>
      </motion.div>

      {loading && <p className="text-center font-mono text-xs text-text-dim animate-pulse-slow">initializing...</p>}
      {error && <p className="text-center text-danger font-mono text-xs">{error}</p>}

      {!loading && !error && allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setActiveTag(null)}
            className={`font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-sm border transition-colors ${
              activeTag === null
                ? 'border-accent/60 text-accent bg-accent/10'
                : 'border-border-custom/50 text-text-dim/60 hover:border-accent/40 hover:text-accent/70'
            }`}
          >
            all
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-sm border transition-colors ${
                activeTag === tag
                  ? 'border-accent/60 text-accent bg-accent/10'
                  : 'border-border-custom/50 text-text-dim/60 hover:border-accent/40 hover:text-accent/70'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {!loading && !error && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={gridVariants}
          initial="hidden"
          animate="show"
        >
          {visiblePresets.map((preset, i) => (
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
                      className="font-mono text-xl leading-none text-accent/45 group-hover:text-accent/75 transition-colors select-none"
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
                    <span className="text-accent/25">&middot;</span>
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

          {/* RPG Campaign card */}
          <motion.div
            variants={cardVariants}
            style={{ position: 'relative' }}
            whileHover={{ scale: 1.025, boxShadow: '0 0 28px rgba(16,185,129,0.25)', transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <HudBrackets />
            <div
              className="neural-card h-full cursor-pointer group border-emerald-500/20"
              onClick={() => setShowPresetPicker(true)}
            >
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
              <div className="p-5 flex flex-col items-center justify-center min-h-[160px] space-y-3">
                <span className="font-symbol font-mono text-3xl text-emerald-500/50 group-hover:text-emerald-400/90 transition-colors select-none">&#9812;</span>
                <div className="text-center space-y-1">
                  <h3 className="font-display text-sm font-bold tracking-wider text-text-dim group-hover:text-emerald-400 transition-colors uppercase">
                    RPG Campaign
                  </h3>
                  <p className="font-mono text-[10px] text-text-dim/60 tracking-wide">
                    dm + party &middot; human-in-the-loop
                  </p>
                </div>
                <span className="font-mono text-[9px] text-emerald-500/40 tracking-widest">// campaign_mode</span>
              </div>
            </div>
          </motion.div>

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
                <span className="font-symbol font-mono text-3xl text-accent/35 group-hover:text-accent/75 transition-colors select-none">&#10022;</span>
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

      {/* Preset Picker Modal */}
      <AnimatePresence>
        {showPresetPicker && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              variants={overlayVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              onClick={() => setShowPresetPicker(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-0 flex items-center justify-center p-6"
              variants={modalVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              onClick={() => setShowPresetPicker(false)}
            >
              <motion.div
                className="bg-zinc-950 border border-zinc-800/60 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header */}
                <div className="border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900 to-zinc-950 px-6 py-4">
                  <h2 className="font-mono text-sm font-bold tracking-wider text-emerald-400 uppercase">
                    <span className="text-emerald-600">// </span>select campaign preset
                  </h2>
                </div>

                {/* Category Tabs */}
                <div className="flex border-b border-zinc-800/60 px-6 py-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`font-mono text-[11px] tracking-wider px-3 py-1.5 rounded-sm border transition-colors ${
                        activeCategory === cat
                          ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                          : 'border-zinc-700/50 text-zinc-400 hover:border-emerald-500/30 hover:text-emerald-500/70'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Presets Grid */}
                <div className="overflow-y-auto flex-1 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryPresets.map((preset) => (
                      <motion.div
                        key={preset.id}
                        className="p-4 border border-zinc-800/60 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <div className="space-y-2">
                          <h3 className="font-mono text-xs font-bold tracking-wider text-emerald-400 uppercase">
                            {preset.name}
                          </h3>
                          <p className="font-mono text-[10px] text-zinc-400 leading-relaxed line-clamp-2">
                            {preset.description}
                          </p>

                          {/* Settings preview */}
                          <div className="pt-3 border-t border-zinc-800/40 space-y-1">
                            <div className="font-mono text-[9px] text-zinc-500 flex justify-between">
                              <span>RND: {preset.rounds}</span>
                              <span>TEMP: {preset.temperature}</span>
                            </div>
                            <div className="font-mono text-[9px] text-zinc-500">
                              {preset.rpgTone.charAt(0).toUpperCase() + preset.rpgTone.slice(1)} &middot; {preset.rpgDifficulty}
                            </div>
                          </div>

                          {/* Party template preview */}
                          <div className="pt-3 border-t border-zinc-800/40">
                            <p className="font-mono text-[9px] text-zinc-600 mb-1">Party:</p>
                            <div className="space-y-0.5">
                              {preset.participantTemplate.map((p, i) => (
                                <div key={i} className="font-mono text-[9px] text-zinc-500">
                                  &middot; {p.name} ({p.char_class})
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800/60 px-6 py-4 flex justify-end">
                  <button
                    onClick={() => setShowPresetPicker(false)}
                    className="font-mono text-[11px] tracking-wider px-4 py-2 rounded-sm border border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
