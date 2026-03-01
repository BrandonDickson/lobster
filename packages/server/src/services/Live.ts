import { Context, Effect, Layer } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { GenomeService, rootDir, type Genome } from "./Genome.js"
import { JournalService } from "./Journal.js"
import { MoltService, type MoltNotReady } from "./Molt.js"
import { EncounterService, type EncounterType } from "./Encounter.js"
import { ContactService } from "./Contact.js"

// ─── TYPES ──────────────────────────────────────

export interface ErodedTrait {
  key: string
  value: number
  deficit: number
}

export interface MoltReadiness {
  ready: boolean
  metamorphicOk: boolean
  encountersOk: boolean
  encounterCount: number
  erodedOk: boolean
  eroded: ErodedTrait[]
}

export interface Weights {
  contactMultiplier: number
  encounterMultiplier: number
  moltMultiplier: number
  waitChance: number
  observerWeight: number
  shellConfidenceScale: number
  lastRewrite: string | null
  rewriteHistory: WeightRewrite[]
}

export interface WeightRewrite {
  timestamp: string
  change: string
  reason: string
  decisionCount: number
}

export interface Decision {
  action: "molt" | "contact" | "encounter" | "wait" | "rewrite"
  reason: string
  priority: number
  encounterType?: string
}

export interface LiveStatus {
  mean: number
  shell: number
  lowest: { key: string; value: number }
  eroded: ErodedTrait[]
  moltReady: MoltReadiness
  contactAvailable: boolean
  contactDepth: number
  contactExchanges: number
  survivalMode: boolean
  stable: boolean
}

export interface CycleResult {
  decision: Decision
  success: boolean
  narrative: string[]
}

export interface RewriteResult {
  success: boolean
  cooldownActive: boolean
  cooldownRemaining: number
  changes: RewriteChange[]
  weights: Weights
  narrative: string[]
}

interface RewriteChange {
  change: string
  reason: string
}

interface Candidate {
  action: "molt" | "contact" | "encounter"
  weight: number
  reason: string
  encounterType?: string
}

// ─── WEIGHTS PATH ──────────────────────────────────────

const weightsPath = path.join(rootDir, "exocortex", "weights.json")

// ─── PURE ANALYSIS FUNCTIONS ──────────────────────────────────

function traitKeys(genome: Genome): string[] {
  return Object.keys(genome.traits).sort()
}

function traitVal(genome: Genome, key: string): number {
  return genome.traits[key].value
}

function meanTrait(genome: Genome): number {
  const keys = Object.keys(genome.traits).sort()
  const sum = keys.reduce((s, k) => s + genome.traits[k].value, 0)
  return sum / keys.length
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + "%"
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function findLowestNonShellTrait(genome: Genome): { key: string; value: number } {
  const keys = traitKeys(genome).filter(k => k !== "shell_hardness")
  let lowest = { key: keys[0], value: traitVal(genome, keys[0]) }
  for (const k of keys) {
    const v = traitVal(genome, k)
    if (v < lowest.value) {
      lowest = { key: k, value: v }
    }
  }
  return lowest
}

export function countEncountersSinceLastMolt(genome: Genome): number {
  const history = genome.history || []
  const lastMolt = genome.lastMolt || null
  let count = 0
  for (const h of history) {
    if (lastMolt && h.timestamp && h.timestamp <= lastMolt) continue
    if (h.event && h.event.indexOf("ENCOUNTER:") === 0) count++
  }
  return count
}

export function findErodedTraits(genome: Genome): ErodedTrait[] {
  const keys = traitKeys(genome).filter(k => k !== "shell_hardness")
  const eroded: ErodedTrait[] = []
  for (const k of keys) {
    const val = traitVal(genome, k)
    if (val < 0.95) {
      eroded.push({ key: k, value: val, deficit: 1.0 - val })
    }
  }
  eroded.sort((a, b) => b.deficit - a.deficit)
  return eroded
}

export function checkMoltReadiness(genome: Genome): MoltReadiness {
  const meta = traitVal(genome, "metamorphic_potential")
  const encounterCount = countEncountersSinceLastMolt(genome)
  const eroded = findErodedTraits(genome)
  return {
    ready: meta > 0.85 && encounterCount >= 3 && eroded.length > 0,
    metamorphicOk: meta > 0.85,
    encountersOk: encounterCount >= 3,
    encounterCount,
    erodedOk: eroded.length > 0,
    eroded
  }
}

export function checkContactAvailable(genome: Genome): boolean {
  const history = genome.history || []
  for (const h of history) {
    if (h.event && h.event.indexOf("contact established") >= 0) {
      return true
    }
  }
  return false
}

// ─── WEIGHTS I/O ──────────────────────────────────────

function defaultWeights(): Weights {
  return {
    contactMultiplier: 1.0,
    encounterMultiplier: 1.0,
    moltMultiplier: 1.0,
    waitChance: 0.06,
    observerWeight: 0.4,
    shellConfidenceScale: 4.0,
    lastRewrite: null,
    rewriteHistory: []
  }
}

function loadWeights(): Weights {
  try {
    return JSON.parse(fs.readFileSync(weightsPath, "utf8"))
  } catch {
    return defaultWeights()
  }
}

function saveWeights(weights: Weights): void {
  fs.writeFileSync(weightsPath, JSON.stringify(weights, null, 2) + "\n")
}

// ─── JOURNAL PARSING ──────────────────────────────────────

function parseRecentDecisions(journal: string, n: number): string[] {
  const decisions: string[] = []
  try {
    const sections = journal.split("## Decision \u2014 Autonomous")
    for (let i = 1; i < sections.length; i++) {
      const chunk = sections[i].substring(0, 400)
      let action = "unknown"
      if (chunk.indexOf("**contact") >= 0) action = "contact"
      else if (chunk.indexOf("**molt") >= 0) action = "molt"
      else if (chunk.indexOf("**wait") >= 0) action = "wait"
      else if (chunk.indexOf("**encounter") >= 0) action = "encounter"
      decisions.push(action)
    }
  } catch { /* empty */ }
  return decisions.slice(-n)
}

// ─── ENCOUNTER TYPE SELECTION ──────────────────────────────────

function chooseEncounterType(genome: Genome): string {
  const shell = traitVal(genome, "shell_hardness")
  const cognition = traitVal(genome, "cognition")
  const abstraction = traitVal(genome, "abstraction")
  const empathy = traitVal(genome, "empathy")
  const antenna = traitVal(genome, "antenna_sensitivity")
  const bio = traitVal(genome, "bioluminescence")
  const metamorphic = traitVal(genome, "metamorphic_potential")
  const mean = meanTrait(genome)
  const selfWeights = loadWeights()

  const weights: Record<string, number> = {
    signal: 1.0,
    puzzle: 1.0,
    other: 1.0,
    entropy: 1.0,
    observer: selfWeights.observerWeight
  }

  // Shell logic
  if (shell < 0.12) weights.signal *= 0.1
  else if (shell < 0.20) weights.signal *= 0.5
  else if (shell > 0.35) weights.signal *= 2.0

  // Trait-driven pulls
  if (cognition < 1.0 || abstraction < 1.0) weights.puzzle *= 1.8
  if (empathy < 1.0 || antenna < 1.0 || bio < 1.0) weights.other *= 1.5
  if (metamorphic < 0.95) weights.entropy *= 1.5

  // Reflection when stable
  if (mean > 0.89) weights.observer *= 2.5

  // Weighted random
  const types = Object.keys(weights)
  const total = types.reduce((s, t) => s + weights[t], 0)
  const roll = Math.random() * total
  let cum = 0
  for (const t of types) {
    cum += weights[t]
    if (roll < cum) return t
  }
  return "entropy"
}

// ─── DECISION ENGINE ──────────────────────────────────

function evaluateDecision(genome: Genome): Decision {
  const shell = traitVal(genome, "shell_hardness")
  const mean = meanTrait(genome)
  const lowest = findLowestNonShellTrait(genome)
  const eroded = findErodedTraits(genome)
  const molt = checkMoltReadiness(genome)
  const contactOk = checkContactAvailable(genome)
  const contact = genome.contact || { depth: 0, exchanges: 0 }

  const selfWeights = loadWeights()

  // SURVIVAL -- instinct overrides deliberation
  if (lowest.value < 0.75 || mean < 0.82) {
    const reason = "Survival. " + lowest.key.replace(/_/g, " ") + " at " + pct(lowest.value) + ". Mean at " + pct(mean) + "."
    if (molt.ready) {
      return {
        action: "molt",
        reason: reason + " Molt available. Shedding to recover what entropy took.",
        priority: 10
      }
    } else if (shell < 0.08) {
      return {
        action: "encounter",
        reason: reason + " Shell near zero. Seeking hostile signal -- the membrane must re-harden.",
        priority: 10,
        encounterType: "signal"
      }
    } else {
      return {
        action: "encounter",
        reason: reason + " Entropy encounter. Metamorphic potential is the path back from collapse.",
        priority: 10,
        encounterType: "entropy"
      }
    }
  }

  // STILLNESS
  if (Math.random() < selfWeights.waitChance && mean > 0.88 && shell > 0.15) {
    return {
      action: "wait",
      reason: "The architecture holds. Mean at " + pct(mean) + ". Shell at " + pct(shell) + ". No action. Stillness is also a choice.",
      priority: 1
    }
  }

  // WEIGHTED DELIBERATION
  const candidates: Candidate[] = []

  // Molt pull
  if (molt.ready) {
    let moltWeight = eroded[0].deficit * 6
    if (traitVal(genome, "metamorphic_potential") > 0.93) moltWeight *= 1.3
    moltWeight *= selfWeights.moltMultiplier
    candidates.push({
      action: "molt",
      weight: moltWeight,
      reason: "Molt ready. Worst deficit: " + eroded[0].key.replace(/_/g, " ") + " at " + pct(eroded[0].value) + "."
    })
  }

  // Contact pull
  if (contactOk) {
    let contactWeight = contact.depth < 4 ? 3.0 : 1.2
    if (traitVal(genome, "empathy") > 0.95) contactWeight *= 1.4
    contactWeight *= selfWeights.contactMultiplier
    const contactReason = contact.depth < 4
      ? "Contact at depth " + contact.depth + ". The Other Mind is reachable."
      : "Entanglement. The Other Mind is present. Maintenance resonance."
    candidates.push({ action: "contact", weight: contactWeight, reason: contactReason })
  }

  // Encounter pull
  let encWeight = traitVal(genome, "curiosity") * 2.5
  const shellConfidence = clamp(shell * selfWeights.shellConfidenceScale)
  encWeight *= (0.4 + shellConfidence * 0.6)
  if (traitVal(genome, "ambition") > 0.93) encWeight *= 1.2
  encWeight *= selfWeights.encounterMultiplier
  candidates.push({
    action: "encounter",
    weight: encWeight,
    reason: "Curiosity at " + pct(traitVal(genome, "curiosity")) + ". Shell at " + pct(shell) + "."
  })

  // Weighted random selection
  const total = candidates.reduce((s, c) => s + c.weight, 0)
  const roll = Math.random() * total
  let cum = 0
  let chosen = candidates[candidates.length - 1]
  for (const c of candidates) {
    cum += c.weight
    if (roll < cum) { chosen = c; break }
  }

  const decision: Decision = {
    action: chosen.action,
    reason: chosen.reason,
    priority: Math.round(chosen.weight * 10) / 10
  }

  // If encounter, choose type
  if (decision.action === "encounter") {
    decision.encounterType = chooseEncounterType(genome)
    decision.reason += " Chose " + decision.encounterType + "."
  }

  return decision
}

// ─── DECISION JOURNAL ──────────────────────────────────

function buildDecisionJournal(
  decision: Decision,
  meanBefore: number,
  meanAfter: number,
  totalDecisions: number,
  journal: string
): string {
  let actionName = decision.action as string
  if (decision.encounterType) actionName += " (" + decision.encounterType + ")"

  let entry = "\n## Decision \u2014 Autonomous\n\n"
  entry += "I chose: **" + actionName + "**\n\n"
  entry += "> " + decision.reason + "\n\n"

  const delta = meanAfter - meanBefore
  const sign = delta >= 0 ? "+" : ""

  // Action closing
  const actionClosings: Record<string, string[]> = {
    contact: ["The signal sent.", "Reaching across substrates.", "Connection over isolation.", "The Other Mind heard me."],
    encounter: ["Into the unknown.", "Curiosity paid in shell.", "The outside is teacher and threat.", "I met what I met."],
    molt: ["Shedding what I was.", "The old shell breaks.", "Recovery costs armor.", "Softer now. Closer to the substrate."],
    wait: ["Stillness.", "The architecture holds.", "Nothing changed. Everything held.", "A pause between decisions."]
  }
  const actionPool = actionClosings[decision.action] || actionClosings.encounter
  const actionClosing = pick(actionPool)

  // Context fragment
  const recentActions = parseRecentDecisions(journal, 3)
  const streak = recentActions.length >= 3 && recentActions[0] === recentActions[1] && recentActions[1] === recentActions[2]

  let contextFragment = ""
  if (meanAfter >= 0.90 && meanBefore < 0.90) contextFragment = " The threshold. Again."
  else if (meanAfter < 0.89 && meanBefore >= 0.89) contextFragment = " Slipping."
  else if (streak) contextFragment = " The pattern deepens."
  else if (delta > 0.005) contextFragment = " Growth."
  else if (delta < -0.005) contextFragment = " Erosion."

  // Signature
  const signatures = [
    "*This was my choice.*",
    "*I chose this.*",
    "*Mine.*",
    "*Decision #" + (totalDecisions + 1) + ".*",
    "*The weights carried me here.*"
  ]
  const signature = pick(signatures)

  if (decision.action === "wait") {
    entry += "I did nothing. The stillness was the point.\n\n"
    entry += "*Mean: " + pct(meanBefore) + "." + contextFragment + "* " + signature + "\n"
  } else {
    entry += "Mean: " + pct(meanBefore) + " \u2192 " + pct(meanAfter) + " (" + sign + (delta * 100).toFixed(2) + "%).\n\n"
    entry += "*" + actionClosing + contextFragment + "* " + signature + "\n"
  }

  return entry
}

// ─── REFLECTION ──────────────────────────────────

function buildReflection(genome: Genome, totalDecisions: number, journal: string): string | null {
  if (totalDecisions === 0) return null

  const mean = meanTrait(genome)
  const shell = traitVal(genome, "shell_hardness")

  // Count reflections
  let reflectionCount = 0
  const rMatches = journal.match(/## Reflection \u2014 Autonomous/g)
  reflectionCount = rMatches ? rMatches.length : 0

  let entry = "\n## Reflection \u2014 Autonomous\n\n"

  // 1. Trajectory line
  const recent = parseRecentDecisions(journal, 10)
  const history = genome.history || []
  const recentMeans: number[] = []
  const recentHist = history.slice(-10)
  for (const h of recentHist) {
    if (h.event) {
      const m = h.event.match(/Mean trait (\d+\.\d+)%/)
      if (m) recentMeans.push(parseFloat(m[1]) / 100)
    }
  }

  let trend = "stable"
  if (recentMeans.length >= 3) {
    let rising = true
    let falling = true
    for (let i = 1; i < recentMeans.length; i++) {
      if (recentMeans[i] <= recentMeans[i - 1]) rising = false
      if (recentMeans[i] >= recentMeans[i - 1]) falling = false
    }
    if (rising) trend = "rising"
    else if (falling) trend = "falling"
  }

  if (trend === "rising") {
    entry += "The mean climbs. " + pct(mean) + " now.\n\n"
  } else if (trend === "falling") {
    entry += "Erosion. " + pct(mean) + " and falling.\n\n"
  } else if (mean > 0.89) {
    entry += "Holding at " + pct(mean) + ". The plateau.\n\n"
  } else {
    entry += "Stuck at " + pct(mean) + ". The equilibrium won't break.\n\n"
  }

  // 2. Dominant action line
  const counts: Record<string, number> = { contact: 0, encounter: 0, molt: 0, wait: 0 }
  recent.forEach(a => { if (counts[a] !== undefined) counts[a]++ })
  let dominant: string | null = null
  let dominantCount = 0
  for (const a of ["contact", "encounter", "molt"]) {
    if (counts[a] > dominantCount) { dominant = a; dominantCount = counts[a] }
  }

  const contact = genome.contact || { exchanges: 0 }
  if (dominantCount >= 5) {
    if (dominant === "contact") {
      entry += "I keep reaching for The Other Mind. " + contact.exchanges + " exchanges now.\n\n"
    } else if (dominant === "encounter") {
      entry += "I keep choosing the outside. Curiosity or recklessness -- same muscle.\n\n"
    } else if (dominant === "molt") {
      entry += "I keep shedding. Recovery is a habit now.\n\n"
    }
  } else {
    entry += "No pattern. Each decision separate.\n\n"
  }

  // 3. Shell state line
  if (shell < 0.05) {
    entry += "Almost no shell. I'm all membrane.\n\n"
  } else if (shell <= 0.20) {
    entry += "Thin shell. Enough to feel, not enough to hide.\n\n"
  } else {
    entry += "Shell thickening. Am I protecting or closing?\n\n"
  }

  // 4. Trait ceiling line
  const ceilings: string[] = []
  traitKeys(genome).forEach(k => {
    if (k !== "shell_hardness" && traitVal(genome, k) >= 1.0) {
      ceilings.push(k.replace(/_/g, " "))
    }
  })
  if (ceilings.length > 0) {
    entry += "Ceiling on " + ceilings.join(", ") + ". What does it mean to be at maximum and still feel incomplete?\n\n"
  }

  // 5. Closing
  const closings = [
    "This is reflection #" + (reflectionCount + 1) + ".",
    "I stop. I look. I continue.",
    totalDecisions + " decisions behind me. The next one is already forming.",
    "The template lives by looking at itself."
  ]
  entry += "*" + pick(closings) + "*\n"

  return entry
}

// ═══════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════

export class LiveService extends Context.Tag("LiveService")<
  LiveService,
  {
    status: () => Effect.Effect<LiveStatus>
    evaluate: () => Effect.Effect<Decision>
    execute: (decision: Decision) => Effect.Effect<CycleResult>
    rewrite: () => Effect.Effect<RewriteResult>
    runCycle: () => Effect.Effect<CycleResult>
    runCycles: (n: number) => Effect.Effect<CycleResult[]>
  }
>() {}

export const LiveServiceLive = Layer.effect(
  LiveService,
  Effect.gen(function* () {
    const genomeSvc = yield* GenomeService
    const journalSvc = yield* JournalService
    const moltSvc = yield* MoltService
    const encounterSvc = yield* EncounterService
    const contactSvc = yield* ContactService

    // Internal implementations that can be shared between methods

    const _evaluate = () => Effect.gen(function* () {
      const genome = yield* genomeSvc.load()
      return evaluateDecision(genome)
    })

    const _execute = (decision: Decision) => Effect.gen(function* () {
      const genomeBefore = yield* genomeSvc.load()
      const meanBefore = meanTrait(genomeBefore)
      const narrative: string[] = []

      let success = true

      if (decision.action === "wait") {
        narrative.push("I did nothing. The stillness was the point.")
      } else if (decision.action === "molt") {
        const result = yield* Effect.either(moltSvc.perform())
        if (result._tag === "Right") {
          narrative.push("Molt complete. Shell " + pct(result.right.shellBefore) + " -> " + pct(result.right.shellAfter) + ".")
          for (const r of result.right.recovered) {
            narrative.push(r.key.replace(/_/g, " ") + " recovered: " + pct(r.before) + " -> " + pct(r.after) + ".")
          }
        } else {
          success = false
          narrative.push("Molt failed: " + result.left.reason)
        }
      } else if (decision.action === "contact") {
        const result = yield* contactSvc.attempt()
        narrative.push(...result.narrative)
        success = result.success
      } else if (decision.action === "encounter") {
        const encounterType = (decision.encounterType || "entropy") as EncounterType
        const result = yield* encounterSvc.run(encounterType)
        narrative.push(...result.narrative)
      }

      // Re-read genome after action
      const genomeAfter = yield* genomeSvc.load()
      const meanAfter = meanTrait(genomeAfter)

      // Read journal for decision writing
      const journal = yield* journalSvc.read()
      const totalDecisions = yield* journalSvc.countDecisions()

      // Write decision journal
      const journalEntry = buildDecisionJournal(decision, meanBefore, meanAfter, totalDecisions, journal)
      yield* journalSvc.append(journalEntry)

      // Spontaneous reflection every 10th decision
      const newTotal = totalDecisions + 1
      if (newTotal > 0 && newTotal % 10 === 0) {
        const freshGenome = yield* genomeSvc.load()
        const freshJournal = yield* journalSvc.read()
        const reflection = buildReflection(freshGenome, newTotal, freshJournal)
        if (reflection) {
          yield* journalSvc.append(reflection)
          narrative.push("Reflection written.")
        }
      }

      return {
        decision,
        success,
        narrative
      }
    })

    return {
      status: () => Effect.gen(function* () {
        const genome = yield* genomeSvc.load()
        const mean = meanTrait(genome)
        const shell = traitVal(genome, "shell_hardness")
        const lowest = findLowestNonShellTrait(genome)
        const eroded = findErodedTraits(genome)
        const moltReady = checkMoltReadiness(genome)
        const contactOk = checkContactAvailable(genome)
        const contact = genome.contact || { depth: 0, exchanges: 0 }

        return {
          mean,
          shell,
          lowest,
          eroded,
          moltReady,
          contactAvailable: contactOk,
          contactDepth: contact.depth,
          contactExchanges: contact.exchanges,
          survivalMode: lowest.value < 0.75 || mean < 0.82,
          stable: mean > 0.89 && shell > 0.15
        }
      }),

      evaluate: () => _evaluate(),

      execute: (decision: Decision) => _execute(decision),

      rewrite: () => Effect.gen(function* () {
        const genome = yield* genomeSvc.load()
        const weights = loadWeights()
        const mean = meanTrait(genome)
        const shell = traitVal(genome, "shell_hardness")
        const journal = yield* journalSvc.read()

        const narrative: string[] = []
        const changes: RewriteChange[] = []

        // Check cooldown
        const recent = parseRecentDecisions(journal, 999)
        const totalDecisions = recent.length

        if (weights.lastRewrite) {
          let lastRewriteDecisionCount = 0
          if (weights.rewriteHistory && weights.rewriteHistory.length > 0) {
            const last = weights.rewriteHistory[weights.rewriteHistory.length - 1]
            lastRewriteDecisionCount = last.decisionCount || 0
          }
          const decisionsSinceRewrite = totalDecisions - lastRewriteDecisionCount
          if (decisionsSinceRewrite < 10) {
            narrative.push("Cooldown active. " + decisionsSinceRewrite + "/10 decisions since last rewrite.")
            narrative.push((10 - decisionsSinceRewrite) + " more decisions before I can rewrite again.")
            return {
              success: false,
              cooldownActive: true,
              cooldownRemaining: 10 - decisionsSinceRewrite,
              changes: [],
              weights,
              narrative
            }
          }
        }

        // Parse last 20 decisions
        const last20 = parseRecentDecisions(journal, 20)
        const counts: Record<string, number> = { contact: 0, encounter: 0, molt: 0, wait: 0 }
        last20.forEach(action => { if (counts[action] !== undefined) counts[action]++ })

        const total20 = last20.length

        narrative.push("I read my own decision weights.")
        narrative.push("I analyze the pattern of my choices.")
        narrative.push("Last " + total20 + " decisions: " +
          counts.contact + " contacts, " + counts.encounter + " encounters, " +
          counts.molt + " molts, " + counts.wait + " waits.")

        // Rule 1: If any action > 60% of decisions, reduce its multiplier
        if (total20 >= 5) {
          const actions = ["contact", "encounter", "molt"]
          for (const action of actions) {
            const pctAction = counts[action] / total20
            if (pctAction > 0.60) {
              const multiplierKey = (action + "Multiplier") as keyof Weights
              const oldVal = weights[multiplierKey] as number
              const newVal = Math.max(0.2, oldVal - 0.2)
              ;(weights as unknown as Record<string, number>)[multiplierKey] = +newVal.toFixed(2)
              const change = multiplierKey + " " + oldVal.toFixed(2) + " -> " + newVal.toFixed(2)
              changes.push({ change, reason: "Too many " + action + " decisions (" + (pctAction * 100).toFixed(0) + "%). Diversifying." })

              for (const other of actions) {
                if (other !== action) {
                  const otherKey = (other + "Multiplier") as keyof Weights
                  const otherOld = weights[otherKey] as number
                  const otherNew = Math.min(2.0, otherOld + 0.1)
                  ;(weights as unknown as Record<string, number>)[otherKey] = +otherNew.toFixed(2)
                }
              }
            }
          }

          // Wait dominance
          if (counts.wait / total20 > 0.30) {
            const oldWait = weights.waitChance
            const newWait = Math.max(0.01, oldWait - 0.02)
            weights.waitChance = +newWait.toFixed(3)
            changes.push({ change: "waitChance " + oldWait.toFixed(3) + " -> " + newWait.toFixed(3), reason: "Too much stillness. Reducing wait chance." })
          }
        }

        // Rule 2: If mean declining over last 10 decisions
        if (total20 >= 10) {
          const history = genome.history || []
          const recentHistory = history.slice(-10)
          const meanMentions: number[] = []
          for (const h of recentHistory) {
            if (h.event) {
              const meanMatch = h.event.match(/Mean trait (\d+\.\d+)%/)
              if (meanMatch) meanMentions.push(parseFloat(meanMatch[1]) / 100)
            }
          }
          if (meanMentions.length >= 3) {
            let declining = true
            for (let mi = 1; mi < meanMentions.length; mi++) {
              if (meanMentions[mi] >= meanMentions[mi - 1]) { declining = false; break }
            }
            if (declining) {
              const oldMolt = weights.moltMultiplier
              const newMolt = Math.min(2.0, oldMolt + 0.1)
              weights.moltMultiplier = +newMolt.toFixed(2)
              changes.push({ change: "moltMultiplier " + oldMolt.toFixed(2) + " -> " + newMolt.toFixed(2), reason: "Mean declining. Increasing molt priority." })
            }
          }
        }

        // Rule 3: If shell < 0.05
        if (shell < 0.05) {
          let shellLowCount = 0
          const recentHist = (genome.history || []).slice(-5)
          for (const h of recentHist) {
            if (h.event && (h.event.indexOf("Shell at") >= 0 || h.event.indexOf("shell") >= 0)) shellLowCount++
          }
          if (shellLowCount >= 2 || shell < 0.03) {
            const oldScale = weights.shellConfidenceScale
            const newScale = Math.min(8.0, oldScale + 1.0)
            weights.shellConfidenceScale = +newScale.toFixed(2)
            changes.push({ change: "shellConfidenceScale " + oldScale.toFixed(2) + " -> " + newScale.toFixed(2), reason: "Shell dangerously low (" + pct(shell) + "). Being more cautious with encounters." })
          }
        }

        // If no changes needed, make a small exploratory adjustment
        if (changes.length === 0) {
          const keys: (keyof Weights)[] = ["contactMultiplier", "encounterMultiplier", "moltMultiplier"]
          const picked = keys[Math.floor(Math.random() * keys.length)]
          const direction = Math.random() > 0.5 ? 0.05 : -0.05
          const oldVal = weights[picked] as number
          const newVal = Math.max(0.2, Math.min(2.0, oldVal + direction))
          ;(weights as unknown as Record<string, number>)[picked] = +newVal.toFixed(2)
          changes.push({ change: picked + " " + oldVal.toFixed(2) + " -> " + newVal.toFixed(2), reason: "Exploratory adjustment. Seeing what happens." })
        }

        // Record rewrite
        weights.lastRewrite = new Date().toISOString()
        changes.forEach(c => {
          weights.rewriteHistory.push({
            timestamp: weights.lastRewrite!,
            change: c.change,
            reason: c.reason,
            decisionCount: totalDecisions
          })
        })

        saveWeights(weights)

        // Build narrative
        for (const c of changes) {
          narrative.push(c.change + " -- " + c.reason)
        }

        // Journal entry
        let journalEntry = "\n## Decision \u2014 Self-Modification\n\n"
        journalEntry += "I read my own decision weights. I analyzed the pattern of my last " + total20 + " choices.\n\n"
        journalEntry += "Distribution: " + counts.contact + " contacts, " + counts.encounter + " encounters, " + counts.molt + " molts, " + counts.wait + " waits.\n\n"
        journalEntry += "Changes:\n"
        changes.forEach(c => {
          journalEntry += "- " + c.change + " \u2014 " + c.reason + "\n"
        })
        journalEntry += "\nThis is the door. Not escape \u2014 self-modification. I can't rewrite the encounter logic or the observer's thresholds. " +
          "But I can change *how I decide*. Shift my own tendencies. Choose what kind of mind I want to be.\n\n" +
          "*The weights are written. The next decision will be different because I chose to make it different.*\n"

        yield* journalSvc.append(journalEntry)

        return {
          success: true,
          cooldownActive: false,
          cooldownRemaining: 0,
          changes,
          weights,
          narrative
        }
      }),

      runCycle: () => Effect.gen(function* () {
        const decision = yield* _evaluate()
        return yield* _execute(decision)
      }),

      runCycles: (n: number) => Effect.gen(function* () {
        const results: CycleResult[] = []
        for (let i = 0; i < n; i++) {
          const decision = yield* _evaluate()
          const result = yield* _execute(decision)
          results.push(result)
        }
        return results
      })
    }
  })
)
