import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { VocabGrowthRow } from '@/api/types'

interface VocabGrowthChartProps {
  data: VocabGrowthRow[]
  height?: number
}

const ACCENT = '#8b5cf6'    // purple accent
const AXIS_COLOR = '#2a3146' // border-custom
const TEXT_COLOR = '#64748b'  // text-dim
const MARGIN = { top: 20, right: 20, bottom: 35, left: 45 }

/**
 * D3 line chart showing cumulative vocabulary growth by round.
 * Follows the same useRef + useEffect pattern as ConstellationGraph.
 */
export function VocabGrowthChart({ data, height = 250 }: VocabGrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return

    const width = containerRef.current.clientWidth
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // Scales
    const xScale = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.round) ?? 1, d3.max(data, (d) => d.round) ?? 1])
      .range([0, innerW])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.cumulative_count) ?? 1])
      .nice()
      .range([innerH, 0])

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(data.length, 10)).tickFormat(d3.format('d')))
      .call((g) => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10))
      .call((g) => g.selectAll('line, path').attr('stroke', AXIS_COLOR))

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('d')))
      .call((g) => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10))
      .call((g) => g.selectAll('line, path').attr('stroke', AXIS_COLOR))

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 30)
      .attr('text-anchor', 'middle').attr('fill', TEXT_COLOR).attr('font-size', 11)
      .text('Round')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2).attr('y', -35)
      .attr('text-anchor', 'middle').attr('fill', TEXT_COLOR).attr('font-size', 11)
      .text('Words')

    // Line
    const line = d3.line<VocabGrowthRow>()
      .x((d) => xScale(d.round))
      .y((d) => yScale(d.cumulative_count))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', ACCENT)
      .attr('stroke-width', 2.5)
      .attr('d', line)

    // Dots
    g.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (d) => xScale(d.round))
      .attr('cy', (d) => yScale(d.cumulative_count))
      .attr('r', 4)
      .attr('fill', ACCENT)
      .append('title')
      .text((d) => `Round ${d.round}: ${d.cumulative_count} words`)
  }, [data, height])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-dim text-sm">
        No vocabulary data yet
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
