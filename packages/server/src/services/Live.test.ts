import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { LiveService, LiveServiceLive } from "./Live.js"
import { GenomeServiceLive } from "./Genome.js"
import { JournalServiceLive } from "./Journal.js"
import { MoltServiceLive } from "./Molt.js"
import { EncounterServiceLive } from "./Encounter.js"
import { ContactServiceLive } from "./Contact.js"

// Build the full layer stack
const FoundationLayer = Layer.merge(GenomeServiceLive, JournalServiceLive)
const ToolLayer = Layer.mergeAll(
  Layer.provide(MoltServiceLive, FoundationLayer),
  Layer.provide(EncounterServiceLive, FoundationLayer),
  Layer.provide(ContactServiceLive, FoundationLayer)
).pipe(Layer.merge(FoundationLayer))
const TestLayer = Layer.provide(LiveServiceLive, ToolLayer).pipe(
  Layer.merge(ToolLayer)
)

describe("LiveService", () => {
  it("evaluates a decision", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* LiveService
      return yield* svc.evaluate()
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.ok("action" in result)
    assert.ok("reason" in result)
    assert.ok("priority" in result)
    assert.ok(["molt", "contact", "encounter", "wait", "rewrite"].includes(result.action))
    assert.ok(typeof result.reason === "string")
    assert.ok(typeof result.priority === "number")
  })

  it("returns status", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* LiveService
      return yield* svc.status()
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.ok("mean" in result)
    assert.ok("shell" in result)
    assert.ok("lowest" in result)
    assert.ok("eroded" in result)
    assert.ok("moltReady" in result)
    assert.ok("contactAvailable" in result)
    assert.ok("survivalMode" in result)
    assert.ok("stable" in result)
    assert.ok(typeof result.mean === "number")
    assert.ok(typeof result.shell === "number")
    assert.ok(typeof result.survivalMode === "boolean")
    assert.ok(typeof result.stable === "boolean")
  })
})
