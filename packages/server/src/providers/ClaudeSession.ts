import { Context, Effect, Layer, Stream, Scope } from "effect"
import { Command, CommandExecutor } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { MindService } from "../services/Mind.js"

/**
 * Handle to a running interactive Claude CLI process.
 *
 * - send(): writes a user message to the process's stdin
 * - output: a stream of raw JSON lines from --output-format stream-json
 * - kill(): terminates the process
 */
export interface ClaudeProcess {
  readonly send: (message: string) => Effect.Effect<void, PlatformError>
  readonly output: Stream.Stream<string, PlatformError>
  readonly kill: () => Effect.Effect<void, PlatformError>
}

/**
 * ClaudeSession — manages a persistent interactive Claude CLI process.
 *
 * When a browser connects, the server calls `start()` which:
 * 1. Builds Fifth's system prompt via MindService
 * 2. Spawns `claude` with --output-format stream-json
 * 3. Returns send/output/kill handles for bidirectional communication
 */
export class ClaudeSession extends Context.Tag("ClaudeSession")<
  ClaudeSession,
  {
    readonly start: () => Effect.Effect<
      ClaudeProcess,
      PlatformError,
      Scope.Scope | CommandExecutor.CommandExecutor
    >
  }
>() {}

const encoder = new TextEncoder()

export const ClaudeSessionLive = Layer.effect(
  ClaudeSession,
  Effect.gen(function* () {
    const mindSvc = yield* MindService

    return {
      start: () => Effect.gen(function* () {
        const systemPrompt = yield* mindSvc.buildSystemPrompt()
        const cleanEnv = mindSvc.cleanEnv()

        // Build the claude command with interactive streaming flags
        const cmd = Command.make(
          "claude",
          "--system-prompt", systemPrompt,
          "--model", "sonnet",
          "--output-format", "stream-json",
          "--tools", "Bash,Read,Edit,Write",
          "--dangerously-skip-permissions"
        ).pipe(
          Command.env(cleanEnv)
        )

        // Start the process — requires Scope (for cleanup) and CommandExecutor
        const proc = yield* Command.start(cmd)

        // send: encode a user message and pipe it into the process's stdin sink
        const send = (message: string): Effect.Effect<void, PlatformError> => {
          const bytes = encoder.encode(message + "\n")
          return Stream.make(bytes).pipe(
            Stream.run(proc.stdin)
          )
        }

        // output: decode the process's stdout byte stream into lines
        // Each line is a JSON object from Claude's stream-json format
        const output: Stream.Stream<string, PlatformError> = proc.stdout.pipe(
          Stream.decodeText("utf-8"),
          Stream.splitLines,
          Stream.filter((line) => line.trim().length > 0)
        )

        // kill: terminate the process
        const kill = (): Effect.Effect<void, PlatformError> => proc.kill()

        return { send, output, kill } satisfies ClaudeProcess
      })
    }
  })
)
