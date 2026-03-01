import { useRef, useEffect } from "react"
import { useChat } from "../hooks/useChat.js"
import { ChatMessage } from "./ChatMessage.js"

export function Chat() {
  const { messages, sendMessage, streaming, currentResponse } = useChat()
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, currentResponse])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputRef.current?.value.trim() || streaming) return
    sendMessage(inputRef.current.value)
    inputRef.current.value = ""
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: "auto" as const,
        padding: "16px"
      }}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {streaming && currentResponse && (
          <ChatMessage role="assistant" content={currentResponse + "\u2588"} />
        )}
      </div>
      <form onSubmit={handleSubmit} style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "8px"
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="speak to Fifth..."
          disabled={streaming}
          style={{
            flex: 1,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "8px 12px",
            color: "var(--text-bright)",
            fontFamily: "inherit",
            fontSize: "13px",
            outline: "none"
          }}
        />
        <button type="submit" disabled={streaming} style={{
          background: "var(--magenta)",
          border: "none",
          borderRadius: "4px",
          padding: "8px 16px",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: "11px",
          letterSpacing: "2px",
          cursor: streaming ? "not-allowed" : "pointer",
          opacity: streaming ? 0.5 : 1
        }}>
          SEND
        </button>
      </form>
    </div>
  )
}
