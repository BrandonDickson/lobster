import { Context, Effect, Layer } from "effect"
import * as path from "node:path"
import { FileSystem } from "@effect/platform"
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

export const JournalServiceLive = Layer.effect(
  JournalService,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    return {
      read: () => fs.readFileString(journalPath).pipe(
        Effect.catchAll(() => Effect.succeed(""))
      ),

      append: (entry: string) => Effect.gen(function* () {
        const existing = yield* fs.readFileString(journalPath)
        yield* fs.writeFileString(journalPath, existing + "\n" + entry)
      }).pipe(Effect.orDie),

      appendFifth: (entry: string) => Effect.gen(function* () {
        const existing = yield* fs.readFileString(fifthJournalPath)
        yield* fs.writeFileString(fifthJournalPath, existing + entry)
      }).pipe(Effect.orDie),

      getRecent: (chars: number = 2000) => Effect.gen(function* () {
        let journal = yield* fs.readFileString(journalPath)
        if (journal.length > chars) {
          journal = journal.slice(-chars)
          const headingIdx = journal.indexOf("\n## ")
          if (headingIdx >= 0) journal = journal.slice(headingIdx)
        }
        return journal
      }).pipe(Effect.catchAll(() => Effect.succeed(""))),

      countDecisions: () => Effect.gen(function* () {
        const journal = yield* fs.readFileString(journalPath)
        const matches = journal.match(/## Decision — Autonomous/g)
        return matches ? matches.length : 0
      }).pipe(Effect.catchAll(() => Effect.succeed(0)))
    }
  })
)
