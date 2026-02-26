import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CAMPAIGN_PRESETS } from '@/lib/presets'
import type { CampaignPreset } from '@/api/types'

const CATEGORIES = ['all', 'fantasy', 'scifi', 'historical', 'competitive'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  fantasy: 'Fantasy',
  scifi: 'Sci-Fi',
  historical: 'Historical',
  competitive: 'Competitive',
}

const TONE_COLORS: Record<string, string> = {
  cinematic: 'text-amber-400/70',
  grimdark: 'text-red-400/70',
  whimsical: 'text-pink-400/70',
  serious: 'text-blue-400/70',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  casual: 'text-emerald-400/60',
  normal: 'text-amber-400/60',
  deadly: 'text-red-400/60',
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

export default function RPGHub() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filtered = activeCategory === 'all'
    ? CAMPAIGN_PRESETS
    : CAMPAIGN_PRESETS.filter(p => p.category === activeCategory)

  function handleSelect(preset: CampaignPreset) {
    navigate(`/campaign/${preset.id}`, { state: { preset } })
  }

  function handleCustom() {
    navigate('/campaign/custom')
  }

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-black tracking-widest text-2xl text-text-primary">
          RPG Campaigns
        </h1>
        <p className="font-mono text-[10px] text-text-dim mt-1 tracking-wider">
          <span className="text-emerald-500/60">// </span>
          choose a campaign preset or build your own
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 border-b border-border-custom/40 pb-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`font-mono text-[11px] tracking-wider px-3 py-1.5 rounded-sm border transition-colors ${
              activeCategory === cat
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-text-dim/50 hover:text-text-dim hover:border-border-custom/40'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Campaign grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
        >
          {filtered.map(preset => (
            <motion.div
              key={preset.id}
              variants={cardVariants}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 0 24px rgba(16,185,129,0.15)',
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredId(preset.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="neural-card h-full cursor-pointer group border-emerald-500/10 hover:border-emerald-500/30 transition-colors"
                onClick={() => handleSelect(preset)}
              >
                {/* Top accent bar */}
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

                <div className="p-5 space-y-3">
                  {/* Title */}
                  <h3 className="font-display text-sm font-bold tracking-wider text-text-primary uppercase group-hover:text-emerald-400 transition-colors">
                    {preset.name}
                  </h3>

                  {/* Description */}
                  <p className="font-mono text-[11px] text-text-dim/70 leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>

                  {/* Campaign hook preview (on hover) */}
                  <AnimatePresence>
                    {hoveredId === preset.id && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="font-mono text-[10px] text-emerald-400/50 italic leading-relaxed line-clamp-2 overflow-hidden"
                      >
                        &ldquo;{preset.campaignHook}&rdquo;
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Metadata row */}
                  <div className="font-mono text-[10px] flex items-center gap-2 pt-2 border-t border-border-custom/30 flex-wrap">
                    <span className={TONE_COLORS[preset.rpgTone] || 'text-text-dim/50'}>
                      {preset.rpgTone}
                    </span>
                    <span className="text-border-custom/40">&middot;</span>
                    <span className={DIFFICULTY_COLORS[preset.rpgDifficulty] || 'text-text-dim/50'}>
                      {preset.rpgDifficulty}
                    </span>
                    <span className="text-border-custom/40">&middot;</span>
                    <span className="text-text-dim/40">
                      {preset.rounds} rounds
                    </span>
                    <span className="text-border-custom/40">&middot;</span>
                    <span className="text-text-dim/40">
                      {preset.participantTemplate.length} party
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Custom campaign card */}
          <motion.div
            variants={cardVariants}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 0 24px rgba(139,92,246,0.15)',
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="neural-card h-full cursor-pointer group border-accent/10 hover:border-accent/30 transition-colors"
              onClick={handleCustom}
            >
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
              <div className="p-5 flex flex-col items-center justify-center min-h-[180px] space-y-3">
                <span className="font-symbol font-mono text-3xl text-accent/35 group-hover:text-accent/75 transition-colors select-none">&#10022;</span>
                <div className="text-center space-y-1">
                  <h3 className="font-display text-sm font-bold tracking-wider text-text-dim group-hover:text-accent transition-colors uppercase">
                    Custom Campaign
                  </h3>
                  <p className="font-mono text-[10px] text-text-dim/50 tracking-wide">
                    build your own world from scratch
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
