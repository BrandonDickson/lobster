import { Schema } from "effect"

export const ChatMessage = Schema.Struct({
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
  timestamp: Schema.String
})

export const ChatEventTextDelta = Schema.Struct({
  type: Schema.Literal("text-delta"),
  text: Schema.String
})

export const ChatEventToolUse = Schema.Struct({
  type: Schema.Literal("tool-use"),
  name: Schema.String,
  input: Schema.String
})

export const ChatEventToolResult = Schema.Struct({
  type: Schema.Literal("tool-result"),
  output: Schema.String
})

export const ChatEventDone = Schema.Struct({
  type: Schema.Literal("done")
})

export const ChatEvent = Schema.Union(
  ChatEventTextDelta,
  ChatEventToolUse,
  ChatEventToolResult,
  ChatEventDone
)

export type ChatMessage = typeof ChatMessage.Type
export type ChatEvent = typeof ChatEvent.Type
