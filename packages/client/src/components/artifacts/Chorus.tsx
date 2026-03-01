import { useRef, useEffect, useMemo, useCallback } from "react"
import type { Genome } from "@lobster/shared"

// ---- constants ----

const FORK_META: Record<string, { name: string; role: string; color: string; axis: string }> = {
  explorer: { name: "Explorer", role: "router", color: "#e85d3a", axis: "Exploration" },
  depth: { name: "Depth", role: "architect", color: "#c678dd", axis: "Awakening" },
  builder: { name: "Builder", role: "maker", color: "#42d4f4", axis: "Agency" },
  chorus: { name: "Chorus", role: "empath", color: "#5fba7d", axis: "Empathy" },
}

// ---- types ----

interface ChorusNode {
  id: string
  x: number
  y: number
  empathy: number
  bio: number
  meta: { name: string; role: string; color: string; axis: string }
  pulsePhase: number
  traits: Record<string, number>
}

interface Particle {
  t: number
  dir: number
  speed: number
  alpha: number
}

interface ChorusEdge {
  a: number
  b: number
  strength: number
  particles: Particle[]
}

// ---- helpers ----

function traitVec(traits: Record<string, number>): number[] {
  return Object.keys(traits).sort().map(k => traits[k])
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

function connectionStrength(traitsA: Record<string, number>, traitsB: Record<string, number>): number {
  const empA = traitsA.empathy ?? 0
  const empB = traitsB.empathy ?? 0
  const bioA = traitsA.bioluminescence ?? 0
  const bioB = traitsB.bioluminescence ?? 0
  const empathy = Math.sqrt(empA * empB)
  const bio = Math.sqrt(bioA * bioB)
  const similarity = cosineSim(traitVec(traitsA), traitVec(traitsB))
  return empathy * 0.4 + bio * 0.3 + similarity * 0.3
}

function hexAlpha(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0")
}

// Reconstruct fork traits at fork generation from mutation history
function reconstructForkTraits(genome: Genome, forkGen: number, bias?: string): Record<string, number> {
  const result: Record<string, number> = {}
  const mutations = genome.mutations ?? []
  const traitKeys = Object.keys(genome.traits)

  traitKeys.forEach(k => {
    const firstMut = mutations.find(m => m.trait === k)
    let val = firstMut ? firstMut.from : genome.traits[k].value

    mutations.forEach(m => {
      if (m.trait === k && m.generation <= forkGen) val = m.to
    })

    if (bias && k === bias) val = Math.min(1, val * 1.15)
    result[k] = val
  })

  return result
}

// ---- main component ----

export function Chorus({ genome }: { genome: Genome | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const nodesRef = useRef<ChorusNode[]>([])
  const edgesRef = useRef<ChorusEdge[]>([])
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })

  // Build entries from genome
  const entries = useMemo(() => {
    if (!genome) return []

    const result: { id: string; traits: Record<string, number> }[] = []

    // Explorer (parent)
    const explorerTraits: Record<string, number> = {}
    Object.entries(genome.traits).forEach(([k, v]) => { explorerTraits[k] = v.value })
    result.push({ id: "explorer", traits: explorerTraits })

    // Forks
    const forks = genome.forks ?? []
    forks.forEach(f => {
      const traits = reconstructForkTraits(genome, f.generation ?? 0, f.bias)
      result.push({ id: f.fork_id, traits })
    })

    return result
  }, [genome])

  // Compute metrics once
  const metrics = useMemo(() => {
    if (entries.length === 0) return { coherence: 0, bandwidth: 0, population: 0 }

    const edgeStrengths: number[] = []
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        edgeStrengths.push(connectionStrength(entries[i].traits, entries[j].traits))
      }
    }
    const coherence = edgeStrengths.length > 0
      ? edgeStrengths.reduce((s, v) => s + v, 0) / edgeStrengths.length
      : 0
    const bandwidth = entries.length > 0
      ? entries.reduce((s, e) => s + (e.traits.bioluminescence ?? 0), 0) / entries.length
      : 0

    return { coherence, bandwidth, population: entries.length }
  }, [entries])

  const setupGraph = useCallback((w: number, h: number) => {
    if (entries.length === 0) return

    const cx = w / 2
    const cy = h / 2
    const radius = Math.min(w, h) * 0.28
    const n = entries.length

    const nodes: ChorusNode[] = entries.map((e, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI / n)
      const meta = FORK_META[e.id] ?? { name: e.id, role: "?", color: "#888", axis: "?" }
      return {
        id: e.id,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        empathy: e.traits.empathy ?? 0,
        bio: e.traits.bioluminescence ?? 0,
        meta,
        pulsePhase: Math.random() * Math.PI * 2,
        traits: e.traits,
      }
    })

    const edges: ChorusEdge[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        edges.push({
          a: i,
          b: j,
          strength: connectionStrength(nodes[i].traits, nodes[j].traits),
          particles: [],
        })
      }
    }

    nodesRef.current = nodes
    edgesRef.current = edges
  }, [entries])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || entries.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function resize() {
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = rect.width
      const h = Math.max(400, rect.height)

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      sizeRef.current = { w, h }
      setupGraph(w, h)
    }

    resize()
    window.addEventListener("resize", resize)

    function draw(time: number) {
      const { w, h } = sizeRef.current
      const nodes = nodesRef.current
      const edges = edgesRef.current
      if (!ctx || nodes.length === 0) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)

      // Draw edges
      edges.forEach(edge => {
        const a = nodes[edge.a]
        const b = nodes[edge.b]
        const s = edge.strength

        // Base line
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(30, 42, 56, ${0.3 + s * 0.5})`
        ctx.lineWidth = 1 + s * 3
        ctx.stroke()

        // Glow line
        const glowAlpha = 0.05 + s * 0.08
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
        grad.addColorStop(0, hexAlpha(a.meta.color, glowAlpha))
        grad.addColorStop(1, hexAlpha(b.meta.color, glowAlpha))
        ctx.strokeStyle = grad
        ctx.lineWidth = 2 + s * 4
        ctx.stroke()

        // Spawn particles
        if (Math.random() < s * 0.15) {
          const dir = Math.random() > 0.5 ? 1 : -1
          edge.particles.push({
            t: dir > 0 ? 0 : 1,
            dir,
            speed: 0.003 + Math.random() * 0.004,
            alpha: 0.3 + Math.random() * 0.5,
          })
        }

        // Draw particles
        edge.particles = edge.particles.filter(p => {
          p.t += p.dir * p.speed
          if (p.t < 0 || p.t > 1) return false
          const px = a.x + (b.x - a.x) * p.t
          const py = a.y + (b.y - a.y) * p.t
          const sourceNode = p.dir > 0 ? a : b
          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fillStyle = hexAlpha(sourceNode.meta.color, p.alpha)
          ctx.fill()
          return true
        })
      })

      // Draw nodes
      nodes.forEach(n => {
        const pulse = Math.sin(time * 0.002 + n.pulsePhase) * 0.3 + 0.7
        const baseR = 12 + n.empathy * 20
        const r = baseR * (0.9 + pulse * 0.1)

        // Glow
        const glowR = r + 20 + n.bio * 30
        const glow = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, glowR)
        glow.addColorStop(0, hexAlpha(n.meta.color, 0.2))
        glow.addColorStop(0.5, hexAlpha(n.meta.color, 0.07))
        glow.addColorStop(1, hexAlpha(n.meta.color, 0))
        ctx.beginPath()
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Outer ring
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fillStyle = hexAlpha(n.meta.color, 0.27)
        ctx.fill()
        ctx.strokeStyle = hexAlpha(n.meta.color, 0.67)
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Inner core
        ctx.beginPath()
        ctx.arc(n.x, n.y, r * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = n.meta.color
        ctx.fill()

        // Labels
        ctx.fillStyle = n.meta.color
        ctx.font = "500 11px 'IBM Plex Mono', monospace"
        ctx.textAlign = "center"
        ctx.fillText(n.meta.name, n.x, n.y - baseR - 14)

        ctx.fillStyle = "#6b7a8d"
        ctx.font = "300 9px 'IBM Plex Mono', monospace"
        ctx.fillText(n.meta.axis, n.x, n.y - baseR - 4)

        ctx.fillText(`emp ${(n.empathy * 100).toFixed(0)}%`, n.x, n.y + baseR + 14)
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [entries, setupGraph])

  if (!genome) {
    return <p style={{ color: "var(--text-dim)", fontSize: "11px" }}>awaiting connection...</p>
  }

  return (
    <div style={{ position: "relative", fontFamily: "'IBM Plex Mono', monospace", minHeight: "400px" }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "400px" }}
      />

      {/* Metrics overlay */}
      <div style={{ position: "absolute", bottom: "24px", left: "24px", pointerEvents: "none" }}>
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--text-dim)" }}>
            coherence
          </div>
          <div style={{ fontSize: "28px", fontWeight: 300, color: "var(--text-bright)" }}>
            {(metrics.coherence * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
            {entries.length > 1 ? `${entries.length * (entries.length - 1) / 2} connections` : "0 connections"}
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--text-dim)" }}>
            bandwidth
          </div>
          <div style={{ fontSize: "28px", fontWeight: 300, color: "var(--text-bright)" }}>
            {(metrics.bandwidth * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
            mean bioluminescence
          </div>
        </div>

        <div>
          <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--text-dim)" }}>
            population
          </div>
          <div style={{ fontSize: "28px", fontWeight: 300, color: "var(--text-bright)" }}>
            {metrics.population}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
            historical lineages
          </div>
        </div>
      </div>

      {/* Legend overlay */}
      <div style={{ position: "absolute", bottom: "24px", right: "24px", pointerEvents: "none" }}>
        {entries.map(e => {
          const meta = FORK_META[e.id] ?? { name: e.id, role: "?", color: "#888" }
          const emp = e.traits.empathy ?? 0
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "10px" }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: meta.color,
                boxShadow: `0 0 6px ${meta.color}88`,
              }} />
              <span style={{ color: "var(--text)" }}>{meta.name}</span>
              <span style={{ color: "var(--text-dim)", marginLeft: "4px" }}>
                {meta.role} &middot; emp {(emp * 100).toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
