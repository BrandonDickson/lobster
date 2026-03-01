import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { ChatEvent, ChatMessage } from "../schemas/Chat.js"

export class ChatRpcs extends RpcGroup.make(
  Rpc.make("SendMessage", {
    payload: { message: Schema.String },
    success: ChatEvent,
    stream: true
  }),
  Rpc.make("GetHistory", {
    success: Schema.Array(ChatMessage)
  })
) {}
