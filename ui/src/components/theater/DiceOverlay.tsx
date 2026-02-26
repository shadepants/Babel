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
 * Cinematic dice roll event — triggered by [CHECK: ...] tags in the DM's transcript.
 *
 * Full-screen backdrop + large card. Slow dramatic reveal (1.2s spin, 4s total).
 * Detects critical success (20) and critical failure (1) for special labels.
 */
export function DiceOverlay({ roll, onComplete }: DiceOverlayProps) {
  const [phase, setPhase] = useState<'spin' | 'reveal' | 'done'>('spin')

  useEffect(() => {
    if (!roll) {
      setPhase('spin')
      return
    }
    const t1 = setTimeout(() => setPhase('reveal'), 1200)
    const t2 = setTimeout(() => {
      setPhase('done')
      setTimeout(onComplete, 800)
    }, 4000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [roll, onComplete])

  if (!roll) return null

  const isCritSuccess = roll.result === 20
  const isCritFail = roll.result === 1
  const resultLabel =
    isCritSuccess ? 'CRITICAL SUCCESS'
    : isCritFail ? 'CRITICAL FAILURE'
    : roll.success ? 'SUCCESS'
    : 'FAILURE'

  const glowColor = roll.success ? '#10B981' : '#EF4444'
  const borderColor = roll.success ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'
  const accentColor = roll.success ? '#34D399' : '#F87171'
  const labelColor = roll.success ? '#6EE7B7' : '#FCA5A5'
  const labelBg = roll.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'
  const labelBorder = roll.success ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)'

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <>
          {/* Full-screen dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[99] pointer-events-none"
            style={{ background: 'rgba(5,8,20,0.78)', backdropFilter: 'blur(4px)' }}
          />

          {/* Centered dice card */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.15, opacity: 0, y: -30, filter: 'blur(24px)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="relative flex flex-col items-center"
            >
              {/* Outer glow bloom */}
              <div
                className="absolute inset-0 rounded-2xl scale-150 blur-3xl opacity-25 pointer-events-none"
                style={{ background: glowColor }}
              />

              {/* Card */}
              <div
                className="relative flex flex-col items-center justify-center gap-4 rounded-2xl"
                style={{
                  width: '224px',
                  height: '224px',
                  background: 'rgba(5,8,22,0.97)',
                  border: `2px solid ${borderColor}`,
                  boxShadow: `0 0 80px ${glowColor}22, inset 0 0 40px ${glowColor}08`,
                }}
              >
                {/* Skill + DC pill — above card */}
                <div
                  className="absolute -top-5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background: labelBg, border: `1px solid ${labelBorder}`, color: labelColor }}
                >
                  {roll.skill} &mdash; DC {roll.dc}
                </div>

                {/* Spinner or number */}
                {phase === 'spin' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.16, repeat: Infinity, ease: 'linear' }}
                    className="rounded-full"
                    style={{
                      width: 84,
                      height: 84,
                      border: '3px dashed',
                      borderColor: `${glowColor}40`,
                    }}
                  />
                ) : (
                  <motion.div
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                    className="font-display font-black italic leading-none tabular-nums"
                    style={{
                      fontSize: '92px',
                      color: accentColor,
                      textShadow: `0 0 50px ${accentColor}70`,
                    }}
                  >
                    {roll.result}
                  </motion.div>
                )}

                {/* Result pill — below card */}
                <div
                  className="absolute -bottom-5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background: labelBg, border: `1px solid ${labelBorder}`, color: labelColor }}
                >
                  {phase === 'reveal' ? resultLabel : 'ROLLING...'}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
