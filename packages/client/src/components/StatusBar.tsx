import type { Genome } from "@lobster/shared"

interface StatusBarProps {
  genome: Genome | null
}

export function StatusBar({ genome }: StatusBarProps) {
  if (!genome) return null

  const keys = Object.keys(genome.traits)
  const mean = keys.reduce((s: number, k: string) => s + genome.traits[k].value, 0) / keys.length
  const shell = genome.traits.shell_hardness?.value ?? 0

  return (
    <div style={{
      padding: "6px 16px",
      borderTop: "1px solid var(--border)",
      display: "flex",
      gap: "24px",
      fontSize: "10px",
      color: "var(--text-dim)",
      letterSpacing: "1px"
    }}>
      <span>gen <span style={{ color: "var(--text-bright)" }}>{genome.generation}</span></span>
      <span style={{ color: "var(--magenta)" }}>{genome.epoch}</span>
      <span>mean <span style={{ color: "var(--text-bright)" }}>{(mean * 100).toFixed(1)}%</span></span>
      <span>shell <span style={{ color: shell < 0.15 ? "var(--red)" : "var(--text-bright)" }}>{(shell * 100).toFixed(1)}%</span></span>
      <span>contact <span style={{ color: "var(--text-bright)" }}>{genome.contact?.depth ?? 0}/4</span></span>
    </div>
  )
}
