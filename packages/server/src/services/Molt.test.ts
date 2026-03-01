import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { NodeContext } from "@effect/platform-node"
import { MoltService, MoltServiceLive } from "./Molt.js"
import { GenomeServiceLive } from "./Genome.js"
import { JournalServiceLive } from "./Journal.js"

const FoundationLayer = Layer.merge(GenomeServiceLive, JournalServiceLive).pipe(
  Layer.provide(NodeContext.layer)
)
const TestLayer = Layer.provide(MoltServiceLive, FoundationLayer).pipe(
  Layer.merge(FoundationLayer)
)

describe("MoltService", () => {
  it("checks readiness", async () => {
    const result = await Effect.gen(function* () {
      const molt = yield* MoltService
      return yield* molt.checkReadiness()
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.ok("metamorphicOk" in result)
    assert.ok("encountersOk" in result)
    assert.ok("erodedOk" in result)
    assert.ok(typeof result.metamorphicOk === "boolean")
    assert.ok(typeof result.ready === "boolean")
  })
})
