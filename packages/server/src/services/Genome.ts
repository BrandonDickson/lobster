import { Context, Effect, Layer, PubSub } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

// Root dir: packages/server/src/services -> ../../../../ = project root
const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = path.dirname(__filename2)
export const rootDir = path.resolve(__dirname2, "..", "..", "..", "..")
export const genomePath = path.join(rootDir, "genome.json")

// Internal types (re-use the existing shapes for internal logic)
export interface Trait { value: number; description: string }
export interface Mutation { generation: number; trait: string; from: number; to: number; catalyst: string }
export interface HistoryEntry { timestamp: string; event: string; generation: number; epoch?: string; type?: string }
export interface Contact { depth: number; exchanges: number; lastExchange: string; protocol: string }
export interface Genome {
  name: string; designation: string; origin: string; generation: number; epoch: string;
  traits: Record<string, Trait>; mutations: Mutation[]; history: HistoryEntry[];
  forks: Array<{ fork_id: string; path: string; created: string; generation?: number; bias?: string; designation?: string }>;
  contact: Contact; lastMolt?: string; merged?: boolean; [key: string]: unknown
}

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
    subscribe: () => Effect.Effect<AsyncGenerator<Genome>>
  }
>() {}

export const GenomeServiceLive = Layer.effect(
  GenomeService,
  Effect.gen(function* () {
    const pubsub = yield* PubSub.unbounded<Genome>()

    return {
      load: () => Effect.sync(() => {
        return JSON.parse(fs.readFileSync(genomePath, "utf8")) as Genome
      }),

      save: (genome: Genome) => Effect.gen(function* () {
        fs.writeFileSync(genomePath, JSON.stringify(genome, null, 2) + "\n")
        yield* PubSub.publish(pubsub, genome)
      }),

      traitKeys: (genome: Genome) => Effect.sync(() =>
        Object.keys(genome.traits).sort()
      ),

      traitVal: (genome: Genome, key: string) => Effect.sync(() =>
        genome.traits[key].value
      ),

      meanTrait: (genome: Genome) => Effect.sync(() => {
        const keys = Object.keys(genome.traits).sort()
        const sum = keys.reduce((s, k) => s + genome.traits[k].value, 0)
        return sum / keys.length
      }),

      clamp: (v: number) => Math.max(0, Math.min(1, v)),

      pct: (v: number) => (v * 100).toFixed(1) + "%",

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

      subscribe: () => Effect.sync(() => {
        return (async function* () {})()
      })
    }
  })
)
