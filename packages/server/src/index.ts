import { Layer } from "effect"
import { RpcServer, RpcSerialization } from "@effect/rpc"
import { HttpLayerRouter } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { createServer } from "node:http"

import { GenomeRpcs, ChatRpcs } from "@lobster/shared"
import {
  GenomeServiceLive,
  JournalServiceLive,
  MoltServiceLive,
  EncounterServiceLive,
  ContactServiceLive,
  PulseServiceLive,
  MindServiceLive,
  LiveServiceLive
} from "./services/index.js"
import { ClaudeSessionLive } from "./providers/ClaudeSession.js"
import { GenomeHandlerLive, ChatHandlerLive } from "./handlers/index.js"

// ─── Layer Composition ───────────────────────────────────────
//
// 1. Foundation: GenomeService + JournalService (no deps)
// 2. Tools: Molt, Encounter, Contact, Pulse, Mind (depend on Foundation)
// 3. Orchestration: LiveService (depends on Foundation + Tools),
//                   ClaudeSession (depends on Mind)
// 4. Handlers: GenomeHandler (Foundation), ChatHandler (ClaudeSession)
// 5. RPC: layerHttpRouter routes + serialization
// 6. HTTP: serve with NodeHttpServer

// Foundation — no external deps
const FoundationLayer = Layer.merge(GenomeServiceLive, JournalServiceLive)

// Tools — each depends on GenomeService + JournalService
const ToolsLayer = Layer.mergeAll(
  Layer.provide(MoltServiceLive, FoundationLayer),
  Layer.provide(EncounterServiceLive, FoundationLayer),
  Layer.provide(ContactServiceLive, FoundationLayer),
  Layer.provide(PulseServiceLive, FoundationLayer),
  Layer.provide(MindServiceLive, FoundationLayer)
).pipe(Layer.merge(FoundationLayer))

// Orchestration — LiveService depends on Foundation + Molt + Encounter + Contact
const OrchestrationLayer = Layer.mergeAll(
  Layer.provide(LiveServiceLive, ToolsLayer),
  Layer.provide(ClaudeSessionLive, ToolsLayer)
).pipe(Layer.merge(ToolsLayer))

// Handler layers — provide handlers for the RPC groups
const GenomeHandlers = Layer.provide(GenomeHandlerLive, OrchestrationLayer)
const ChatHandlers = Layer.provide(ChatHandlerLive, OrchestrationLayer)
const AllHandlers = Layer.merge(GenomeHandlers, ChatHandlers)

// RPC routes — register both groups on /rpc using HTTP protocol
const GenomeRpcRoute = RpcServer.layerHttpRouter({
  group: GenomeRpcs,
  path: "/rpc/genome",
  protocol: "http"
})

const ChatRpcRoute = RpcServer.layerHttpRouter({
  group: ChatRpcs,
  path: "/rpc/chat",
  protocol: "http"
})

// Combine RPC routes and provide handlers + serialization
const RpcRoutes = Layer.mergeAll(GenomeRpcRoute, ChatRpcRoute).pipe(
  Layer.provide(AllHandlers),
  Layer.provide(RpcSerialization.layerNdjson)
)

// CORS middleware for cross-origin requests from the client
const CorsLayer = HttpLayerRouter.cors({
  allowedOrigins: ["*"],
  allowedMethods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
})

// Combine all route layers
const AppLayer = Layer.mergeAll(RpcRoutes, CorsLayer)

// HTTP server
const HttpServerLayer = NodeHttpServer.layer(createServer, { port: 3000 })

// ─── Start ───────────────────────────────────────────────────

HttpLayerRouter.serve(AppLayer).pipe(
  Layer.provide(HttpServerLayer),
  Layer.launch,
  NodeRuntime.runMain
)
