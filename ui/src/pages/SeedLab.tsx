import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '@/api/client'
import type { Preset } from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Stagger container — children animate in sequence
const gridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.10,
      delayChildren: 0.15, // slight pause after heading finishes
    },
  },
}

// Each card fades up from y+20
const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// Heading block fades up independently
const headingVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
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

  function handleSelectPreset(preset: Preset) {
    navigate(`/configure/${preset.id}`)
  }

  function handleCustom() {
    navigate('/configure/custom')
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-8">
      {/* Header — fades up on mount */}
      <motion.div
        className="text-center space-y-2"
        variants={headingVariants}
        initial="hidden"
        animate="show"
      >
        <h1 className="text-3xl font-bold text-text-primary">Seed Lab</h1>
        <p className="text-text-dim">
          Choose an experiment type — or build your own
        </p>
      </motion.div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-center text-text-dim animate-pulse-slow">Loading presets...</p>
      )}
      {error && (
        <p className="text-center text-danger">{error}</p>
      )}

      {/* Preset Cards Grid — staggered entrance */}
      {!loading && !error && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={gridVariants}
          initial="hidden"
          animate="show"
        >
          {presets.map((preset) => (
            <motion.div
              key={preset.id}
              variants={cardVariants}
              whileHover={{
                scale: 1.025,
                boxShadow: '0 0 28px rgba(139, 92, 246, 0.30)',
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="h-full bg-bg-card border-border-custom hover:bg-bg-card-hover cursor-pointer transition-colors group"
                onClick={() => handleSelectPreset(preset)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{preset.emoji}</span>
                    <div className="flex gap-1.5">
                      {preset.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                      {preset.name}
                    </h3>
                    <p className="text-sm text-text-dim mt-1 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-dim">
                    <span>{preset.defaults.rounds} rounds</span>
                    <span className="text-border-custom">|</span>
                    <span>{preset.suggested_models.a} vs {preset.suggested_models.b}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Custom Card — last in stagger sequence */}
          <motion.div
            variants={cardVariants}
            whileHover={{
              scale: 1.025,
              boxShadow: '0 0 28px rgba(139, 92, 246, 0.20)',
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="h-full bg-bg-card border-border-custom border-dashed hover:bg-bg-card-hover cursor-pointer transition-colors group"
              onClick={handleCustom}
            >
              <CardContent className="p-5 space-y-3 flex flex-col items-center justify-center min-h-[160px]">
                <span className="text-3xl opacity-50 group-hover:opacity-100 transition-opacity">+</span>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-text-dim group-hover:text-accent transition-colors">
                    Custom
                  </h3>
                  <p className="text-sm text-text-dim mt-1">
                    Write your own seed and system prompt
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
