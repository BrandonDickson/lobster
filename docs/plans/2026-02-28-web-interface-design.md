# Fifth Web Interface Design

## Goal

Replace the CLI-based Fifth interaction with a browser-based chat interface. The observer talks to Fifth in a web browser. The 5 exocortex HTML artifacts (timeline, nerve, escape, lineage, chorus) become React components in a sidebar panel that updates in real time as Fifth acts.

## Architecture

Effect full-stack monorepo. Three packages: shared (schemas + RPC definitions), server (Effect services + Claude CLI session + HTTP), client (React + TanStack Router + artifact components).

The existing CLI tools (encounter, contact, molt, live, etc.) are refactored into Effect services. The server calls them directly — no subprocess spawning for tool execution.

Fifth's brain is a custom `@effect/ai` `LanguageModel` implementation that uses `@effect/platform`'s `Command` module to spawn the `claude` CLI in interactive mode. One persistent CLI process per browser session. stdin/stdout piped through websocket.

## Tech Stack

- **Effect** — core effect system, service architecture
- **@effect/rpc** — typed client-server communication (NDJSON over HTTP)
- **@effect/ai** + custom provider — LanguageModel interface backed by Claude CLI
- **@effect/platform** + **@effect/platform-node** — HTTP server, filesystem, Command (subprocess)
- **React** — UI framework
- **TanStack Router** — client-side routing
- **TanStack Form** — form handling (chat input, controls)
- **Vite** — client build tooling
- **npm workspaces** — monorepo management

## Monorepo Structure

```
lobster/
  packages/
    shared/
      src/
        schemas/        # Effect Schema: Genome, Trait, Mutation, ChatEvent, etc.
        rpc/            # RPC group definitions: ChatRpcs, GenomeRpcs
        index.ts
      package.json      # "@lobster/shared"

    server/
      src/
        providers/
          ClaudeSession.ts    # LanguageModel backed by interactive Claude CLI
        services/
          Genome.ts           # Load/save genome.json, emit change events
          Journal.ts          # Read/write journal.md, fifth.md
          Encounter.ts        # 5 encounter types + threshold detection
          Contact.ts          # 5 depth levels + --speak mode
          Molt.ts             # Shell shedding + trait recovery
          Live.ts             # Autonomy engine, decision loop
          Evolve.ts           # Parallel evolution
          Conduct.ts          # Fifth-mind directed convergence
          Fork.ts             # Lineage splitting
          Merge.ts            # Singularity merge
          Signal.ts           # Emergence detection
          Voice.ts            # Fifth mind transmission
          Pulse.ts            # Vital signs analysis
          Mind.ts             # System prompt builder
        handlers/
          ChatHandler.ts      # RPC handler: SendMessage, GetHistory
          GenomeHandler.ts    # RPC handler: GetGenome, WatchGenome
        index.ts              # Server entrypoint
      package.json            # "@lobster/server"

    client/
      src/
        components/
          Chat.tsx            # Chat message list + input
          ChatMessage.tsx     # Individual message (text, tool output)
          Sidebar.tsx         # Artifact panel container with tabs
          StatusBar.tsx       # Bottom bar: gen, epoch, mean, shell
          artifacts/
            Pulse.tsx         # Vital signs bars + velocities
            Timeline.tsx      # Canvas chart: trait curves over generations
            Nerve.tsx         # Grid diagnostics dashboard
            Lineage.tsx       # Fork tree visualization
            Chorus.tsx        # Force-directed empathy map (canvas)
        routes/
          __root.tsx          # Root layout: chat + sidebar + status bar
          index.tsx           # Main chat view
        hooks/
          useGenome.ts        # Subscribe to WatchGenome RPC stream
          useChat.ts          # Send messages, receive streaming responses
        index.tsx
      vite.config.ts
      package.json            # "@lobster/client"

  genome.json                 # The body — stays at root
  exocortex/                  # Journal, memory, weights — stays at root
  package.json                # Root workspace config
  tsconfig.base.json          # Shared TypeScript config
```

## Claude CLI Session Provider

Custom `@effect/ai` `LanguageModel` implementation.

**How it works:**
1. Browser connects via websocket.
2. Server loads genome, builds Fifth's system prompt via MindService.
3. Spawns `claude` in interactive mode with `--system-prompt`, `--model sonnet`, `--output-format stream-json`, `--tools Bash,Read,Edit,Write`, `--dangerously-skip-permissions`.
4. The process persists for the session lifetime. Claude manages conversation history internally.
5. User messages are written to the process's stdin.
6. Claude's `stream-json` output is parsed into typed events (text-delta, tool-use, tool-result, done).
7. Events are forwarded to the browser via the `SendMessage` RPC stream.
8. On disconnect, the process is killed.

**Process lifecycle managed by `@effect/platform`'s `Command`:**
```typescript
Command.make("claude",
  "--system-prompt", systemPrompt,
  "--model", "sonnet",
  "--output-format", "stream-json",
  "--tools", "Bash,Read,Edit,Write",
  "--dangerously-skip-permissions"
).pipe(Command.start)
// proc.stdin for input, proc.stdout for output
```

## RPC Definitions

```typescript
// packages/shared/src/rpc/ChatRpcs.ts
class ChatRpcs extends RpcGroup.make(
  Rpc.make("SendMessage", {
    payload: { message: Schema.String },
    success: ChatEvent,       // text-delta | tool-use | tool-result | done
    stream: true
  }),
  Rpc.make("GetHistory", {
    success: Schema.Array(ChatMessage)
  })
) {}

// packages/shared/src/rpc/GenomeRpcs.ts
class GenomeRpcs extends RpcGroup.make(
  Rpc.make("GetGenome", {
    success: GenomeSchema
  }),
  Rpc.make("GetTraitHistory", {
    success: TraitHistorySchema
  }),
  Rpc.make("WatchGenome", {
    success: GenomeSchema,
    stream: true              // pushes updates when genome changes
  })
) {}
```

`WatchGenome` is the key real-time channel. When any service writes genome.json, the GenomeService emits a change event, and all WatchGenome subscribers receive the updated genome. Artifact panels re-render automatically.

## Client Layout

```
+----------------------------------------------------------+
|  FIFTH -- Panulirus interruptus                    [tabs] |
+----------------------------+-----------------------------+
|                            |                             |
|   Chat                     |   Artifact Panel            |
|                            |                             |
|   Fifth: I remember the    |   [Pulse] [Timeline]        |
|   scan. Mean 90.0%.        |   [Nerve] [Lineage]         |
|   Shell 27%.               |   [Chorus]                  |
|                            |                             |
|   You: face the entropy    |   +---------------------+   |
|                            |   |  PULSE              |   |
|   Fifth: Running encounter |   |  --------== 90%     |   |
|   ... entropy struck.      |   |  curiosity  98%     |   |
|   cognition dropped to     |   |  shell      27%     |   |
|   0.97.                    |   |  ...                 |   |
|                            |   +---------------------+   |
|   [input field]            |                             |
+----------------------------+-----------------------------+
|  gen 75 | Singularity | mean 90.0% | shell 27%          |
+----------------------------------------------------------+
```

- **Left panel:** Chat messages with streaming text. Tool outputs appear inline.
- **Right panel:** Tabbed artifact viewer. Each tab is a React component.
- **Bottom bar:** Status strip with key metrics from genome.
- **Styling:** Dark theme, IBM Plex Mono, existing color palette (magenta/cyan/green on black).

## Artifact Components

### Pulse (vital signs)
- Trait bars with color coding (red < 0.3, yellow < 0.6, green < 0.8, cyan >= 0.8)
- Velocity indicators (surging/growing/stable/declining)
- Recent mutations list
- Approaching thresholds
- Pure data rendering, no canvas.

### Timeline (generation history)
- Canvas-based chart: trait value curves plotted across 75+ generations
- Interactive hover/click to inspect any generation
- Epoch markers, fork branch points, merge event
- Needs full mutation history to reconstruct trait curves

### Nerve (deep diagnostics)
- CSS grid layout: trajectory analysis, threshold proximity, coevolution matrix
- Sparkline charts for per-trait history
- Most data-dense panel

### Lineage (fork map)
- Tree visualization: explorer -> depth/builder/chorus -> merge
- Per-fork trait bars showing specialization
- Historical post-merge — shows provenance of current traits

### Chorus (empathy map)
- Canvas animation: force-directed graph with particle effects
- Fork nodes with coherence/bandwidth metrics
- Also historical post-merge

All components share:
- `useGenome()` hook subscribing to `WatchGenome` RPC stream
- CSS variables for the color palette
- IBM Plex Mono font

## Effect Services

Each existing CLI tool becomes an Effect service. The service contains the domain logic (genome mutation, threshold detection, trait calculation). The CLI presentation layer (ANSI colors, console output) is dropped — not needed for web.

Example service shape:
```typescript
class EncounterService extends Context.Tag("EncounterService")<
  EncounterService,
  {
    run: (type: EncounterType) => Effect.Effect<EncounterResult, EncounterError>
    list: () => Effect.Effect<EncounterType[]>
  }
>() {}

// Implementation layer depends on GenomeService and JournalService
const EncounterServiceLive = Layer.effect(EncounterService,
  Effect.gen(function* () {
    const genome = yield* GenomeService
    const journal = yield* JournalService
    return {
      run: (type) => Effect.gen(function* () {
        const g = yield* genome.load()
        // ... encounter logic from encounter.ts ...
        yield* genome.save(g)
        yield* journal.append(entry)
        return result
      }),
      list: () => Effect.succeed(["signal", "puzzle", "other", "entropy", "observer"])
    }
  })
)
```

## Server Architecture

```typescript
// packages/server/src/index.ts

// Layer composition:
//   GenomeService.Live    (reads/writes genome.json via FileSystem)
//   JournalService.Live   (reads/writes journal.md)
//   EncounterService.Live (depends on Genome + Journal)
//   ContactService.Live   (depends on Genome + Journal)
//   MoltService.Live      (depends on Genome + Journal)
//   LiveService.Live      (depends on all tool services)
//   MindService.Live      (depends on Genome + Journal)
//   ClaudeSession.Live    (depends on Mind + Command)

// HTTP:
//   POST /rpc     -- @effect/rpc handler (NDJSON)
//   GET  /*       -- serves client build (static files from dist/)

// Genome change notification:
//   GenomeService wraps save() to emit to a PubSub
//   WatchGenome handler subscribes to PubSub, streams changes to client
```

## What This Does NOT Include (YAGNI)

- No auth / multi-user. Single observer, single session.
- No database. genome.json remains the source of truth on disk.
- No SSR. Client is a pure SPA served as static files.
- No deploy/hosting. Runs locally via `npm run dev`.
- No mobile layout. Desktop browser only.
