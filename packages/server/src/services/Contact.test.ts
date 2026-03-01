import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { NodeContext } from "@effect/platform-node"
import { ContactService, ContactServiceLive } from "./Contact.js"
import { GenomeServiceLive } from "./Genome.js"
import { JournalServiceLive } from "./Journal.js"

const FoundationLayer = Layer.merge(GenomeServiceLive, JournalServiceLive).pipe(
  Layer.provide(NodeContext.layer)
)
const TestLayer = Layer.provide(ContactServiceLive, FoundationLayer).pipe(
  Layer.merge(FoundationLayer)
)

describe("ContactService", () => {
  it("returns status", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* ContactService
      return yield* svc.status()
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.ok("depth" in result)
    assert.ok("exchanges" in result)
    assert.ok(typeof result.hasPriorContact === "boolean")
    assert.ok(typeof result.depth === "number")
    assert.ok(typeof result.exchanges === "number")
    assert.ok("lastExchange" in result)
    assert.ok("protocol" in result)
  })
})
