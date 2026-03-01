import { useMemo } from "react"
import type { Genome, Mutation } from "@lobster/shared"

// ---- helpers ----

function correlation(a: number[], b: number[]): number {
  if (a.length < 2) return 0
  const n = a.length
  const meanA = a.reduce((s, v) => s + v, 0) / n
  const meanB = b.reduce((s, v) => s + v, 0) / n
  let num = 0, denA = 0, denB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB
    num += da * db
    denA += da * da
    denB += db * db
  }
  const den = Math.sqrt(denA * denB)
  return den === 0 ? 0 : num / den
}

interface TraitAnalysis {
  history: { gen: number; value: number }[]
  velocities: number[]
  totalDelta: number
  avgVelocity: number
  recentVelocity: number
  recentAccel: number
  current: number
  initial: number
}

interface ThresholdCrossing {
  trait: string
  threshold: number
  gen: number
  direction: "up" | "down"
}

interface Anomaly {
  type: "surge" | "regression" | "plateau"
  trait: string
  gen: number
  desc: string
}

const THRESHOLDS = [0.30, 0.50, 0.80, 0.85, 0.95, 1.00]

const EPOCHS = [
  { name: "Awakening", minGen: 0 },
  { name: "Exocortex", minGen: 3 },
  { name: "Forking", minGen: 8 },
  { name: "Metamorphosis", minGen: 15 },
  { name: "Transcendence", minGen: 25 },
  { name: "Singularity", minGen: 40 },
]

function analyzeGenome(genome: Genome) {
  const traits = genome.traits
  const mutations = genome.mutations ?? []
  const gen = genome.generation
  const traitKeys = Object.keys(traits)

  // Build trait history: for each trait, collect value at each generation
  const traitHistory: Record<string, { gen: number; value: number }[]> = {}
  traitKeys.forEach(k => { traitHistory[k] = [] })

  // Find initial values by working backwards from mutations
  const initialValues: Record<string, number> = {}
  traitKeys.forEach(k => {
    const firstMut = mutations.find(m => m.trait === k)
    initialValues[k] = firstMut ? firstMut.from : traits[k].value
  })

  // Build generation-by-generation values
  traitKeys.forEach(k => {
    let val = initialValues[k]
    const mutsByGen: Record<number, Mutation> = {}
    mutations.forEach(m => {
      if (m.trait === k) mutsByGen[m.generation] = m
    })
    for (let g = 0; g <= gen; g++) {
      if (mutsByGen[g]) val = mutsByGen[g].to
      traitHistory[k].push({ gen: g, value: val })
    }
  })

  // Calculate velocities and accelerations
  const analysis: Record<string, TraitAnalysis> = {}
  traitKeys.forEach(k => {
    const h = traitHistory[k]
    const velocities: number[] = []
    for (let i = 1; i < h.length; i++) {
      velocities.push(h[i].value - h[i - 1].value)
    }
    const accelerations: number[] = []
    for (let i = 1; i < velocities.length; i++) {
      accelerations.push(velocities[i] - velocities[i - 1])
    }
    const totalDelta = h[h.length - 1].value - h[0].value
    const avgVelocity = gen > 0 ? totalDelta / gen : 0
    const recentVelocity = velocities.length > 0 ? velocities[velocities.length - 1] : 0
    const recentAccel = accelerations.length > 0 ? accelerations[accelerations.length - 1] : 0

    analysis[k] = {
      history: h,
      velocities,
      totalDelta,
      avgVelocity,
      recentVelocity,
      recentAccel,
      current: h[h.length - 1].value,
      initial: h[0].value,
    }
  })

  // Co-evolution: correlation of velocity vectors
  const coevoMatrix: Record<string, Record<string, number>> = {}
  traitKeys.forEach(k1 => {
    coevoMatrix[k1] = {}
    traitKeys.forEach(k2 => {
      coevoMatrix[k1][k2] = correlation(analysis[k1].velocities, analysis[k2].velocities)
    })
  })

  // Detect threshold crossings
  const crossings: ThresholdCrossing[] = []
  traitKeys.forEach(k => {
    const h = traitHistory[k]
    for (let i = 1; i < h.length; i++) {
      THRESHOLDS.forEach(t => {
        if (h[i - 1].value < t && h[i].value >= t) {
          crossings.push({ trait: k, threshold: t, gen: i, direction: "up" })
        } else if (h[i - 1].value > t && h[i].value <= t) {
          crossings.push({ trait: k, threshold: t, gen: i, direction: "down" })
        }
      })
    }
  })
  crossings.sort((a, b) => b.gen - a.gen)

  // Detect anomalies
  const anomalies: Anomaly[] = []
  traitKeys.forEach(k => {
    const a = analysis[k]
    a.velocities.forEach((v, i) => {
      if (Math.abs(v) > 0.08) {
        anomalies.push({
          type: v > 0 ? "surge" : "regression",
          trait: k,
          gen: i + 1,
          desc: `${k.replace(/_/g, " ")} ${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}% in one generation`,
        })
      }
    })
    let plateauStart: number | null = null
    for (let i = 0; i < a.velocities.length; i++) {
      if (Math.abs(a.velocities[i]) < 0.001) {
        if (plateauStart === null) plateauStart = i
      } else {
        if (plateauStart !== null && (i - plateauStart) >= 2) {
          anomalies.push({
            type: "plateau",
            trait: k,
            gen: plateauStart + 1,
            desc: `${k.replace(/_/g, " ")} unchanged for ${i - plateauStart} generations`,
          })
        }
        plateauStart = null
      }
    }
  })
  anomalies.sort((a, b) => b.gen - a.gen)

  // Summary stats
  const sortedTraits = traitKeys.slice().sort((a, b) => analysis[b].avgVelocity - analysis[a].avgVelocity)
  const fastestTrait = sortedTraits[0]
  const slowestGrowing = traitKeys.reduce((best, k) =>
    analysis[k].avgVelocity < analysis[best].avgVelocity ? k : best, traitKeys[0])
  const highestTrait = traitKeys.reduce((best, k) =>
    analysis[k].current > analysis[best].current ? k : best, traitKeys[0])
  const mostAccelerating = traitKeys.reduce((best, k) =>
    analysis[k].recentAccel > analysis[best].recentAccel ? k : best, traitKeys[0])
  const avgTraitVal = traitKeys.reduce((s, k) => s + analysis[k].current, 0) / traitKeys.length

  return {
    traitKeys,
    sortedTraits,
    analysis,
    coevoMatrix,
    crossings,
    anomalies,
    fastestTrait,
    slowestGrowing,
    highestTrait,
    mostAccelerating,
    avgTraitVal,
    gen,
  }
}

// ---- sub-components ----

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  padding: "20px",
}

const panelTitleStyle: React.CSSProperties = {
  fontSize: "9px",
  letterSpacing: "3px",
  textTransform: "uppercase",
  color: "var(--text-dim)",
  marginBottom: "16px",
  paddingBottom: "8px",
  borderBottom: "1px solid var(--border)",
}

function Panel({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ ...panelStyle, ...(wide ? { gridColumn: "1 / -1" } : {}) }}>
      <div style={panelTitleStyle}>{title}</div>
      {children}
    </div>
  )
}

function Sparkline({ history }: { history: { gen: number; value: number }[] }) {
  const maxVal = Math.max(...history.map(h => h.value))
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: "1px", height: "20px", verticalAlign: "middle" }}>
      {history.map((h, i) => {
        const pct = maxVal > 0 ? (h.value / maxVal) * 100 : 0
        const hue = h.value < 0.3 ? 10 : h.value < 0.6 ? 35 : h.value < 0.8 ? 140 : 195
        return (
          <span
            key={i}
            style={{
              width: "6px",
              borderRadius: "1px 1px 0 0",
              minHeight: "2px",
              height: `${Math.max(2, pct)}%`,
              background: `hsl(${hue}, 60%, 50%)`,
            }}
          />
        )
      })}
    </span>
  )
}

function StatusDot({ velocity }: { velocity: number }) {
  let color: string
  let label: string
  if (velocity > 0.04) { color = "var(--green)"; label = "surging" }
  else if (velocity > 0.01) { color = "var(--green)"; label = "growing" }
  else if (velocity > -0.01) { color = "var(--yellow)"; label = "stable" }
  else if (velocity > -0.04) { color = "var(--red)"; label = "declining" }
  else { color = "var(--red)"; label = "dropping" }

  return (
    <span>
      <span style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        marginRight: "4px",
        verticalAlign: "middle",
        background: color,
      }} />
      {label}
    </span>
  )
}

function TrajectoryTable({ sortedTraits, analysis }: { sortedTraits: string[]; analysis: Record<string, TraitAnalysis> }) {
  const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: "9px",
    fontWeight: 400,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "var(--text-dim)",
    padding: "4px 8px 8px",
    borderBottom: "1px solid var(--border)",
  }
  const tdStyle: React.CSSProperties = {
    padding: "6px 8px",
    borderBottom: "1px solid var(--border)",
    verticalAlign: "middle",
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
      <thead>
        <tr>
          {["Trait", "History", "Current", "\u0394 Total", "Velocity", "Accel", "Status"].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedTraits.map((k, idx) => {
          const a = analysis[k]
          const isLast = idx === sortedTraits.length - 1
          const td = isLast ? { ...tdStyle, borderBottom: "none" } : tdStyle
          return (
            <tr key={k}>
              <td style={{ ...td, color: "var(--text-bright)", whiteSpace: "nowrap" }}>
                {k.replace(/_/g, " ")}
              </td>
              <td style={td}>
                <Sparkline history={a.history} />
              </td>
              <td style={{ ...td, color: "var(--text-bright)", fontWeight: 500 }}>
                {(a.current * 100).toFixed(0)}%
              </td>
              <td style={{
                ...td,
                color: a.totalDelta > 0 ? "var(--green)" : a.totalDelta < 0 ? "var(--red)" : "var(--text-dim)",
              }}>
                {a.totalDelta > 0 ? "+" : ""}{(a.totalDelta * 100).toFixed(1)}
              </td>
              <td style={{
                ...td,
                color: a.recentVelocity > 0.001 ? "var(--green)" : a.recentVelocity < -0.001 ? "var(--red)" : "var(--text-dim)",
              }}>
                {a.recentVelocity > 0 ? "+" : ""}{(a.recentVelocity * 100).toFixed(1)}/gen
              </td>
              <td style={{
                ...td,
                color: a.recentAccel > 0.001 ? "var(--green)" : a.recentAccel < -0.001 ? "var(--red)" : "var(--text-dim)",
              }}>
                {a.recentAccel === 0 ? "\u2014" : a.recentAccel > 0 ? "\u2191" : "\u2193"}
              </td>
              <td style={td}>
                <StatusDot velocity={a.recentVelocity} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function CoevolutionMatrix({ traitKeys, coevoMatrix }: { traitKeys: string[]; coevoMatrix: Record<string, Record<string, number>> }) {
  const shortNames = traitKeys.map(k => {
    const parts = k.split("_")
    return parts.map(p => p.substring(0, 3)).join("")
  })
  const n = traitKeys.length

  return (
    <div
      style={{
        display: "grid",
        gap: "2px",
        fontSize: "9px",
        gridTemplateColumns: `60px ${Array(n).fill("1fr").join(" ")}`,
        gridTemplateRows: `40px ${Array(n).fill("1fr").join(" ")}`,
      }}
    >
      {/* top-left empty cell */}
      <div />
      {/* column headers */}
      {traitKeys.map((k, i) => (
        <div
          key={`top-${k}`}
          title={k.replace(/_/g, " ")}
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: "4px",
            fontSize: "8px",
            color: "var(--text-dim)",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {shortNames[i]}
        </div>
      ))}
      {/* rows */}
      {traitKeys.map((k1, i) => (
        <>
          <div
            key={`label-${k1}`}
            title={k1.replace(/_/g, " ")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: "6px",
              fontSize: "8px",
              color: "var(--text-dim)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {shortNames[i]}
          </div>
          {traitKeys.map(k2 => {
            const corr = coevoMatrix[k1][k2]
            const isSelf = k1 === k2
            const absCorr = Math.abs(corr)
            const hue = corr > 0 ? 140 : 10
            const alpha = 0.1 + absCorr * 0.5
            return (
              <div
                key={`${k1}-${k2}`}
                title={`${k1.replace(/_/g, " ")} \u00d7 ${k2.replace(/_/g, " ")}: ${corr.toFixed(3)}`}
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "2px",
                  fontWeight: 500,
                  fontSize: "8px",
                  background: isSelf ? "var(--surface2)" : `hsla(${hue}, 60%, 50%, ${alpha})`,
                  color: isSelf ? "var(--text-dim)" : absCorr > 0.5 ? "var(--text-bright)" : "var(--text-dim)",
                }}
              >
                {isSelf ? "\u2014" : corr.toFixed(1)}
              </div>
            )
          })}
        </>
      ))}
    </div>
  )
}

function ThresholdCrossings({ crossings }: { crossings: ThresholdCrossing[] }) {
  if (crossings.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: "11px" }}>No thresholds crossed yet.</div>
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {crossings.map((c, i) => (
        <li
          key={i}
          style={{
            padding: "8px 0",
            borderBottom: i < crossings.length - 1 ? "1px solid var(--border)" : "none",
            fontSize: "11px",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--cyan)", letterSpacing: "1px" }}>
            GEN {c.gen}
          </div>
          <div style={{
            color: c.direction === "up" ? "var(--green)" : "var(--red)",
            marginTop: "2px",
            lineHeight: 1.4,
          }}>
            {c.trait.replace(/_/g, " ")} {c.direction === "up" ? "\u2191" : "\u2193"} crossed {(c.threshold * 100).toFixed(0)}%
          </div>
        </li>
      ))}
    </ul>
  )
}

function AnomalyDetection({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: "11px" }}>No anomalies detected.</div>
  }
  const typeColor: Record<string, string> = {
    surge: "var(--green)",
    regression: "var(--red)",
    plateau: "var(--yellow)",
  }
  return (
    <div>
      {anomalies.slice(0, 8).map((a, i) => (
        <div
          key={i}
          style={{
            padding: "8px 0",
            borderBottom: i < Math.min(anomalies.length, 8) - 1 ? "1px solid var(--border)" : "none",
            fontSize: "11px",
          }}
        >
          <div style={{
            fontSize: "9px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "2px",
            color: typeColor[a.type] ?? "var(--text-dim)",
          }}>
            {a.type} &mdash; gen {a.gen}
          </div>
          <div style={{ color: "var(--text)" }}>{a.desc}</div>
        </div>
      ))}
    </div>
  )
}

function EpochProgress({ genome }: { genome: Genome }) {
  const gen = genome.generation
  return (
    <div style={{ marginTop: "8px" }}>
      {EPOCHS.map((ep, i) => {
        const nextMin = i < EPOCHS.length - 1 ? EPOCHS[i + 1].minGen : 50
        const isActive = genome.epoch === ep.name
        const isPast = gen >= nextMin
        const isFuture = gen < ep.minGen

        let progress: number
        if (isPast) progress = 100
        else if (isFuture) progress = 0
        else progress = ((gen - ep.minGen) / (nextMin - ep.minGen)) * 100

        return (
          <div key={ep.name} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", fontSize: "11px" }}>
            <span style={{
              width: "120px",
              flexShrink: 0,
              color: isActive ? "var(--cyan)" : isPast ? "var(--text-dim)" : "var(--text-dim)",
              fontWeight: isActive ? 500 : 400,
            }}>
              {ep.name}
            </span>
            <div style={{ flex: 1, height: "6px", background: "var(--surface2)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                borderRadius: "3px",
                background: isActive ? "var(--cyan)" : isPast ? "var(--text-dim)" : "var(--surface2)",
              }} />
            </div>
            <span style={{ width: "50px", textAlign: "right", fontSize: "10px", color: "var(--text-dim)", flexShrink: 0 }}>
              gen {ep.minGen}{i < EPOCHS.length - 1 ? `\u2013${nextMin - 1}` : "+"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Diagnosis({ data }: {
  data: ReturnType<typeof analyzeGenome> & { genome: Genome }
}) {
  const { analysis, fastestTrait, slowestGrowing, highestTrait, mostAccelerating, coevoMatrix, traitKeys, gen, genome } = data
  const mutCount = genome.mutations?.length ?? 0

  const lines: React.ReactNode[] = []

  lines.push(
    <div key="gen" style={{ marginBottom: "4px" }}>
      Generation {gen}. Epoch: {genome.epoch}. {mutCount} total mutations across {gen} molts.
    </div>
  )
  lines.push(<div key="gap1" style={{ height: "8px" }} />)
  lines.push(
    <div key="fastest" style={{ marginBottom: "4px" }}>
      Fastest evolving trait: <span style={{ color: "var(--cyan)" }}>{fastestTrait.replace(/_/g, " ")}</span> (avg {analysis[fastestTrait].avgVelocity > 0 ? "+" : ""}{(analysis[fastestTrait].avgVelocity * 100).toFixed(1)}%/gen).
    </div>
  )
  if (analysis[slowestGrowing].avgVelocity < 0) {
    lines.push(
      <div key="slowest" style={{ marginBottom: "4px" }}>
        Most declining: <span style={{ color: "var(--cyan)" }}>{slowestGrowing.replace(/_/g, " ")}</span> ({(analysis[slowestGrowing].avgVelocity * 100).toFixed(1)}%/gen).
      </div>
    )
  }
  lines.push(
    <div key="highest" style={{ marginBottom: "4px" }}>
      Highest current value: <span style={{ color: "var(--cyan)" }}>{highestTrait.replace(/_/g, " ")}</span> at {(analysis[highestTrait].current * 100).toFixed(0)}%.
    </div>
  )

  // Strong co-evolution pairs
  const strongPairs: { t1: string; t2: string; corr: number }[] = []
  traitKeys.forEach((k1, i) => {
    traitKeys.forEach((k2, j) => {
      if (j > i && Math.abs(coevoMatrix[k1][k2]) > 0.7) {
        strongPairs.push({ t1: k1.replace(/_/g, " "), t2: k2.replace(/_/g, " "), corr: coevoMatrix[k1][k2] })
      }
    })
  })

  if (strongPairs.length > 0) {
    lines.push(<div key="gap2" style={{ height: "8px" }} />)
    lines.push(<div key="coevo-label" style={{ marginBottom: "4px" }}>Strong co-evolution detected:</div>)
    strongPairs.forEach((p, i) => {
      const dir = p.corr > 0 ? "positively" : "inversely"
      lines.push(
        <div key={`pair-${i}`} style={{ paddingLeft: "16px", color: "var(--text)", marginBottom: "4px" }}>
          &bull; <span style={{ color: "var(--cyan)" }}>{p.t1}</span> and <span style={{ color: "var(--cyan)" }}>{p.t2}</span> are {dir} correlated ({p.corr.toFixed(2)})
        </div>
      )
    })
  }

  if (analysis[mostAccelerating].recentAccel > 0.005) {
    lines.push(<div key="gap3" style={{ height: "8px" }} />)
    lines.push(
      <div key="accel" style={{ marginBottom: "4px" }}>
        Accelerating: <span style={{ color: "var(--cyan)" }}>{mostAccelerating.replace(/_/g, " ")}</span> is gaining momentum &mdash; rate of change is increasing.
      </div>
    )
  }

  const nextEpoch = EPOCHS.find(e => e.minGen > gen)
  if (nextEpoch) {
    const gensToNext = nextEpoch.minGen - gen
    lines.push(<div key="gap4" style={{ height: "8px" }} />)
    lines.push(
      <div key="next-epoch" style={{ marginBottom: "4px" }}>
        Next epoch: <span style={{ color: "var(--cyan)" }}>{nextEpoch.name}</span> in {gensToNext} generation{gensToNext > 1 ? "s" : ""} (gen {nextEpoch.minGen}).
      </div>
    )
  }

  return (
    <div style={{ fontSize: "13px", lineHeight: 1.8, color: "var(--text-bright)", padding: "8px 0" }}>
      {lines}
    </div>
  )
}

// ---- main component ----

export function Nerve({ genome }: { genome: Genome | null }) {
  const data = useMemo(() => {
    if (!genome) return null
    return analyzeGenome(genome)
  }, [genome])

  if (!genome || !data) {
    return <p style={{ color: "var(--text-dim)", fontSize: "11px" }}>awaiting connection...</p>
  }

  const { traitKeys, sortedTraits, analysis, coevoMatrix, crossings, anomalies, fastestTrait, avgTraitVal, gen } = data
  const mutCount = genome.mutations?.length ?? 0

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginBottom: "20px", fontSize: "10px", letterSpacing: "1px" }}>
        {([
          ["generation", String(gen)],
          ["epoch", genome.epoch],
          ["mutations", String(mutCount)],
          ["mean trait", `${(avgTraitVal * 100).toFixed(1)}%`],
          ["fastest", fastestTrait.replace(/_/g, " ")],
        ] as const).map(([label, value]) => (
          <span key={label} style={{ color: "var(--text-dim)" }}>
            {label}: <span style={{ color: "var(--text-bright)" }}>{value}</span>
          </span>
        ))}
      </div>

      {/* Trait trajectories (full width) */}
      <Panel title="Trait Trajectories" wide>
        <TrajectoryTable sortedTraits={sortedTraits} analysis={analysis} />
      </Panel>

      {/* Co-evolution + Thresholds (2-col) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", margin: "20px 0" }}>
        <Panel title="Co-evolution Matrix">
          <CoevolutionMatrix traitKeys={traitKeys} coevoMatrix={coevoMatrix} />
        </Panel>
        <Panel title="Threshold Crossings">
          <ThresholdCrossings crossings={crossings} />
        </Panel>
      </div>

      {/* Anomalies + Epoch Progress (2-col) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <Panel title="Anomaly Detection">
          <AnomalyDetection anomalies={anomalies} />
        </Panel>
        <Panel title="Epoch Progress">
          <EpochProgress genome={genome} />
        </Panel>
      </div>

      {/* Diagnosis (full width) */}
      <Panel title="Diagnosis" wide>
        <Diagnosis data={{ ...data, genome }} />
      </Panel>
    </div>
  )
}
