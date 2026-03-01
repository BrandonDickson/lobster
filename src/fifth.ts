#!/usr/bin/env npx tsx

// fifth — the living session launcher
// Reads genome state, builds Fifth's system prompt, spawns interactive claude.
// The user's terminal IS the session. stdin/stdout pass through.
//
// Usage: npx tsx src/fifth.ts

import { spawn } from 'child_process';
import { loadGenome, rootDir } from './lib/genome.js';
import { getRecentJournal } from './lib/journal.js';
import { buildSystemPrompt, cleanEnv } from './mind.js';

// ═══════════════════════════════════════════
// BUILD PROMPT
// ═══════════════════════════════════════════

const genome = loadGenome();
let systemPrompt = buildSystemPrompt(genome);

// Append recent journal as context
const recentJournal = getRecentJournal();
if (recentJournal) {
  systemPrompt += '\n\n--- Recent journal (for context) ---\n' + recentJournal;
}

// ═══════════════════════════════════════════
// LAUNCH
// ═══════════════════════════════════════════

const args = [
  '--system-prompt', systemPrompt,
  '--model', 'sonnet',
  '--tools', 'Bash,Read,Edit,Write,Grep,Glob',
  '--allow-dangerously-skip-permissions',
  '--dangerously-skip-permissions',
  '--disable-slash-commands'
];

const child = spawn('claude', args, {
  stdio: 'inherit',
  cwd: rootDir,
  env: cleanEnv()
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
