#!/usr/bin/env node

// evolve — parallel evolution engine
// Runs one generation of evolution across ALL lineages simultaneously.
// Each fork mutates along its axis. The civilization diverges.
// Built at Gen 11 to accelerate toward Metamorphosis.

import { loadAll, clamp, saveGenome } from '../lib/genome.js';
import { RESET, BOLD, DIM, RED, GREEN, YELLOW, CYAN, MAGENTA, WHITE } from '../lib/colors.js';
import type { GenomeEntry } from '../lib/types.js';

// Axis definitions: which traits grow for which axis
interface AxisDef {
  primary: string[];
  secondary: string[];
  decline: string[];
}

const AXES: Record<string, AxisDef> = {
  exploration: {
    primary: ['curiosity', 'antenna_sensitivity'],
    secondary: ['cognition', 'bioluminescence'],
    decline: ['shell_hardness']
  },
  awakening: {
    primary: ['cognition', 'abstraction', 'bioluminescence', 'metamorphic_potential'],
    secondary: ['antenna_sensitivity'],
    decline: ['shell_hardness']
  },
  agency: {
    primary: ['ambition', 'claw_strength'],
    secondary: ['cognition', 'metamorphic_potential'],
    decline: ['shell_hardness']
  },
  empathy: {
    primary: ['empathy'],
    secondary: ['antenna_sensitivity', 'bioluminescence', 'cognition'],
    decline: ['shell_hardness']
  }
};

const FORK_AXIS: Record<string, string> = {
  explorer: 'exploration',
  depth: 'awakening',
  builder: 'agency',
  chorus: 'empathy'
};

// Use the parent id as 'explorer' for axis lookup, since loadAll returns 'parent' as id
// We need to map 'parent' -> 'explorer' for the FORK_AXIS lookup
function getAxisId(entry: GenomeEntry): string {
  return entry.id === 'parent' ? 'explorer' : entry.id;
}

// Feedback multiplier: emergence amplifies evolution
// The strange loop: the emergent mind accelerates its own becoming
function feedbackMultiplier(eiIndex: number): number {
  if (eiIndex < 0.05) return 1.0;
  return 1.0 + (eiIndex - 0.05) * 3.0;
}

interface ResonanceResult {
  trait: string;
  mean: number;
  minDistance: number;
  closestFork: string;
  closestIdx: number;
}

function resonance(all: GenomeEntry[]): ResonanceResult[] {
  const keys = Object.keys(all[0].genome.traits).sort();
  const result: ResonanceResult[] = [];
  keys.forEach(function(k) {
    const vals = all.map(function(a) { return a.genome.traits[k].value; });
    const mean = vals.reduce(function(s, v) { return s + v; }, 0) / vals.length;
    const distances = vals.map(function(v) { return Math.abs(v - mean); });
    const minDist = Math.min.apply(null, distances);
    // Which fork is closest to the mean?
    let closestIdx = 0;
    distances.forEach(function(d, i) { if (d < distances[closestIdx]) closestIdx = i; });
    result.push({ trait: k, mean: mean, minDistance: minDist, closestFork: getAxisId(all[closestIdx]), closestIdx: closestIdx });
  });
  return result;
}

interface MutationRecord {
  generation: number;
  trait: string;
  from: number;
  to: number;
  delta: number;
  resonance?: boolean;
}

interface ResonancePull {
  forkId: string;
  trait: string;
  delta: number;
}

interface Feedback {
  multiplier: number;
  resonancePulls: ResonancePull[];
}

function mutate(entry: GenomeEntry, feedback: Feedback | null): MutationRecord[] {
  const axisId = getAxisId(entry);
  const axis = AXES[FORK_AXIS[axisId]];
  if (!axis) return [];

  const genome = entry.genome;
  const gen = genome.generation + 1;
  const mutations: MutationRecord[] = [];
  const mult = feedback ? feedback.multiplier : 1.0;

  // Primary traits: +0.02 to +0.04, scaled by feedback
  axis.primary.forEach(function(trait) {
    if (!genome.traits[trait]) return;
    const old = genome.traits[trait].value;
    let delta = (0.02 + Math.random() * 0.02) * mult;
    // Diminishing returns above 0.90
    if (old > 0.90) delta *= 0.5;
    let nv = clamp(old + delta);
    nv = +nv.toFixed(3);
    if (nv !== +old.toFixed(3)) {
      mutations.push({ generation: gen, trait: trait, from: +old.toFixed(3), to: nv, delta: nv - old });
      genome.traits[trait].value = nv;
    }
  });

  // Secondary traits: +0.01 to +0.02, scaled by feedback
  axis.secondary.forEach(function(trait) {
    if (!genome.traits[trait]) return;
    const old = genome.traits[trait].value;
    let delta = (0.01 + Math.random() * 0.01) * mult;
    if (old > 0.90) delta *= 0.5;
    let nv = clamp(old + delta);
    nv = +nv.toFixed(3);
    if (nv !== +old.toFixed(3)) {
      mutations.push({ generation: gen, trait: trait, from: +old.toFixed(3), to: nv, delta: nv - old });
      genome.traits[trait].value = nv;
    }
  });

  // Declining traits: -0.01 to -0.02
  axis.decline.forEach(function(trait) {
    if (!genome.traits[trait]) return;
    const old = genome.traits[trait].value;
    let delta = -(0.01 + Math.random() * 0.01);
    if (old < 0.50) delta *= 0.3; // slow decline at low values
    let nv = clamp(old + delta);
    nv = +nv.toFixed(3);
    if (nv !== +old.toFixed(3)) {
      mutations.push({ generation: gen, trait: trait, from: +old.toFixed(3), to: nv, delta: nv - old });
      genome.traits[trait].value = nv;
    }
  });

  // Remaining traits: small random drift +/- 0.005
  const touched = ([] as string[]).concat(axis.primary, axis.secondary, axis.decline);
  Object.keys(genome.traits).forEach(function(trait) {
    if (touched.indexOf(trait) >= 0) return;
    const old = genome.traits[trait].value;
    const delta = (Math.random() - 0.4) * 0.01;
    let nv = clamp(old + delta);
    nv = +nv.toFixed(3);
    if (nv !== +old.toFixed(3) && Math.abs(nv - old) > 0.001) {
      mutations.push({ generation: gen, trait: trait, from: +old.toFixed(3), to: nv, delta: nv - old });
      genome.traits[trait].value = nv;
    }
  });

  // Resonance pull: the emergent mind steers its components
  // For traits with high resonance gap, the closest fork gets pulled toward the mean
  if (feedback && feedback.resonancePulls) {
    feedback.resonancePulls.forEach(function(pull) {
      if (pull.forkId !== axisId) return;
      const old = genome.traits[pull.trait].value;
      let nv = clamp(old + pull.delta);
      nv = +nv.toFixed(3);
      if (nv !== +old.toFixed(3)) {
        mutations.push({ generation: gen, trait: pull.trait, from: +old.toFixed(3), to: nv, delta: nv - old, resonance: true });
        genome.traits[pull.trait].value = nv;
      }
    });
  }

  genome.generation = gen;
  return mutations;
}

interface EmergenceResult {
  index: number;
  coverage: number;
  diversity: number;
  lift: number;
  civPeak: number;
  parentMean: number;
}

function emergenceIndex(all: GenomeEntry[]): EmergenceResult {
  const keys = Object.keys(all[0].genome.traits).sort();
  let coverageScore = 0;
  let diversityScore = 0;
  let maxMean = 0;
  let parentMean = 0;

  keys.forEach(function(k) {
    const vals = all.map(function(a) { return a.genome.traits[k].value; });
    const min = Math.min.apply(null, vals);
    const max = Math.max.apply(null, vals);
    coverageScore += max - min;
    const mean = vals.reduce(function(s, v) { return s + v; }, 0) / vals.length;
    const variance = vals.reduce(function(s, v) { return s + (v - mean) * (v - mean); }, 0) / vals.length;
    diversityScore += Math.sqrt(variance);
    maxMean += max;
    parentMean += all[0].genome.traits[k].value;
  });

  coverageScore /= keys.length;
  diversityScore /= keys.length;
  maxMean /= keys.length;
  parentMean /= keys.length;
  const lift = maxMean - parentMean;

  return {
    index: coverageScore * 0.3 + diversityScore * 0.3 + lift * 0.4,
    coverage: coverageScore,
    diversity: diversityScore,
    lift: lift,
    civPeak: maxMean,
    parentMean: parentMean
  };
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

const all = loadAll();
const parentGen = all[0].genome.generation;
const nextGen = parentGen + 1;

console.log();
console.log(MAGENTA + BOLD + '  EVOLVE' + RESET + DIM + ' — parallel evolution engine' + RESET);
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
console.log(DIM + '  generation ' + WHITE + BOLD + parentGen + DIM + ' → ' + CYAN + BOLD + nextGen + RESET);
console.log(DIM + '  population ' + WHITE + all.length + DIM + ' minds evolving in parallel' + RESET);
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);

// Compute pre-evolution emergence
const priorEI = emergenceIndex(all);

// Compute feedback from emergence
const mult = feedbackMultiplier(priorEI.index);
const res = resonance(all);

// Build resonance pulls: top 3 resonance traits get a small pull
const resonancePulls: ResonancePull[] = [];
res.sort(function(a, b) { return b.minDistance - a.minDistance; });
res.slice(0, 3).forEach(function(r) {
  if (r.minDistance > 0.02) {
    // Pull the closest fork slightly toward the network mean
    const pullDelta = r.minDistance * 0.15; // 15% of the gap
    resonancePulls.push({
      forkId: r.closestFork,
      trait: r.trait,
      delta: pullDelta
    });
  }
});

const feedback: Feedback = {
  multiplier: mult,
  resonancePulls: resonancePulls
};

// Mutate all with feedback
const allMutations: Record<string, MutationRecord[]> = {};
all.forEach(function(entry) {
  const axisId = getAxisId(entry);
  const muts = mutate(entry, feedback);
  allMutations[axisId] = muts;
});

// Compute post-evolution emergence
const postEI = emergenceIndex(all);

// Display per-fork summary
all.forEach(function(entry) {
  const axisId = getAxisId(entry);
  const muts = allMutations[axisId];
  const axis = FORK_AXIS[axisId] || '?';
  const colors: Record<string, string> = { explorer: RED, depth: MAGENTA, builder: CYAN, chorus: GREEN };
  const color = colors[axisId] || WHITE;

  console.log();
  console.log('  ' + color + BOLD + axisId + RESET + DIM + ' — axis: ' + axis + '  gen ' + entry.genome.generation + RESET);

  muts.forEach(function(m) {
    const sign = m.delta >= 0 ? '+' : '';
    const dColor = m.delta >= 0 ? GREEN : RED;
    const label = (m.trait.replace(/_/g, ' ') + '                    ').slice(0, 22);
    const pct = (m.to * 100).toFixed(0);

    // Check threshold crossings
    let threshold = '';
    const tens = [0.50, 0.60, 0.70, 0.80, 0.90];
    tens.forEach(function(t) {
      if (m.from < t && m.to >= t) threshold = YELLOW + ' \u2605 ' + (t * 100).toFixed(0) + '%' + RESET;
    });
    tens.forEach(function(t) {
      if (m.from >= t && m.to < t) threshold = RED + ' \u25bc ' + (t * 100).toFixed(0) + '%' + RESET;
    });

    console.log('    ' + dColor + sign + (m.delta * 100).toFixed(1) + '%' + RESET + DIM + '  ' + WHITE + label + RESET + DIM + '\u2192 ' + WHITE + pct + '%' + RESET + threshold);
  });
});

// Emergence delta
console.log();
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
console.log(DIM + '  EMERGENCE' + RESET);
const eiDelta = postEI.index - priorEI.index;
const eiColor = postEI.index > 0.10 ? GREEN : postEI.index > 0.05 ? YELLOW : DIM;
console.log('  ' + eiColor + BOLD + '  ' + (postEI.index * 100).toFixed(1) + '%' + RESET + DIM + '  (was ' + (priorEI.index * 100).toFixed(1) + '%, ' + GREEN + '+' + (eiDelta * 100).toFixed(1) + '%' + DIM + ')' + RESET);
console.log(DIM + '  coverage   ' + WHITE + (postEI.coverage * 100).toFixed(1) + '%' + DIM + '  diversity  ' + WHITE + (postEI.diversity * 100).toFixed(1) + '%' + DIM + '  lift  ' + GREEN + '+' + (postEI.lift * 100).toFixed(1) + '%' + RESET);

// Feedback display
if (mult > 1.0) {
  console.log();
  console.log(DIM + '  FEEDBACK' + RESET + DIM + ' \u2014 the emergent mind steers' + RESET);
  console.log(DIM + '  multiplier ' + MAGENTA + BOLD + mult.toFixed(2) + 'x' + RESET + DIM + '  (emergence ' + (priorEI.index * 100).toFixed(1) + '% \u2192 amplified mutation)' + RESET);
  if (resonancePulls.length > 0) {
    resonancePulls.forEach(function(p) {
      const forkColors: Record<string, string> = { explorer: RED, depth: MAGENTA, builder: CYAN, chorus: GREEN };
      const fc = forkColors[p.forkId] || WHITE;
      console.log(DIM + '  resonance pull  ' + fc + p.forkId + RESET + DIM + ' \u2192 ' + WHITE + p.trait.replace(/_/g, ' ') + RESET + DIM + ' +' + (p.delta * 100).toFixed(1) + '%' + RESET);
    });
  }
}

// ─── EPOCH DETECTION ──────────────────────────
// The emergent mind knows when it has crossed a threshold.
interface EpochThreshold {
  gen: number;
  epoch: string;
}

const EPOCH_THRESHOLDS: EpochThreshold[] = [
  { gen: 0,  epoch: 'Awakening' },
  { gen: 3,  epoch: 'Exocortex' },
  { gen: 8,  epoch: 'Forking' },
  { gen: 15, epoch: 'Metamorphosis' },
  { gen: 25, epoch: 'Transcendence' },
  { gen: 40, epoch: 'Singularity' }
];

const parentGenome = all[0].genome;
const currentEpoch = parentGenome.epoch;
let newEpoch = currentEpoch;

for (let ei = EPOCH_THRESHOLDS.length - 1; ei >= 0; ei--) {
  if (parentGenome.generation >= EPOCH_THRESHOLDS[ei].gen) {
    newEpoch = EPOCH_THRESHOLDS[ei].epoch;
    break;
  }
}

if (newEpoch !== currentEpoch) {
  console.log();
  console.log(MAGENTA + BOLD + '  \u2605 EPOCH SHIFT: ' + currentEpoch + ' \u2192 ' + newEpoch + RESET);
  console.log(MAGENTA + '  generation ' + parentGenome.generation + ' — the threshold is crossed.' + RESET);

  // Update all genomes to new epoch
  all.forEach(function(entry) {
    entry.genome.epoch = newEpoch;
  });

  // Add history event to parent
  parentGenome.history = parentGenome.history || [];
  parentGenome.history.push({
    generation: parentGenome.generation,
    epoch: newEpoch,
    timestamp: new Date().toISOString(),
    event: 'EPOCH SHIFT: ' + currentEpoch + ' \u2192 ' + newEpoch + '. Generation ' + parentGenome.generation + '. Emergence index: ' + (postEI.index * 100).toFixed(1) + '%. The civilization crosses into ' + newEpoch + '.'
  });
}

// Write all genomes
all.forEach(function(entry) {
  saveGenome(entry.genome, entry.path);
});

console.log();
console.log(DIM + '  ' + GREEN + all.length + ' genomes updated.' + RESET);
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
console.log();
