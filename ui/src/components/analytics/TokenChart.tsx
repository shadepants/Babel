import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { TurnStatRow } from '@/api/types'

interface TokenChartProps {
  data: TurnStatRow[]
  modelAName: string
  modelBName: string
  height?: number
}

const COLOR_A = '#F59E0B'
const COLOR_B = '#06B6D4'
const AXIS_COLOR = '#2a3146'
const TEXT_COLOR = '#64748b'

/**
 * D3 grouped bar chart showing tokens per round for both models.
 * Visualizes how verbose each model gets as the conversation deepens.
 */
export function TokenChart({ data, modelAName, modelBName, height = 240 }: TokenChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return

    const width = containerRef.current.clientWidth
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const margin = { top: 12, right: 16, bottom: 32, left: 48 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const maxTokens = d3.max(data, (d) =>
      Math.max(d.model_a_tokens ?? 0, d.model_b_tokens ?? 0)
    ) ?? 100

    const x0 = d3.scaleBand()
      .domain(data.map((d) => String(d.round)))
      .range([0, innerW])
      .paddingInner(0.25)
      .paddingOuter(0.1)

    const x1 = d3.scaleBand()
      .domain(['a', 'b'])
      .range([0, x0.bandwidth()])
      .padding(0.08)

    const y = d3.scaleLinear()
      .domain([0, maxTokens * 1.1])
      .range([innerH, 0])

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(() => ''))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', AXIS_COLOR).attr('stroke-opacity', 0.3))

    // Bars — Model A
    g.selectAll('.bar-a')
      .data(data)
      .join('rect')
      .attr('x', (d) => (x0(String(d.round)) ?? 0) + (x1('a') ?? 0))
      .attr('y', (d) => y(d.model_a_tokens ?? 0))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => innerH - y(d.model_a_tokens ?? 0))
      .attr('fill', COLOR_A)
      .attr('fill-opacity', 0.7)
      .attr('rx', 2)

    // Bars — Model B
    g.selectAll('.bar-b')
      .data(data)
      .join('rect')
      .attr('x', (d) => (x0(String(d.round)) ?? 0) + (x1('b') ?? 0))
      .attr('y', (d) => y(d.model_b_tokens ?? 0))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => innerH - y(d.model_b_tokens ?? 0))
      .attr('fill', COLOR_B)
      .attr('fill-opacity', 0.7)
      .attr('rx', 2)

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickFormat((d) => `R${d}`))
      .call((g) => g.select('.domain').attr('stroke', AXIS_COLOR))
      .call((g) => g.selectAll('.tick text').attr('fill', TEXT_COLOR).attr('font-size', 10))
      .call((g) => g.selectAll('.tick line').attr('stroke', AXIS_COLOR))

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(4))
      .call((g) => g.select('.domain').attr('stroke', AXIS_COLOR))
      .call((g) => g.selectAll('.tick text').attr('fill', TEXT_COLOR).attr('font-size', 10))
      .call((g) => g.selectAll('.tick line').attr('stroke', AXIS_COLOR))

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${margin.left + 8},${height - 8})`)
    legend.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', COLOR_A).attr('fill-opacity', 0.7)
    legend.append('text').attr('x', 14).attr('y', 9).attr('fill', TEXT_COLOR).attr('font-size', 10).text(modelAName)
    const offset = modelAName.length * 6 + 28
    legend.append('rect').attr('x', offset).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', COLOR_B).attr('fill-opacity', 0.7)
    legend.append('text').attr('x', offset + 14).attr('y', 9).attr('fill', TEXT_COLOR).attr('font-size', 10).text(modelBName)
  }, [data, modelAName, modelBName, height])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-dim text-sm">
        No token data yet
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
