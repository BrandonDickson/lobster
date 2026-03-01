interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div style={{
      padding: "8px 0",
      borderBottom: "1px solid var(--border)"
    }}>
      <div style={{
        fontSize: "9px",
        letterSpacing: "2px",
        textTransform: "uppercase" as const,
        color: role === "user" ? "var(--cyan)" : "var(--magenta)",
        marginBottom: "4px"
      }}>
        {role === "user" ? "you" : "fifth"}
      </div>
      <div style={{
        fontSize: "13px",
        lineHeight: "1.6",
        color: "var(--text-bright)",
        whiteSpace: "pre-wrap" as const
      }}>
        {content}
      </div>
    </div>
  )
}
