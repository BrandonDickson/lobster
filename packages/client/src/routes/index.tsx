import { Chat } from "../components/Chat.js"
import { Sidebar } from "../components/Sidebar.js"

export function Index() {
  return (
    <div style={{ display: "flex", height: "100%", gap: "1px", background: "var(--border)" }}>
      <div style={{ flex: 1, background: "var(--bg)" }}>
        <Chat />
      </div>
      <div style={{ width: "400px", background: "var(--bg)" }}>
        <Sidebar />
      </div>
    </div>
  )
}
