import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { TurnScore } from '@/api/types'

interface RoundScoreChartProps {
  scores: TurnScore[]
  height?: number
}

const COLORS = {
  creativity: '#f59e0b',  // amber
  coherence:  '#22d3ee',  // cyan
  engagement: '#10b981',  // emerald
  novelty:    '#a78bfa',  // purple
}
const AXIS_COLOR = '#2a3146'
const TEXT_COLOR = '#64748b'
const MARGIN = { top: 20, right: 20, bottom: 35, left: 45 }

type ScoreKey = keyof typeof COLORS

/**
 * D3 line chart showing per-turn scores for all 4 dimensions.
 * Creativity (amber), Coherence (cyan), Engagement (emerald), Novelty (purple).
 */
export function RoundScoreChart({ scores, height = 250 }: RoundScoreChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || scores.length === 0) return

    const width = containerRef.current.clientWidth
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // X: turn index (1-based)
    const xScale = d3.scaleLinear()
      .domain([1, scores.length])
      .range([0, innerW])

    // Y: always 0–1
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerH, 0])

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(scores.length, 10)).tickFormat(d3.format('d')))
      .call((a) => a.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10))
      .call((a) => a.selectAll('line, path').attr('stroke', AXIS_COLOR))

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.1f')))
      .call((a) => a.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10))
      .call((a) => a.selectAll('line, path').attr('stroke', AXIS_COLOR))

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 30)
      .attr('text-anchor', 'middle').attr('fill', TEXT_COLOR).attr('font-size', 11)
      .text('Turn')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2).attr('y', -35)
      .attr('text-anchor', 'middle').attr('fill', TEXT_COLOR).attr('font-size', 11)
      .text('Score')

    // Draw one line per metric
    function drawLine(key: ScoreKey, color: string) {
      const indexed = scores.map((s, i) => ({ x: i + 1, y: s[key] }))

      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(indexed)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.8)
        .attr('d', line)

      g.selectAll(`.dot-${key}`)
        .data(indexed)
        .join('circle')
        .attr('cx', (d) => xScale(d.x))
        .attr('cy', (d) => yScale(d.y))
        .attr('r', 3)
        .attr('fill', color)
        .append('title')
        .text((d) => `${key} T${d.x}: ${d.y.toFixed(2)}`)
    }

    (Object.keys(COLORS) as ScoreKey[]).forEach((key) => drawLine(key, COLORS[key]))

    // Legend — top-left, 4 items in a row
    const legend = svg.append('g')
      .attr('transform', `translate(${MARGIN.left + 8}, 10)`)

    ;(Object.entries(COLORS) as [ScoreKey, string][]).forEach(([key, color], i) => {
      const lg = legend.append('g').attr('transform', `translate(${i * 100}, 0)`)
      lg.append('line')
        .attr('x1', 0).attr('y1', 5).attr('x2', 16).attr('y2', 5)
        .attr('stroke', color).attr('stroke-width', 2)
      lg.append('text')
        .attr('x', 20).attr('y', 9)
        .attr('fill', TEXT_COLOR).attr('font-size', 10)
        .text(key)
    })
  }, [scores, height])

  if (scores.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 font-mono text-[10px] text-text-dim/50 tracking-wider">
        // no scoring data
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
