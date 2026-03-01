import { Effect, Option, Ref, Stream } from "effect"
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

/**
 * ChatHandler — implements the ChatRpcs group.
 *
 * - SendMessage: reuses a persistent ClaudeProcess across messages
 * - GetHistory: returns empty array (no persistence yet)
 */
export const ChatHandlerLive = ChatRpcs.toLayer(
  Effect.gen(function* () {
    const session = yield* ClaudeSession
    const procRef = yield* Ref.make<Option.Option<ClaudeProcess>>(Option.none())

    const getOrStartProcess = Effect.gen(function* () {
      const current = yield* Ref.get(procRef)
      if (Option.isSome(current)) {
        return current.value
      }
      const proc = yield* session.start()
      yield* Ref.set(procRef, Option.some(proc))
      return proc
    })

    return {
      SendMessage: ({ message }: { message: string }) => {
        const sendToProc = Effect.gen(function* () {
          const proc = yield* getOrStartProcess
          yield* proc.send(message)

          return proc.output.pipe(
            Stream.map((line) => parseChatEvent(line)),
            Stream.filter((evt): evt is ChatEvent => evt !== null),
            Stream.takeUntil((evt) => evt.type === "done"),
            Stream.orDie
          )
        }).pipe(
          Effect.orDie
        )

        return Stream.unwrap(sendToProc)
      },

      GetHistory: () =>
        Effect.succeed([] as Array<ChatMessage>)
    }
  })
)
