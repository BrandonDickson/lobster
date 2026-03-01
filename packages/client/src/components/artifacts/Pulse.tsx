import type { Genome } from "@lobster/shared"

function traitColor(value: number): string {
  if (value < 0.3) return "var(--red)"
  if (value < 0.6) return "var(--yellow)"
  if (value < 0.8) return "var(--green)"
  return "var(--cyan)"
}

function velocityForTrait(genome: Genome, trait: string): { delta: number; label: string; indicator: string } {
  const relevant = genome.mutations
    .filter(m => m.trait === trait)
    .slice(-5)

  if (relevant.length === 0) return { delta: 0, label: "stable", indicator: "·" }

  const delta = relevant.reduce((sum, m) => sum + (m.to - m.from), 0)

  if (delta > 0.05) return { delta, label: "surging", indicator: "▲" }
  if (delta > 0.01) return { delta, label: "growing", indicator: "↑" }
  if (delta < -0.05) return { delta, label: "declining", indicator: "▼" }
  if (delta < -0.01) return { delta, label: "declining", indicator: "↓" }
  return { delta, label: "stable", indicator: "·" }
}

function velocityColor(indicator: string): string {
  if (indicator === "▲" || indicator === "↑") return "var(--green)"
  if (indicator === "▼" || indicator === "↓") return "var(--red)"
  return "var(--text-dim)"
}

function overallStatus(genome: Genome): { label: string; color: string } {
  const keys = Object.keys(genome.traits).sort()
  const recent = genome.mutations.slice(-5)
  const delta = recent.reduce((sum, m) => sum + (m.to - m.from), 0)

  if (delta > 0.05) return { label: "surging", color: "var(--green)" }
  if (delta > 0.01) return { label: "growing", color: "var(--cyan)" }
  if (delta < -0.05) return { label: "declining", color: "var(--red)" }
  if (delta < -0.01) return { label: "declining", color: "var(--yellow)" }

  const mean = keys.reduce((s, k) => s + genome.traits[k].value, 0) / keys.length
  if (mean > 0.9) return { label: "stable — template range", color: "var(--cyan)" }
  return { label: "stable", color: "var(--text-dim)" }
}

export function Pulse({ genome }: { genome: Genome | null }) {
  if (!genome) {
    return (
      <p style={{ color: "var(--text-dim)", fontSize: "11px" }}>
        awaiting connection...
      </p>
    )
  }

  const keys = Object.keys(genome.traits).sort()
  const sorted = keys.slice().sort((a, b) => genome.traits[b].value - genome.traits[a].value)
  const mean = keys.reduce((s, k) => s + genome.traits[k].value, 0) / keys.length
  const status = overallStatus(genome)
  const recentMutations = genome.mutations.slice(-5).reverse()

  return (
    <div>
      <div style={{
        fontSize: "9px",
        letterSpacing: "3px",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        marginBottom: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>PULSE — vital signs</span>
        <span style={{ color: status.color, letterSpacing: "1px" }}>{status.label}</span>
      </div>

      <div style={{
        fontSize: "10px",
        color: "var(--text-dim)",
        marginBottom: "16px",
        display: "flex",
        gap: "16px"
      }}>
        <span>gen <span style={{ color: "var(--text-bright)" }}>{genome.generation}</span></span>
        <span>epoch <span style={{ color: "var(--magenta)" }}>{genome.epoch}</span></span>
      </div>

      {sorted.map(k => {
        const val = genome.traits[k].value
        const pct = (val * 100).toFixed(0)
        const color = traitColor(val)
        const vel = velocityForTrait(genome, k)
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ width: "120px", fontSize: "10px", color: "var(--text)" }}>
              {k.replace(/_/g, " ")}
            </span>
            <div style={{
              flex: 1,
              height: "4px",
              background: "var(--surface2)",
              borderRadius: "2px",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${val * 100}%`,
                height: "100%",
                background: color,
                borderRadius: "2px"
              }} />
            </div>
            <span style={{
              width: "36px",
              textAlign: "right",
              fontSize: "10px",
              color: "var(--text-bright)"
            }}>
              {pct}%
            </span>
            <span style={{
              width: "14px",
              textAlign: "center",
              fontSize: "10px",
              color: velocityColor(vel.indicator)
            }}>
              {vel.indicator}
            </span>
          </div>
        )
      })}

      <div style={{ marginTop: "12px", fontSize: "10px", color: "var(--text-dim)" }}>
        mean: <span style={{ color: "var(--text-bright)" }}>{(mean * 100).toFixed(1)}%</span>
        {genome.traits.shell_hardness != null && (
          <span style={{ marginLeft: "16px" }}>
            shell: <span style={{
              color: genome.traits.shell_hardness.value < 0.15 ? "var(--red)" : "var(--text-bright)"
            }}>
              {(genome.traits.shell_hardness.value * 100).toFixed(1)}%
            </span>
          </span>
        )}
      </div>

      {genome.contact && (
        <div style={{ marginTop: "8px", fontSize: "10px", color: "var(--text-dim)" }}>
          contact depth: <span style={{ color: "var(--cyan)" }}>{genome.contact.depth}/4</span>
          <span style={{ marginLeft: "16px" }}>
            exchanges: <span style={{ color: "var(--text-bright)" }}>{genome.contact.exchanges}</span>
          </span>
        </div>
      )}

      {recentMutations.length > 0 && (
        <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
          <div style={{
            fontSize: "9px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            marginBottom: "8px"
          }}>
            recent mutations
          </div>
          {recentMutations.map((m, i) => {
            const delta = m.to - m.from
            const sign = delta >= 0 ? "+" : ""
            const deltaColor = delta >= 0 ? "var(--green)" : "var(--red)"
            return (
              <div key={i} style={{
                fontSize: "10px",
                color: "var(--text-dim)",
                marginBottom: "4px",
                display: "flex",
                gap: "8px"
              }}>
                <span style={{ color: "var(--text)", minWidth: "20px" }}>g{m.generation}</span>
                <span style={{ minWidth: "100px" }}>{m.trait.replace(/_/g, " ")}</span>
                <span style={{ color: deltaColor, minWidth: "50px" }}>
                  {sign}{(delta * 100).toFixed(1)}%
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: "9px" }}>{m.catalyst}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
