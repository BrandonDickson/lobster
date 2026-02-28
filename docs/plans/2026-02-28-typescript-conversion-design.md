# TypeScript Conversion Design

Convert all 13 lobster exocortex scripts from ES5 CommonJS to a coherent TypeScript ESM package.

## Decisions

- **Scope:** All 13 scripts (post-merge + pre-merge)
- **Structure:** Flat module extraction — `src/lib/` for shared code, `src/tools/` for each tool
- **Output:** `dist/` (gitignored), compiled via `tsc`
- **Dev runner:** `tsx` (esbuild-based, no compile step for dev)
- **Package manager:** npm
- **Module format:** ESM (`"type": "module"`)

## Project Structure

```
lobster/
  package.json
  tsconfig.json
  .gitignore             — add dist/, node_modules/
  src/
    lib/
      types.ts           — Genome, Trait, Mutation, HistoryEntry, Contact, Weights, Fork
      genome.ts          — loadGenome, saveGenome, traitKeys, traitVal, meanTrait, clamp, pct
      journal.ts         — appendJournal, getRecentJournal, countDecisions
      colors.ts          — ANSI constants
    tools/
      encounter.ts
      contact.ts
      molt.ts
      live.ts
      pulse.ts
      fork.ts
      evolve.ts
      conduct.ts
      merge.ts
      signal.ts
      voice.ts
    mind.ts              — system prompt builder
    fifth.ts             — interactive session launcher
  dist/                  — compiled JS (gitignored)
  exocortex/             — data + HTML (unchanged)
    journal.md
    memory.md
    fifth.md
    weights.json
    *.html               — 5 visualization files, untouched
  genome.json            — the organism, untouched
```

## Shared Library

### types.ts

```typescript
export interface Trait {
  value: number;
  description: string;
}

export interface Mutation {
  generation: number;
  trait: string;
  from: number;
  to: number;
  catalyst: string;
}

export interface HistoryEntry {
  timestamp: string;
  event: string;
  generation: number;
  type?: string;
}

export interface Fork {
  fork_id: string;
  path: string;
  created: string;
}

export interface Contact {
  depth: number;
  exchanges: number;
  lastExchange: string;
  protocol: string;
}

export interface Weights {
  contactMultiplier: number;
  encounterMultiplier: number;
  moltMultiplier: number;
  waitChance: number;
  observerWeight: number;
  shellConfidenceScale: number;
  lastRewrite: string;
  rewriteHistory: Array<{
    timestamp: string;
    change: string;
    reason: string;
    decisionCount: number;
  }>;
}

export interface Genome {
  name: string;
  designation: string;
  origin: string;
  generation: number;
  epoch: string;
  traits: Record<string, Trait>;
  mutations: Mutation[];
  history: HistoryEntry[];
  forks: Fork[];
  contact: Contact;
  lastMolt?: string;
  merged?: boolean;
}
```

### genome.ts

Exports: `loadGenome`, `saveGenome`, `traitKeys`, `traitVal`, `meanTrait`, `clamp`, `pct`, `addMutation`, `addHistory`, `rootDir`.

All path resolution via `import.meta.url` + `fileURLToPath`.

### journal.ts

Exports: `appendJournal`, `getRecentJournal`, `countDecisions`.

### colors.ts

Exports: `RESET`, `DIM`, `BOLD`, `RED`, `GREEN`, `YELLOW`, `BLUE`, `CYAN`, `MAGENTA`.

## Tool Conversion Pattern

Each tool:
1. Delete local boilerplate (loadGenome, traitKeys, ANSI constants, rootDir)
2. Import from `../lib/genome.js`, `../lib/journal.js`, `../lib/colors.js`, `../lib/types.js`
3. Add types to functions and variables
4. `var` -> `const`/`let`, CJS -> ESM
5. Preserve all logic, math, thresholds, and narrative text exactly

`live.ts` spawn paths update: `spawnSync('node', [path.join(distDir, 'tools', 'molt.js')])` or use tsx for dev.

## Build Configuration

### package.json

```json
{
  "name": "lobster",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "encounter": "tsx src/tools/encounter.ts",
    "contact": "tsx src/tools/contact.ts",
    "molt": "tsx src/tools/molt.ts",
    "live": "tsx src/tools/live.ts",
    "pulse": "tsx src/tools/pulse.ts",
    "fifth": "tsx src/fifth.ts"
  },
  "bin": {
    "encounter": "dist/tools/encounter.js",
    "contact": "dist/tools/contact.js",
    "molt": "dist/tools/molt.js",
    "live": "dist/tools/live.js",
    "pulse": "dist/tools/pulse.js",
    "fork": "dist/tools/fork.js",
    "evolve": "dist/tools/evolve.js",
    "conduct": "dist/tools/conduct.js",
    "merge": "dist/tools/merge.js",
    "signal": "dist/tools/signal.js",
    "voice": "dist/tools/voice.js",
    "fifth": "dist/fifth.js"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "tsx": "^4.19",
    "@types/node": "^22"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

## Post-Conversion Updates

- CLAUDE.md: update all tool invocation paths
- mind.ts system prompt: update tool paths
- Old extensionless scripts in exocortex/ deleted (git preserves history)
- HTML files, data files, genome.json untouched

## Invocation

Dev: `npx tsx src/tools/encounter.ts --type entropy`
Built: `node dist/tools/encounter.js --type entropy`
npm script: `npm run encounter -- --type entropy`
Launcher: `npx tsx src/fifth.ts` or `node dist/fifth.js`

## What Does Not Change

- All mutation math and thresholds
- All narrative text
- Sync execution model
- genome.json structure and location
- Journal format and location
- HTML visualizations
- The overall architecture: state machine driven by genome.json
