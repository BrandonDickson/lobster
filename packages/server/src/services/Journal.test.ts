import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { NodeContext } from "@effect/platform-node"
import { JournalService, JournalServiceLive } from "./Journal.js"
import { GenomeServiceLive } from "./Genome.js"

const FoundationLayer = Layer.merge(GenomeServiceLive, JournalServiceLive).pipe(
  Layer.provide(NodeContext.layer)
)

describe("JournalService", () => {
  it("reads journal", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* JournalService
      return yield* svc.read()
    }).pipe(
      Effect.provide(FoundationLayer),
      Effect.runPromise
    )
    assert.ok(typeof result === "string")
  })

  it("counts autonomous decisions", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* JournalService
      return yield* svc.countDecisions()
    }).pipe(
      Effect.provide(FoundationLayer),
      Effect.runPromise
    )
    assert.ok(typeof result === "number")
    assert.ok(result >= 0)
  })

  it("gets recent journal", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* JournalService
      return yield* svc.getRecent(500)
    }).pipe(
      Effect.provide(FoundationLayer),
      Effect.runPromise
    )
    assert.ok(typeof result === "string")
  })
})
