import { Effect, Stream } from "effect"
import { GenomeRpcs } from "@lobster/shared"
import { GenomeService } from "../services/Genome.js"

/**
 * GenomeHandler — implements the GenomeRpcs group.
 *
 * - GetGenome: loads current genome from disk
 * - GetTraitHistory: reconstructs per-trait history from mutations
 * - WatchGenome: emits current genome then streams PubSub updates
 */
export const GenomeHandlerLive = GenomeRpcs.toLayer(
  Effect.gen(function* () {
    const genomeSvc = yield* GenomeService

    return {
      GetGenome: () =>
        genomeSvc.load(),

      GetTraitHistory: () =>
        Effect.gen(function* () {
          const genome = yield* genomeSvc.load()
          const keys = yield* genomeSvc.traitKeys(genome)

          return keys.map((trait) => {
            const mutations = (genome.mutations || []).filter(
              (m) => m.trait === trait
            )
            const values = mutations.map((m) => m.to)
            // Prepend the initial value if we have mutations
            if (mutations.length > 0) {
              values.unshift(mutations[0].from)
            } else {
              values.push(genome.traits[trait].value)
            }
            return { trait, values }
          })
        }),

      WatchGenome: () =>
        Stream.concat(
          Stream.fromEffect(genomeSvc.load()),
          genomeSvc.subscribe()
        )
    }
  })
)
