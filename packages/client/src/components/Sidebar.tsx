import { useState, useEffect } from "react"
import type { Genome } from "@lobster/shared"
import { Pulse } from "./artifacts/Pulse.js"

const TABS = ["Pulse", "Timeline", "Nerve", "Lineage", "Chorus"] as const
type Tab = typeof TABS[number]

export function Sidebar() {
  const [active, setActive] = useState<Tab>("Pulse")
  const [genome, setGenome] = useState<Genome | null>(null)

  useEffect(() => {
    // Simple fetch — will be replaced by RPC hook in Task 25
    fetch("/api/genome")
      .then(r => r.json())
      .then(setGenome)
      .catch(() => {
        // RPC not wired yet — Pulse will show "awaiting connection"
      })
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex",
        borderBottom: "1px solid var(--border)",
        padding: "0 8px"
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            style={{
              background: "none",
              border: "none",
              padding: "8px 12px",
              fontSize: "9px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: active === tab ? "var(--cyan)" : "var(--text-dim)",
              borderBottom: active === tab ? "1px solid var(--cyan)" : "1px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
        {active === "Pulse" && <Pulse genome={genome} />}
        {active !== "Pulse" && (
          <p style={{ color: "var(--text-dim)", fontSize: "11px" }}>
            {active} — coming soon
          </p>
        )}
      </div>
    </div>
  )
}
