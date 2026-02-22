import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { VocabWord } from '@/api/types'

interface ConstellationGraphProps {
  words: VocabWord[]
  modelA: string   // display name for color mapping
  modelB: string
  onNodeClick?: (word: VocabWord) => void
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  word: VocabWord
  r: number
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
}

const MODEL_A_COLOR = '#6366f1'  // indigo, matches tailwind model-a
const MODEL_B_COLOR = '#f59e0b'  // amber, matches tailwind model-b

/**
 * D3 force-directed graph showing vocabulary relationships.
 *
 * React owns the <svg> via ref. D3 owns everything inside it via useEffect.
 * This is the standard React + D3 pattern — React renders the container,
 * D3 handles the physics simulation and DOM manipulation imperatively.
 */
export function ConstellationGraph({
  words,
  modelA,
  modelB,
  onNodeClick,
}: ConstellationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || words.length < 2) return

    const width = containerRef.current.clientWidth
    const height = Math.max(400, containerRef.current.clientHeight)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove() // clear previous render
    svg.attr('width', width).attr('height', height)

    // Build nodes
    const nodes: SimNode[] = words.map((w) => ({
      id: w.word,
      word: w,
      r: Math.max(10, Math.min(30, 10 + (w.usage_count - 1) * 5)),
    }))

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // Build links from parent_words
    const links: SimLink[] = words.flatMap((w) =>
      (w.parent_words ?? [])
        .filter((parent) => nodeMap.has(parent))
        .map((parent) => ({
          source: parent,
          target: w.word,
        })),
    )

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(100),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => d.r + 6))

    // Render links
    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#2a3146')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)

    // Render nodes
    const node = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) =>
        d.word.coined_by === modelA ? MODEL_A_COLOR : MODEL_B_COLOR,
      )
      .attr('fill-opacity', 0.7)
      .attr('stroke', (d) =>
        d.word.coined_by === modelA ? MODEL_A_COLOR : MODEL_B_COLOR,
      )
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => onNodeClick?.(d.word))

    // Render labels
    const label = svg
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => d.id)
      .attr('font-size', 11)
      .attr('font-family', 'monospace')
      .attr('fill', '#e2e8f0')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.r + 14)
      .attr('pointer-events', 'none')

    // Drag behavior
    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(drag)

    // Tooltip on hover
    node.append('title').text((d) => {
      const w = d.word
      return `${w.word}${w.meaning ? `: ${w.meaning}` : ''}\nCoined by ${w.coined_by} (Round ${w.coined_round})`
    })

    // Tick: update positions
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x!)
        .attr('y1', (d) => (d.source as SimNode).y!)
        .attr('x2', (d) => (d.target as SimNode).x!)
        .attr('y2', (d) => (d.target as SimNode).y!)

      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)

      label.attr('x', (d) => d.x!).attr('y', (d) => d.y!)
    })

    return () => {
      simulation.stop()
    }
  }, [words, modelA, modelB, onNodeClick])

  if (words.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-text-dim text-sm">
        Graph appears as words are coined (need at least 2)
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-[500px]">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
