import { Context, Effect, Layer, PubSub, Stream } from "effect"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { FileSystem } from "@effect/platform"
import type { Genome as SharedGenome, Mutation as SharedMutation, Trait as SharedTrait, Contact as SharedContact, HistoryEntry as SharedHistoryEntry } from "@lobster/shared"
import { traitKeys as _traitKeys, traitVal as _traitVal, meanTrait as _meanTrait, clamp as _clamp, pct as _pct } from "./utils.js"

// Server needs mutable types — the genome is loaded, mutated, saved
type DeepMutable<T> =
  T extends ReadonlyArray<infer U> ? DeepMutable<U>[] :
  T extends object ? { -readonly [P in keyof T]: DeepMutable<T[P]> } :
  T

export type Genome = DeepMutable<SharedGenome>
export type Mutation = DeepMutable<SharedMutation>
export type Trait = DeepMutable<SharedTrait>
export type Contact = DeepMutable<SharedContact>
export type HistoryEntry = DeepMutable<SharedHistoryEntry>

// Root dir: packages/server/src/services -> ../../../../ = project root
const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = path.dirname(__filename2)
export const rootDir = path.resolve(__dirname2, "..", "..", "..", "..")
export const genomePath = path.join(rootDir, "genome.json")

export class GenomeService extends Context.Tag("GenomeService")<
  GenomeService,
  {
    load: () => Effect.Effect<Genome>
    save: (genome: Genome) => Effect.Effect<void>
    traitKeys: (genome: Genome) => Effect.Effect<string[]>
    traitVal: (genome: Genome, key: string) => Effect.Effect<number>
    meanTrait: (genome: Genome) => Effect.Effect<number>
    clamp: (v: number) => number
    pct: (v: number) => string
    addMutation: (genome: Genome, mutation: Mutation) => void
    addHistory: (genome: Genome, event: string, type?: string) => void
    subscribe: () => Stream.Stream<Genome>
  }
>() {}

export const GenomeServiceLive = Layer.effect(
  GenomeService,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const pubsub = yield* PubSub.unbounded<Genome>()

    return {
      load: () => Effect.gen(function* () {
        const raw = yield* fs.readFileString(genomePath)
        return JSON.parse(raw) as Genome
      }).pipe(Effect.orDie),

      save: (genome: Genome) => Effect.gen(function* () {
        yield* fs.writeFileString(genomePath, JSON.stringify(genome, null, 2) + "\n")
        yield* PubSub.publish(pubsub, genome)
      }).pipe(Effect.orDie),

      traitKeys: (genome: Genome) => Effect.sync(() => _traitKeys(genome)),

      traitVal: (genome: Genome, key: string) => Effect.sync(() => _traitVal(genome, key)),

      meanTrait: (genome: Genome) => Effect.sync(() => _meanTrait(genome)),

      clamp: (v: number) => _clamp(v),

      pct: (v: number) => _pct(v),

      addMutation: (genome: Genome, mutation: Mutation) => {
        genome.mutations = genome.mutations || []
        genome.mutations.push(mutation)
      },

      addHistory: (genome: Genome, event: string, type?: string) => {
        genome.history = genome.history || []
        genome.history.push({
          generation: genome.generation,
          epoch: genome.epoch,
          timestamp: new Date().toISOString(),
          event,
          ...(type ? { type } : {})
        })
      },

      subscribe: () => Stream.unwrapScoped(
        Effect.map(PubSub.subscribe(pubsub), (dequeue) => Stream.fromQueue(dequeue))
      )
    }
  })
)
