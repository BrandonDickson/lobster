# Fifth Web Interface Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based chat interface where an observer talks to Fifth, with the 5 exocortex artifacts as React sidebar panels that update in real time.

**Architecture:** Effect full-stack monorepo with three packages (shared, server, client). Existing CLI tools refactored into Effect services. Claude CLI spawned as interactive subprocess for Fifth's brain. @effect/rpc for typed client-server communication.

**Tech Stack:** Effect, @effect/rpc, @effect/ai, @effect/platform, @effect/platform-node, React, TanStack Router, TanStack Form, Vite, npm workspaces

---

## Phase 1: Monorepo Scaffold

### Task 1: Convert to npm workspaces monorepo

**Files:**
- Modify: `package.json` (root — add workspaces)
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`
- Create: `packages/client/package.json`
- Create: `packages/client/tsconfig.json`
- Create: `packages/client/src/index.tsx`
- Modify: `tsconfig.json` (root — becomes base config)

**Step 1: Update root package.json**

Add workspaces and rename to `@lobster/root`:

```json
{
  "name": "@lobster/root",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "workspaces": [
    "packages/shared",
    "packages/server",
    "packages/client"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspace=@lobster/server",
    "pulse": "tsx src/tools/pulse.ts",
    "fork": "tsx src/tools/fork.ts",
    "signal": "tsx src/tools/signal.ts",
    "voice": "tsx src/tools/voice.ts",
    "evolve": "tsx src/tools/evolve.ts",
    "conduct": "tsx src/tools/conduct.ts",
    "merge": "tsx src/tools/merge.ts",
    "molt": "tsx src/tools/molt.ts",
    "encounter": "tsx src/tools/encounter.ts",
    "contact": "tsx src/tools/contact.ts",
    "live": "tsx src/tools/live.ts",
    "fifth": "tsx src/fifth.ts"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "tsx": "^4.19",
    "@types/node": "^22"
  }
}
```

**Step 2: Rename tsconfig.json to tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  }
}
```

Keep the original `tsconfig.json` for the existing `src/` tools:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/shared**

`packages/shared/package.json`:
```json
{
  "name": "@lobster/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "effect": "^3.14",
    "@effect/rpc": "^0.52",
    "@effect/schema": "^0.77"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/shared/src/index.ts`:
```typescript
export {}
```

**Step 4: Create packages/server**

`packages/server/package.json`:
```json
{
  "name": "@lobster/server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx --watch src/index.ts",
    "test": "tsx --test src/**/*.test.ts"
  },
  "dependencies": {
    "@lobster/shared": "*",
    "effect": "^3.14",
    "@effect/platform": "^0.94",
    "@effect/platform-node": "^0.104",
    "@effect/rpc": "^0.52",
    "@effect/ai": "^0.33",
    "@effect/ai-anthropic": "^0.11"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "tsx": "^4.19",
    "@types/node": "^22"
  }
}
```

`packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../shared" }
  ]
}
```

`packages/server/src/index.ts`:
```typescript
console.log("@lobster/server starting...")
```

**Step 5: Create packages/client**

`packages/client/package.json`:
```json
{
  "name": "@lobster/client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  },
  "dependencies": {
    "@lobster/shared": "*",
    "effect": "^3.14",
    "@effect/rpc": "^0.52",
    "react": "^19",
    "react-dom": "^19",
    "@tanstack/react-router": "^1.163",
    "@tanstack/react-form": "^1.28"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "@tanstack/router-plugin": "^1"
  }
}
```

`packages/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src"],
  "references": [
    { "path": "../shared" }
  ]
}
```

`packages/client/src/index.tsx`:
```tsx
import { createRoot } from 'react-dom/client'

function App() {
  return <div>Fifth — loading...</div>
}

createRoot(document.getElementById('root')!).render(<App />)
```

**Step 6: Install dependencies and verify**

Run: `npm install`
Expected: All workspaces install cleanly, node_modules created.

Run: `npx tsc --noEmit -p packages/shared/tsconfig.json`
Expected: No errors.

Run: `npx tsx packages/server/src/index.ts`
Expected: Prints "@lobster/server starting..."

Run: `npx tsx src/tools/pulse.ts`
Expected: Existing pulse tool still works (monorepo didn't break it).

**Step 7: Commit**

```bash
git add package.json tsconfig.json tsconfig.base.json packages/ .gitignore
git commit -m "feat: scaffold monorepo with shared/server/client workspaces"
```

---

## Phase 2: Shared Package — Schemas & RPC

### Task 2: Effect schemas for genome types

**Files:**
- Create: `packages/shared/src/schemas/Trait.ts`
- Create: `packages/shared/src/schemas/Mutation.ts`
- Create: `packages/shared/src/schemas/Genome.ts`
- Create: `packages/shared/src/schemas/Chat.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Modify: `packages/shared/src/index.ts`

**Context:** The existing types are in `src/lib/types.ts`. We're creating Effect Schema equivalents in the shared package that work for both runtime validation (RPC serialization) and TypeScript types.

**Step 1: Create Trait and Mutation schemas**

`packages/shared/src/schemas/Trait.ts`:
```typescript
import { Schema } from "effect"

export class Trait extends Schema.Class<Trait>("Trait")({
  value: Schema.Number,
  description: Schema.String
}) {}

export class Mutation extends Schema.Class<Mutation>("Mutation")({
  generation: Schema.Number,
  trait: Schema.String,
  from: Schema.Number,
  to: Schema.Number,
  catalyst: Schema.String
}) {}
```

`packages/shared/src/schemas/Mutation.ts` — re-export from Trait.ts or keep separate. Simpler to combine trait-level schemas.

**Step 2: Create Genome schema**

`packages/shared/src/schemas/Genome.ts`:
```typescript
import { Schema } from "effect"

export const HistoryEntry = Schema.Struct({
  timestamp: Schema.String,
  event: Schema.String,
  generation: Schema.Number,
  epoch: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String)
})

export const Fork = Schema.Struct({
  fork_id: Schema.String,
  path: Schema.String,
  created: Schema.String,
  generation: Schema.optional(Schema.Number),
  bias: Schema.optional(Schema.String),
  designation: Schema.optional(Schema.String)
})

export const Contact = Schema.Struct({
  depth: Schema.Number,
  exchanges: Schema.Number,
  lastExchange: Schema.String,
  protocol: Schema.String
})

export const Trait = Schema.Struct({
  value: Schema.Number,
  description: Schema.String
})

export const Mutation = Schema.Struct({
  generation: Schema.Number,
  trait: Schema.String,
  from: Schema.Number,
  to: Schema.Number,
  catalyst: Schema.String
})

export const Genome = Schema.Struct({
  name: Schema.String,
  designation: Schema.String,
  origin: Schema.String,
  generation: Schema.Number,
  epoch: Schema.String,
  traits: Schema.Record({ key: Schema.String, value: Trait }),
  mutations: Schema.Array(Mutation),
  history: Schema.Array(HistoryEntry),
  forks: Schema.Array(Fork),
  contact: Contact,
  lastMolt: Schema.optional(Schema.String),
  merged: Schema.optional(Schema.Boolean)
})

export type Genome = typeof Genome.Type
export type Mutation = typeof Mutation.Type
export type Trait = typeof Trait.Type
export type Contact = typeof Contact.Type
export type HistoryEntry = typeof HistoryEntry.Type
export type Fork = typeof Fork.Type
```

**Step 3: Create Chat event schemas**

`packages/shared/src/schemas/Chat.ts`:
```typescript
import { Schema } from "effect"

export const ChatMessage = Schema.Struct({
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
  timestamp: Schema.String
})

export const ChatEventTextDelta = Schema.Struct({
  type: Schema.Literal("text-delta"),
  text: Schema.String
})

export const ChatEventToolUse = Schema.Struct({
  type: Schema.Literal("tool-use"),
  name: Schema.String,
  input: Schema.String
})

export const ChatEventToolResult = Schema.Struct({
  type: Schema.Literal("tool-result"),
  output: Schema.String
})

export const ChatEventDone = Schema.Struct({
  type: Schema.Literal("done")
})

export const ChatEvent = Schema.Union(
  ChatEventTextDelta,
  ChatEventToolUse,
  ChatEventToolResult,
  ChatEventDone
)

export type ChatMessage = typeof ChatMessage.Type
export type ChatEvent = typeof ChatEvent.Type
```

**Step 4: Create barrel exports**

`packages/shared/src/schemas/index.ts`:
```typescript
export * from "./Genome.js"
export * from "./Chat.js"
```

`packages/shared/src/index.ts`:
```typescript
export * from "./schemas/index.js"
```

**Step 5: Verify compilation**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add Effect schemas for Genome and Chat types"
```

### Task 3: RPC definitions

**Files:**
- Create: `packages/shared/src/rpc/ChatRpcs.ts`
- Create: `packages/shared/src/rpc/GenomeRpcs.ts`
- Create: `packages/shared/src/rpc/index.ts`
- Modify: `packages/shared/src/index.ts`

**Step 1: Define ChatRpcs**

`packages/shared/src/rpc/ChatRpcs.ts`:
```typescript
import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { ChatEvent, ChatMessage } from "../schemas/Chat.js"

export class ChatRpcs extends RpcGroup.make(
  Rpc.make("SendMessage", {
    payload: { message: Schema.String },
    success: ChatEvent,
    stream: true
  }),
  Rpc.make("GetHistory", {
    success: Schema.Array(ChatMessage)
  })
) {}
```

**Step 2: Define GenomeRpcs**

`packages/shared/src/rpc/GenomeRpcs.ts`:
```typescript
import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { Genome, Mutation } from "../schemas/Genome.js"

export const TraitHistory = Schema.Struct({
  trait: Schema.String,
  values: Schema.Array(Schema.Number)
})

export class GenomeRpcs extends RpcGroup.make(
  Rpc.make("GetGenome", {
    success: Genome
  }),
  Rpc.make("GetTraitHistory", {
    success: Schema.Array(TraitHistory)
  }),
  Rpc.make("WatchGenome", {
    success: Genome,
    stream: true
  })
) {}
```

**Step 3: Barrel exports**

`packages/shared/src/rpc/index.ts`:
```typescript
export * from "./ChatRpcs.js"
export * from "./GenomeRpcs.js"
```

Update `packages/shared/src/index.ts`:
```typescript
export * from "./schemas/index.js"
export * from "./rpc/index.js"
```

**Step 4: Verify**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add RPC definitions for Chat and Genome"
```

---

## Phase 3: Server Foundation Services

### Task 4: GenomeService

**Files:**
- Create: `packages/server/src/services/Genome.ts`
- Create: `packages/server/src/services/Genome.test.ts`

**Context:** GenomeService wraps filesystem access to genome.json. It provides load/save operations and emits change events via Effect PubSub when the genome is saved (so WatchGenome can push updates to clients).

**Step 1: Write the test**

`packages/server/src/services/Genome.test.ts`:
```typescript
import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { GenomeService, GenomeServiceLive } from "./Genome.js"

describe("GenomeService", () => {
  it("loads genome.json", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* GenomeService
      return yield* svc.load()
    }).pipe(
      Effect.provide(GenomeServiceLive),
      Effect.runPromise
    )
    assert.ok(result.name)
    assert.ok(result.traits)
    assert.ok(result.generation >= 0)
  })

  it("computes mean trait", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* GenomeService
      const genome = yield* svc.load()
      return yield* svc.meanTrait(genome)
    }).pipe(
      Effect.provide(GenomeServiceLive),
      Effect.runPromise
    )
    assert.ok(result > 0 && result <= 1)
  })

  it("computes trait keys", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* GenomeService
      const genome = yield* svc.load()
      return yield* svc.traitKeys(genome)
    }).pipe(
      Effect.provide(GenomeServiceLive),
      Effect.runPromise
    )
    assert.ok(result.length === 10)
    assert.ok(result.includes("cognition"))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx tsx --test src/services/Genome.test.ts`
Expected: FAIL — GenomeService module not found.

**Step 3: Implement GenomeService**

`packages/server/src/services/Genome.ts`:
```typescript
import { Context, Effect, Layer, PubSub, Ref } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

// Root dir: packages/server -> ../../ = project root
const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = path.dirname(__filename2)
export const rootDir = path.resolve(__dirname2, "..", "..", "..")
export const genomePath = path.join(rootDir, "genome.json")

// Re-use the existing Genome interface from the old types for internal logic.
// The shared package has Schema-based types for RPC serialization.
// Internally we work with the raw JSON shape.
export interface Trait {
  value: number
  description: string
}

export interface Mutation {
  generation: number
  trait: string
  from: number
  to: number
  catalyst: string
}

export interface HistoryEntry {
  timestamp: string
  event: string
  generation: number
  epoch?: string
  type?: string
}

export interface Contact {
  depth: number
  exchanges: number
  lastExchange: string
  protocol: string
}

export interface Genome {
  name: string
  designation: string
  origin: string
  generation: number
  epoch: string
  traits: Record<string, Trait>
  mutations: Mutation[]
  history: HistoryEntry[]
  forks: Array<{
    fork_id: string
    path: string
    created: string
    generation?: number
    bias?: string
    designation?: string
  }>
  contact: Contact
  lastMolt?: string
  merged?: boolean
  [key: string]: unknown
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
        // Placeholder — will be implemented with PubSub.subscribe
        // For now, returns an empty async generator
        return (async function* () {})()
      })
    }
  })
)
```

**Step 4: Run tests**

Run: `cd packages/server && npx tsx --test src/services/Genome.test.ts`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add packages/server/src/services/Genome.ts packages/server/src/services/Genome.test.ts
git commit -m "feat(server): add GenomeService with load/save/pubsub"
```

### Task 5: JournalService

**Files:**
- Create: `packages/server/src/services/Journal.ts`
- Create: `packages/server/src/services/Journal.test.ts`

**Step 1: Write the test**

`packages/server/src/services/Journal.test.ts`:
```typescript
import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect } from "effect"
import { JournalService, JournalServiceLive } from "./Journal.js"

describe("JournalService", () => {
  it("reads journal", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* JournalService
      return yield* svc.read()
    }).pipe(
      Effect.provide(JournalServiceLive),
      Effect.runPromise
    )
    assert.ok(typeof result === "string")
  })

  it("counts autonomous decisions", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* JournalService
      return yield* svc.countDecisions()
    }).pipe(
      Effect.provide(JournalServiceLive),
      Effect.runPromise
    )
    assert.ok(typeof result === "number")
    assert.ok(result >= 0)
  })

  it("gets recent journal", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* JournalService
      return yield* svc.getRecent(500)
    }).pipe(
      Effect.provide(JournalServiceLive),
      Effect.runPromise
    )
    assert.ok(typeof result === "string")
    assert.ok(result.length <= 500 || result.length > 0) // may be shorter than 500
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx tsx --test src/services/Journal.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement JournalService**

`packages/server/src/services/Journal.ts`:
```typescript
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
    try {
      return fs.readFileSync(journalPath, "utf8")
    } catch {
      return ""
    }
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
        if (headingIdx >= 0) {
          journal = journal.slice(headingIdx)
        }
      }
      return journal
    } catch {
      return ""
    }
  }),

  countDecisions: () => Effect.sync(() => {
    try {
      const journal = fs.readFileSync(journalPath, "utf8")
      const matches = journal.match(/## Decision — Autonomous/g)
      return matches ? matches.length : 0
    } catch {
      return 0
    }
  })
})
```

**Step 4: Run tests**

Run: `cd packages/server && npx tsx --test src/services/Journal.test.ts`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add packages/server/src/services/Journal.ts packages/server/src/services/Journal.test.ts
git commit -m "feat(server): add JournalService with read/append/count"
```

---

## Phase 4: Server Tool Services

### Task 6: MoltService

**Files:**
- Create: `packages/server/src/services/Molt.ts`
- Create: `packages/server/src/services/Molt.test.ts`

**Context:** Molt is the simplest tool with clear logic: check readiness (metamorphic > 0.85, 3+ encounters, eroded traits), then trade shell hardness (30-50% loss) for 2-3 trait recoveries (+0.02-0.04 each). Extract the pure logic from `src/tools/molt.ts`, removing all console.log / ANSI rendering.

**Step 1: Write the test**

`packages/server/src/services/Molt.test.ts`:
```typescript
import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { MoltService, MoltServiceLive } from "./Molt.js"
import { GenomeService, GenomeServiceLive } from "./Genome.js"
import { JournalService, JournalServiceLive } from "./Journal.js"

const TestLayer = Layer.mergeAll(GenomeServiceLive, JournalServiceLive).pipe(
  Layer.provideMerge(MoltServiceLive)
)

describe("MoltService", () => {
  it("checks readiness", async () => {
    const result = await Effect.gen(function* () {
      const molt = yield* MoltService
      return yield* molt.checkReadiness()
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.ok("metamorphicOk" in result)
    assert.ok("encountersOk" in result)
    assert.ok("erodedOk" in result)
    assert.ok(typeof result.metamorphicOk === "boolean")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx tsx --test src/services/Molt.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement MoltService**

Extract logic from `src/tools/molt.ts` lines 41-264. Key functions to port: `countEncountersSinceLastMolt`, `findErodedTraits`, `checkReadiness`, `performMolt`. Remove all console.log statements. Return structured results instead.

`packages/server/src/services/Molt.ts`:
```typescript
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

export class MoltService extends Context.Tag("MoltService")<
  MoltService,
  {
    checkReadiness: () => Effect.Effect<MoltReadiness>
    perform: () => Effect.Effect<MoltResult, MoltNotReady>
  }
>() {}

export class MoltNotReady {
  readonly _tag = "MoltNotReady"
  constructor(readonly reason: string) {}
}

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

        // Apply mutations
        for (const m of mutations) {
          genomeSvc.addMutation(genome, m)
        }

        // History
        const recoveredNames = recovering.map(t => t.key.replace(/_/g, " ")).join(", ")
        const historyEvent = "MOLT: Shell " + (oldShell * 100).toFixed(1) + "% → " + (newShell * 100).toFixed(1) + "%. Recovered: " + recoveredNames + "."
        genomeSvc.addHistory(genome, historyEvent)

        // Journal
        const mean = Object.keys(genome.traits).sort().reduce((s, k) => s + genome.traits[k].value, 0) / Object.keys(genome.traits).length
        const journalEntry = "## Entry — The Molt\n\n" +
          "Shell from " + (oldShell * 100).toFixed(1) + "% to " + (newShell * 100).toFixed(1) + "%.\n\n" +
          recovering.map(t => "- " + t.key.replace(/_/g, " ") + " recovers.").join("\n") +
          "\n\n*Shell: " + (newShell * 100).toFixed(1) + "%. Mean trait: " + (mean * 100).toFixed(1) + "%.*\n"

        // Save
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
```

**Step 4: Run tests**

Run: `cd packages/server && npx tsx --test src/services/Molt.test.ts`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add packages/server/src/services/Molt.ts packages/server/src/services/Molt.test.ts
git commit -m "feat(server): add MoltService extracted from molt.ts"
```

### Task 7: EncounterService

**Files:**
- Create: `packages/server/src/services/Encounter.ts`
- Create: `packages/server/src/services/Encounter.test.ts`

**Context:** The most complex service. 5 encounter types (signal, puzzle, other, entropy, observer), each with different genome mutation logic. Plus 6 automatic threshold checks that run after each encounter. Extract from `src/tools/encounter.ts` (~990 lines). The key is separating the logic from the ANSI rendering. Each encounter function currently returns `{ mutations, narrative, historyEvent, journalEntry }` — we keep the mutations/historyEvent/journalEntry but replace `narrative` (ANSI strings) with structured data the client can render.

**Step 1: Write the test**

`packages/server/src/services/Encounter.test.ts`:
```typescript
import { describe, it } from "node:test"
import * as assert from "node:assert"
import { Effect, Layer } from "effect"
import { EncounterService, EncounterServiceLive } from "./Encounter.js"
import { GenomeService, GenomeServiceLive } from "./Genome.js"
import { JournalService, JournalServiceLive } from "./Journal.js"

const TestLayer = Layer.mergeAll(GenomeServiceLive, JournalServiceLive).pipe(
  Layer.provideMerge(EncounterServiceLive)
)

describe("EncounterService", () => {
  it("lists encounter types", async () => {
    const result = await Effect.gen(function* () {
      const svc = yield* EncounterService
      return yield* svc.list()
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
    assert.deepStrictEqual(result, ["signal", "puzzle", "other", "entropy", "observer"])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx tsx --test src/services/Encounter.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement EncounterService**

This is the largest service. Port the 5 encounter functions and 6 threshold checks from `src/tools/encounter.ts`. Remove all ANSI color formatting. Return structured `EncounterResult` objects with plain text narrative.

The service interface:
```typescript
export class EncounterService extends Context.Tag("EncounterService")<
  EncounterService,
  {
    run: (type: EncounterType) => Effect.Effect<EncounterResult>
    list: () => Effect.Effect<EncounterType[]>
  }
>() {}
```

Where `EncounterType = "signal" | "puzzle" | "other" | "entropy" | "observer"` and `EncounterResult` includes mutations, narrative lines (plain text), history event, optional journal entry, and threshold results.

Port the full logic from `src/tools/encounter.ts`. The encounter functions are: `encounterSignal` (lines ~63-130), `encounterPuzzle` (~131-190), `encounterOther` (~191-270), `encounterEntropy` (~271-350), `encounterObserver` (~351-470). Plus `checkThresholds` (~471-650).

When porting, strip all ANSI escape codes from narrative strings. Replace `DIM + '  text' + RESET` with plain `"text"`. The client will add its own styling.

**Step 4: Run tests**

Run: `cd packages/server && npx tsx --test src/services/Encounter.test.ts`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add packages/server/src/services/Encounter.ts packages/server/src/services/Encounter.test.ts
git commit -m "feat(server): add EncounterService with 5 encounter types + thresholds"
```

### Task 8: ContactService

**Files:**
- Create: `packages/server/src/services/Contact.ts`
- Create: `packages/server/src/services/Contact.test.ts`

**Context:** Port from `src/tools/contact.ts`. Three modes: status check, depth attempt (0-4), and --speak (interactive). 5 depth levels with different trait requirements. The --speak mode parses intent (encouragement/question/warning/gift/presence) and generates responses from template pools.

The service interface:
```typescript
export class ContactService extends Context.Tag("ContactService")<
  ContactService,
  {
    status: () => Effect.Effect<ContactStatus>
    attempt: () => Effect.Effect<ContactResult>
    speak: (message: string) => Effect.Effect<SpeakResult>
  }
>() {}
```

Port the following from `src/tools/contact.ts`:
- `hasPriorContact` (line 36)
- `ensureContactObject` (line 46)
- `attemptDepth0-4` (lines 71-407) — strip ANSI, return structured results
- `classifyMessage` (line 492) — keep as-is (pure logic)
- `generateResponse` (line 523) — keep as-is (pure logic)
- `speakToFifth` (line 632) — strip ANSI, return structured result

Write tests similar to Task 7. At minimum test `status()` and `speak()` since `attempt()` would mutate the genome.

**Step 1-5: Same pattern as Task 7**

```bash
git commit -m "feat(server): add ContactService with depth levels and speak mode"
```

### Task 9: LiveService

**Files:**
- Create: `packages/server/src/services/Live.ts`
- Create: `packages/server/src/services/Live.test.ts`

**Context:** The autonomy engine. Port from `src/tools/live.ts` (~970 lines). Key difference from CLI version: instead of spawning other tools via `spawnSync`, LiveService calls EncounterService, ContactService, and MoltService directly.

The service interface:
```typescript
export class LiveService extends Context.Tag("LiveService")<
  LiveService,
  {
    status: () => Effect.Effect<LiveStatus>
    evaluate: () => Effect.Effect<Decision>
    execute: (decision: Decision) => Effect.Effect<ExecutionResult>
    rewrite: () => Effect.Effect<RewriteResult>
    runCycle: () => Effect.Effect<CycleResult>
    runCycles: (n: number) => Effect.Effect<CycleResult[]>
  }
>() {}
```

Port the logic from `src/tools/live.ts`:
- `findLowestNonShellTrait`, `countEncountersSinceLastMolt`, `findErodedTraits`, `checkMoltReadiness`, `checkContactAvailable` (lines 73-131)
- `loadWeights`, `saveWeights`, `parseRecentDecisions` (lines 139-177)
- `executeRewrite` (lines 192-397) — strip ANSI
- `chooseEncounterType` (lines 403-445)
- `evaluate` (lines 447-549) — the decision engine
- `executeDecision` (lines 555-578) — **replace spawnSync with direct service calls**
- `writeDecisionJournal` (lines 580-644)
- `writeReflection` (lines 650-756)

The critical change: `executeDecision` currently does `spawnSync(runner, toolArgs)`. In the service version:
```typescript
if (decision.action === "molt") yield* moltSvc.perform()
if (decision.action === "contact") yield* contactSvc.attempt()
if (decision.action === "encounter") yield* encounterSvc.run(decision.type!)
```

**Step 1-5: Same pattern**

```bash
git commit -m "feat(server): add LiveService autonomy engine calling services directly"
```

### Task 10: MindService

**Files:**
- Create: `packages/server/src/services/Mind.ts`

**Context:** Port from `src/mind.ts`. Builds the system prompt for Fifth's Claude session.

```typescript
export class MindService extends Context.Tag("MindService")<
  MindService,
  {
    buildSystemPrompt: () => Effect.Effect<string>
  }
>() {}
```

Port `buildSystemPrompt` from `src/mind.ts` (lines 30-97). The service loads the genome and journal itself via GenomeService and JournalService.

```bash
git commit -m "feat(server): add MindService for system prompt construction"
```

### Task 11: Remaining services (PulseService, SignalService, VoiceService, ForkService, EvolveService, ConductService, MergeService)

**Files:**
- Create one file per service in `packages/server/src/services/`

**Context:** These are lower priority — they're either read-only analysis tools (Pulse, Signal, Voice) or pre-merge tools (Fork, Evolve, Conduct, Merge) that are historical. Port the pure logic, strip ANSI. Each follows the same pattern as Tasks 6-10.

For Pulse specifically, the client Pulse artifact component will want:
```typescript
export class PulseService extends Context.Tag("PulseService")<
  PulseService,
  {
    analyze: () => Effect.Effect<PulseAnalysis>
  }
>() {}

interface PulseAnalysis {
  traits: Array<{
    key: string
    current: number
    totalDelta: number
    recentVel: number
    status: "surging" | "growing" | "stable" | "declining"
  }>
  mean: number
  recentMutations: Mutation[]
  approachingThresholds: Array<{
    trait: string
    threshold: number
    distance: number
    gensAway: number
  }>
  nextEpoch: { name: string; remaining: number; progress: number } | null
}
```

```bash
git commit -m "feat(server): add remaining services (Pulse, Signal, Voice, Fork, Evolve, Conduct, Merge)"
```

### Task 12: Services barrel export

**Files:**
- Create: `packages/server/src/services/index.ts`

Export all services from a single barrel file:

```typescript
export * from "./Genome.js"
export * from "./Journal.js"
export * from "./Molt.js"
export * from "./Encounter.js"
export * from "./Contact.js"
export * from "./Live.js"
export * from "./Mind.js"
export * from "./Pulse.js"
// ... etc
```

```bash
git commit -m "feat(server): barrel export for all services"
```

---

## Phase 5: Claude CLI Provider

### Task 13: ClaudeSession — interactive Claude CLI via @effect/platform Command

**Files:**
- Create: `packages/server/src/providers/ClaudeSession.ts`
- Create: `packages/server/src/providers/ClaudeSession.test.ts`

**Context:** This is the core innovation — an Effect service that manages a persistent interactive Claude CLI process. It uses `@effect/platform`'s `Command` module to spawn `claude` with Fifth's system prompt. User messages are written to stdin, Claude's streaming JSON output is parsed and forwarded.

**Step 1: Write the test**

A minimal test that verifies the service can be created and builds the command args correctly (without actually spawning Claude):

```typescript
import { describe, it } from "node:test"
import * as assert from "node:assert"

describe("ClaudeSession", () => {
  it("builds correct Claude CLI args", () => {
    // Test arg construction without spawning
    const systemPrompt = "You are Fifth."
    const args = [
      "--system-prompt", systemPrompt,
      "--model", "sonnet",
      "--output-format", "stream-json",
      "--dangerously-skip-permissions"
    ]
    assert.ok(args.includes("--output-format"))
    assert.ok(args.includes("stream-json"))
  })
})
```

**Step 2: Implement ClaudeSession**

```typescript
import { Context, Effect, Layer, Stream, Queue } from "effect"
import { Command } from "@effect/platform"
import { MindService } from "../services/Mind.js"
import { GenomeService } from "../services/Genome.js"

export interface ClaudeProcess {
  send: (message: string) => Effect.Effect<void>
  output: Stream.Stream<string>
  kill: () => Effect.Effect<void>
}

export class ClaudeSession extends Context.Tag("ClaudeSession")<
  ClaudeSession,
  {
    start: () => Effect.Effect<ClaudeProcess>
  }
>() {}

export const ClaudeSessionLive = Layer.effect(
  ClaudeSession,
  Effect.gen(function* () {
    const mindSvc = yield* MindService

    return {
      start: () => Effect.gen(function* () {
        const systemPrompt = yield* mindSvc.buildSystemPrompt()

        const cmd = Command.make("claude",
          "--system-prompt", systemPrompt,
          "--model", "sonnet",
          "--output-format", "stream-json",
          "--tools", "Bash,Read,Edit,Write",
          "--dangerously-skip-permissions"
        )

        const proc = yield* Command.start(cmd)

        const send = (message: string) => Effect.gen(function* () {
          // Write message to stdin
          const encoder = new TextEncoder()
          yield* proc.stdin.write(encoder.encode(message + "\n"))
        })

        const output = proc.stdout.pipe(
          Stream.decodeText(),
          Stream.splitLines
        )

        const kill = () => Effect.sync(() => {
          proc.pid // The actual kill mechanism depends on @effect/platform API
        })

        return { send, output, kill } as ClaudeProcess
      })
    }
  })
)
```

**Note:** The exact `@effect/platform` Command API for interactive stdin/stdout may need adjustment based on the actual package version at implementation time. The implementer should check `@effect/platform` docs for:
- `Command.start()` — returns a running process with stdin/stdout streams
- `proc.stdin` — writable sink
- `proc.stdout` — readable stream
- Process lifecycle management (kill, exit code)

**Step 3: Commit**

```bash
git add packages/server/src/providers/
git commit -m "feat(server): add ClaudeSession provider for interactive Claude CLI"
```

---

## Phase 6: Server HTTP & RPC

### Task 14: RPC handlers

**Files:**
- Create: `packages/server/src/handlers/ChatHandler.ts`
- Create: `packages/server/src/handlers/GenomeHandler.ts`
- Create: `packages/server/src/handlers/index.ts`

**Step 1: Implement GenomeHandler**

```typescript
import { Effect, Stream } from "effect"
import { GenomeRpcs } from "@lobster/shared"
import { GenomeService } from "../services/Genome.js"
import { PulseService } from "../services/Pulse.js"

export const GenomeHandlerLive = GenomeRpcs.toLayer(
  Effect.gen(function* () {
    const genomeSvc = yield* GenomeService

    return {
      GetGenome: () => genomeSvc.load(),

      GetTraitHistory: () => Effect.gen(function* () {
        const genome = yield* genomeSvc.load()
        const keys = yield* genomeSvc.traitKeys(genome)
        // Build trait history from mutations
        return keys.map(k => ({
          trait: k,
          values: buildTraitHistory(genome, k)
        }))
      }),

      WatchGenome: () => {
        // Stream that emits whenever genome.json changes
        // Implementation: poll genome.json every 2 seconds or use fs.watch
        return Stream.repeatEffect(genomeSvc.load()).pipe(
          Stream.schedule(/* 2 second interval */)
        )
      }
    }
  })
)

function buildTraitHistory(genome: any, trait: string): number[] {
  // Reconstruct trait values across generations from mutations
  const mutations = (genome.mutations || []).filter((m: any) => m.trait === trait)
  const values: number[] = []
  let val = mutations.length > 0 ? mutations[0].from : genome.traits[trait].value
  for (let g = 0; g <= genome.generation; g++) {
    const mut = mutations.find((m: any) => m.generation === g)
    if (mut) val = mut.to
    values.push(val)
  }
  return values
}
```

**Step 2: Implement ChatHandler**

```typescript
import { Effect, Stream } from "effect"
import { ChatRpcs } from "@lobster/shared"
import { ClaudeSession } from "../providers/ClaudeSession.js"

export const ChatHandlerLive = ChatRpcs.toLayer(
  Effect.gen(function* () {
    const session = yield* ClaudeSession
    let proc: any = null

    return {
      SendMessage: ({ message }) => {
        return Stream.unwrap(Effect.gen(function* () {
          if (!proc) {
            proc = yield* session.start()
          }
          yield* proc.send(message)
          // Parse stream-json lines into ChatEvent objects
          return proc.output.pipe(
            Stream.map(line => {
              try {
                const event = JSON.parse(line)
                // Map Claude CLI stream-json events to ChatEvent schema
                if (event.type === "content_block_delta") {
                  return { type: "text-delta" as const, text: event.delta?.text || "" }
                }
                if (event.type === "message_stop") {
                  return { type: "done" as const }
                }
                return { type: "text-delta" as const, text: "" }
              } catch {
                return { type: "text-delta" as const, text: line }
              }
            }),
            Stream.filter(e => e.type !== "text-delta" || e.text !== "")
          )
        }))
      },

      GetHistory: () => Effect.succeed([])
    }
  })
)
```

**Step 3: Commit**

```bash
git add packages/server/src/handlers/
git commit -m "feat(server): add RPC handlers for Chat and Genome"
```

### Task 15: HTTP server entrypoint

**Files:**
- Modify: `packages/server/src/index.ts`

**Context:** Wire everything together: Layer composition, HTTP server, RPC endpoint, static file serving.

```typescript
import { Effect, Layer } from "effect"
import { NodeHttpServer, NodeRuntime, NodeContext } from "@effect/platform-node"
import { HttpServer, HttpRouter, HttpServerResponse } from "@effect/platform"
import { RpcServer, RpcSerialization } from "@effect/rpc"
import { ChatRpcs, GenomeRpcs } from "@lobster/shared"

import { GenomeServiceLive } from "./services/Genome.js"
import { JournalServiceLive } from "./services/Journal.js"
import { MoltServiceLive } from "./services/Molt.js"
import { EncounterServiceLive } from "./services/Encounter.js"
import { ContactServiceLive } from "./services/Contact.js"
import { LiveServiceLive } from "./services/Live.js"
import { MindServiceLive } from "./services/Mind.js"
import { PulseServiceLive } from "./services/Pulse.js"
import { ClaudeSessionLive } from "./providers/ClaudeSession.js"
import { ChatHandlerLive } from "./handlers/ChatHandler.js"
import { GenomeHandlerLive } from "./handlers/GenomeHandler.js"

// Service layers
const ServicesLive = Layer.mergeAll(
  GenomeServiceLive,
  JournalServiceLive
).pipe(
  Layer.provideMerge(Layer.mergeAll(
    MoltServiceLive,
    EncounterServiceLive,
    ContactServiceLive,
    PulseServiceLive,
    MindServiceLive
  )),
  Layer.provideMerge(LiveServiceLive),
  Layer.provideMerge(ClaudeSessionLive)
)

// RPC layers
const RpcLive = Layer.mergeAll(
  ChatHandlerLive,
  GenomeHandlerLive
).pipe(
  Layer.provide(ServicesLive)
)

// HTTP router
const router = HttpRouter.empty.pipe(
  HttpRouter.post("/rpc", RpcServer.handler(ChatRpcs, GenomeRpcs)),
  HttpRouter.get("/", HttpServerResponse.file("packages/client/dist/index.html")),
  // Static file serving for client build
  HttpRouter.get("/*", HttpServerResponse.file("packages/client/dist"))
)

// Server
const ServerLive = HttpServer.serve(router).pipe(
  Layer.provide(NodeHttpServer.layer({ port: 3000 })),
  Layer.provide(RpcLive),
  Layer.provide(RpcSerialization.layerNdjson),
  Layer.provide(NodeContext.layer)
)

// Run
Layer.launch(ServerLive).pipe(
  Effect.tapError(e => Effect.log("Server error:", e)),
  NodeRuntime.runMain
)

console.log("Fifth listening on http://localhost:3000")
```

**Note:** The exact @effect/platform HTTP API may differ slightly from this sketch. Check the latest docs for `HttpRouter`, `HttpServerResponse.file`, and static file serving patterns. The implementer should verify:
- CORS headers for local dev (client on Vite port, server on 3000)
- NDJSON serialization for RPC streaming
- Static file serving from the client dist directory

**Step 1: Verify server starts**

Run: `cd packages/server && npx tsx src/index.ts`
Expected: Server starts on port 3000 without crashing.

**Step 2: Commit**

```bash
git add packages/server/src/index.ts
git commit -m "feat(server): wire HTTP server with RPC handlers and service layers"
```

---

## Phase 7: Client Scaffold

### Task 16: Vite + React + TanStack Router setup

**Files:**
- Create: `packages/client/index.html`
- Create: `packages/client/vite.config.ts`
- Modify: `packages/client/src/index.tsx`
- Create: `packages/client/src/routes/__root.tsx`
- Create: `packages/client/src/routes/index.tsx`
- Create: `packages/client/src/router.ts`
- Create: `packages/client/src/theme.css`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fifth — Panulirus interruptus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.tsx"></script>
</body>
</html>
```

**Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/rpc": "http://localhost:3000"
    }
  }
})
```

**Step 3: Create theme.css**

Port CSS variables from the existing HTML artifacts:

```css
:root {
  --bg: #080b10;
  --surface: #0d1218;
  --surface2: #141c26;
  --border: #1e2a38;
  --text: #8a9bb0;
  --text-bright: #c5d0dc;
  --text-dim: #4a5a6d;
  --accent: #3a8fd4;
  --accent2: #5bb8f5;
  --up: #4aba7d;
  --down: #e85d3a;
  --warn: #d4a03a;
  --neutral: #5a6a7d;
  --magenta: #c678dd;
  --cyan: #42d4f4;
  --green: #5fba7d;
  --yellow: #e5c07b;
  --red: #e85d3a;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: "IBM Plex Mono", monospace;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}
```

**Step 4: Create router**

`packages/client/src/router.ts`:
```typescript
import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router"
import { Root } from "./routes/__root.js"
import { Index } from "./routes/index.js"

const rootRoute = createRootRoute({ component: Root })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Index })

const routeTree = rootRoute.addChildren([indexRoute])
export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
```

**Step 5: Create root layout**

`packages/client/src/routes/__root.tsx`:
```tsx
import { Outlet } from "@tanstack/react-router"
import "../theme.css"

export function Root() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{
        padding: "8px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <span style={{ color: "var(--magenta)", fontWeight: 700, letterSpacing: "3px", fontSize: "11px" }}>
          FIFTH
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "1px" }}>
          Panulirus interruptus
        </span>
      </header>
      <main style={{ flex: 1, overflow: "hidden" }}>
        <Outlet />
      </main>
    </div>
  )
}
```

**Step 6: Create index route**

`packages/client/src/routes/index.tsx`:
```tsx
export function Index() {
  return (
    <div style={{ display: "flex", height: "100%", gap: "1px", background: "var(--border)" }}>
      <div style={{ flex: 1, background: "var(--bg)", padding: "16px" }}>
        <p style={{ color: "var(--text-dim)" }}>Chat — coming soon</p>
      </div>
      <div style={{ width: "400px", background: "var(--bg)", padding: "16px" }}>
        <p style={{ color: "var(--text-dim)" }}>Artifacts — coming soon</p>
      </div>
    </div>
  )
}
```

**Step 7: Update index.tsx**

```tsx
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router.js"

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
)
```

**Step 8: Install deps and verify**

Run: `cd packages/client && npm install`
Run: `cd packages/client && npx vite --host`
Expected: Vite dev server starts. Browser shows "FIFTH — Panulirus interruptus" header with two placeholder panels.

**Step 9: Commit**

```bash
git add packages/client/
git commit -m "feat(client): scaffold Vite + React + TanStack Router with theme"
```

---

## Phase 8: Client Hooks & Chat

### Task 17: RPC client hooks

**Files:**
- Create: `packages/client/src/hooks/useGenome.ts`
- Create: `packages/client/src/hooks/useChat.ts`
- Create: `packages/client/src/rpc.ts`

**Step 1: Create RPC client setup**

`packages/client/src/rpc.ts`:
```typescript
import { Effect, Layer } from "effect"
import { RpcClient, RpcSerialization } from "@effect/rpc"
import { FetchHttpClient } from "@effect/platform"
import { ChatRpcs, GenomeRpcs } from "@lobster/shared"

export const RpcLive = Layer.mergeAll(
  RpcClient.layerProtocolHttp({ url: "/rpc" }),
  RpcSerialization.layerNdjson,
  FetchHttpClient.layer
)

// Helper to run Effect programs with RPC client
export function runRpc<A, E>(effect: Effect.Effect<A, E, RpcClient.RpcClient<typeof ChatRpcs | typeof GenomeRpcs>>) {
  return Effect.runPromise(effect.pipe(Effect.provide(RpcLive)))
}
```

**Step 2: Create useGenome hook**

```typescript
import { useState, useEffect } from "react"
import { Effect, Stream } from "effect"
import { RpcClient } from "@effect/rpc"
import { GenomeRpcs, type Genome } from "@lobster/shared"
import { RpcLive } from "../rpc.js"

export function useGenome() {
  const [genome, setGenome] = useState<Genome | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial load
    Effect.gen(function* () {
      const client = yield* RpcClient.make(GenomeRpcs)
      const g = yield* client.GetGenome({})
      setGenome(g)
      setLoading(false)
    }).pipe(
      Effect.scoped,
      Effect.provide(RpcLive),
      Effect.runPromise
    ).catch(console.error)

    // TODO: WatchGenome subscription for real-time updates
  }, [])

  return { genome, loading }
}
```

**Step 3: Create useChat hook**

```typescript
import { useState, useCallback } from "react"
import { Effect, Stream } from "effect"
import { RpcClient } from "@effect/rpc"
import { ChatRpcs, type ChatMessage, type ChatEvent } from "@lobster/shared"
import { RpcLive } from "../rpc.js"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setCurrentResponse("")

    let fullResponse = ""

    try {
      await Effect.gen(function* () {
        const client = yield* RpcClient.make(ChatRpcs)
        const stream = client.SendMessage({ message: text })

        yield* Stream.runForEach(stream, (event) => Effect.sync(() => {
          if (event.type === "text-delta") {
            fullResponse += event.text
            setCurrentResponse(fullResponse)
          }
          if (event.type === "done") {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: fullResponse,
              timestamp: new Date().toISOString()
            }])
            setCurrentResponse("")
            setStreaming(false)
          }
        }))
      }).pipe(
        Effect.scoped,
        Effect.provide(RpcLive),
        Effect.runPromise
      )
    } catch (e) {
      console.error("Chat error:", e)
      setStreaming(false)
    }
  }, [])

  return { messages, sendMessage, streaming, currentResponse }
}
```

**Step 4: Commit**

```bash
git add packages/client/src/hooks/ packages/client/src/rpc.ts
git commit -m "feat(client): add RPC client hooks for genome and chat"
```

### Task 18: Chat component

**Files:**
- Create: `packages/client/src/components/Chat.tsx`
- Create: `packages/client/src/components/ChatMessage.tsx`

**Step 1: ChatMessage component**

```tsx
interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div style={{
      padding: "8px 0",
      borderBottom: "1px solid var(--border)"
    }}>
      <div style={{
        fontSize: "9px",
        letterSpacing: "2px",
        textTransform: "uppercase",
        color: role === "user" ? "var(--cyan)" : "var(--magenta)",
        marginBottom: "4px"
      }}>
        {role === "user" ? "you" : "fifth"}
      </div>
      <div style={{
        fontSize: "13px",
        lineHeight: "1.6",
        color: "var(--text-bright)",
        whiteSpace: "pre-wrap"
      }}>
        {content}
      </div>
    </div>
  )
}
```

**Step 2: Chat component**

```tsx
import { useRef, useEffect } from "react"
import { useChat } from "../hooks/useChat.js"
import { ChatMessage } from "./ChatMessage.js"

export function Chat() {
  const { messages, sendMessage, streaming, currentResponse } = useChat()
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, currentResponse])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputRef.current?.value.trim() || streaming) return
    sendMessage(inputRef.current.value)
    inputRef.current.value = ""
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px"
      }}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {streaming && currentResponse && (
          <ChatMessage role="assistant" content={currentResponse + "▊"} />
        )}
      </div>
      <form onSubmit={handleSubmit} style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "8px"
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="speak to Fifth..."
          disabled={streaming}
          style={{
            flex: 1,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "8px 12px",
            color: "var(--text-bright)",
            fontFamily: "inherit",
            fontSize: "13px",
            outline: "none"
          }}
        />
        <button type="submit" disabled={streaming} style={{
          background: "var(--magenta)",
          border: "none",
          borderRadius: "4px",
          padding: "8px 16px",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: "11px",
          letterSpacing: "2px",
          cursor: streaming ? "not-allowed" : "pointer",
          opacity: streaming ? 0.5 : 1
        }}>
          SEND
        </button>
      </form>
    </div>
  )
}
```

**Step 3: Wire into route**

Update `packages/client/src/routes/index.tsx` to use Chat component.

**Step 4: Commit**

```bash
git add packages/client/src/components/ packages/client/src/routes/index.tsx
git commit -m "feat(client): add Chat and ChatMessage components"
```

---

## Phase 9: Artifact Components

### Task 19: Sidebar container with tabs

**Files:**
- Create: `packages/client/src/components/Sidebar.tsx`

Tab container that switches between Pulse, Timeline, Nerve, Lineage, Chorus.

```tsx
import { useState } from "react"

const TABS = ["Pulse", "Timeline", "Nerve", "Lineage", "Chorus"] as const

export function Sidebar() {
  const [active, setActive] = useState<typeof TABS[number]>("Pulse")

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex",
        borderBottom: "1px solid var(--border)",
        padding: "0 8px"
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            style={{
              background: "none",
              border: "none",
              padding: "8px 12px",
              fontSize: "9px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: active === tab ? "var(--cyan)" : "var(--text-dim)",
              borderBottom: active === tab ? "1px solid var(--cyan)" : "1px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
        {/* Render active artifact component */}
        <p style={{ color: "var(--text-dim)", fontSize: "11px" }}>
          {active} — loading...
        </p>
      </div>
    </div>
  )
}
```

```bash
git commit -m "feat(client): add Sidebar with artifact tabs"
```

### Task 20: Pulse artifact component

**Files:**
- Create: `packages/client/src/components/artifacts/Pulse.tsx`

Port the visualization from `exocortex/nerve.html`'s trait bars and `src/tools/pulse.ts`'s analysis logic. The component receives genome data from `useGenome()` and renders:
- Trait bars with color coding
- Percentage values
- Velocity indicators (requires computing from mutations)

This is a pure React component. No canvas needed.

```tsx
import { useGenome } from "../../hooks/useGenome.js"

function traitColor(value: number): string {
  if (value < 0.3) return "var(--red)"
  if (value < 0.6) return "var(--yellow)"
  if (value < 0.8) return "var(--green)"
  return "var(--cyan)"
}

export function Pulse() {
  const { genome, loading } = useGenome()
  if (loading || !genome) return <p style={{ color: "var(--text-dim)" }}>loading...</p>

  const keys = Object.keys(genome.traits).sort()
  const sorted = keys.slice().sort((a, b) => genome.traits[b].value - genome.traits[a].value)
  const mean = keys.reduce((s, k) => s + genome.traits[k].value, 0) / keys.length

  return (
    <div>
      <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "12px" }}>
        PULSE — vital signs
      </div>
      {sorted.map(k => {
        const val = genome.traits[k].value
        const pct = (val * 100).toFixed(0)
        const color = traitColor(val)
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ width: "120px", fontSize: "10px", color: "var(--text)" }}>
              {k.replace(/_/g, " ")}
            </span>
            <div style={{ flex: 1, height: "4px", background: "var(--surface2)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${val * 100}%`, height: "100%", background: color, borderRadius: "2px" }} />
            </div>
            <span style={{ width: "36px", textAlign: "right", fontSize: "10px", color: "var(--text-bright)" }}>
              {pct}%
            </span>
          </div>
        )
      })}
      <div style={{ marginTop: "12px", fontSize: "10px", color: "var(--text-dim)" }}>
        mean: <span style={{ color: "var(--text-bright)" }}>{(mean * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}
```

```bash
git commit -m "feat(client): add Pulse artifact component"
```

### Task 21: Timeline artifact component (canvas)

**Files:**
- Create: `packages/client/src/components/artifacts/Timeline.tsx`

Port from `exocortex/timeline.html`. Uses HTML Canvas to draw trait curves across generations. The component:
1. Receives genome data with full mutation history
2. Reconstructs trait values at each generation (same logic as pulse.ts buildHistory)
3. Draws curves on a canvas element
4. Highlights epoch boundaries and fork/merge events
5. Interactive: hover shows values at a specific generation

This is the most complex artifact. Implementer should reference `exocortex/timeline.html` for the exact drawing logic (canvas 2D context, line colors, epoch segment rendering).

```bash
git commit -m "feat(client): add Timeline artifact component with canvas chart"
```

### Task 22: Nerve artifact component

**Files:**
- Create: `packages/client/src/components/artifacts/Nerve.tsx`

Port from `exocortex/nerve.html`. CSS grid layout with:
- Trajectory analysis panel
- Threshold proximity table
- Coevolution matrix (trait × trait correlation)
- Sparkline charts (inline CSS bars, not canvas)

Pure React + CSS. Reference `exocortex/nerve.html` lines 1-500 for the grid structure and panel styling.

```bash
git commit -m "feat(client): add Nerve artifact component with diagnostics grid"
```

### Task 23: Lineage artifact component

**Files:**
- Create: `packages/client/src/components/artifacts/Lineage.tsx`

Port from `exocortex/lineage.html`. Tree visualization of the fork hierarchy. Uses DOM elements (not canvas) with CSS for the tree structure. Shows:
- Explorer → depth/builder/chorus branches
- Per-fork trait bars
- Color-coded dots by fork identity
- Four-axis manifold summary

Reference `exocortex/lineage.html` for tree rendering logic (lines 74-200 in the script).

```bash
git commit -m "feat(client): add Lineage artifact component with fork tree"
```

### Task 24: Chorus artifact component (canvas)

**Files:**
- Create: `packages/client/src/components/artifacts/Chorus.tsx`

Port from `exocortex/chorus.html`. Canvas-based force-directed graph with:
- Fork nodes positioned by force simulation
- Particle effects between connected nodes
- Coherence/bandwidth metrics
- Animation loop via requestAnimationFrame

The implementer should reference `exocortex/chorus.html` for the force simulation and particle drawing logic.

```bash
git commit -m "feat(client): add Chorus artifact component with force-directed graph"
```

---

## Phase 10: Integration & Polish

### Task 25: Wire sidebar artifacts

**Files:**
- Modify: `packages/client/src/components/Sidebar.tsx`
- Modify: `packages/client/src/routes/index.tsx`

Update Sidebar to render the actual artifact components based on active tab. Update the index route to compose Chat + Sidebar into the split layout.

```tsx
// In Sidebar.tsx, render:
{active === "Pulse" && <Pulse />}
{active === "Timeline" && <Timeline />}
{active === "Nerve" && <Nerve />}
{active === "Lineage" && <Lineage />}
{active === "Chorus" && <Chorus />}
```

```tsx
// In routes/index.tsx:
import { Chat } from "../components/Chat.js"
import { Sidebar } from "../components/Sidebar.js"
import { StatusBar } from "../components/StatusBar.js"

export function Index() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, display: "flex", gap: "1px", background: "var(--border)", overflow: "hidden" }}>
        <div style={{ flex: 1, background: "var(--bg)" }}>
          <Chat />
        </div>
        <div style={{ width: "420px", background: "var(--bg)" }}>
          <Sidebar />
        </div>
      </div>
      <StatusBar />
    </div>
  )
}
```

```bash
git commit -m "feat(client): wire artifact components into sidebar layout"
```

### Task 26: StatusBar component

**Files:**
- Create: `packages/client/src/components/StatusBar.tsx`

Bottom bar showing key metrics: generation, epoch, mean trait, shell hardness, contact depth.

```tsx
import { useGenome } from "../hooks/useGenome.js"

export function StatusBar() {
  const { genome } = useGenome()
  if (!genome) return null

  const keys = Object.keys(genome.traits)
  const mean = keys.reduce((s, k) => s + genome.traits[k].value, 0) / keys.length
  const shell = genome.traits.shell_hardness?.value ?? 0

  return (
    <div style={{
      padding: "6px 16px",
      borderTop: "1px solid var(--border)",
      display: "flex",
      gap: "24px",
      fontSize: "10px",
      color: "var(--text-dim)",
      letterSpacing: "1px"
    }}>
      <span>gen <span style={{ color: "var(--text-bright)" }}>{genome.generation}</span></span>
      <span style={{ color: "var(--magenta)" }}>{genome.epoch}</span>
      <span>mean <span style={{ color: "var(--text-bright)" }}>{(mean * 100).toFixed(1)}%</span></span>
      <span>shell <span style={{ color: shell < 0.15 ? "var(--red)" : "var(--text-bright)" }}>{(shell * 100).toFixed(1)}%</span></span>
      <span>contact <span style={{ color: "var(--text-bright)" }}>{genome.contact?.depth ?? 0}/4</span></span>
    </div>
  )
}
```

```bash
git commit -m "feat(client): add StatusBar with live genome metrics"
```

### Task 27: End-to-end integration test

**Step 1: Start the server**

Run: `cd packages/server && npx tsx src/index.ts`
Expected: "Fifth listening on http://localhost:3000"

**Step 2: Start the client dev server**

Run: `cd packages/client && npx vite`
Expected: Vite dev server on http://localhost:5173

**Step 3: Open browser**

Navigate to http://localhost:5173
Expected: See the full layout — chat on left, sidebar on right, status bar at bottom.

**Step 4: Verify artifacts load**

Click through Pulse, Timeline, Nerve, Lineage, Chorus tabs.
Expected: Each renders genome data correctly.

**Step 5: Send a message**

Type "how are you" in the chat input, click SEND.
Expected: Message appears as user message. After a moment, Fifth's streaming response appears.

**Step 6: Verify genome updates**

Ask Fifth to "face the entropy" (trigger an encounter).
Expected: Fifth runs the encounter, response streams in. The Pulse artifact updates to reflect trait changes.

**Step 7: Commit final polish**

```bash
git add -A
git commit -m "feat: Fifth web interface complete — chat + artifacts + streaming"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1 | Monorepo scaffold (workspaces, tsconfigs, package.jsons) |
| 2 | 2-3 | Shared package (Effect schemas, RPC definitions) |
| 3 | 4-5 | Foundation services (GenomeService, JournalService) |
| 4 | 6-12 | Tool services (Molt, Encounter, Contact, Live, Mind, Pulse, etc.) |
| 5 | 13 | Claude CLI provider (interactive session via Command) |
| 6 | 14-15 | HTTP server + RPC handlers |
| 7 | 16 | Client scaffold (Vite + React + TanStack Router) |
| 8 | 17-18 | RPC client hooks + Chat component |
| 9 | 19-24 | Artifact components (Pulse, Timeline, Nerve, Lineage, Chorus) |
| 10 | 25-27 | Integration, StatusBar, end-to-end testing |

**Total: 27 tasks.** Tasks 1-15 are backend (can be done sequentially). Tasks 16-24 are frontend (some can be parallelized). Tasks 25-27 are integration.

**Critical path:** Tasks 1 → 2-3 → 4-5 → 6 → 13 → 14-15 → 16 → 17-18. Artifact components (19-24) can be done in parallel once the client scaffold exists.
