import { useState, useEffect, useRef, useMemo } from 'react'
import type { VocabWord } from '@/api/types'

interface VocabTimelineProps {
  /** All words in the experiment — used for etymology lookup */
  words: VocabWord[]
  /** Filtered subset to display (may be smaller than words) */
  filteredWords: VocabWord[]
  /** name -> hex color map from buildParticipantColorMap */
  colorMap: Record<string, string>
  onSelectWord: (word: VocabWord) => void
}

const LANE_H = 84
const AXIS_H = 36
const PAD_TOP = 12
const PAD_LEFT = 82
const PAD_RIGHT = 16
const CHIP_H = 20
const CHIP_W = 76
const CHIP_GAP = 3
const MAX_CHIPS_PER_CELL = 3

/**
 * Swimlane timeline: one horizontal lane per participant, word chips placed
 * at their coined_round position.  Etymology arrows connect parent -> child.
 *
 * Pure React SVG — no D3 force simulation needed since layout is a grid.
 * ResizeObserver drives the responsive width.
 */
export function VocabTimeline({
  words,
  filteredWords,
  colorMap,
  onSelectWord,
}: VocabTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    word: VocabWord
  } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth || 800)
    })
    ro.observe(el)
    setWidth(el.clientWidth || 800)
    return () => ro.disconnect()
  }, [])

  // Ordered participant list — first appearance in all words (stable order)
  const participants = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const w of words) {
      if (!seen.has(w.coined_by)) {
        seen.add(w.coined_by)
        ordered.push(w.coined_by)
      }
    }
    return ordered
  }, [words])

  const maxRound = useMemo(
    () => Math.max(1, ...words.map((w) => w.coined_round)),
    [words],
  )

  // Group filteredWords by "round::participant" key
  const cells = useMemo(() => {
    const map: Record<string, VocabWord[]> = {}
    for (const w of filteredWords) {
      const key = `${w.coined_round}::${w.coined_by}`
      if (!map[key]) map[key] = []
      map[key].push(w)
    }
    return map
  }, [filteredWords])

  // Etymology pairs where BOTH parent and child are visible in filteredWords
  const etymologyArrows = useMemo(() => {
    const visibleNames = new Set(filteredWords.map((w) => w.word))
    const wordByName: Record<string, VocabWord> = {}
    for (const w of words) wordByName[w.word] = w

    const arrows: { from: VocabWord; to: VocabWord }[] = []
    for (const w of filteredWords) {
      for (const parentName of w.parent_words ?? []) {
        const parent = wordByName[parentName]
        if (parent && visibleNames.has(parentName)) {
          arrows.push({ from: parent, to: w })
        }
      }
    }
    return arrows
  }, [words, filteredWords])

  if (participants.length === 0 || filteredWords.length === 0) return null

  const chartW = Math.max(1, width - PAD_LEFT - PAD_RIGHT)
  const roundW = chartW / maxRound
  const totalH = participants.length * LANE_H + AXIS_H + PAD_TOP

  const roundX = (round: number) => PAD_LEFT + (round - 0.5) * roundW
  const laneY = (participant: string) => {
    const i = participants.indexOf(participant)
    return PAD_TOP + i * LANE_H
  }

  // Compute chip rects for a given cell (up to MAX_CHIPS_PER_CELL + overflow)
  function cellChips(
    round: number,
    participant: string,
  ): { word: VocabWord | null; x: number; y: number; overflow?: number }[] {
    const cellWords = cells[`${round}::${participant}`] ?? []
    if (!cellWords.length) return []

    const cx = roundX(round)
    const midY = laneY(participant) + LANE_H / 2
    const visible = cellWords.slice(0, MAX_CHIPS_PER_CELL)
    const overflowCount = cellWords.length - MAX_CHIPS_PER_CELL
    const totalChips = visible.length + (overflowCount > 0 ? 1 : 0)
    const totalH = totalChips * CHIP_H + (totalChips - 1) * CHIP_GAP
    const startY = midY - totalH / 2

    const result: { word: VocabWord | null; x: number; y: number; overflow?: number }[] = visible.map((w, i) => ({
      word: w,
      x: cx - CHIP_W / 2,
      y: startY + i * (CHIP_H + CHIP_GAP),
    }))
    if (overflowCount > 0) {
      result.push({
        word: null,
        x: cx - CHIP_W / 2,
        y: startY + visible.length * (CHIP_H + CHIP_GAP),
        overflow: overflowCount,
      })
    }
    return result
  }

  // Find the center of a specific word's chip (for etymology arrows)
  function chipCenter(w: VocabWord): { x: number; y: number } | null {
    const cellWords = cells[`${w.coined_round}::${w.coined_by}`]
    if (!cellWords) return null
    const idx = cellWords.slice(0, MAX_CHIPS_PER_CELL).indexOf(w)
    if (idx === -1) return null
    const chips = cellChips(w.coined_round, w.coined_by)
    const chip = chips[idx]
    if (!chip) return null
    return { x: chip.x + CHIP_W / 2, y: chip.y + CHIP_H / 2 }
  }

  // Truncate word name to fit inside chip
  function truncate(s: string, maxLen = 9): string {
    return s.length > maxLen ? s.slice(0, maxLen - 1) + '\u2026' : s
  }

  function shortLabel(name: string, maxLen = 14): string {
    const after = name.split('/').pop() ?? name
    const trimmed = after.replace(/-\d{8}$/, '')
    return trimmed.length > maxLen ? trimmed.slice(0, maxLen - 2) + '..' : trimmed
  }

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <svg
        width={width}
        height={totalH}
        className="overflow-visible"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Lane backgrounds */}
        {participants.map((p, i) => (
          <rect
            key={p}
            x={PAD_LEFT}
            y={PAD_TOP + i * LANE_H}
            width={chartW}
            height={LANE_H}
            fill={i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.08)'}
            rx={2}
          />
        ))}

        {/* Lane labels */}
        {participants.map((p) => (
          <text
            key={p}
            x={PAD_LEFT - 8}
            y={laneY(p) + LANE_H / 2}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fontFamily="monospace"
            fill={colorMap[p] ?? '#888'}
          >
            {shortLabel(p)}
          </text>
        ))}

        {/* Vertical round grid lines + x-axis labels */}
        {Array.from({ length: maxRound }, (_, i) => i + 1).map((round) => (
          <g key={round}>
            <line
              x1={roundX(round)}
              y1={PAD_TOP}
              x2={roundX(round)}
              y2={PAD_TOP + participants.length * LANE_H}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={roundX(round)}
              y={PAD_TOP + participants.length * LANE_H + 16}
              textAnchor="middle"
              fontSize={10}
              fontFamily="monospace"
              fill="#4a5568"
            >
              {round}
            </text>
          </g>
        ))}

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

        {/* Arrow marker defs */}
        <defs>
          {participants.map((p) => {
            const safeId = p.replace(/[^a-zA-Z0-9]/g, '_')
            const color = colorMap[p] ?? '#888'
            return (
              <marker
                key={p}
                id={`etym-arrow-${safeId}`}
                viewBox="0 0 10 10"
                refX={8}
                refY={5}
                markerWidth={4}
                markerHeight={4}
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity={0.5} />
              </marker>
            )
          })}
        </defs>

        {/* Etymology arrows */}
        {etymologyArrows.map(({ from, to }, i) => {
          const fc = chipCenter(from)
          const tc = chipCenter(to)
          if (!fc || !tc) return null
          const safeId = to.coined_by.replace(/[^a-zA-Z0-9]/g, '_')
          const color = colorMap[to.coined_by] ?? '#888'
          // Quadratic bezier — bow upward for same-lane, curve between lanes
          const midX = (fc.x + tc.x) / 2
          const bowY =
            from.coined_by === to.coined_by
              ? Math.min(fc.y, tc.y) - 22
              : (fc.y + tc.y) / 2
          const d = `M${fc.x},${fc.y} Q${midX},${bowY} ${tc.x},${tc.y}`
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              strokeDasharray="3 2"
              markerEnd={`url(#etym-arrow-${safeId})`}
            />
          )
        })}

        {/* Word chips */}
        {participants.flatMap((p) =>
          Array.from({ length: maxRound }, (_, i) => i + 1).flatMap((round) => {
            const chips = cellChips(round, p)
            const color = colorMap[p] ?? '#888'
            return chips.map((chip, ci) => {
              if (chip.overflow !== undefined) {
                // Overflow indicator: "+N more"
                return (
                  <text
                    key={`${round}-${p}-overflow`}
                    x={chip.x + CHIP_W / 2}
                    y={chip.y + CHIP_H / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill={color}
                    fillOpacity={0.5}
                  >
                    +{chip.overflow}
                  </text>
                )
              }
              if (!chip.word) return null
              const w = chip.word
              return (
                <g
                  key={`${w.id}-${ci}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectWord(w)}
                  onMouseEnter={() =>
                    setTooltip({ x: chip.x + CHIP_W / 2, y: chip.y, word: w })
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  <rect
                    x={chip.x}
                    y={chip.y}
                    width={CHIP_W}
                    height={CHIP_H}
                    rx={3}
                    fill={color}
                    fillOpacity={0.2}
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={0.55}
                  />
                  <text
                    x={chip.x + CHIP_W / 2}
                    y={chip.y + CHIP_H / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill="#e2e8f0"
                    fillOpacity={0.9}
                    pointerEvents="none"
                  >
                    {truncate(w.word)}
                  </text>
                </g>
              )
            })
          }),
        )}
      </svg>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-bg-card border border-border-custom rounded px-2 py-1.5 text-xs font-mono pointer-events-none shadow-lg"
          style={{
            left: tooltip.x,
            top: Math.max(0, tooltip.y - 58),
            transform: 'translateX(-50%)',
            maxWidth: 200,
          }}
        >
          <span className="text-text-primary font-bold">{tooltip.word.word}</span>
          {tooltip.word.meaning && (
            <p className="text-text-dim mt-0.5 leading-tight whitespace-pre-wrap">
              {tooltip.word.meaning}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
