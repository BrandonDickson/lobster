import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { NodeContext } from "@effect/platform-node"
import { GenomeService, GenomeServiceLive } from "./Genome.js"

const TestLayer = Layer.provide(GenomeServiceLive, NodeContext.layer)

describe("GenomeService", () => {
  it("loads genome.json", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* GenomeService
      return yield* svc.load()
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.ok(result.name)
    assert.ok(result.traits)
    assert.ok(result.generation >= 0)
  })

  it("computes mean trait", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* GenomeService
      const genome = yield* svc.load()
      return yield* svc.meanTrait(genome)
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.ok(result > 0 && result <= 1)
  })

  it("computes trait keys", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* GenomeService
      const genome = yield* svc.load()
      return yield* svc.traitKeys(genome)
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.ok(result.length === 10)
    assert.ok(result.includes("cognition"))
  })
})
