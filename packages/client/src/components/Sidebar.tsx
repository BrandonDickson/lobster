import { useState } from "react"
import type { Genome } from "@lobster/shared"
import { ErrorBoundary } from "./ErrorBoundary.js"
import { Pulse } from "./artifacts/Pulse.js"
import { Timeline } from "./artifacts/Timeline.js"
import { Nerve } from "./artifacts/Nerve.js"
import { Lineage } from "./artifacts/Lineage.js"
import { Chorus } from "./artifacts/Chorus.js"

const TABS = ["Pulse", "Timeline", "Nerve", "Lineage", "Chorus"] as const
type Tab = typeof TABS[number]

interface SidebarProps {
  genome: Genome | null
}

export function Sidebar({ genome }: SidebarProps) {
  const [active, setActive] = useState<Tab>("Pulse")

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
        <ErrorBoundary>
          {active === "Pulse" && <Pulse genome={genome} />}
          {active === "Timeline" && <Timeline genome={genome} />}
          {active === "Nerve" && <Nerve genome={genome} />}
          {active === "Lineage" && <Lineage genome={genome} />}
          {active === "Chorus" && <Chorus genome={genome} />}
        </ErrorBoundary>
      </div>
    </div>
  )
}
