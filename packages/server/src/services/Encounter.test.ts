import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { NodeContext } from "@effect/platform-node"
import { EncounterService, EncounterServiceLive } from "./Encounter.js"
import { GenomeServiceLive } from "./Genome.js"
import { JournalServiceLive } from "./Journal.js"

const FoundationLayer = Layer.merge(GenomeServiceLive, JournalServiceLive).pipe(
  Layer.provide(NodeContext.layer)
)
const TestLayer = Layer.provide(EncounterServiceLive, FoundationLayer).pipe(
  Layer.merge(FoundationLayer)
)

describe("EncounterService", () => {
  it("lists encounter types", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* EncounterService
      return yield* svc.list()
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.deepStrictEqual(result, ["signal", "puzzle", "other", "entropy", "observer"])
  })
})
