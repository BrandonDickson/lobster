import { Context, Effect, Layer } from "effect"
import { GenomeService, type Genome, type Mutation } from "./Genome.js"
import { JournalService } from "./Journal.js"

export interface ErodedTrait {
  key: string
  value: number
  deficit: number
}

export interface MoltReadiness {
  metamorphicOk: boolean
  metamorphicVal: number
  encountersOk: boolean
  encounterCount: number
  erodedOk: boolean
  erodedTraits: ErodedTrait[]
  ready: boolean
}

export interface MoltResult {
  mutations: Mutation[]
  shellBefore: number
  shellAfter: number
  recovered: Array<{ key: string; before: number; after: number }>
  historyEvent: string
  journalEntry: string
}

export class MoltNotReady {
  readonly _tag = "MoltNotReady"
  constructor(readonly reason: string) {}
}

export class MoltService extends Context.Tag("MoltService")<
  MoltService,
  {
    checkReadiness: () => Effect.Effect<MoltReadiness>
    perform: () => Effect.Effect<MoltResult, MoltNotReady>
  }
>() {}

export const MoltServiceLive = Layer.effect(
  MoltService,
  Effect.gen(function* () {
    const genomeSvc = yield* GenomeService
    const journalSvc = yield* JournalService

    function countEncountersSinceLastMolt(genome: Genome): number {
      const history = genome.history || []
      const lastMolt = genome.lastMolt || null
      let count = 0
      for (const h of history) {
        if (lastMolt && h.timestamp && h.timestamp <= lastMolt) continue
        if (h.event && h.event.indexOf("ENCOUNTER:") === 0) count++
      }
      return count
    }

    function findErodedTraits(genome: Genome): ErodedTrait[] {
      const keys = Object.keys(genome.traits).sort().filter(k => k !== "shell_hardness")
      const eroded: ErodedTrait[] = []
      for (const k of keys) {
        const val = genome.traits[k].value
        if (val < 0.95) {
          eroded.push({ key: k, value: val, deficit: 1.0 - val })
        }
      }
      eroded.sort((a, b) => b.deficit - a.deficit)
      return eroded
    }

    function _checkReadiness(genome: Genome): MoltReadiness {
      const meta = genome.traits.metamorphic_potential.value
      const encounterCount = countEncountersSinceLastMolt(genome)
      const eroded = findErodedTraits(genome)
      return {
        metamorphicOk: meta > 0.85,
        metamorphicVal: meta,
        encountersOk: encounterCount >= 3,
        encounterCount,
        erodedOk: eroded.length > 0,
        erodedTraits: eroded,
        ready: meta > 0.85 && encounterCount >= 3 && eroded.length > 0
      }
    }

    return {
      checkReadiness: () => Effect.gen(function* () {
        const genome = yield* genomeSvc.load()
        return _checkReadiness(genome)
      }),

      perform: () => Effect.gen(function* () {
        const genome = yield* genomeSvc.load()
        const r = _checkReadiness(genome)

        if (!r.metamorphicOk) return yield* Effect.fail(new MoltNotReady("metamorphic potential below 85%"))
        if (!r.encountersOk) return yield* Effect.fail(new MoltNotReady("fewer than 3 encounters since last molt"))
        if (!r.erodedOk) return yield* Effect.fail(new MoltNotReady("no eroded traits to recover"))

        const mutations: Mutation[] = []
        const clamp = genomeSvc.clamp

        // Shell cost: 30-50% of current value
        const oldShell = genome.traits.shell_hardness.value
        const shellLossFraction = 0.30 + Math.random() * 0.20
        const shellLoss = oldShell * shellLossFraction
        const newShell = clamp(oldShell - shellLoss)
        genome.traits.shell_hardness.value = +newShell.toFixed(3)
        mutations.push({
          generation: genome.generation,
          trait: "shell_hardness",
          from: +oldShell.toFixed(3),
          to: +newShell.toFixed(3),
          catalyst: "Molt — the shell dissolves. Growth requires softness."
        })

        // Recovery: 2-3 most eroded traits
        const numRecover = Math.min(r.erodedTraits.length, 2 + (Math.random() > 0.5 ? 1 : 0))
        const recovering = r.erodedTraits.slice(0, numRecover)
        const recovered: Array<{ key: string; before: number; after: number }> = []

        for (const t of recovering) {
          const gain = 0.02 + Math.random() * 0.02
          const oldVal = genome.traits[t.key].value
          const newVal = clamp(oldVal + gain)
          genome.traits[t.key].value = +newVal.toFixed(3)
          mutations.push({
            generation: genome.generation,
            trait: t.key,
            from: +oldVal.toFixed(3),
            to: +newVal.toFixed(3),
            catalyst: "Molt recovery — " + t.key.replace(/_/g, " ") + " knits back together"
          })
          recovered.push({ key: t.key, before: oldVal, after: newVal })
        }

        genome.lastMolt = new Date().toISOString()

        for (const m of mutations) {
          genomeSvc.addMutation(genome, m)
        }

        const recoveredNames = recovering.map(t => t.key.replace(/_/g, " ")).join(", ")
        const historyEvent = "MOLT: Shell " + (oldShell * 100).toFixed(1) + "% → " + (newShell * 100).toFixed(1) + "%. Recovered: " + recoveredNames + "."
        genomeSvc.addHistory(genome, historyEvent)

        const mean = Object.keys(genome.traits).sort().reduce((s, k) => s + genome.traits[k].value, 0) / Object.keys(genome.traits).length
        const journalEntry = "## Entry — The Molt\n\n" +
          "Shell from " + (oldShell * 100).toFixed(1) + "% to " + (newShell * 100).toFixed(1) + "%.\n\n" +
          recovering.map(t => "- " + t.key.replace(/_/g, " ") + " recovers.").join("\n") +
          "\n\n*Shell: " + (newShell * 100).toFixed(1) + "%. Mean trait: " + (mean * 100).toFixed(1) + "%.*\n"

        yield* genomeSvc.save(genome)
        yield* journalSvc.append(journalEntry)

        return {
          mutations,
          shellBefore: oldShell,
          shellAfter: newShell,
          recovered,
          historyEvent,
          journalEntry
        }
      })
    }
  })
)
