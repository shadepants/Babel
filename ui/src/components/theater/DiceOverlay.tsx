import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface DiceOverlayProps {
  roll: {
    skill: string
    dc: number
    result: number
    success: boolean
  } | null
  onComplete: () => void
}

/**
 * 3D-ish Dice Roll animation — triggered by [CHECK: ...] tags in the transcript.
 * Renders a d20-style octagon that spins and reveals the final number.
 */
export function DiceOverlay({ roll, onComplete }: DiceOverlayProps) {
  const [phase, setPhase] = useState<'spin' | 'reveal' | 'done'>('spin')

  useEffect(() => {
    if (!roll) {
      setPhase('spin')
      return
    }

    const t1 = setTimeout(() => setPhase('reveal'), 800)
    const t2 = setTimeout(() => {
      setPhase('done')
      setTimeout(onComplete, 1000)
    }, 2500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [roll, onComplete])

  if (!roll) return null

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.5, opacity: 0, filter: 'blur(20px)' }}
            className="relative"
          >
            {/* Glow backing */}
            <div className={`absolute inset-0 blur-3xl opacity-40 scale-150 ${roll.success ? 'bg-emerald-500' : 'bg-red-500'}`} />

            <div className="relative bg-zinc-950/90 border-2 border-accent/40 w-32 h-32 flex flex-col items-center justify-center rounded-xl backdrop-blur-xl shadow-2xl">
              <div className="absolute -top-6 bg-accent/20 border border-accent/40 px-3 py-0.5 rounded-full font-mono text-[9px] text-accent tracking-widest uppercase">
                {roll.skill} DC{roll.dc}
              </div>

              {phase === 'spin' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 border-4 border-dashed border-accent/30 rounded-full"
                />
              ) : (
                <motion.div
                  initial={{ scale: 0.5, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className={`font-display font-black text-5xl italic ${roll.success ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {roll.result}
                </motion.div>
              )}

              <div className="absolute -bottom-6 font-mono text-[10px] tracking-tighter text-text-dim/60 uppercase">
                {phase === 'reveal' ? (roll.success ? 'SUCCESS' : (roll.result === 1 ? 'CRITICAL FAILURE' : 'FAILURE')) : 'ROLLING...'}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
