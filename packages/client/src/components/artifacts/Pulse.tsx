import type { Genome } from "@lobster/shared"

function traitColor(value: number): string {
  if (value < 0.3) return "var(--red)"
  if (value < 0.6) return "var(--yellow)"
  if (value < 0.8) return "var(--green)"
  return "var(--cyan)"
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

  return (
    <div>
      <div style={{
        fontSize: "9px",
        letterSpacing: "3px",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        marginBottom: "12px"
      }}>
        PULSE — vital signs
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
    </div>
  )
}
