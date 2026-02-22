import { useRef, useEffect, useCallback } from 'react'
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
 * Uses incremental updates via D3's .data().join() pattern so new words
 * are smoothly added without destroying existing node positions or physics.
 * The simulation is created once and persisted across renders via useRef.
 */
export function ConstellationGraph({
  words,
  modelA,
  modelB,
  onNodeClick,
}: ConstellationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Persist D3 objects across renders so we don't destroy/rebuild the graph
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map())
  const gLinkRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const gNodeRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const gLabelRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)

  // Stable callback ref so the data-update effect doesn't re-run on callback identity change
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick

  const getColor = useCallback(
    (word: VocabWord) => word.coined_by === modelA ? MODEL_A_COLOR : MODEL_B_COLOR,
    [modelA, modelB],
  )

  // ── One-time init: create SVG groups + simulation (only rebuilds on model identity change) ──
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = Math.max(400, containerRef.current.clientHeight)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const gLink = svg.append('g').attr('class', 'links')
    const gNode = svg.append('g').attr('class', 'nodes')
    const gLabel = svg.append('g').attr('class', 'labels')

    gLinkRef.current = gLink
    gNodeRef.current = gNode
    gLabelRef.current = gLabel

    const simulation = d3
      .forceSimulation<SimNode, SimLink>([])
      .force('link', d3.forceLink<SimNode, SimLink>([]).id((d) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => d.r + 6))

    // Tick handler reads from the SVG groups directly — works with any data
    simulation.on('tick', () => {
      gLink.selectAll<SVGLineElement, SimLink>('line')
        .attr('x1', (d) => (d.source as SimNode).x!)
        .attr('y1', (d) => (d.source as SimNode).y!)
        .attr('x2', (d) => (d.target as SimNode).x!)
        .attr('y2', (d) => (d.target as SimNode).y!)

      gNode.selectAll<SVGCircleElement, SimNode>('circle')
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!)

      gLabel.selectAll<SVGTextElement, SimNode>('text')
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y!)
    })

    simRef.current = simulation
    nodeMapRef.current = new Map()

    return () => {
      simulation.stop()
      simRef.current = null
    }
  }, [modelA, modelB])

  // ── Incremental data update: add/update/remove nodes without tearing ──
  useEffect(() => {
    const simulation = simRef.current
    const gLink = gLinkRef.current
    const gNode = gNodeRef.current
    const gLabel = gLabelRef.current
    if (!simulation || !gLink || !gNode || !gLabel || words.length < 2) return

    const existingNodes = nodeMapRef.current

    // Build node list, preserving x/y positions of existing nodes
    const nodes: SimNode[] = words.map((w) => {
      const existing = existingNodes.get(w.word)
      if (existing) {
        existing.word = w
        existing.r = Math.max(10, Math.min(30, 10 + (w.usage_count - 1) * 5))
        return existing
      }
      return {
        id: w.word,
        word: w,
        r: Math.max(10, Math.min(30, 10 + (w.usage_count - 1) * 5)),
      }
    })

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    nodeMapRef.current = nodeMap

    // Build links from parent_words
    const links: SimLink[] = words.flatMap((w) =>
      (w.parent_words ?? [])
        .filter((parent) => nodeMap.has(parent))
        .map((parent) => ({ source: parent, target: w.word })),
    )

    // Feed new data to simulation
    simulation.nodes(nodes)
    ;(simulation.force('link') as d3.ForceLink<SimNode, SimLink>).links(links)

    // ── Join links ──
    gLink
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links, (d) =>
        `${(d.source as SimNode).id ?? d.source}-${(d.target as SimNode).id ?? d.target}`,
      )
      .join('line')
      .attr('stroke', '#2a3146')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)

    // ── Join nodes with enter/update/exit transitions ──
    const nodeSel = gNode
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(nodes, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append('circle')
            .attr('cx', (d) => d.x ?? 0)
            .attr('cy', (d) => d.y ?? 0)
            .attr('r', 0)
            .attr('cursor', 'pointer')
            .call((s) => s.transition().duration(300).attr('r', (d) => d.r)),
        (update) =>
          update.call((s) => s.transition().duration(300).attr('r', (d) => d.r)),
        (exit) =>
          exit.call((s) => s.transition().duration(200).attr('r', 0).remove()),
      )
      .attr('fill', (d) => getColor(d.word))
      .attr('fill-opacity', 0.7)
      .attr('stroke', (d) => getColor(d.word))
      .attr('stroke-width', 2)
      .on('click', (_event, d) => onNodeClickRef.current?.(d.word))

    // Tooltips (recreate on each update since word data may have changed)
    nodeSel.select('title').remove()
    nodeSel.append('title').text((d) => {
      const w = d.word
      return `${w.word}${w.meaning ? `: ${w.meaning}` : ''}\nCoined by ${w.coined_by} (Round ${w.coined_round})`
    })

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
    nodeSel.call(drag)

    // ── Join labels ──
    gLabel
      .selectAll<SVGTextElement, SimNode>('text')
      .data(nodes, (d) => d.id)
      .join('text')
      .text((d) => d.id)
      .attr('font-size', 11)
      .attr('font-family', 'monospace')
      .attr('fill', '#e2e8f0')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.r + 14)
      .attr('pointer-events', 'none')

    // Gently reheat — alpha 0.3 gives a soft nudge instead of a violent restart
    simulation.alpha(0.3).restart()
  }, [words, getColor])

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
