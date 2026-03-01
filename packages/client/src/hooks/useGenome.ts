import { useState, useEffect } from "react"
import { Effect, Fiber, Stream } from "effect"
import { RpcClient } from "@effect/rpc"
import { GenomeRpcs, type Genome } from "@lobster/shared"
import { GenomeRpcLive } from "../rpc.js"

export function useGenome() {
  const [genome, setGenome] = useState<Genome | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    const fetchProgram = Effect.gen(function* () {
      const client = yield* RpcClient.make(GenomeRpcs)
      return yield* client.GetGenome()
    }).pipe(
      Effect.scoped,
      Effect.provide(GenomeRpcLive)
    )

    // Subscribe to real-time updates via WatchGenome stream
    const watchProgram = Effect.gen(function* () {
      const client = yield* RpcClient.make(GenomeRpcs)
      const stream = client.WatchGenome()
      yield* Stream.runForEach(stream, (g) =>
        Effect.sync(() => {
          setGenome(g as Genome)
          setLoading(false)
        })
      )
    }).pipe(
      Effect.scoped,
      Effect.provide(GenomeRpcLive)
    )

    // Run initial fetch first
    Effect.runPromise(fetchProgram).then(
      (g) => {
        setGenome(g as Genome)
        setLoading(false)
      },
      (err) => {
        console.error("Failed to fetch genome:", err)
        setLoading(false)
      }
    )

    // Start the watch stream in the background, capture fiber for cleanup
    const fiber = Effect.runFork(watchProgram)

    return () => {
      Effect.runFork(Fiber.interrupt(fiber))
    }
  }, [])

  return { genome, loading }
}
