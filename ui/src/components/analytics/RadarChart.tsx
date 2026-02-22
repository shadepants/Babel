import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { RadarDataPoint } from '@/api/types'

interface RadarChartProps {
  data: RadarDataPoint[]
  height?: number
}

const AXIS_COLOR = '#2a3146'
const TEXT_COLOR = '#64748b'
const LEVELS = 5 // concentric rings
const AXES = ['Verbosity', 'Speed', 'Creativity', 'Consistency', 'Engagement']

/**
 * D3 radar/spider chart for model personality comparison.
 * Each model renders as a filled polygon over 5 normalized axes.
 * Follows the same useRef + useEffect pattern as VocabGrowthChart.
 */
export function RadarChart({ data, height = 320 }: RadarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return

    const width = containerRef.current.clientWidth
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const radius = Math.min(width, height) / 2 - 40
    const cx = width / 2
    const cy = height / 2
    const numAxes = AXES.length
    const angleSlice = (2 * Math.PI) / numAxes

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`)

    // Concentric level rings
    for (let level = 1; level <= LEVELS; level++) {
      const r = (radius / LEVELS) * level
      const points = AXES.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2
        return [r * Math.cos(angle), r * Math.sin(angle)] as [number, number]
      })
      g.append('polygon')
        .attr('points', points.map((p) => p.join(',')).join(' '))
        .attr('fill', 'none')
        .attr('stroke', AXIS_COLOR)
        .attr('stroke-opacity', 0.3)
        .attr('stroke-dasharray', level < LEVELS ? '2,3' : 'none')
    }

    // Axis lines + labels
    AXES.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle)

      g.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', x).attr('y2', y)
        .attr('stroke', AXIS_COLOR)
        .attr('stroke-opacity', 0.4)

      const labelR = radius + 16
      g.append('text')
        .attr('x', labelR * Math.cos(angle))
        .attr('y', labelR * Math.sin(angle))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', TEXT_COLOR)
        .attr('font-size', 11)
        .text(axis)
    })

    // Model polygons
    data.forEach((model) => {
      const points = model.axes.map((a, i) => {
        const angle = angleSlice * i - Math.PI / 2
        const r = radius * a.value
        return [r * Math.cos(angle), r * Math.sin(angle)] as [number, number]
      })

      // Filled area
      g.append('polygon')
        .attr('points', points.map((p) => p.join(',')).join(' '))
        .attr('fill', model.color)
        .attr('fill-opacity', 0.15)
        .attr('stroke', model.color)
        .attr('stroke-width', 2)

      // Vertex dots
      points.forEach((p, i) => {
        g.append('circle')
          .attr('cx', p[0]).attr('cy', p[1])
          .attr('r', 3.5)
          .attr('fill', model.color)
          .append('title')
          .text(`${model.display_name}: ${model.axes[i].axis} = ${(model.axes[i].value * 100).toFixed(0)}%`)
      })
    })

    // Legend at bottom
    const legendY = height / 2 - 20
    const legendX = -((data.length - 1) * 90) / 2
    data.forEach((model, i) => {
      const lx = legendX + i * 90
      g.append('rect')
        .attr('x', lx).attr('y', legendY)
        .attr('width', 12).attr('height', 12)
        .attr('rx', 2)
        .attr('fill', model.color)

      g.append('text')
        .attr('x', lx + 16).attr('y', legendY + 10)
        .attr('fill', TEXT_COLOR)
        .attr('font-size', 10)
        .text(model.display_name)
    })
  }, [data, height])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-dim text-sm">
        No radar data yet
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
