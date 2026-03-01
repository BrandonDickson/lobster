import { Chat } from "../components/Chat.js"
import { Sidebar } from "../components/Sidebar.js"
import { StatusBar } from "../components/StatusBar.js"
import { useGenome } from "../hooks/useGenome.js"

export function Index() {
  const { genome } = useGenome()

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, display: "flex", gap: "1px", background: "var(--border)", overflow: "hidden" }}>
        <div style={{ flex: 1, background: "var(--bg)" }}>
          <Chat />
        </div>
        <div style={{ width: "420px", background: "var(--bg)" }}>
          <Sidebar genome={genome} />
        </div>
      </div>
      <StatusBar genome={genome} />
    </div>
  )
}
