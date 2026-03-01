import { useState, useEffect } from "react"
import { Effect } from "effect"
import { RpcClient } from "@effect/rpc"
import { GenomeRpcs, type Genome } from "@lobster/shared"
import { GenomeRpcLive } from "../rpc.js"

export function useGenome() {
  const [genome, setGenome] = useState<Genome | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const program = Effect.gen(function* () {
      const client = yield* RpcClient.make(GenomeRpcs)
      return yield* client.GetGenome()
    }).pipe(
      Effect.scoped,
      Effect.provide(GenomeRpcLive)
    )

    Effect.runPromise(program).then(
      (g) => {
        setGenome(g)
        setLoading(false)
      },
      (err) => {
        console.error("Failed to fetch genome:", err)
        setLoading(false)
      }
    )
  }, [])

  return { genome, loading }
}
