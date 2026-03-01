import { Effect, Stream } from "effect"
import { ChatRpcs, type ChatMessage, type ChatEvent } from "@lobster/shared"
import { ClaudeSession, type ClaudeProcess } from "../providers/ClaudeSession.js"

/**
 * Parse a raw JSON line from Claude's stream-json output into a ChatEvent.
 *
 * Claude CLI stream-json emits objects like:
 *   {"type":"assistant","message":{"type":"text","text":"..."}}
 *   {"type":"result","subtype":"success",...}
 *
 * We map these to our ChatEvent union.
 */
function parseChatEvent(line: string): ChatEvent | null {
  try {
    const obj = JSON.parse(line)

    if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta") {
      return { type: "text-delta" as const, text: obj.delta.text }
    }

    if (obj.type === "assistant" && obj.message?.content) {
      const content = obj.message.content
      if (typeof content === "string" && content.length > 0) {
        return { type: "text-delta" as const, text: content }
      }
    }

    if (obj.type === "text") {
      return { type: "text-delta" as const, text: obj.text || "" }
    }

    if (obj.type === "tool_use") {
      return {
        type: "tool-use" as const,
        name: obj.name || "unknown",
        input: typeof obj.input === "string" ? obj.input : JSON.stringify(obj.input || {})
      }
    }

    if (obj.type === "tool_result") {
      return {
        type: "tool-result" as const,
        output: typeof obj.output === "string" ? obj.output : JSON.stringify(obj.output || {})
      }
    }

    if (obj.type === "result") {
      return { type: "done" as const }
    }

    return null
  } catch {
    return null
  }
}

const doneEvent: ChatEvent = { type: "done" as const }

/**
 * ChatHandler — implements the ChatRpcs group.
 *
 * - SendMessage: starts a ClaudeSession, sends a message, streams ChatEvents
 * - GetHistory: returns empty array (no persistence yet)
 */
export const ChatHandlerLive = ChatRpcs.toLayer(
  Effect.gen(function* () {
    const session = yield* ClaudeSession

    return {
      SendMessage: ({ message }: { message: string }) => {
        const startAndSend = Effect.gen(function* () {
          const proc: ClaudeProcess = yield* session.start()
          yield* proc.send(message)

          const eventStream = proc.output.pipe(
            Stream.map((line) => parseChatEvent(line)),
            Stream.filter((evt): evt is ChatEvent => evt !== null),
            Stream.takeUntil((evt) => evt.type === "done"),
            Stream.orDie
          )

          return eventStream
        }).pipe(
          Effect.orDie
        )

        return Stream.unwrapScoped(startAndSend)
      },

      GetHistory: () =>
        Effect.succeed([] as Array<ChatMessage>)
    }
  })
)
