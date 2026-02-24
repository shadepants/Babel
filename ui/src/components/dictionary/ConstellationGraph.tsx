import { useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import type { VocabWord } from '@/api/types'

interface ConstellationGraphProps {
  words: VocabWord[]
  /** name -> hex color map from buildParticipantColorMap */
  colorMap: Record<string, string>
  /** When set, dims nodes from other participants to 0.12 opacity */
  filterParticipant: string | null
  onSelectWord?: (word: VocabWord) => void
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

/** Expand a convex hull polygon outward from its centroid by `padding` px. */
function expandPolygon(
  hull: [number, number][],
  padding: number,
): [number, number][] {
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length
  return hull.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const len = Math.hypot(dx, dy) || 1
    return [x + (dx / len) * padding, y + (dy / len) * padding] as [
      number,
      number,
    ]
  })
}

/** Build an SVG path string for a circle centred at (cx, cy) with radius r. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0-${r * 2},0`
}

/**
 * D3 force-directed graph showing vocabulary relationships.
 *
 * Incremental updates via D3's .data().join() keep existing positions stable
 * as new words arrive.  Zoom/pan lives on the SVG; a zoom-container <g>
 * wraps everything so transforms don't affect the SVG bounds.
 *
 * Hull regions are redrawn on every simulation tick so they track node
 * movement.  Colors and filter opacity are driven by refs so they update
 * without restarting the simulation.
 */
export function ConstellationGraph({
  words,
  colorMap,
  filterParticipant,
  onSelectWord,
}: ConstellationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Persist D3 objects across renders
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map())
  const gLinkRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const gNodeRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const gLabelRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const gHullRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)

  // Live refs — updated every render; read inside D3 callbacks without
  // needing to restart the simulation when they change.
  const colorMapRef = useRef(colorMap)
  colorMapRef.current = colorMap
  const filterParticipantRef = useRef(filterParticipant)
  filterParticipantRef.current = filterParticipant
  const onSelectWordRef = useRef(onSelectWord)
  onSelectWordRef.current = onSelectWord

  const getColor = useCallback((word: VocabWord) => {
    return colorMapRef.current[word.coined_by] ?? '#888'
  }, [])

  // ── One-time init: SVG structure, zoom, simulation ──────────────────────
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = Math.max(400, containerRef.current.clientHeight)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    // All drawable content lives inside this group so zoom transforms it
    const g = svg.append('g').attr('class', 'zoom-container')

    // Zoom / pan — wheel to scale, drag to pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })
    svg.call(zoom)
    // Double-click resets zoom
    svg.on('dblclick.zoom', () => {
      svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity)
    })

    // Layer order: hulls behind links behind nodes behind labels
    const gHull = g.append('g').attr('class', 'hulls')
    const gLink = g.append('g').attr('class', 'links')
    const gNode = g.append('g').attr('class', 'nodes')
    const gLabel = g.append('g').attr('class', 'labels')

    gHullRef.current = gHull
    gLinkRef.current = gLink
    gNodeRef.current = gNode
    gLabelRef.current = gLabel

    const simulation = d3
      .forceSimulation<SimNode, SimLink>([])
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>([])
          .id((d) => d.id)
          .distance(100),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<SimNode>().radius((d) => d.r + 6),
      )

    simulation.on('tick', () => {
      // ── Standard element position updates ──
      gLink
        .selectAll<SVGLineElement, SimLink>('line')
        .attr('x1', (d) => (d.source as SimNode).x!)
        .attr('y1', (d) => (d.source as SimNode).y!)
        .attr('x2', (d) => (d.target as SimNode).x!)
        .attr('y2', (d) => (d.target as SimNode).y!)

      gNode
        .selectAll<SVGCircleElement, SimNode>('circle')
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!)

      gLabel
        .selectAll<SVGTextElement, SimNode>('text')
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y!)

      // ── Hull update — runs every tick since node positions change ──
      const fp = filterParticipantRef.current
      const nodesByParticipant: Record<string, SimNode[]> = {}
      for (const n of simulation.nodes()) {
        const p = n.word.coined_by
        if (!nodesByParticipant[p]) nodesByParticipant[p] = []
        nodesByParticipant[p].push(n)
      }

      // Only draw hulls for the active filter participant (or all if unfiltered)
      const hullData = Object.entries(nodesByParticipant)
        .filter(([name]) => !fp || name === fp)
        .map(([name, nodes]) => {
          const pts = nodes.map((n) => [n.x!, n.y!] as [number, number])
          const hull = pts.length >= 3 ? d3.polygonHull(pts) : null
          const color = colorMapRef.current[name] ?? '#888'
          return { name, hull, pts, color }
        })

      gHull
        .selectAll<SVGPathElement, (typeof hullData)[number]>('path')
        .data(hullData, (d) => d.name)
        .join('path')
        .attr('d', (d) => {
          if (d.hull) {
            const expanded = expandPolygon(d.hull, 30)
            return 'M' + expanded.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z'
          }
          // Fallback for 1–2 nodes: draw a circle around their centroid
          if (!d.pts.length) return ''
          const cx = d.pts.reduce((s, p) => s + p[0], 0) / d.pts.length
          const cy = d.pts.reduce((s, p) => s + p[1], 0) / d.pts.length
          const r =
            Math.max(30, ...d.pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy))) + 30
          return circlePath(cx, cy, r)
        })
        .attr('fill', (d) => d.color)
        .attr('fill-opacity', 0.07)
        .attr('stroke', (d) => d.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.3)
        .attr('stroke-dasharray', '4 3')
        .attr('pointer-events', 'none')
    })

    simRef.current = simulation
    nodeMapRef.current = new Map()

    return () => {
      simulation.stop()
      simRef.current = null
    }
  }, []) // intentionally empty — uses refs for dynamic values; remounts on unmount only

  // ── Incremental data update ──────────────────────────────────────────────
  useEffect(() => {
    const simulation = simRef.current
    const gLink = gLinkRef.current
    const gNode = gNodeRef.current
    const gLabel = gLabelRef.current
    if (!simulation || !gLink || !gNode || !gLabel || words.length < 2) return

    const existingNodes = nodeMapRef.current

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

    const links: SimLink[] = words.flatMap((w) =>
      (w.parent_words ?? [])
        .filter((parent) => nodeMap.has(parent))
        .map((parent) => ({ source: parent, target: w.word })),
    )

    simulation.nodes(nodes)
    ;(simulation.force('link') as d3.ForceLink<SimNode, SimLink>).links(links)

    // Links
    gLink
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links, (d) =>
        `${(d.source as SimNode).id ?? d.source}-${(d.target as SimNode).id ?? d.target}`,
      )
      .join('line')
      .attr('stroke', '#2a3146')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)

    // Nodes
    const fp = filterParticipant
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
      .attr('fill-opacity', (d) =>
        fp && d.word.coined_by !== fp ? 0.12 : 0.7,
      )
      .attr('stroke', (d) => getColor(d.word))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', (d) =>
        fp && d.word.coined_by !== fp ? 0.12 : 1,
      )
      .on('click', (_event, d) => onSelectWordRef.current?.(d.word))

    // Tooltips
    nodeSel.select('title').remove()
    nodeSel.append('title').text((d) => {
      const w = d.word
      return `${w.word}${w.meaning ? `: ${w.meaning}` : ''}\nCoined by ${w.coined_by} (Round ${w.coined_round})`
    })

    // Drag
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

    // Labels
    gLabel
      .selectAll<SVGTextElement, SimNode>('text')
      .data(nodes, (d) => d.id)
      .join('text')
      .text((d) => d.id)
      .attr('font-size', 11)
      .attr('font-family', 'monospace')
      .attr('fill', '#e2e8f0')
      .attr('fill-opacity', (d) =>
        fp && d.word.coined_by !== fp ? 0.12 : 1,
      )
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.r + 14)
      .attr('pointer-events', 'none')

    simulation.alpha(0.3).restart()
  }, [words, getColor, filterParticipant])

  // ── Filter-only update: adjust opacity without restarting simulation ────
  useEffect(() => {
    const gNode = gNodeRef.current
    const gLabel = gLabelRef.current
    if (!gNode || !gLabel) return
    const fp = filterParticipant
    gNode
      .selectAll<SVGCircleElement, SimNode>('circle')
      .attr('fill-opacity', (d) => (fp && d.word.coined_by !== fp ? 0.12 : 0.7))
      .attr('stroke-opacity', (d) => (fp && d.word.coined_by !== fp ? 0.12 : 1))
    gLabel
      .selectAll<SVGTextElement, SimNode>('text')
      .attr('fill-opacity', (d) => (fp && d.word.coined_by !== fp ? 0.12 : 1))
  }, [filterParticipant])

  if (words.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-text-dim text-sm">
        Graph appears as words are coined (need at least 2)
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-[500px]">
      <p className="text-[10px] font-mono text-text-dim/40 mb-1">
        scroll to zoom &nbsp;&middot;&nbsp; drag to pan &nbsp;&middot;&nbsp; double-click to reset
      </p>
      <svg ref={svgRef} className="w-full h-full border border-border-custom/20 rounded" />
    </div>
  )
}
