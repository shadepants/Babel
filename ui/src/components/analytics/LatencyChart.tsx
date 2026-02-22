import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { TurnStatRow } from '@/api/types'

interface LatencyChartProps {
  data: TurnStatRow[]
  modelAName: string
  modelBName: string
  height?: number
}

const MODEL_A_COLOR = '#6366f1' // indigo
const MODEL_B_COLOR = '#f59e0b' // amber
const AXIS_COLOR = '#2a3146'
const TEXT_COLOR = '#64748b'
const MARGIN = { top: 20, right: 20, bottom: 35, left: 50 }

/**
 * D3 dual-line chart comparing per-round latency between two models.
 * Model A in indigo, Model B in amber — consistent with the rest of the app.
 */
export function LatencyChart({ data, modelAName, modelBName, height = 250 }: LatencyChartProps) {
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

    // Combine both latency arrays for Y domain
    const allLatencies = data.flatMap((d) =>
      [d.model_a_latency, d.model_b_latency].filter((v): v is number => v != null),
    )

    const xScale = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.round) ?? 1, d3.max(data, (d) => d.round) ?? 1])
      .range([0, innerW])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allLatencies) ?? 1])
      .nice()
      .range([innerH, 0])

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(data.length, 10)).tickFormat(d3.format('d')))
      .call((g) => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10))
      .call((g) => g.selectAll('line, path').attr('stroke', AXIS_COLOR))

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .call((g) => g.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10))
      .call((g) => g.selectAll('line, path').attr('stroke', AXIS_COLOR))

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 30)
      .attr('text-anchor', 'middle').attr('fill', TEXT_COLOR).attr('font-size', 11)
      .text('Round')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2).attr('y', -40)
      .attr('text-anchor', 'middle').attr('fill', TEXT_COLOR).attr('font-size', 11)
      .text('Latency (s)')

    // Helper to draw a line + dots for one model
    function drawLine(
      accessor: (d: TurnStatRow) => number | null,
      color: string,
      label: string,
    ) {
      const validData = data.filter((d) => accessor(d) != null)
      if (validData.length === 0) return

      const line = d3.line<TurnStatRow>()
        .defined((d) => accessor(d) != null)
        .x((d) => xScale(d.round))
        .y((d) => yScale(accessor(d)!))
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(validData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', line)

      g.selectAll(`.dot-${label}`)
        .data(validData)
        .join('circle')
        .attr('cx', (d) => xScale(d.round))
        .attr('cy', (d) => yScale(accessor(d)!))
        .attr('r', 3.5)
        .attr('fill', color)
        .append('title')
        .text((d) => `${label} R${d.round}: ${accessor(d)?.toFixed(1)}s`)
    }

    drawLine((d) => d.model_a_latency, MODEL_A_COLOR, modelAName)
    drawLine((d) => d.model_b_latency, MODEL_B_COLOR, modelBName)

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${MARGIN.left + 10}, 10)`)

    const items = [
      { label: modelAName, color: MODEL_A_COLOR },
      { label: modelBName, color: MODEL_B_COLOR },
    ]
    items.forEach((item, i) => {
      const lg = legend.append('g').attr('transform', `translate(${i * 160}, 0)`)
      lg.append('line')
        .attr('x1', 0).attr('y1', 5).attr('x2', 20).attr('y2', 5)
        .attr('stroke', item.color).attr('stroke-width', 2)
      lg.append('text')
        .attr('x', 25).attr('y', 9)
        .attr('fill', TEXT_COLOR).attr('font-size', 10)
        .text(item.label)
    })
  }, [data, modelAName, modelBName, height])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-dim text-sm">
        No latency data yet
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
