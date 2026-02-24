import { useState, useEffect, useRef, useMemo } from 'react'
import type { VocabWord } from '@/api/types'

interface VocabBurstChartProps {
  words: VocabWord[]
  colorMap: Record<string, string>
  onSelectWord: (word: VocabWord) => void
}

const PAD_LEFT = 40
const PAD_RIGHT = 20
const PAD_TOP = 16
const PAD_BOTTOM = 48
const MIN_BAR_W = 12
const MAX_BAR_W = 64

/**
 * Per-round vocabulary burst chart.
 * Bars show new words coined per round; burst rounds (mean + 1.5 * stddev)
 * are highlighted in amber with a glow ring.
 * Hover shows a tooltip listing all words coined that round.
 * Click selects the first word coined that round.
 */
export function VocabBurstChart({ words, colorMap, onSelectWord }: VocabBurstChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [hoveredRound, setHoveredRound] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; round: number } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 800))
    ro.observe(el)
    setWidth(el.clientWidth || 800)
    return () => ro.disconnect()
  }, [])

  // Group words by coined_round
  const perRound = useMemo(() => {
    const map: Record<number, VocabWord[]> = {}
    for (const w of words) {
      ;(map[w.coined_round] ??= []).push(w)
    }
    return map
  }, [words])

  const rounds = useMemo(
    () => Object.keys(perRound).map(Number).sort((a, b) => a - b),
    [perRound],
  )

  // Burst detection: mean + 1.5 * stddev threshold
  const { burstThreshold, mean: burstMean } = useMemo(() => {
    if (rounds.length === 0) return { burstThreshold: 0, mean: 0 }
    const counts = rounds.map(r => perRound[r].length)
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    const variance = counts.reduce((a, c) => a + (c - mean) ** 2, 0) / counts.length
    const stddev = Math.sqrt(variance)
    return { burstThreshold: mean + 1.5 * stddev, mean }
  }, [rounds, perRound])

  if (rounds.length === 0) return null

  const maxCount = Math.max(...rounds.map(r => perRound[r].length))
  const chartW = Math.max(1, width - PAD_LEFT - PAD_RIGHT)
  const chartH = 220

  const barW = Math.min(MAX_BAR_W, Math.max(MIN_BAR_W, chartW / rounds.length - 4))
  const slotW = chartW / rounds.length
  const barX = (round: number) => {
    const idx = rounds.indexOf(round)
    return PAD_LEFT + idx * slotW + (slotW - barW) / 2
  }
  const barH = (count: number) => (count / maxCount) * chartH
  const barY = (count: number) => PAD_TOP + chartH - barH(count)

  // y-axis ticks (0, maxCount/2, maxCount)
  const yTicks = [0, Math.round(maxCount / 2), maxCount].filter(
    (v, i, a) => a.indexOf(v) === i,
  )

  const totalH = PAD_TOP + chartH + PAD_BOTTOM

  // Participant color blend for normal bars (use first participant's color)
  const defaultColor = Object.values(colorMap)[0] ?? '#22d3ee'
  const burstColor = '#f59e0b'

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <div className="font-mono text-xs text-text-dim mb-2">
        // VOCAB BURST &mdash; new words per round
        {burstMean > 0 && (
          <span className="ml-3 text-amber-400">
            burst threshold: {burstThreshold.toFixed(1)} words/round
          </span>
        )}
      </div>

      <svg
        width={width}
        height={totalH}
        className="overflow-visible"
        onMouseLeave={() => { setHoveredRound(null); setTooltip(null) }}
      >
        <defs>
          <filter id="burst-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Y-axis */}
        {yTicks.map(tick => {
          const ty = PAD_TOP + chartH - (tick / maxCount) * chartH
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT - 4} y1={ty}
                x2={PAD_LEFT + chartW} y2={ty}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={ty}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={9}
                fontFamily="monospace"
                fill="#4a5568"
              >
                {tick}
              </text>
            </g>
          )
        })}

        {/* Burst threshold line */}
        {burstMean > 0 && burstThreshold <= maxCount && (
          <line
            x1={PAD_LEFT} y1={barY(burstThreshold)}
            x2={PAD_LEFT + chartW} y2={barY(burstThreshold)}
            stroke={burstColor}
            strokeWidth={1}
            strokeOpacity={0.35}
            strokeDasharray="4 3"
          />
        )}

        {/* Bars */}
        {rounds.map(round => {
          const count = perRound[round].length
          const isBurst = count > burstThreshold && burstThreshold > 0
          const isHovered = hoveredRound === round
          const x = barX(round)
          const h = barH(count)
          const y = barY(count)
          const color = isBurst ? burstColor : defaultColor
          const opacity = isHovered ? 0.9 : isBurst ? 0.75 : 0.45

          return (
            <g
              key={round}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const firstWord = perRound[round][0]
                if (firstWord) onSelectWord(firstWord)
              }}
              onMouseEnter={() => {
                setHoveredRound(round)
                setTooltip({ x: x + barW / 2, y, round })
              }}
              onMouseLeave={() => { setHoveredRound(null); setTooltip(null) }}
            >
              {/* Glow layer for burst bars */}
              {isBurst && (
                <rect
                  x={x - 2} y={y - 2}
                  width={barW + 4} height={h + 4}
                  rx={3}
                  fill={burstColor}
                  fillOpacity={0.15}
                  filter="url(#burst-glow)"
                />
              )}
              {/* Main bar */}
              <rect
                x={x} y={y}
                width={barW} height={h}
                rx={2}
                fill={color}
                fillOpacity={opacity}
                stroke={color}
                strokeWidth={isHovered ? 1.5 : 1}
                strokeOpacity={isBurst ? 0.9 : 0.5}
              />
              {/* Count label (only if bar is tall enough) */}
              {h > 20 && (
                <text
                  x={x + barW / 2}
                  y={y + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="monospace"
                  fill="#e2e8f0"
                  fillOpacity={0.85}
                  pointerEvents="none"
                >
                  {count}
                </text>
              )}
              {/* X-axis round label */}
              <text
                x={x + barW / 2}
                y={PAD_TOP + chartH + 16}
                textAnchor="middle"
                fontSize={9}
                fontFamily="monospace"
                fill={isBurst ? burstColor : '#4a5568'}
                fillOpacity={isBurst ? 0.9 : 1}
              >
                {round}
              </text>
            </g>
          )
        })}

        {/* X-axis label */}
        <text
          x={PAD_LEFT + chartW / 2}
          y={totalH - 4}
          textAnchor="middle"
          fontSize={9}
          fontFamily="monospace"
          fill="#374151"
          letterSpacing={1}
        >
          // ROUND
        </text>
      </svg>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-bg-card border border-border-custom rounded px-3 py-2 text-xs font-mono pointer-events-none shadow-lg"
          style={{
            left: tooltip.x,
            top: Math.max(0, tooltip.y - 8),
            transform: 'translate(-50%, -100%)',
            maxWidth: 240,
          }}
        >
          <div className="text-text-dim mb-1">
            Round {tooltip.round} &mdash; {perRound[tooltip.round].length} new word{perRound[tooltip.round].length !== 1 ? 's' : ''}
            {perRound[tooltip.round].length > burstThreshold && burstThreshold > 0 && (
              <span className="ml-1 text-amber-400">&#9650; burst</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {perRound[tooltip.round].slice(0, 12).map(w => (
              <span
                key={w.id}
                className="text-text-primary"
                style={{ color: colorMap[w.coined_by] ?? undefined }}
              >
                {w.word}
              </span>
            ))}
            {perRound[tooltip.round].length > 12 && (
              <span className="text-text-dim">+{perRound[tooltip.round].length - 12} more</span>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 font-mono text-xs text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: defaultColor, opacity: 0.55 }} />
          normal round
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400 opacity-80" />
          burst round
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 border-t border-dashed border-amber-400 opacity-40" />
          threshold
        </span>
      </div>
    </div>
  )
}
