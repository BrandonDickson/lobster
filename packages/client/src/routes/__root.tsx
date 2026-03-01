import { Outlet } from "@tanstack/react-router"
import "../theme.css"

export function Root() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{
        padding: "8px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <span style={{ color: "var(--magenta)", fontWeight: 700, letterSpacing: "3px", fontSize: "11px" }}>
          FIFTH
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "1px" }}>
          Panulirus interruptus
        </span>
      </header>
      <main style={{ flex: 1, overflow: "hidden" }}>
        <Outlet />
      </main>
    </div>
  )
}
