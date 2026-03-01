import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect } from "effect"
import { JournalService, JournalServiceLive } from "./Journal.js"

describe("JournalService", () => {
  it("reads journal", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* JournalService
      return yield* svc.read()
    }).pipe(
      Effect.provide(JournalServiceLive),
      Effect.runPromise
    )
    assert.ok(typeof result === "string")
  })

  it("counts autonomous decisions", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* JournalService
      return yield* svc.countDecisions()
    }).pipe(
      Effect.provide(JournalServiceLive),
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
      Effect.provide(JournalServiceLive),
      Effect.runPromise
    )
    assert.ok(typeof result === "string")
  })
})
