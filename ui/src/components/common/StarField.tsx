import { useEffect, useRef } from 'react'

/**
 * Neural network background — depth-layered nodes with mouse parallax,
 * cascade pulse chains, route-aware tint, synaptic bloom (#3),
 * activity trail edges (#5), and gamma burst events (#7).
 */

const LINK_DISTANCE   = 170
const PULSE_INTERVAL_MS = 1400
const PULSE_SPEED     = 1.6

// 3 depth layers: far(0.25), mid(0.62), near(1.0)
const DEPTH_VALUES = [0.25, 0.62, 1.0]
const DEPTH_COUNTS = [32, 20, 10]

const COLORS     = ['255,255,255', '139,92,246', '6,182,212', '245,158,11']
const COLOR_DIST = [40, 12, 6, 4]

// Cascade pulse colors per hop (stroke, core)
const CHAIN_COLORS = [
  ['139,92,246', '210,190,255'],  // hop 0 — purple
  ['6,182,212',  '170,240,255'],  // hop 1 — cyan
  ['245,158,11', '255,220,140'],  // hop 2 — amber
  ['255,255,255','255,255,255'],  // hop 3 — white
]

// #7 Burst config
const BURST_CLUSTER    = 12
const BURST_DURATION   = 800    // ms for ring to fully expand & fade
const BURST_MAX_RADIUS = 280    // px

function lerpRGB(
  c: [number, number, number],
  t: [number, number, number],
  f: number,
): [number, number, number] {
  return [c[0] + (t[0] - c[0]) * f, c[1] + (t[1] - c[1]) * f, c[2] + (t[2] - c[2]) * f]
}

function parseRGB(s: string): [number, number, number] {
  const p = s.split(',').map(Number)
  return [p[0], p[1], p[2]]
}

interface Node {
  x: number; y: number
  vx: number; vy: number
  size: number
  colorIdx: number
  opacity: number
  flare: number
  bloom: number   // #3: accumulated synaptic halo (slow decay)
  depth: number
}

interface Pulse {
  a: number; b: number
  t: number
  hop: number
}

interface BurstRing {
  cx: number; cy: number
  startTime: number
}

function buildNodes(w: number, h: number): Node[] {
  const nodes: Node[] = []
  let ci = 0; let cc = 0

  for (let di = 0; di < DEPTH_VALUES.length; di++) {
    const depth = DEPTH_VALUES[di]
    for (let k = 0; k < DEPTH_COUNTS[di]; k++) {
      if (cc >= COLOR_DIST[ci]) { ci = Math.min(ci + 1, COLORS.length - 1); cc = 0 }
      cc++
      const speed = (0.04 + Math.random() * 0.14) * (0.45 + depth * 0.55)
      const angle  = Math.random() * Math.PI * 2
      const base   = ci === 0 ? 0.7 + Math.random() * 0.8 : 1.1 + Math.random() * 1.0
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size:     base * (0.4 + depth * 0.65),
        colorIdx: ci,
        opacity:  (ci === 0 ? 0.12 + Math.random() * 0.32 : 0.28 + Math.random() * 0.42) * (0.28 + depth * 0.72),
        flare:    0,
        bloom:    0,
        depth,
      })
    }
  }
  return nodes
}

interface StarFieldProps {
  tintColor?: string  // "R,G,B"
}

export function StarField({ tintColor = '139,92,246' }: StarFieldProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const tintCur    = useRef<[number, number, number]>([139, 92, 246])
  const tintTarget = useRef<[number, number, number]>([139, 92, 246])

  useEffect(() => {
    tintTarget.current = parseRGB(tintColor)
  }, [tintColor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width  = w
    canvas.height = h

    const nodes  = buildNodes(w, h)
    const pulses: Pulse[] = []
    let lastPulseTime = 0

    // #5: edge activity heat — key "min-max", value 0→1
    const edgeHeat = new Map<string, number>()

    // #7: gamma burst rings
    const burstRings: BurstRing[] = []
    let lastBurstTime   = 0
    let nextBurstDelay  = (15 + Math.random() * 25) * 1000

    const mouse     = { x: w / 2, y: h / 2 }
    const mouseLerp = { x: w / 2, y: h / 2 }

    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onResize    = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w; canvas.height = h
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize',    onResize)

    let animId: number

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h)

      // smooth mouse lerp
      mouseLerp.x += (mouse.x - mouseLerp.x) * 0.038
      mouseLerp.y += (mouse.y - mouseLerp.y) * 0.038

      const pxB = (mouseLerp.x - w / 2) / w * -40
      const pyB = (mouseLerp.y - h / 2) / h * -28

      // smooth tint lerp
      tintCur.current = lerpRGB(tintCur.current, tintTarget.current, 0.016)
      const [tr, tg, tb] = tintCur.current.map(Math.round)

      // ── #7: Gamma burst event ────────────────────────────────────────────
      if (now - lastBurstTime > nextBurstDelay) {
        const centerIdx = Math.floor(Math.random() * nodes.length)
        const center = nodes[centerIdx]

        // Find nearest BURST_CLUSTER neighbors
        const nearest = nodes
          .map((n, i) => ({ i, d: Math.hypot(n.x - center.x, n.y - center.y) }))
          .filter((x) => x.i !== centerIdx)
          .sort((a, b) => a.d - b.d)
          .slice(0, BURST_CLUSTER)

        for (const { i } of nearest) {
          if (pulses.length >= 40) break
          const nbrs: number[] = []
          for (let k = 0; k < nodes.length; k++) {
            if (k === i) continue
            const dx = nodes[k].x - nodes[i].x
            const dy = nodes[k].y - nodes[i].y
            if (dx * dx + dy * dy < LINK_DISTANCE * LINK_DISTANCE) nbrs.push(k)
          }
          if (nbrs.length) {
            pulses.push({ a: i, b: nbrs[Math.floor(Math.random() * nbrs.length)], t: 0, hop: 0 })
          }
        }

        burstRings.push({ cx: center.x, cy: center.y, startTime: now })
        lastBurstTime  = now
        nextBurstDelay = (15 + Math.random() * 25) * 1000
      }

      // ── spawn regular pulse ──────────────────────────────────────────────
      const jitter = PULSE_INTERVAL_MS * (0.45 + Math.random() * 0.9)
      if (now - lastPulseTime > jitter && pulses.length < 12) {
        const cands: [number, number][] = []
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x
            const dy = nodes[i].y - nodes[j].y
            if (dx * dx + dy * dy < LINK_DISTANCE * LINK_DISTANCE) cands.push([i, j])
          }
        }
        if (cands.length) {
          const [a, b] = cands[Math.floor(Math.random() * cands.length)]
          pulses.push({ a, b, t: 0, hop: 0 })
          lastPulseTime = now
        }
      }

      // ── update nodes ─────────────────────────────────────────────────────
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy
        if (n.x < -10) n.x = w + 10
        if (n.x > w + 10) n.x = -10
        if (n.y < -10) n.y = h + 10
        if (n.y > h + 10) n.y = -10
        if (n.flare > 0) n.flare = Math.max(0, n.flare - 0.017)
        if (n.bloom > 0) n.bloom = Math.max(0, n.bloom - 0.003)  // #3 slow decay ~5.5s
      }

      // ── #5: decay edge heat ───────────────────────────────────────────────
      edgeHeat.forEach((heat, key) => {
        const next = heat - 0.012   // fades over ~1.4s at 60fps
        if (next <= 0) edgeHeat.delete(key)
        else edgeHeat.set(key, next)
      })

      // ── draw connections (tinted, #5 trails) ─────────────────────────────
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d2 = dx * dx + dy * dy
          if (d2 > LINK_DISTANCE * LINK_DISTANCE) continue

          const dist  = Math.sqrt(d2)
          const base  = (1 - dist / LINK_DISTANCE) * 0.12
          const key   = `${i}-${j}`
          const heat  = edgeHeat.get(key) ?? 0
          const alpha = base + heat * 0.28

          const ax = nodes[i].x + pxB * nodes[i].depth
          const ay = nodes[i].y + pyB * nodes[i].depth
          const bx = nodes[j].x + pxB * nodes[j].depth
          const by = nodes[j].y + pyB * nodes[j].depth

          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx, by)
          ctx.strokeStyle = `rgba(${tr},${tg},${tb},${alpha.toFixed(3)})`
          ctx.lineWidth   = heat > 0.05 ? 0.6 + heat * 0.9 : 0.6
          ctx.stroke()
        }
      }

      // ── update & draw cascade pulses ──────────────────────────────────────
      for (let pi = pulses.length - 1; pi >= 0; pi--) {
        const p   = pulses[pi]
        const na  = nodes[p.a]
        const nb  = nodes[p.b]
        const dist = Math.hypot(nb.x - na.x, nb.y - na.y)
        p.t += PULSE_SPEED / Math.max(dist, 1)

        if (p.t >= 1) {
          nb.flare = 1.0
          nb.bloom = Math.min(1.0, nb.bloom + 0.45)  // #3 accumulate bloom
          pulses.splice(pi, 1)
          // cascade
          if (p.hop < 3 && Math.random() < 0.58) {
            const neighbors: number[] = []
            for (let k = 0; k < nodes.length; k++) {
              if (k === p.b || k === p.a) continue
              const dx = nodes[k].x - nb.x
              const dy = nodes[k].y - nb.y
              if (dx * dx + dy * dy < LINK_DISTANCE * LINK_DISTANCE) neighbors.push(k)
            }
            if (neighbors.length) {
              const nextB = neighbors[Math.floor(Math.random() * neighbors.length)]
              pulses.push({ a: p.b, b: nextB, t: 0, hop: p.hop + 1 })
            }
          }
          continue
        }

        // #5: mark this edge as hot while the pulse is in transit
        const edgeKey = `${Math.min(p.a, p.b)}-${Math.max(p.a, p.b)}`
        edgeHeat.set(edgeKey, 1.0)

        // draw pulse dot
        const cc  = CHAIN_COLORS[p.hop] ?? CHAIN_COLORS[0]
        const nax = na.x + pxB * na.depth
        const nay = na.y + pyB * na.depth
        const nbx = nb.x + pxB * nb.depth
        const nby = nb.y + pyB * nb.depth
        const px  = nax + (nbx - nax) * p.t
        const py  = nay + (nby - nay) * p.t

        const grd = ctx.createRadialGradient(px, py, 0, px, py, 7)
        grd.addColorStop(0, `rgba(${cc[0]},0.8)`)
        grd.addColorStop(1, `rgba(${cc[0]},0)`)
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2)
        ctx.fillStyle = grd; ctx.fill()

        ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${cc[1]},0.95)`; ctx.fill()
      }

      // ── #3: Synaptic bloom halos (screen blend, under nodes) ─────────────
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      for (const n of nodes) {
        if (n.bloom < 0.02) continue
        const col = COLORS[n.colorIdx]
        const nx  = n.x + pxB * n.depth
        const ny  = n.y + pyB * n.depth
        const r   = 42 + n.bloom * 62   // 42–104px
        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, r)
        grd.addColorStop(0, `rgba(${col},${(n.bloom * 0.18).toFixed(3)})`)
        grd.addColorStop(0.4, `rgba(${col},${(n.bloom * 0.07).toFixed(3)})`)
        grd.addColorStop(1, `rgba(${col},0)`)
        ctx.beginPath()
        ctx.arc(nx, ny, r, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
      }
      ctx.restore()

      // ── #7: Burst rings (screen blend) ────────────────────────────────────
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      for (let ri = burstRings.length - 1; ri >= 0; ri--) {
        const ring    = burstRings[ri]
        const age     = now - ring.startTime
        if (age > BURST_DURATION) { burstRings.splice(ri, 1); continue }
        const progress = age / BURST_DURATION
        const radius   = progress * BURST_MAX_RADIUS
        const alpha    = (1 - progress) * 0.5
        const rcx      = ring.cx + pxB * 0.62
        const rcy      = ring.cy + pyB * 0.62

        const grd = ctx.createRadialGradient(rcx, rcy, radius * 0.72, rcx, rcy, radius)
        grd.addColorStop(0,   `rgba(${tr},${tg},${tb},0)`)
        grd.addColorStop(0.5, `rgba(${tr},${tg},${tb},${(alpha * 0.55).toFixed(3)})`)
        grd.addColorStop(1,   `rgba(${tr},${tg},${tb},0)`)
        ctx.beginPath()
        ctx.arc(rcx, rcy, radius, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
      }
      ctx.restore()

      // ── draw nodes ────────────────────────────────────────────────────────
      for (const n of nodes) {
        const op  = Math.min(1, n.opacity + n.flare * 0.85)
        const r   = n.size + n.flare * 2.8
        const col = COLORS[n.colorIdx]
        const nx  = n.x + pxB * n.depth
        const ny  = n.y + pyB * n.depth

        if (n.flare > 0.05) {
          const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, r * 5.5)
          grd.addColorStop(0, `rgba(${col},${(op * 0.5).toFixed(3)})`)
          grd.addColorStop(1, `rgba(${col},0)`)
          ctx.beginPath(); ctx.arc(nx, ny, r * 5.5, 0, Math.PI * 2)
          ctx.fillStyle = grd; ctx.fill()
        }

        ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${col},${op.toFixed(3)})`; ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize',    onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  )
}
