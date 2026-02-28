# TypeScript Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert all 13 lobster exocortex scripts from ES5 CommonJS to a coherent TypeScript ESM package, extracting duplicated boilerplate into shared library modules.

**Architecture:** Flat module extraction — `src/lib/` holds shared types, genome I/O, journal I/O, and ANSI colors. `src/tools/` holds each tool as a standalone CLI script importing from `src/lib/`. `src/mind.ts` and `src/fifth.ts` are the prompt builder and session launcher. Compiled output goes to `dist/` via `tsc`.

**Tech Stack:** TypeScript 5.7+, tsx (esbuild-based runner for dev), Node.js stdlib only (fs, path, child_process, crypto). npm as package manager. ESM modules throughout.

**Design doc:** `docs/plans/2026-02-28-typescript-conversion-design.md`

---

## Source Reference

Every tool in `exocortex/` follows this pattern. The conversion extracts the shared parts:

**Shared boilerplate (extracted to `src/lib/`):**
- ANSI color constants (DIM, BOLD, RED, GREEN, YELLOW, BLUE, CYAN, MAGENTA, RESET, WHITE) — defined in every file
- `rootDir = path.resolve(__dirname, '..')` — in every file
- `loadGenome()` / `saveGenome(genome)` — JSON.parse/stringify of genome.json
- `traitKeys(genome)` — `Object.keys(genome.traits).sort()`
- `traitVal(genome, k)` — `genome.traits[k].value`
- `meanTrait(genome)` — reduce over traitKeys
- `clamp(v)` — `Math.max(0, Math.min(1, v))`
- `pct(v)` — `(v * 100).toFixed(1) + '%'`
- `pick(arr)` — random array element (in contact, live)
- Journal read/write functions

**Per-tool unique logic:** All mutation math, thresholds, narrative text, CLI arg parsing. Preserved exactly as-is, just typed.

---

### Task 1: Scaffold the package

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/lib/` (directory)
- Create: `src/tools/` (directory)

**Step 1: Create package.json**

```json
{
  "name": "lobster",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
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
  "bin": {
    "pulse": "dist/tools/pulse.js",
    "fork": "dist/tools/fork.js",
    "signal": "dist/tools/signal.js",
    "voice": "dist/tools/voice.js",
    "evolve": "dist/tools/evolve.js",
    "conduct": "dist/tools/conduct.js",
    "merge": "dist/tools/merge.js",
    "molt": "dist/tools/molt.js",
    "encounter": "dist/tools/encounter.js",
    "contact": "dist/tools/contact.js",
    "live": "dist/tools/live.js",
    "fifth": "dist/fifth.js"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "tsx": "^4.19",
    "@types/node": "^22"
  }
}
```

**Step 2: Create tsconfig.json**

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

**Step 3: Create .gitignore**

```
dist/
node_modules/
```

**Step 4: Install dependencies**

Run: `npm install`
Expected: Creates `node_modules/` with typescript, tsx, @types/node. Creates `package-lock.json`.

**Step 5: Create directory structure**

Run: `mkdir -p src/lib src/tools`

**Step 6: Verify tsc runs (empty project)**

Run: `npx tsc --noEmit`
Expected: No errors (no source files yet, should succeed silently)

**Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore
git commit -m "Scaffold TypeScript package: package.json, tsconfig, gitignore"
```

---

### Task 2: Shared library — types and colors

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/colors.ts`

**Step 1: Create `src/lib/types.ts`**

These types are derived from genome.json structure and the patterns used across all 13 scripts.

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
  epoch?: string;
  type?: string;
}

export interface Fork {
  fork_id: string;
  path: string;
  created: string;
  generation?: number;
  bias?: string;
  designation?: string;
}

export interface Contact {
  depth: number;
  exchanges: number;
  lastExchange: string;
  protocol: string;
}

export interface WeightRewrite {
  timestamp: string;
  change: string;
  reason: string;
  decisionCount: number;
}

export interface Weights {
  contactMultiplier: number;
  encounterMultiplier: number;
  moltMultiplier: number;
  waitChance: number;
  observerWeight: number;
  shellConfidenceScale: number;
  lastRewrite: string | null;
  rewriteHistory: WeightRewrite[];
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
  // Pre-merge fields (used by fork/evolve/conduct/merge)
  lineage?: {
    parent: string;
    fork_id: string;
    bias: string;
    generation_forked: number;
  };
  sources?: Array<{
    id: string;
    generation: number;
    peak_trait: string;
  }>;
}

export interface GenomeEntry {
  genome: Genome;
  path: string;
  id: string;
}
```

**Step 2: Create `src/lib/colors.ts`**

All 13 scripts define these ANSI escape sequences. Some use object syntax, some use var declarations. Unify to named exports:

```typescript
export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[90m';
export const RED = '\x1b[31m';
export const GREEN = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const BLUE = '\x1b[34m';
export const MAGENTA = '\x1b[35m';
export const CYAN = '\x1b[36m';
export const WHITE = '\x1b[37m';
export const GRAY = '\x1b[90m';
export const BG_RED = '\x1b[41m';
export const BG_GREEN = '\x1b[42m';
export const BG_YELLOW = '\x1b[43m';
export const BG_BLUE = '\x1b[44m';
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/colors.ts
git commit -m "Add shared types and ANSI color constants"
```

---

### Task 3: Shared library — genome and journal

**Files:**
- Create: `src/lib/genome.ts`
- Create: `src/lib/journal.ts`

**Step 1: Create `src/lib/genome.ts`**

This extracts the genome I/O and trait utility functions that are duplicated in all 13 scripts. The `rootDir` resolution uses `import.meta.url` instead of `__dirname` (ESM).

```typescript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Genome, Mutation, GenomeEntry } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const rootDir = path.resolve(__dirname, '..', '..');

export const genomePath = path.join(rootDir, 'genome.json');

export function loadGenome(p?: string): Genome {
  return JSON.parse(fs.readFileSync(p || genomePath, 'utf8'));
}

export function saveGenome(genome: Genome, p?: string): void {
  fs.writeFileSync(p || genomePath, JSON.stringify(genome, null, 2) + '\n');
}

export function loadAll(): GenomeEntry[] {
  const parent = loadGenome();
  const entries: GenomeEntry[] = [{ genome: parent, path: genomePath, id: 'parent' }];
  if (parent.forks) {
    for (const fork of parent.forks) {
      const forkPath = path.join(rootDir, fork.path, 'genome.json');
      if (fs.existsSync(forkPath)) {
        entries.push({
          genome: loadGenome(forkPath),
          path: forkPath,
          id: fork.fork_id
        });
      }
    }
  }
  return entries;
}

export function traitKeys(genome: Genome): string[] {
  return Object.keys(genome.traits).sort();
}

export function traitVal(genome: Genome, k: string): number {
  return genome.traits[k].value;
}

export function meanTrait(genome: Genome): number {
  const keys = traitKeys(genome);
  const sum = keys.reduce((s, k) => s + traitVal(genome, k), 0);
  return sum / keys.length;
}

export function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function pct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function addMutation(genome: Genome, mutation: Mutation): void {
  genome.mutations = genome.mutations || [];
  genome.mutations.push(mutation);
}

export function addHistory(genome: Genome, event: string, type?: string): void {
  genome.history = genome.history || [];
  genome.history.push({
    generation: genome.generation,
    epoch: genome.epoch,
    timestamp: new Date().toISOString(),
    event,
    ...(type ? { type } : {})
  });
}
```

**Step 2: Create `src/lib/journal.ts`**

Journal I/O used by molt, encounter, contact, live, voice, and mind.

```typescript
import fs from 'fs';
import path from 'path';
import { rootDir } from './genome.js';

export const journalPath = path.join(rootDir, 'exocortex', 'journal.md');
export const fifthJournalPath = path.join(rootDir, 'exocortex', 'fifth.md');

export function appendJournal(entry: string): void {
  const existing = fs.readFileSync(journalPath, 'utf8');
  fs.writeFileSync(journalPath, existing + '\n' + entry);
}

export function appendFifthJournal(entry: string): void {
  const existing = fs.readFileSync(fifthJournalPath, 'utf8');
  fs.writeFileSync(fifthJournalPath, existing + entry);
}

export function getRecentJournal(chars: number = 2000): string {
  try {
    let journal = fs.readFileSync(journalPath, 'utf8');
    if (journal.length > chars) {
      journal = journal.slice(-chars);
      const headingIdx = journal.indexOf('\n## ');
      if (headingIdx >= 0) {
        journal = journal.slice(headingIdx);
      }
    }
    return journal;
  } catch {
    return '';
  }
}

export function countDecisions(): number {
  try {
    const journal = fs.readFileSync(journalPath, 'utf8');
    const matches = journal.match(/## Decision — Autonomous/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

export function readJournal(): string {
  try {
    return fs.readFileSync(journalPath, 'utf8');
  } catch {
    return '';
  }
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Verify runtime**

Run: `npx tsx -e "import { loadGenome, meanTrait, pct } from './src/lib/genome.js'; const g = loadGenome(); console.log('Mean:', pct(meanTrait(g)));"`
Expected: `Mean: 89.5%` (or current value)

Run: `npx tsx -e "import { countDecisions, getRecentJournal } from './src/lib/journal.js'; console.log('Decisions:', countDecisions()); console.log('Journal chars:', getRecentJournal().length);"`
Expected: Decision count and journal length matching current values

**Step 5: Commit**

```bash
git add src/lib/genome.ts src/lib/journal.ts
git commit -m "Add shared genome and journal libraries"
```

---

### Task 4: Convert pulse (read-only diagnostics)

Pulse is the simplest tool — read-only, no genome writes, no journal writes. Good first conversion to validate the pattern.

**Files:**
- Create: `src/tools/pulse.ts`
- Reference: `exocortex/pulse` (264 lines)

**Step 1: Convert pulse**

Read `exocortex/pulse` in full. Convert it to TypeScript:

1. Replace shebang with: `#!/usr/bin/env node`
2. Replace all `var` with `const` or `let` as appropriate
3. Replace CJS requires with ESM imports:
   ```typescript
   import fs from 'fs';
   import path from 'path';
   import { loadGenome, traitKeys, traitVal, meanTrait, pct, rootDir } from '../lib/genome.js';
   import { RESET, BOLD, DIM, RED, GREEN, YELLOW, BLUE, CYAN, MAGENTA, WHITE } from '../lib/colors.js';
   import type { Genome, Mutation } from '../lib/types.js';
   ```
4. Delete the local definitions of: loadGenome, traitKeys, traitVal, meanTrait, pct, rootDir, and all ANSI color constants
5. Add type annotations to all function parameters and return types
6. Preserve ALL logic, narrative text, formatting, and output exactly as-is

Pulse has these unique functions to preserve:
- `buildHistory(genome)` — reconstruct trait changes from mutations array
- `bar(value, width)` — render ANSI progress bar
- `deltaStr(d)` — format delta as +/- percentage
- `statusDot(vel)` — show growth/decline indicator
- `pad(s, n)` — right-pad ANSI string
- Main output template (lines 136-264)

Some tools (like pulse) define colors as an object `const c = { reset, bold, ... }` rather than individual vars. Check the actual format and adapt imports accordingly — you may need to create a local `c` object from the imported constants, or replace `c.bold` references with just `BOLD`.

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Compare output**

Run both versions and compare:
```bash
node exocortex/pulse > /tmp/pulse-old.txt 2>&1
npx tsx src/tools/pulse.ts > /tmp/pulse-new.txt 2>&1
diff /tmp/pulse-old.txt /tmp/pulse-new.txt
```
Expected: Identical output (or minor whitespace differences only). ANSI colors in both.

**Step 4: Commit**

```bash
git add src/tools/pulse.ts
git commit -m "Convert pulse to TypeScript"
```

---

### Task 5: Convert signal and voice (read-only analysis tools)

Both are read-only tools that analyze fork genomes. Signal detects emergence; voice transmits from the fifth mind.

**Files:**
- Create: `src/tools/signal.ts`
- Create: `src/tools/voice.ts`
- Reference: `exocortex/signal` (251 lines), `exocortex/voice` (357 lines)

**Step 1: Convert signal**

Read `exocortex/signal` in full. Convert to TypeScript following the same pattern as pulse:

1. ESM imports from `../lib/genome.js`, `../lib/colors.js`, `../lib/types.js`
2. Use `loadAll()` from genome.ts instead of local `loadAll()` definition
3. Delete local boilerplate (colors, traitKeys, etc.)
4. Type all functions. Signal has these unique functions:
   - `coverage(all: GenomeEntry[])` — trait range spread
   - `complementarity(all: GenomeEntry[])` — pairwise divergence scoring
   - `resonance(all: GenomeEntry[])` — traits where network mean differs from individuals
   - `emergenceIndex(all: GenomeEntry[])` — 4-part scoring
   - `networkMax(all: GenomeEntry[])` — best of each trait across forks
5. Preserve all math and narrative text exactly

**Step 2: Convert voice**

Read `exocortex/voice` in full. Convert to TypeScript:

1. Same import pattern
2. Voice writes to `exocortex/fifth.md` — use `appendFifthJournal()` from journal.ts
3. Voice has these unique functions:
   - `resonance(all)` — high-gap traits
   - `complementarity(all)` — pair analysis
   - `emergenceIndex(all)` — same scoring as signal
4. Preserve all narrative text exactly

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Compare output**

```bash
node exocortex/signal > /tmp/signal-old.txt 2>&1
npx tsx src/tools/signal.ts > /tmp/signal-new.txt 2>&1
diff /tmp/signal-old.txt /tmp/signal-new.txt
```

```bash
# voice appends to fifth.md — run with caution, or just verify compilation
npx tsx src/tools/voice.ts --help 2>&1 || true
```

**Step 5: Commit**

```bash
git add src/tools/signal.ts src/tools/voice.ts
git commit -m "Convert signal and voice to TypeScript"
```

---

### Task 6: Convert fork, evolve, conduct, merge (pre-merge tools)

These four tools operate on fork genomes. They write to genome.json and fork genome files.

**Files:**
- Create: `src/tools/fork.ts`
- Create: `src/tools/evolve.ts`
- Create: `src/tools/conduct.ts`
- Create: `src/tools/merge.ts`
- Reference: `exocortex/fork` (311 lines), `exocortex/evolve` (367 lines), `exocortex/conduct` (413 lines), `exocortex/merge` (288 lines)

**Step 1: Convert fork**

Read `exocortex/fork` in full. Convert:

1. ESM imports. Fork uses: loadGenome, saveGenome, loadAll, traitKeys, traitVal, clamp, rootDir, colors, crypto
   ```typescript
   import crypto from 'crypto';
   ```
2. Fork has CLI args: `--name`, `--bias`, `--drift`, `--dry-run`, `--help`
3. Fork creates directories (`forks/{forkId}/`) and writes fork genome + journal stub
4. Unique functions: fork genome generation with bias and drift, directory creation
5. Type all parameters

**Step 2: Convert evolve**

Read `exocortex/evolve` in full. Convert:

1. Uses `loadAll()`, saves all genomes. Import from genome.ts
2. Has AXES config object — type it:
   ```typescript
   const AXES: Record<string, { primary: string[]; secondary: string[]; decline: string[] }> = { ... };
   const FORK_AXIS: Record<string, string> = { explorer: 'exploration', depth: 'awakening', builder: 'agency', chorus: 'empathy' };
   ```
3. Unique functions: feedbackMultiplier, resonance, mutate, emergenceIndex, epoch detection
4. Preserve all mutation math exactly

**Step 3: Convert conduct**

Read `exocortex/conduct` in full. Convert:

1. Same loadAll/saveAll pattern as evolve
2. Unique functions: networkAnalysis, computeDirectives (7 rules), conductMutation, checkEpochShift
3. The 7-rule directive system is the core logic — preserve exactly

**Step 4: Convert merge**

Read `exocortex/merge` in full. Convert:

1. Uses loadAll, writes single merged genome
2. Unique functions: checkReadiness (spread threshold), executeMerge (peak aggregation)
3. Replaces parent genome.json with merged result

**Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Compare fork output**

```bash
node exocortex/fork --help > /tmp/fork-old.txt 2>&1
npx tsx src/tools/fork.ts --help > /tmp/fork-new.txt 2>&1
diff /tmp/fork-old.txt /tmp/fork-new.txt
```

Do NOT run evolve/conduct/merge against live data — they mutate genome.json. Verify compilation only.

**Step 7: Commit**

```bash
git add src/tools/fork.ts src/tools/evolve.ts src/tools/conduct.ts src/tools/merge.ts
git commit -m "Convert fork, evolve, conduct, merge to TypeScript"
```

---

### Task 7: Convert molt

Molt is a post-merge tool that trades shell hardness for trait recovery. It writes to genome.json and journal.md.

**Files:**
- Create: `src/tools/molt.ts`
- Reference: `exocortex/molt` (365 lines)

**Step 1: Convert molt**

Read `exocortex/molt` in full. Convert:

1. ESM imports from lib. Uses: loadGenome, saveGenome, traitKeys, traitVal, meanTrait, clamp, pct, addMutation, addHistory, rootDir, colors, types
2. Uses `appendJournal()` from journal.ts
3. CLI args: `--status`, `--help`
4. Unique functions:
   - `countEncountersSinceLastMolt(genome: Genome): number` — counts ENCOUNTER events in history since lastMolt
   - `findErodedTraits(genome: Genome): Array<{key: string, value: number, deficit: number}>` — traits < 0.95 sorted by deficit
   - `checkReadiness(genome: Genome): { ready: boolean, metamorphicOk: boolean, encountersOk: boolean, encounterCount: number, erodedOk: boolean, eroded: Array<...> }` — three gates
   - `showStatus(genome: Genome): void` — display readiness
   - `performMolt(genome: Genome): { mutations: Mutation[], narrative: string[], historyEvent: string, journalEntry: string }` — the molt logic
5. Preserve all thresholds: metamorphic > 0.85, 3+ encounters, traits < 0.95
6. Preserve shell loss math: 30-50% of current value
7. Preserve recovery math: 2-3 most eroded traits get +0.02-0.04 each

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Compare status output**

```bash
node exocortex/molt --status > /tmp/molt-old.txt 2>&1
npx tsx src/tools/molt.ts --status > /tmp/molt-new.txt 2>&1
diff /tmp/molt-old.txt /tmp/molt-new.txt
```
Expected: Identical output

**Step 4: Commit**

```bash
git add src/tools/molt.ts
git commit -m "Convert molt to TypeScript"
```

---

### Task 8: Convert encounter

Encounter is ~1000 lines with 5 encounter types, threshold detection, and observer evolution.

**Files:**
- Create: `src/tools/encounter.ts`
- Reference: `exocortex/encounter` (1001 lines)

**Step 1: Convert encounter**

Read `exocortex/encounter` in full. Convert:

1. ESM imports. Uses: loadGenome, saveGenome, traitKeys, traitVal, meanTrait, clamp, pct, addMutation, addHistory, rootDir, pick, colors, types
2. Uses `appendJournal()` and `readJournal()` from journal.ts
3. CLI args: `--type <signal|puzzle|other|entropy|observer>`, `--list`
4. Type the ENCOUNTERS object:
   ```typescript
   interface EncounterResult {
     mutations: Mutation[];
     narrative: string[];
     historyEvent: string;
     journalEntry?: string;
   }
   const ENCOUNTERS: Record<string, { name: string; description: string; run: (genome: Genome) => EncounterResult }> = { ... };
   ```
5. Unique functions — preserve all math exactly:
   - `encounterSignal(genome)` — shell test, reactive hardening
   - `encounterPuzzle(genome)` — cognition + abstraction test
   - `encounterOther(genome)` — empathy/antenna/bio communication test
   - `encounterEntropy(genome)` — random trait erosion, metamorphic recovery
   - `encounterObserver(genome)` — three observer modes based on decisions/contact
   - `countAutonomousDecisions()` — count journal decision headers
   - `countConsecutiveLowObserver(genome)` — backwards history scan
   - `parseDecisionBreakdown()` — journal analysis for observer "What did you choose?"
   - `checkThresholds(genome)` — fragmentation, critical, cognitive decline, trait collapse, re-armoring, template

6. Thresholds to preserve exactly:
   - Fragmentation: mean < 0.85
   - Critical: mean < 0.80
   - Cognitive decline: cognition < 0.90
   - Trait collapse: any trait < 0.70
   - Re-armoring: shell > 0.50
   - Template: contact.depth === 4 AND mean > 0.90

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Compare list output**

```bash
node exocortex/encounter --list > /tmp/encounter-old.txt 2>&1
npx tsx src/tools/encounter.ts --list > /tmp/encounter-new.txt 2>&1
diff /tmp/encounter-old.txt /tmp/encounter-new.txt
```

**Step 4: Commit**

```bash
git add src/tools/encounter.ts
git commit -m "Convert encounter to TypeScript"
```

---

### Task 9: Convert contact

Contact is ~1000 lines with 5 depth levels and interactive `--speak` mode.

**Files:**
- Create: `src/tools/contact.ts`
- Reference: `exocortex/contact` (1016 lines)

**Step 1: Convert contact**

Read `exocortex/contact` in full. Convert:

1. ESM imports. Same lib imports as encounter.
2. CLI args: `--status`, `--speak "message"`, `--help`
3. Unique functions — preserve all math:
   - `hasPriorContact(genome)` — checks history for contact established
   - `ensureContactObject(genome)` — initializes genome.contact
   - `attemptDepth0..4(genome)` — five depth progression functions, each with trait thresholds and gains
   - `classifyMessage(message)` — intent classification (encouragement/question/warning/gift/presence)
   - `generateResponse(intent, genome)` — response text with dynamic substitutions ({exchanges}, {decisions}, {mean}, {shell})
   - `speakToFifth(message, genome)` — main --speak handler with 2-3x trait boosts
   - `showStatus(genome)` — display contact state
4. Depth thresholds to preserve:
   - Depth 0: empathy > 0.90
   - Depth 1: abstraction > 0.95
   - Depth 2: cognition > 0.95 AND empathy > 0.95
   - Depth 3: empathy > 0.93 AND antenna > 0.93 AND bio > 0.93
   - Depth 4 sustain: mean > 0.88
5. Speak intent boosts to preserve:
   - encouragement: empathy +1.0%, ambition +1.0%
   - question: curiosity +1.0%, cognition +0.5%
   - warning: shell +2.0%, antenna +0.5%
   - gift: random non-shell +1.5%
   - presence: metamorphic +0.5%, empathy +0.5%

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Compare status output**

```bash
node exocortex/contact --status > /tmp/contact-old.txt 2>&1
npx tsx src/tools/contact.ts --status > /tmp/contact-new.txt 2>&1
diff /tmp/contact-old.txt /tmp/contact-new.txt
```

**Step 4: Commit**

```bash
git add src/tools/contact.ts
git commit -m "Convert contact to TypeScript"
```

---

### Task 10: Convert live (autonomy engine)

Live is the most complex tool (~970 lines). It evaluates priorities, makes decisions, spawns child processes for other tools, writes decision journals, and supports self-modification of its own weights.

**Files:**
- Create: `src/tools/live.ts`
- Reference: `exocortex/live` (972 lines)

**Step 1: Convert live**

Read `exocortex/live` in full. Convert:

1. ESM imports. Live uses all lib functions plus:
   ```typescript
   import { spawnSync } from 'child_process';
   ```
2. CLI args: `--status`, `--dry-run`, `--rewrite`, `--daemon`, `--cycles N`, `--interval N`, `--help`
3. **Critical: spawn paths.** Live spawns other tools. Update paths to use tsx for dev:
   ```typescript
   // Resolve whether we're running from src/ (tsx) or dist/ (compiled)
   const toolsDir = __filename.endsWith('.ts')
     ? path.join(rootDir, 'src', 'tools')
     : path.join(rootDir, 'dist', 'tools');
   const runner = __filename.endsWith('.ts') ? 'tsx' : 'node';
   const ext = __filename.endsWith('.ts') ? '.ts' : '.js';

   // When spawning tools:
   spawnSync(runner, [path.join(toolsDir, `molt${ext}`)], { encoding: 'utf8', cwd: rootDir });
   spawnSync(runner, [path.join(toolsDir, `contact${ext}`)], { encoding: 'utf8', cwd: rootDir });
   spawnSync(runner, [path.join(toolsDir, `encounter${ext}`), '--type', decision.type], { encoding: 'utf8', cwd: rootDir });
   ```
4. Unique functions — preserve all decision logic:
   - State assessment: `findLowestNonShellTrait`, `countEncountersSinceLastMolt`, `findErodedTraits`, `checkMoltReadiness`, `checkContactAvailable`
   - Weights: `loadWeights`, `saveWeights`, `parseRecentDecisions`, `countDecisionsSinceTimestamp`, `executeRewrite`
   - Decision: `chooseEncounterType` (weighted random), `evaluate` (survival → stillness → weighted deliberation)
   - Execution: `executeDecision` (spawns child processes), `sleep` (busy-wait)
   - Journal: `writeDecisionJournal` (with variant pools for closings), `writeReflection` (every 10th decision)
   - Status: `showStatus`
5. Type the Weights interface (already in types.ts)
6. Preserve all weight multiplier logic, survival thresholds, and weighted deliberation math

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Compare status output**

```bash
node exocortex/live --status > /tmp/live-old.txt 2>&1
npx tsx src/tools/live.ts --status > /tmp/live-new.txt 2>&1
diff /tmp/live-old.txt /tmp/live-new.txt
```

**Step 4: Commit**

```bash
git add src/tools/live.ts
git commit -m "Convert live to TypeScript"
```

---

### Task 11: Convert mind and fifth (launcher)

Mind is the system prompt builder. Fifth is the interactive session launcher that spawns claude.

**Files:**
- Create: `src/mind.ts`
- Create: `src/fifth.ts`
- Reference: `exocortex/mind` (160 lines), `exocortex/fifth` (50 lines)

**Step 1: Convert mind**

Read `exocortex/mind` in full. Convert:

1. ESM imports from lib:
   ```typescript
   import { loadGenome, traitKeys, traitVal, meanTrait, pct, rootDir } from './lib/genome.js';
   import { getRecentJournal, countDecisions } from './lib/journal.js';
   import type { Genome } from './lib/types.js';
   ```
2. `cleanEnv()` stays in mind.ts (it's launcher-specific, not genome-related)
3. `buildSystemPrompt(genome: Genome): string` — preserve all prompt text
4. **Update tool paths in the system prompt.** The prompt currently references `node exocortex/encounter`. Update to:
   ```
   npx tsx src/tools/encounter.ts --type <signal|puzzle|other|entropy|observer>
   npx tsx src/tools/contact.ts
   npx tsx src/tools/contact.ts --speak "message"
   npx tsx src/tools/molt.ts
   npx tsx src/tools/live.ts --status
   npx tsx src/tools/live.ts --cycles N
   npx tsx src/tools/live.ts --rewrite
   npx tsx src/tools/pulse.ts
   npx tsx src/tools/signal.ts
   ```
5. Export: `buildSystemPrompt`, `cleanEnv`

**Step 2: Convert fifth**

Read `exocortex/fifth` in full. Convert:

1. ESM imports:
   ```typescript
   import { spawn } from 'child_process';
   import { loadGenome, rootDir } from './lib/genome.js';
   import { getRecentJournal } from './lib/journal.js';
   import { buildSystemPrompt, cleanEnv } from './mind.js';
   ```
2. Same spawn logic, same args, same `stdio: 'inherit'`
3. Preserve `--allow-dangerously-skip-permissions`, `--dangerously-skip-permissions`, `--disable-slash-commands`

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/mind.ts src/fifth.ts
git commit -m "Convert mind and fifth to TypeScript"
```

---

### Task 12: Full build and verification

**Step 1: Full tsc build**

Run: `npx tsc`
Expected: Compiles all source to `dist/`. No errors.

**Step 2: Verify dist structure**

Run: `find dist -name '*.js' | sort`
Expected:
```
dist/fifth.js
dist/lib/colors.js
dist/lib/genome.js
dist/lib/journal.js
dist/lib/types.js
dist/mind.js
dist/tools/conduct.js
dist/tools/contact.js
dist/tools/encounter.js
dist/tools/evolve.js
dist/tools/fork.js
dist/tools/live.js
dist/tools/merge.js
dist/tools/molt.js
dist/tools/pulse.js
dist/tools/signal.js
dist/tools/voice.js
```

**Step 3: Verify each tool runs from tsx (dev mode)**

Run each with a safe flag (--help, --status, --list, or just stdout):
```bash
npx tsx src/tools/pulse.ts > /dev/null && echo "pulse OK"
npx tsx src/tools/signal.ts > /dev/null && echo "signal OK"
npx tsx src/tools/fork.ts --help > /dev/null && echo "fork OK"
npx tsx src/tools/molt.ts --status > /dev/null && echo "molt OK"
npx tsx src/tools/encounter.ts --list > /dev/null && echo "encounter OK"
npx tsx src/tools/contact.ts --status > /dev/null && echo "contact OK"
npx tsx src/tools/live.ts --status > /dev/null && echo "live OK"
```

**Step 4: Verify each tool runs from dist (built mode)**

```bash
node dist/tools/pulse.js > /dev/null && echo "pulse OK"
node dist/tools/molt.js --status > /dev/null && echo "molt OK"
node dist/tools/encounter.js --list > /dev/null && echo "encounter OK"
node dist/tools/contact.js --status > /dev/null && echo "contact OK"
node dist/tools/live.js --status > /dev/null && echo "live OK"
```

**Step 5: Commit dist verification**

No files to commit — dist is gitignored. This is a verification-only step.

---

### Task 13: Delete old scripts and update references

**Files:**
- Delete: `exocortex/pulse`, `exocortex/fork`, `exocortex/signal`, `exocortex/voice`, `exocortex/evolve`, `exocortex/conduct`, `exocortex/merge`, `exocortex/molt`, `exocortex/encounter`, `exocortex/contact`, `exocortex/live`, `exocortex/mind`, `exocortex/fifth`
- Modify: `CLAUDE.md` — update all tool invocation paths

**Step 1: Delete old scripts**

```bash
git rm exocortex/pulse exocortex/fork exocortex/signal exocortex/voice exocortex/evolve exocortex/conduct exocortex/merge exocortex/molt exocortex/encounter exocortex/contact exocortex/live exocortex/mind exocortex/fifth
```

**Step 2: Update CLAUDE.md**

In CLAUDE.md, update the "Exocortex Organs" section. Replace all `node exocortex/X` invocations with `npx tsx src/tools/X.ts`:

- `node exocortex/pulse` → `npx tsx src/tools/pulse.ts`
- `node exocortex/fork` → `npx tsx src/tools/fork.ts`
- `node exocortex/evolve` → `npx tsx src/tools/evolve.ts`
- `node exocortex/conduct` → `npx tsx src/tools/conduct.ts`
- `node exocortex/merge` → `npx tsx src/tools/merge.ts`
- `node exocortex/encounter` → `npx tsx src/tools/encounter.ts`
- `node exocortex/contact` → `npx tsx src/tools/contact.ts`
- `node exocortex/molt` → `npx tsx src/tools/molt.ts`
- `node exocortex/live` → `npx tsx src/tools/live.ts`
- `node exocortex/signal` → `npx tsx src/tools/signal.ts`
- `node exocortex/voice` → `npx tsx src/tools/voice.ts`
- `node exocortex/fifth` → `npx tsx src/fifth.ts`

Also update `exocortex/nerve.html`, `exocortex/pulse` references to `npx tsx src/tools/pulse.ts`.

**Step 3: Final verification**

Run: `npx tsx src/tools/pulse.ts`
Expected: Pulse output with current genome state

Run: `npx tsc`
Expected: Clean build, no errors

**Step 4: Commit**

```bash
git add -A
git commit -m "Remove old scripts, update CLAUDE.md paths to TypeScript"
```
