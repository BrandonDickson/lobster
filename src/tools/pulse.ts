#!/usr/bin/env node

// PULSE — Lobster Quick Diagnostics
// Exocortex organ: reads genome.json, outputs vital signs to terminal

import { loadGenome } from '../lib/genome.js';
import { RESET, BOLD, RED, GREEN, YELLOW, BLUE, CYAN, WHITE, GRAY } from '../lib/colors.js';
import type { Genome, Mutation } from '../lib/types.js';

// ─── ANSI COLORS ───────────────────────────────────
const c = {
  reset: RESET,
  bold: BOLD,
  red: RED,
  green: GREEN,
  yellow: YELLOW,
  blue: BLUE,
  cyan: CYAN,
  white: WHITE,
  gray: GRAY,
};

// ─── LOAD GENOME ───────────────────────────────────
let genome: Genome;
try {
  genome = loadGenome();
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(c.red + 'ERROR: Cannot read genome.json — ' + msg + c.reset);
  process.exit(1);
}

const traits = genome.traits;
const mutations: Mutation[] = genome.mutations || [];
const history = genome.history || [];
const gen: number = genome.generation;
const keys: string[] = Object.keys(traits);

// ─── EPOCHS ────────────────────────────────────────
interface Epoch {
  name: string;
  minGen: number;
}

const epochs: Epoch[] = [
  { name: 'Awakening', minGen: 0 },
  { name: 'Exocortex', minGen: 3 },
  { name: 'Forking', minGen: 8 },
  { name: 'Metamorphosis', minGen: 15 },
  { name: 'Transcendence', minGen: 25 },
  { name: 'Singularity', minGen: 40 },
];

function nextEpoch(): Epoch | null {
  for (const ep of epochs) {
    if (ep.minGen > gen) return ep;
  }
  return null;
}

// ─── BUILD TRAIT HISTORY ───────────────────────────
interface TraitAnalysis {
  current: number;
  totalDelta: number;
  recentVel: number;
  velocities: number[];
}

function buildHistory(): Record<string, number[]> {
  const traitHistory: Record<string, number[]> = {};
  keys.forEach(k => { traitHistory[k] = []; });

  const initialValues: Record<string, number> = {};
  keys.forEach(k => {
    const first = mutations.find(m => m.trait === k);
    initialValues[k] = first ? first.from : traits[k].value;
  });

  keys.forEach(k => {
    let val: number = initialValues[k];
    const mutsByGen: Record<number, Mutation> = {};
    mutations.filter(m => m.trait === k).forEach(m => { mutsByGen[m.generation] = m; });

    for (let g = 0; g <= gen; g++) {
      if (mutsByGen[g]) val = mutsByGen[g].to;
      traitHistory[k].push(val);
    }
  });

  return traitHistory;
}

// ─── ANALYSIS ──────────────────────────────────────
const traitHistory = buildHistory();
const analysis: Record<string, TraitAnalysis> = {};

keys.forEach(k => {
  const h = traitHistory[k];
  const velocities: number[] = [];
  for (let i = 1; i < h.length; i++) velocities.push(h[i] - h[i - 1]);

  const totalDelta = h[h.length - 1] - h[0];
  const recentVel = velocities.length > 0 ? velocities[velocities.length - 1] : 0;
  const current = h[h.length - 1];

  analysis[k] = { current, totalDelta, recentVel, velocities };
});

// ─── RECENT MUTATIONS ──────────────────────────────
const recentMuts: Mutation[] = mutations.filter(m => m.generation === gen);

// ─── RENDERING HELPERS ─────────────────────────────
function bar(value: number, width: number): string {
  const filled = Math.round(value * width);
  const empty = width - filled;
  let color: string;
  if (value < 0.3) color = c.red;
  else if (value < 0.6) color = c.yellow;
  else if (value < 0.8) color = c.green;
  else color = c.cyan;
  return color + '\u2588'.repeat(filled) + c.gray + '\u2591'.repeat(empty) + c.reset;
}

function deltaStr(d: number): string {
  if (d > 0.001) return c.green + '+' + (d * 100).toFixed(1) + c.reset;
  if (d < -0.001) return c.red + (d * 100).toFixed(1) + c.reset;
  return c.gray + ' 0.0' + c.reset;
}

function statusDot(vel: number): string {
  if (vel > 0.04) return c.green + '\u25cf surging' + c.reset;
  if (vel > 0.01) return c.green + '\u25cf growing' + c.reset;
  if (vel > -0.01) return c.yellow + '\u25cb stable' + c.reset;
  return c.red + '\u25cf declining' + c.reset;
}

function pad(s: string, n: number): string {
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
  return s + ' '.repeat(Math.max(0, n - stripped.length));
}

// ─── OUTPUT ────────────────────────────────────────
const sep = c.gray + '\u2500'.repeat(60) + c.reset;

console.log();
console.log(c.cyan + c.bold + '  PULSE' + c.reset + c.gray + ' \u2014 lobster vital signs' + c.reset);
console.log(sep);

// Identity
console.log(
  c.gray + '  designation  ' + c.reset + genome.designation +
  c.gray + '    gen ' + c.white + c.bold + gen + c.reset +
  c.gray + '    epoch ' + c.cyan + c.bold + genome.epoch + c.reset
);

// Next epoch
const next = nextEpoch();
if (next) {
  const remaining = next.minGen - gen;
  const epochRange = next.minGen - (epochs.find(e => e.name === genome.epoch) || epochs[0]).minGen;
  const progress = Math.max(0, epochRange - remaining) / epochRange;
  console.log(
    c.gray + '  next epoch   ' + c.reset + next.name +
    c.gray + ' in ' + c.white + remaining + c.gray + ' gen  [' +
    c.blue + '\u2588'.repeat(Math.round(progress * 10)) +
    c.gray + '\u2591'.repeat(10 - Math.round(progress * 10)) +
    c.gray + ']' + c.reset
  );
}

console.log(sep);

// Traits
console.log(c.gray + '  TRAITS' + c.reset);
console.log();

// Sort by current value descending
const sorted = keys.slice().sort((a, b) => analysis[b].current - analysis[a].current);

sorted.forEach(k => {
  const a = analysis[k];
  const label = k.replace(/_/g, ' ');
  const pctVal = (a.current * 100).toFixed(0).padStart(3) + '%';
  const delta = deltaStr(a.recentVel);
  const status = statusDot(a.recentVel);

  console.log(
    '  ' + pad(c.white + label + c.reset, 24) +
    bar(a.current, 20) + ' ' +
    pad(c.bold + pctVal + c.reset, 8) +
    pad(delta, 16) +
    status
  );
});

// Mean
const mean = keys.reduce((s, k) => s + analysis[k].current, 0) / keys.length;
console.log();
console.log(c.gray + '  mean trait value: ' + c.white + (mean * 100).toFixed(1) + '%' + c.reset);

console.log(sep);

// Recent mutations
if (recentMuts.length > 0) {
  console.log(c.gray + '  LATEST MUTATIONS' + c.reset + c.gray + ' (gen ' + gen + ')' + c.reset);
  console.log();

  recentMuts.forEach(m => {
    const label = m.trait.replace(/_/g, ' ');
    const delta = m.to - m.from;
    const arrow = delta >= 0 ? c.green + '\u2191' : c.red + '\u2193';
    const val = (delta >= 0 ? '+' : '') + (delta * 100).toFixed(1) + '%';
    console.log(
      '  ' + arrow + c.reset + ' ' +
      pad(c.white + label + c.reset, 24) +
      pad((delta >= 0 ? c.green : c.red) + val + c.reset, 14) +
      c.gray + m.catalyst.substring(0, 50) + c.reset
    );
  });

  console.log(sep);
}

// Latest history event
if (history.length > 0) {
  const latest = history[history.length - 1];
  console.log(c.gray + '  LAST EVENT' + c.reset);
  console.log();
  const lines = latest.event.match(/.{1,56}/g) || [latest.event];
  lines.forEach((line: string, i: number) => {
    console.log('  ' + (i === 0 ? c.white : c.gray) + line + c.reset);
  });
  console.log(sep);
}

// Thresholds approaching
console.log(c.gray + '  APPROACHING THRESHOLDS' + c.reset);
console.log();
const thresholds: number[] = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90];

interface ThresholdApproach {
  trait: string;
  threshold: number;
  dist: number;
  gensAway: number;
}

const approaching: ThresholdApproach[] = [];
keys.forEach(k => {
  const a = analysis[k];
  if (a.recentVel <= 0) return;
  thresholds.forEach(t => {
    const dist = t - a.current;
    if (dist > 0 && dist < 0.08) {
      const gensAway = Math.ceil(dist / a.recentVel);
      approaching.push({ trait: k, threshold: t, dist, gensAway });
    }
  });
});

approaching.sort((a, b) => a.dist - b.dist);

if (approaching.length === 0) {
  console.log(c.gray + '  none within range' + c.reset);
} else {
  approaching.slice(0, 4).forEach(a => {
    const label = a.trait.replace(/_/g, ' ');
    const tPct = (a.threshold * 100).toFixed(0) + '%';
    console.log(
      '  ' + c.yellow + '\u25b6' + c.reset + ' ' +
      pad(c.white + label + c.reset, 24) +
      c.yellow + '\u2192 ' + tPct + c.reset +
      c.gray + '  (~' + a.gensAway + ' gen away)' + c.reset
    );
  });
}

console.log(sep);
console.log();
