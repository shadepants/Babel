import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import * as d3 from 'd3'
import { api } from '@/api/client'
import type { TreeNode } from '@/api/types'
import { HudBrackets } from '@/components/common/HudBrackets'
import { getPresetGlow } from '@/lib/presetColors'

// ── Layout constants ───────────────────────────────────────────────────────────
const NODE_W = 182
const NODE_H = 84
const V_GAP  = 108   // vertical space between sibling nodes
const H_GAP  = 226   // horizontal space per depth level
const PAD    = 56    // outer padding around the whole tree

// ── Helpers ───────────────────────────────────────────────────────────────────
function nodeStroke(status: string): string {
  if (status === 'running')   return '#F59E0B'
  if (status === 'completed') return '#06B6D4'
  if (status === 'failed')    return '#EF4444'
  return '#4B5563'
}

function modelShort(m: string): string {
  return (m.split('/').pop() ?? m).replace(/-\d{8}$/, '').slice(0, 24)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BranchTree() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const navigate          = useNavigate()
  const svgRef            = useRef<SVGSVGElement>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [treeData,  setTreeData]  = useState<TreeNode | null>(null)

  // ── Fetch tree ──
  useEffect(() => {
    if (!experimentId) return
    setLoading(true)
    setError(null)
    api.getExperimentTree(experimentId)
      .then((root) => { setTreeData(root); setLoading(false) })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load tree')
        setLoading(false)
      })
  }, [experimentId])

  // ── D3 render (runs after treeData + SVG element are in DOM) ──
  useEffect(() => {
    const svgEl = svgRef.current
    if (!treeData || !svgEl) return

    // Build hierarchy + apply tree layout
    const root   = d3.hierarchy<TreeNode>(treeData, (d) => d.children)
    const layout = d3.tree<TreeNode>().nodeSize([V_GAP, H_GAP])
    const pRoot  = layout(root)

    // Compute bounding box over all nodes
    const nodes = pRoot.descendants()
    const links = pRoot.links()

    let x0 = Infinity, x1 = -Infinity
    let y0 = Infinity, y1 = -Infinity
    nodes.forEach((d) => {
      if (d.x < x0) x0 = d.x
      if (d.x > x1) x1 = d.x
      if (d.y < y0) y0 = d.y
      if (d.y > y1) y1 = d.y
    })

    const svgW = (y1 - y0) + NODE_W + PAD * 2
    const svgH = (x1 - x0) + NODE_H + PAD * 2
    // Coordinate transforms: d3.y -> svg x, d3.x -> svg y
    const ox = -y0 + PAD
    const oy = -x0 + PAD + NODE_H / 2

    // Clear canvas
    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('width', svgW).attr('height', svgH)

    const g = svg.append('g')

    // ── Edges ──────────────────────────────────────────────────────────────────
    g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>('path.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        const glow = getPresetGlow(d.target.data.preset)
        return glow ? glow.replace(/[\d.]+\)$/, '0.60)') : 'rgba(139,92,246,0.40)'
      })
      .attr('stroke-width', 1.5)
      // Cubic bezier: source right edge -> target left edge
      .attr('d', (d) => {
        const sx = d.source.y + ox + NODE_W
        const sy = d.source.x + oy
        const tx = d.target.y + ox
        const ty = d.target.x + oy
        const mx = (sx + tx) / 2
        return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`
      })

    // ── Edge labels ────────────────────────────────────────────────────────────
    g.selectAll<SVGTextElement, d3.HierarchyPointLink<TreeNode>>('text.elabel')
      .data(links.filter((l) => l.target.data.fork_at_round != null))
      .join('text')
      .attr('class', 'elabel')
      .attr('x',    (d) => (d.source.y + d.target.y) / 2 + ox + NODE_W / 2)
      .attr('y',    (d) => (d.source.x + d.target.x) / 2 + oy - 7)
      .attr('fill', 'rgba(156,163,175,0.70)')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-size', '9')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .text((d) => `fork @ R${d.target.data.fork_at_round}`)

    // ── Nodes ──────────────────────────────────────────────────────────────────
    const nodeG = g
      .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.y + ox},${d.x + oy - NODE_H / 2})`)
      .style('cursor', 'pointer')
      .on('click', (_evt, d) => navigate(`/analytics/${d.data.id}`))

    // Background rect
    nodeG.append('rect')
      .attr('width',  NODE_W)
      .attr('height', NODE_H)
      .attr('rx', 6).attr('ry', 6)
      .attr('fill', 'rgba(10,14,24,0.90)')
      .attr('stroke', (d) => nodeStroke(d.data.status))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.75)

    // Preset glow overlay (semi-transparent tint on top of background)
    nodeG.each(function(d) {
      const glow = getPresetGlow(d.data.preset)
      if (!glow) return
      d3.select(this).append('rect')
        .attr('width',  NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 6).attr('ry', 6)
        .attr('fill', glow)
        .attr('pointer-events', 'none')
    })

    // Status dot (top-right corner)
    nodeG.append('circle')
      .attr('cx', NODE_W - 10)
      .attr('cy', 10)
      .attr('r', 4)
      .attr('fill', (d) => nodeStroke(d.data.status))
      .attr('pointer-events', 'none')

    // Label / ID
    nodeG.append('text')
      .attr('x', 8).attr('y', 16)
      .attr('fill', '#E5E7EB')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-size', '11')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d) =>
        d.data.label
          ? `// ${d.data.label.slice(0, 20)}`
          : d.data.id.slice(0, 16) + '\u2026'
      )

    // Model A (amber)
    nodeG.append('text')
      .attr('x', 8).attr('y', 31)
      .attr('fill', '#F59E0B')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-size', '9')
      .attr('pointer-events', 'none')
      .text((d) => modelShort(d.data.model_a))

    // Model B (cyan)
    nodeG.append('text')
      .attr('x', 8).attr('y', 43)
      .attr('fill', '#06B6D4')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-size', '9')
      .attr('pointer-events', 'none')
      .text((d) => modelShort(d.data.model_b))

    // Round counter
    nodeG.append('text')
      .attr('x', 8).attr('y', 57)
      .attr('fill', '#6B7280')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-size', '9')
      .attr('pointer-events', 'none')
      .text((d) => `R${d.data.rounds_completed}/${d.data.rounds_planned}`)

    // Fork button (bottom-right; stops propagation to prevent analytics nav)
    nodeG.append('text')
      .attr('x', NODE_W - 6)
      .attr('y', NODE_H - 6)
      .attr('fill', 'rgba(139,92,246,0.70)')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-size', '8')
      .attr('text-anchor', 'end')
      .style('cursor', 'pointer')
      .text('fork \u203a')
      .on('click', (evt, d) => {
        evt.stopPropagation()
        navigate(`/configure/${d.data.preset ?? 'custom'}?fork=${d.data.id}`)
      })

  }, [treeData, navigate])

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 max-w-full space-y-5">

      {/* Header */}
      <div className="space-y-1">
        <Link to="/gallery" className="font-mono text-xs text-text-dim hover:text-accent">
          &larr; Gallery
        </Link>
        <p className="font-mono text-xs mt-2" style={{ color: 'rgba(167,139,250,0.6)' }}>
          // BRANCH TREE
        </p>
        <h1 className="font-display font-black tracking-widest text-xl text-text-primary uppercase">
          Experiment Lineage
        </h1>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <span className="font-mono text-sm text-text-dim animate-pulse-slow">
            loading tree...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-center py-24">
          <span className="font-mono text-sm text-danger">{error}</span>
        </div>
      )}

      {/* Tree canvas */}
      {!loading && !error && (
        <div className="relative neural-card">
          <HudBrackets />
          <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <svg ref={svgRef} style={{ display: 'block' }} />
          </div>
        </div>
      )}

      {/* Footer hint */}
      {!loading && !error && (
        <p className="font-mono text-xs text-center" style={{ color: 'rgba(107,114,128,0.5)' }}>
          click node &rarr; analytics &nbsp;&middot;&nbsp; fork &rsaquo; &rarr; branch from that round
        </p>
      )}

    </div>
  )
}
