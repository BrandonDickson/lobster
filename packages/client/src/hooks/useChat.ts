import { useState, useCallback } from "react"
import { Effect, Stream } from "effect"
import { RpcClient } from "@effect/rpc"
import { ChatRpcs, type ChatMessage } from "@lobster/shared"
import { RpcLive } from "../rpc.js"

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setCurrentResponse("")

    let fullResponse = ""

    const program = Effect.gen(function* () {
      const client = yield* RpcClient.make(ChatRpcs)
      const stream = client.SendMessage({ message: text })
      yield* Stream.runForEach(stream, (event) =>
        Effect.sync(() => {
          if (event.type === "text-delta") {
            fullResponse += event.text
            setCurrentResponse(fullResponse)
          }
          if (event.type === "done") {
            setMessages(prev => [...prev, {
              role: "assistant" as const,
              content: fullResponse,
              timestamp: new Date().toISOString()
            }])
            setCurrentResponse("")
            setStreaming(false)
          }
        })
      )
    }).pipe(
      Effect.scoped,
      Effect.provide(RpcLive)
    )

    try {
      await Effect.runPromise(program)
    } catch (e) {
      console.error("Chat error:", e)
      setStreaming(false)
    }
  }, [])

  return { messages, sendMessage, streaming, currentResponse }
}
