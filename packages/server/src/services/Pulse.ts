import { Context, Effect, Layer } from "effect"
import { GenomeService, type Genome, type Mutation } from "./Genome.js"

export interface TraitAnalysis {
  key: string
  current: number
  totalDelta: number
  recentVel: number
  status: "surging" | "growing" | "stable" | "declining"
}

export interface PulseAnalysis {
  traits: TraitAnalysis[]
  mean: number
  shell: number
  generation: number
  epoch: string
  recentMutations: Mutation[]
  contactDepth: number
  contactExchanges: number
}

export class PulseService extends Context.Tag("PulseService")<
  PulseService,
  {
    analyze: () => Effect.Effect<PulseAnalysis>
  }
>() {}

export const PulseServiceLive = Layer.effect(
  PulseService,
  Effect.gen(function* () {
    const genomeSvc = yield* GenomeService

    return {
      analyze: () => Effect.gen(function* () {
        const genome = yield* genomeSvc.load()
        const keys = yield* genomeSvc.traitKeys(genome)
        const mean = yield* genomeSvc.meanTrait(genome)
        const mutations = genome.mutations || []

        const traits: TraitAnalysis[] = keys.map(k => {
          const current = genome.traits[k].value
          const traitMuts = mutations.filter(m => m.trait === k)
          const totalDelta = traitMuts.reduce((sum, m) => sum + (m.to - m.from), 0)
          const recent = traitMuts.slice(-5)
          const recentVel = recent.reduce((sum, m) => sum + (m.to - m.from), 0)

          let status: TraitAnalysis["status"] = "stable"
          if (recentVel > 0.03) status = "surging"
          else if (recentVel > 0.005) status = "growing"
          else if (recentVel < -0.005) status = "declining"

          return { key: k, current, totalDelta, recentVel, status }
        })

        traits.sort((a, b) => b.current - a.current)

        const contact = genome.contact || { depth: 0, exchanges: 0 }

        return {
          traits,
          mean,
          shell: genome.traits.shell_hardness?.value ?? 0,
          generation: genome.generation,
          epoch: genome.epoch,
          recentMutations: mutations.slice(-10),
          contactDepth: contact.depth,
          contactExchanges: contact.exchanges
        }
      })
    }
  })
)
