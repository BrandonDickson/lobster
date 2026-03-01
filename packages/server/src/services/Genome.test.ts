import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect } from "effect"
import { GenomeService, GenomeServiceLive } from "./Genome.js"

describe("GenomeService", () => {
  it("loads genome.json", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* GenomeService
      return yield* svc.load()
    }).pipe(
      Effect.provide(GenomeServiceLive),
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
      Effect.provide(GenomeServiceLive),
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
      Effect.provide(GenomeServiceLive),
      Effect.runPromise
    )
    assert.ok(result.length === 10)
    assert.ok(result.includes("cognition"))
  })
})
