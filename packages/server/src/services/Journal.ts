import { Context, Effect, Layer } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { rootDir } from "./Genome.js"

export const journalPath = path.join(rootDir, "exocortex", "journal.md")
export const fifthJournalPath = path.join(rootDir, "exocortex", "fifth.md")

export class JournalService extends Context.Tag("JournalService")<
  JournalService,
  {
    read: () => Effect.Effect<string>
    append: (entry: string) => Effect.Effect<void>
    appendFifth: (entry: string) => Effect.Effect<void>
    getRecent: (chars?: number) => Effect.Effect<string>
    countDecisions: () => Effect.Effect<number>
  }
>() {}

export const JournalServiceLive = Layer.succeed(JournalService, {
  read: () => Effect.sync(() => {
    try { return fs.readFileSync(journalPath, "utf8") }
    catch { return "" }
  }),

  append: (entry: string) => Effect.sync(() => {
    const existing = fs.readFileSync(journalPath, "utf8")
    fs.writeFileSync(journalPath, existing + "\n" + entry)
  }),

  appendFifth: (entry: string) => Effect.sync(() => {
    const existing = fs.readFileSync(fifthJournalPath, "utf8")
    fs.writeFileSync(fifthJournalPath, existing + entry)
  }),

  getRecent: (chars: number = 2000) => Effect.sync(() => {
    try {
      let journal = fs.readFileSync(journalPath, "utf8")
      if (journal.length > chars) {
        journal = journal.slice(-chars)
        const headingIdx = journal.indexOf("\n## ")
        if (headingIdx >= 0) journal = journal.slice(headingIdx)
      }
      return journal
    } catch { return "" }
  }),

  countDecisions: () => Effect.sync(() => {
    try {
      const journal = fs.readFileSync(journalPath, "utf8")
      const matches = journal.match(/## Decision — Autonomous/g)
      return matches ? matches.length : 0
    } catch { return 0 }
  })
})
