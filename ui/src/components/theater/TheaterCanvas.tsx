import { useRef, useEffect } from 'react'
import type { TurnEvent, VocabEvent } from '@/api/types'

const COLOR_A = 'rgba(245, 158, 11'   // amber — model A
const COLOR_B = 'rgba(6, 182, 212'    // cyan  — model B

interface Animation {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
  color: string
  type: 'ring' | 'vocab'
}

interface TheaterCanvasProps {
  lastTurn: TurnEvent | null
  lastVocab: VocabEvent | null
  modelAName: string
}

/**
 * Full-bleed canvas behind the Theater split columns.
 * Draws expanding pulse rings on each turn and particle bursts on vocab discoveries.
 * All animation is pure canvas + requestAnimationFrame — zero dependencies.
 */
export function TheaterCanvas({ lastTurn, lastVocab, modelAName }: TheaterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animsRef  = useRef<Animation[]>([])
  const rafRef    = useRef<number>(undefined)

  // Track last-seen IDs to avoid double-firing on re-render
  const lastTurnIdRef  = useRef<string | number | null>(null)
  const lastVocabRef   = useRef<string | null>(null)

  // ── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Remove dead animations
      animsRef.current = animsRef.current.filter(a => a.opacity > 0.005)

      for (const a of animsRef.current) {
        if (a.type === 'ring') {
          // Expanding glow ring
          ctx.beginPath()
          ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2)
          ctx.strokeStyle = `${a.color}, ${a.opacity})`
          ctx.lineWidth = 2.5
          ctx.stroke()

          // Inner softer ring
          ctx.beginPath()
          ctx.arc(a.x, a.y, a.radius * 0.6, 0, Math.PI * 2)
          ctx.strokeStyle = `${a.color}, ${a.opacity * 0.3})`
          ctx.lineWidth = 8
          ctx.stroke()

          a.radius += (a.maxRadius - a.radius) * 0.035
          a.opacity *= 0.965

        } else {
          // Vocab burst — 12 radiating dots
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2
            const r = a.radius
            ctx.beginPath()
            ctx.arc(
              a.x + Math.cos(angle) * r,
              a.y + Math.sin(angle) * r,
              2.5, 0, Math.PI * 2,
            )
            ctx.fillStyle = `${a.color}, ${a.opacity})`
            ctx.fill()
          }
          // Central flash
          ctx.beginPath()
          ctx.arc(a.x, a.y, Math.max(0, 8 - a.radius * 0.2), 0, Math.PI * 2)
          ctx.fillStyle = `${a.color}, ${a.opacity * 0.6})`
          ctx.fill()

          a.radius += 2.8
          a.opacity *= 0.91
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  // ── Spawn pulse ring on new turn ─────────────────────────────────────────
  useEffect(() => {
    if (!lastTurn) return
    if (lastTurn.turn_id === lastTurnIdRef.current) return
    lastTurnIdRef.current = lastTurn.turn_id

    const canvas = canvasRef.current
    if (!canvas) return

    const isA  = lastTurn.speaker === modelAName
    const color = isA ? COLOR_A : COLOR_B

    animsRef.current.push({
      x: isA ? canvas.width * 0.25 : canvas.width * 0.75,
      y: canvas.height * 0.45,
      radius: 50,
      maxRadius: 320,
      opacity: 0.65,
      color,
      type: 'ring',
    })
  }, [lastTurn, modelAName])

  // ── Spawn vocab burst on new word ────────────────────────────────────────
  useEffect(() => {
    if (!lastVocab) return
    if (lastVocab.word === lastVocabRef.current) return
    lastVocabRef.current = lastVocab.word

    const canvas = canvasRef.current
    if (!canvas) return

    const isA  = lastVocab.coined_by === modelAName
    const color = isA ? COLOR_A : COLOR_B

    animsRef.current.push({
      x: isA ? canvas.width * 0.25 : canvas.width * 0.75,
      y: canvas.height * 0.28,
      radius: 0,
      maxRadius: 80,
      opacity: 1.0,
      color,
      type: 'vocab',
    })
  }, [lastVocab, modelAName])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
