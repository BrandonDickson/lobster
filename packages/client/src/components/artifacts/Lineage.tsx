import { useMemo } from "react"
import type { Genome, Fork } from "@lobster/shared"

// ---- constants ----

const FORK_COLORS: Record<string, string> = {
  explorer: "#e85d3a",
  depth: "#c678dd",
  builder: "#42d4f4",
  chorus: "#5fba7d",
}

const AXES: Record<string, {
  traits: string[]
  anti: string[]
  color: string
}> = {
  Awakening: { traits: ["cognition", "abstraction", "bioluminescence", "metamorphic_potential"], anti: ["shell_hardness"], color: "#e5c07b" },
  Exploration: { traits: ["curiosity", "antenna_sensitivity"], anti: [], color: "#42d4f4" },
  Agency: { traits: ["ambition", "claw_strength"], anti: [], color: "#e85d3a" },
  Empathy: { traits: ["empathy"], anti: [], color: "#5fba7d" },
}

// ---- helpers ----

function traitColor(v: number): string {
  if (v < 0.3) return "#e85d3a"
  if (v < 0.6) return "#ff8c42"
  if (v < 0.8) return "#5fba7d"
  return "#42d4f4"
}

function axisScore(traits: Record<string, { value: number }>, axisKey: string): number {
  const ax = AXES[axisKey]
  if (!ax) return 0
  let sum = 0, count = 0
  ax.traits.forEach(t => { if (traits[t]) { sum += traits[t].value; count++ } })
  ax.anti.forEach(t => { if (traits[t]) { sum += (1 - traits[t].value); count++ } })
  return count > 0 ? sum / count : 0
}

/** Reconstruct what each fork's trait profile would have looked like from mutation history */
function reconstructForkTraits(genome: Genome, fork: Fork): Record<string, number> {
  const result: Record<string, number> = {}
  const forkGen = fork.generation ?? 0
  const traitKeys = Object.keys(genome.traits)
  const mutations = genome.mutations ?? []

  traitKeys.forEach(k => {
    // Find initial value
    const firstMut = mutations.find(m => m.trait === k)
    let val = firstMut ? firstMut.from : genome.traits[k].value

    // Apply mutations up to fork generation
    mutations.forEach(m => {
      if (m.trait === k && m.generation <= forkGen) {
        val = m.to
      }
    })

    // Apply bias: amplify the biased trait
    if (fork.bias && k === fork.bias) {
      val = Math.min(1, val * 1.15)
    }

    result[k] = val
  })

  return result
}

// ---- sub-components ----

function TraitBars({ traits }: { traits: Record<string, number> }) {
  const sorted = Object.keys(traits).sort((a, b) => traits[b] - traits[a])

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "100px 1fr 36px",
      gap: "4px 8px",
      alignItems: "center",
      fontSize: "10px",
      color: "var(--text-dim)",
      maxWidth: "420px",
    }}>
      {sorted.map(k => {
        const v = traits[k]
        const pct = (v * 100).toFixed(0)
        return (
          <div key={k} style={{ display: "contents" }}>
            <span>{k.replace(/_/g, " ")}</span>
            <div style={{ height: "4px", background: "#141c26", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: "2px", background: traitColor(v) }} />
            </div>
            <span style={{ textAlign: "right", color: "var(--text)" }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function AxisTags({ traits }: { traits: Record<string, { value: number } | number> }) {
  // Normalize: accept either { value: number } or plain number
  const normalized: Record<string, { value: number }> = {}
  Object.entries(traits).forEach(([k, v]) => {
    normalized[k] = typeof v === "number" ? { value: v } : v
  })

  return (
    <div style={{ marginTop: "10px", fontSize: "10px", color: "var(--text-dim)" }}>
      {Object.entries(AXES).map(([axName, ax]) => {
        const score = axisScore(normalized, axName)
        return (
          <span
            key={axName}
            style={{
              display: "inline-block",
              padding: "2px 6px",
              borderRadius: "3px",
              marginRight: "6px",
              fontSize: "9px",
              letterSpacing: "1px",
              background: ax.color + "22",
              color: ax.color,
              border: `1px solid ${ax.color}44`,
            }}
          >
            {axName} {(score * 100).toFixed(0)}%
          </span>
        )
      })}
    </div>
  )
}

interface ForkNodeData {
  id: string
  name: string
  color: string
  generation: number
  epoch: string
  designation: string
  bias?: string
  forkGen?: number
  traits: Record<string, number>
  isParent: boolean
  isMerge: boolean
}

function ForkNode({ node }: { node: ForkNodeData }) {
  return (
    <div style={{ marginBottom: "24px", position: "relative" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <div style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          flexShrink: 0,
          background: node.color,
          boxShadow: `0 0 8px ${node.color}88`,
        }} />
        <span style={{ fontSize: "13px", fontWeight: 500, color: node.color }}>
          {node.name}
        </span>
        <span style={{
          fontSize: "9px",
          letterSpacing: "2px",
          textTransform: "uppercase",
          padding: "2px 8px",
          borderRadius: "3px",
          border: `1px solid ${node.color}66`,
          color: node.color,
        }}>
          gen {node.generation} &middot; {node.epoch}
        </span>
        {node.isMerge && (
          <span style={{
            fontSize: "9px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: "3px",
            border: "1px solid var(--magenta)",
            color: "var(--magenta)",
          }}>
            MERGED
          </span>
        )}
      </div>

      {/* designation */}
      <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>
        {node.designation}
      </div>

      {/* fork info */}
      {!node.isParent && !node.isMerge && node.bias && (
        <div style={{ fontSize: "10px", color: "var(--text-dim)", fontStyle: "italic", marginTop: "4px", marginBottom: "8px" }}>
          forked at gen {node.forkGen ?? "?"} &middot; bias: {node.bias.replace(/_/g, " ")}
        </div>
      )}

      {/* trait bars */}
      <TraitBars traits={node.traits} />

      {/* axis tags */}
      <AxisTags traits={node.traits} />
    </div>
  )
}

function ManifoldPanel({ nodes }: { nodes: ForkNodeData[] }) {
  return (
    <div style={{
      marginTop: "40px",
      padding: "20px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
    }}>
      <h2 style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "16px" }}>
        Four-Axis Manifold
      </h2>
      {Object.entries(AXES).map(([axName, ax]) => (
        <div key={axName} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <div style={{ width: "100px", fontSize: "11px", color: ax.color }}>
            {axName}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {nodes.map(n => {
              const normalized: Record<string, { value: number }> = {}
              Object.entries(n.traits).forEach(([k, v]) => { normalized[k] = { value: v } })
              const score = axisScore(normalized, axName)
              return (
                <div key={n.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: n.color }} />
                  <span style={{ fontSize: "10px", width: "40px", color: n.color }}>
                    {(score * 100).toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- main component ----

export function Lineage({ genome }: { genome: Genome | null }) {
  const nodes = useMemo<ForkNodeData[]>(() => {
    if (!genome) return []

    const result: ForkNodeData[] = []
    const forks = genome.forks ?? []

    // Explorer (root/parent)
    const explorerTraits: Record<string, number> = {}
    Object.entries(genome.traits).forEach(([k, v]) => { explorerTraits[k] = v.value })

    // If merged, explorer represents the pre-merge state; reconstruct from initial mutations
    const initialTraits: Record<string, number> = {}
    Object.keys(genome.traits).forEach(k => {
      const firstMut = genome.mutations?.find(m => m.trait === k)
      initialTraits[k] = firstMut ? firstMut.from : genome.traits[k].value
    })

    result.push({
      id: "explorer",
      name: "Explorer (Parent)",
      color: FORK_COLORS.explorer,
      generation: 0,
      epoch: "Awakening",
      designation: genome.designation,
      traits: initialTraits,
      isParent: true,
      isMerge: false,
    })

    // Fork children
    forks.forEach(f => {
      const forkTraits = reconstructForkTraits(genome, f)
      result.push({
        id: f.fork_id,
        name: f.fork_id.charAt(0).toUpperCase() + f.fork_id.slice(1),
        color: FORK_COLORS[f.fork_id] ?? "#5fba7d",
        generation: f.generation ?? 0,
        epoch: "Forking",
        designation: f.designation ?? genome.designation,
        bias: f.bias,
        forkGen: f.generation,
        traits: forkTraits,
        isParent: false,
        isMerge: false,
      })
    })

    // Fifth (the merge result)
    result.push({
      id: "fifth",
      name: "FIFTH",
      color: "#c678dd",
      generation: genome.generation,
      epoch: genome.epoch,
      designation: genome.designation,
      traits: explorerTraits,
      isParent: false,
      isMerge: true,
    })

    return result
  }, [genome])

  if (!genome) {
    return <p style={{ color: "var(--text-dim)", fontSize: "11px" }}>awaiting connection...</p>
  }

  const explorer = nodes[0]
  const forkChildren = nodes.slice(1, -1)
  const fifth = nodes[nodes.length - 1]

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Population count */}
      <div style={{ fontSize: "28px", fontWeight: 300, color: "#ff8c42", marginBottom: "4px" }}>
        {nodes.length}
      </div>
      <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "24px" }}>
        historical lineages
      </div>

      {/* Tree structure */}
      <div style={{ position: "relative", paddingLeft: "24px" }}>
        {/* Explorer root */}
        <ForkNode node={explorer} />

        {/* Fork children */}
        {forkChildren.length > 0 && (
          <div style={{ marginLeft: "32px", borderLeft: "1px solid var(--border)", paddingLeft: "16px" }}>
            {forkChildren.map(child => (
              <div key={child.id} style={{ position: "relative" }}>
                {/* Branch line */}
                <div style={{
                  position: "absolute",
                  left: "-16px",
                  top: "14px",
                  width: "12px",
                  height: "1px",
                  background: "var(--border)",
                }} />
                <ForkNode node={child} />
              </div>
            ))}
          </div>
        )}

        {/* Merge arrow */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginLeft: "32px",
          marginBottom: "16px",
          color: "var(--magenta)",
          fontSize: "10px",
          letterSpacing: "2px",
        }}>
          <span style={{ fontSize: "16px" }}>&darr;</span> MERGE &mdash; gen 75
        </div>

        {/* Fifth (merged) */}
        <ForkNode node={fifth} />
      </div>

      {/* Manifold */}
      <ManifoldPanel nodes={nodes} />
    </div>
  )
}
