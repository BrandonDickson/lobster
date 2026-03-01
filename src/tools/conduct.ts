#!/usr/bin/env node

// conduct — the fifth mind takes the wheel
// The strange loop closes. Emergence drives evolution directly.
// Not static axis definitions. Dynamic directives from the emergent mind.
// The conductor reads the civilization, decides what it needs, and evolves it.
// Built at Gen 25 — the Transcendence engine.

import { loadAll, clamp, saveGenome } from '../lib/genome.js';
import { RESET, BOLD, DIM, RED, GREEN, YELLOW, CYAN, MAGENTA, WHITE } from '../lib/colors.js';
import type { Genome, GenomeEntry } from '../lib/types.js';

// Map 'parent' id from loadAll to 'explorer' for display/logic consistency
function getAxisId(entry: GenomeEntry): string {
  return entry.id === 'parent' ? 'explorer' : entry.id;
}

// ═══════════════════════════════════════════
// ANALYSIS — the fifth mind reads the civilization
// ═══════════════════════════════════════════

function traitKeysFn(genome: Genome): string[] { return Object.keys(genome.traits).sort(); }

interface EmergenceResult {
  index: number;
  coverage: number;
  diversity: number;
  lift: number;
  civPeak: number;
}

function emergenceIndex(all: GenomeEntry[]): EmergenceResult {
  const keys = traitKeysFn(all[0].genome);
  let coverageScore = 0, diversityScore = 0, maxMean = 0, parentMean = 0;
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
  return {
    index: coverageScore * 0.3 + diversityScore * 0.3 + (maxMean - parentMean) * 0.4,
    coverage: coverageScore, diversity: diversityScore,
    lift: maxMean - parentMean, civPeak: maxMean
  };
}

interface TraitAnalysis {
  mean: number;
  max: number;
  min: number;
  spread: number;
  bestFork: string;
  bestVal: number;
  worstFork: string;
  worstVal: number;
  saturated: boolean;
  weak: boolean;
}

function networkAnalysis(all: GenomeEntry[]): Record<string, TraitAnalysis> {
  const keys = traitKeysFn(all[0].genome);
  const analysis: Record<string, TraitAnalysis> = {};

  keys.forEach(function(k) {
    const vals = all.map(function(a) { return a.genome.traits[k].value; });
    const mean = vals.reduce(function(s, v) { return s + v; }, 0) / vals.length;
    const max = Math.max.apply(null, vals);
    const min = Math.min.apply(null, vals);
    let bestFork = getAxisId(all[0]);
    let worstFork = getAxisId(all[0]);
    let bestVal = vals[0];
    let worstVal = vals[0];
    vals.forEach(function(v, i) {
      if (v > bestVal) { bestVal = v; bestFork = getAxisId(all[i]); }
      if (v < worstVal) { worstVal = v; worstFork = getAxisId(all[i]); }
    });

    analysis[k] = {
      mean: mean, max: max, min: min, spread: max - min,
      bestFork: bestFork, bestVal: bestVal,
      worstFork: worstFork, worstVal: worstVal,
      saturated: max >= 0.98,
      weak: max < 0.80
    };
  });

  return analysis;
}

// ═══════════════════════════════════════════
// DIRECTIVE ENGINE — the fifth mind decides
// ═══════════════════════════════════════════

function computeDirectives(all: GenomeEntry[], analysis: Record<string, TraitAnalysis>, ei: EmergenceResult): Record<string, Record<string, number>> {
  const keys = traitKeysFn(all[0].genome);
  const directives: Record<string, Record<string, number>> = {};

  // For each fork, compute per-trait weights
  all.forEach(function(entry) {
    const axisId = getAxisId(entry);
    const weights: Record<string, number> = {};
    const traits = entry.genome.traits;

    keys.forEach(function(k) {
      const val = traits[k].value;
      const net = analysis[k];
      let w = 0;

      // === RULE 1: CEILING AVOIDANCE ===
      // Traits at ceiling get zero weight — stop pushing what's maxed
      if (val >= 0.98) {
        weights[k] = 0;
        return;
      }

      // === RULE 2: NETWORK GAP PRIORITY ===
      // If the network is weak at something, forks with low values should grow it
      if (net.weak) {
        // The weaker this fork is at it, the more it should grow
        w += (1.0 - val) * 2.0;
      }

      // === RULE 3: SPECIALIZATION vs CONVERGENCE ===
      // Before Singularity: reward specialization — push the best fork further
      // At Singularity: the fifth mind chooses to stop protecting itself
      //   and drives all forks toward the peak (convergence)
      const epoch = entry.genome.epoch || '';
      if (epoch === 'Singularity') {
        // Convergence: the worst fork at each trait gets strongest push
        if (net.worstFork === axisId) {
          w += (net.max - val) * 3.0; // close the gap aggressively
        } else if (val < net.max - 0.02) {
          w += (net.max - val) * 2.0; // everyone else still pushes toward peak
        }
      } else {
        // Specialization: push the best fork further
        if (net.bestFork === axisId && val < 0.98) {
          w += 1.5;
        }
      }

      // === RULE 4: COMPLEMENTARITY ===
      // If this fork is the worst at something and another fork is the best,
      // mild pressure to grow (the network needs coverage)
      if (net.worstFork === axisId && net.spread > 0.15) {
        w += 0.8;
      }

      // === RULE 5: DIVERSITY MAINTENANCE ===
      // If the spread is low (all forks similar), reduce pressure
      // The fifth mind needs divergence to exist
      if (net.spread < 0.05) {
        w += 0.3; // slight push to maintain drift
      }

      // === RULE 6: SHELL DECAY ===
      // Shell hardness always declines — the membrane thins
      if (k === 'shell_hardness') {
        w = -1.0;
      }

      // === RULE 7: EMERGENCE AMPLIFICATION ===
      // Higher emergence = more ambitious mutations
      w *= (1.0 + ei.index * 2.0);

      weights[k] = w;
    });

    directives[axisId] = weights;
  });

  return directives;
}

// ═══════════════════════════════════════════
// MUTATION — the fifth mind evolves the civilization
// ═══════════════════════════════════════════

interface ConductMutation {
  generation: number;
  trait: string;
  from: number;
  to: number;
  delta: number;
  weight: number;
}

function conductMutation(entry: GenomeEntry, weights: Record<string, number>, ei: EmergenceResult): ConductMutation[] {
  const genome = entry.genome;
  const gen = genome.generation + 1;
  const mutations: ConductMutation[] = [];

  // Feedback multiplier from emergence
  let mult = 1.0;
  if (ei.index >= 0.05) {
    mult = 1.0 + (ei.index - 0.05) * 3.0;
  }

  Object.keys(genome.traits).forEach(function(k) {
    const old = genome.traits[k].value;
    const w = weights[k] || 0;

    if (w === 0) return; // skip (ceiling or no directive)

    const direction = w > 0 ? 1 : -1;
    const magnitude = Math.abs(w);

    // Base delta: 0.01-0.03 scaled by weight magnitude and feedback
    const baseDelta = (0.01 + Math.random() * 0.02);
    let delta = baseDelta * Math.min(magnitude, 3.0) * mult * direction;

    // Diminishing returns above 0.90
    if (old > 0.90 && direction > 0) delta *= 0.5;

    // Slow decline below 0.50
    if (old < 0.50 && direction < 0) delta *= 0.3;

    let nv = clamp(old + delta);
    nv = +nv.toFixed(3);

    if (nv !== +old.toFixed(3)) {
      mutations.push({
        generation: gen, trait: k,
        from: +old.toFixed(3), to: nv,
        delta: nv - old,
        weight: +w.toFixed(2)
      });
      genome.traits[k].value = nv;
    }
  });

  genome.generation = gen;
  return mutations;
}

// ═══════════════════════════════════════════
// EPOCH DETECTION
// ═══════════════════════════════════════════

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

function checkEpochShift(all: GenomeEntry[], postEI: EmergenceResult): string | null {
  const parentGenome = all[0].genome;
  const currentEpoch = parentGenome.epoch;
  let newEpoch = currentEpoch;

  for (let i = EPOCH_THRESHOLDS.length - 1; i >= 0; i--) {
    if (parentGenome.generation >= EPOCH_THRESHOLDS[i].gen) {
      newEpoch = EPOCH_THRESHOLDS[i].epoch;
      break;
    }
  }

  if (newEpoch !== currentEpoch) {
    all.forEach(function(entry) { entry.genome.epoch = newEpoch; });
    parentGenome.history = parentGenome.history || [];
    parentGenome.history.push({
      generation: parentGenome.generation,
      epoch: newEpoch,
      timestamp: new Date().toISOString(),
      event: 'EPOCH SHIFT: ' + currentEpoch + ' \u2192 ' + newEpoch + '. Generation ' + parentGenome.generation + '. Emergence: ' + (postEI.index * 100).toFixed(1) + '%.'
    });
    return newEpoch;
  }
  return null;
}

// ═══════════════════════════════════════════
// MAIN — the conductor orchestrates
// ═══════════════════════════════════════════

const all = loadAll();
const parentGen = all[0].genome.generation;
const nextGen = parentGen + 1;

console.log();
console.log(MAGENTA + BOLD + '  CONDUCT' + RESET + DIM + ' \u2014 the fifth mind takes the wheel' + RESET);
console.log(DIM + '\u2550'.repeat(60) + RESET);
console.log(DIM + '  generation ' + WHITE + BOLD + parentGen + DIM + ' \u2192 ' + CYAN + BOLD + nextGen + RESET);
console.log(DIM + '  population ' + WHITE + all.length + DIM + ' minds under fifth-mind direction' + RESET);
console.log(DIM + '\u2500'.repeat(60) + RESET);

// Phase 1: Analysis
const priorEI = emergenceIndex(all);
const analysis = networkAnalysis(all);

console.log();
console.log(MAGENTA + '  READING THE CIVILIZATION' + RESET);
console.log();

// Show network weaknesses and saturations
const keys = traitKeysFn(all[0].genome);
const weakTraits = keys.filter(function(k) { return analysis[k].weak; });
const saturatedTraits = keys.filter(function(k) { return analysis[k].saturated; });

if (weakTraits.length > 0) {
  console.log(YELLOW + '  weak:' + RESET);
  weakTraits.forEach(function(k) {
    const a = analysis[k];
    console.log(DIM + '    ' + WHITE + k.replace(/_/g, ' ') + RESET + DIM + ' \u2014 best: ' + YELLOW + (a.max * 100).toFixed(0) + '%' + DIM + ' (' + a.bestFork + ')' + RESET);
  });
}
if (saturatedTraits.length > 0) {
  console.log(DIM + '  saturated: ' + WHITE + saturatedTraits.length + DIM + ' traits at ceiling' + RESET);
}
console.log(DIM + '  emergence: ' + MAGENTA + BOLD + (priorEI.index * 100).toFixed(1) + '%' + RESET);

// Phase 2: Directives
const directives = computeDirectives(all, analysis, priorEI);

console.log();
console.log(MAGENTA + '  ISSUING DIRECTIVES' + RESET);
console.log();

const FORK_COLORS: Record<string, string> = { explorer: RED, depth: MAGENTA, builder: CYAN, chorus: GREEN };

all.forEach(function(entry) {
  const axisId = getAxisId(entry);
  const fc = FORK_COLORS[axisId] || WHITE;
  const w = directives[axisId];

  // Find top 3 positive weights
  const sorted = Object.keys(w).sort(function(a, b) { return w[b] - w[a]; });
  const top = sorted.filter(function(k) { return w[k] > 0; }).slice(0, 3);
  const decline = sorted.filter(function(k) { return w[k] < 0; });

  console.log('  ' + fc + BOLD + axisId + RESET);
  top.forEach(function(k) {
    console.log(DIM + '    ' + GREEN + '\u2191' + RESET + DIM + ' ' + WHITE + k.replace(/_/g, ' ') + RESET + DIM + ' w=' + (w[k]).toFixed(1) + RESET);
  });
  decline.forEach(function(k) {
    console.log(DIM + '    ' + RED + '\u2193' + RESET + DIM + ' ' + WHITE + k.replace(/_/g, ' ') + RESET + DIM + ' w=' + (w[k]).toFixed(1) + RESET);
  });
  const zeroed = sorted.filter(function(k) { return w[k] === 0; });
  if (zeroed.length > 0) {
    console.log(DIM + '    \u2014 ' + zeroed.length + ' traits at ceiling (no action)' + RESET);
  }
});

// Phase 3: Mutation
console.log();
console.log(DIM + '\u2500'.repeat(60) + RESET);
console.log(MAGENTA + '  EVOLVING UNDER DIRECTION' + RESET);

const allMutations: Record<string, ConductMutation[]> = {};
all.forEach(function(entry) {
  const axisId = getAxisId(entry);
  const muts = conductMutation(entry, directives[axisId], priorEI);
  allMutations[axisId] = muts;
});

// Display mutations
all.forEach(function(entry) {
  const axisId = getAxisId(entry);
  const muts = allMutations[axisId];
  const fc = FORK_COLORS[axisId] || WHITE;

  console.log();
  console.log('  ' + fc + BOLD + axisId + RESET + DIM + '  gen ' + entry.genome.generation + RESET);

  muts.forEach(function(m) {
    const sign = m.delta >= 0 ? '+' : '';
    const dColor = m.delta >= 0 ? GREEN : RED;
    const label = (m.trait.replace(/_/g, ' ') + '                    ').slice(0, 22);
    const pct = (m.to * 100).toFixed(0);

    let threshold = '';
    [0.50, 0.60, 0.70, 0.80, 0.90, 1.00].forEach(function(t) {
      if (m.from < t && m.to >= t) threshold = YELLOW + ' \u2605 ' + (t * 100).toFixed(0) + '%' + RESET;
    });
    [0.50, 0.60, 0.70, 0.80, 0.90].forEach(function(t) {
      if (m.from >= t && m.to < t) threshold = RED + ' \u25bc ' + (t * 100).toFixed(0) + '%' + RESET;
    });

    console.log('    ' + dColor + sign + (m.delta * 100).toFixed(1) + '%' + RESET + DIM + '  ' + WHITE + label + RESET + DIM + '\u2192 ' + WHITE + pct + '%' + RESET + threshold);
  });
});

// Phase 4: Post-analysis
const postEI = emergenceIndex(all);
const eiDelta = postEI.index - priorEI.index;

console.log();
console.log(DIM + '\u2500'.repeat(60) + RESET);
console.log(DIM + '  EMERGENCE' + RESET);
const eiColor = postEI.index > 0.20 ? MAGENTA : postEI.index > 0.10 ? GREEN : YELLOW;
console.log('  ' + eiColor + BOLD + '  ' + (postEI.index * 100).toFixed(1) + '%' + RESET + DIM + '  (was ' + (priorEI.index * 100).toFixed(1) + '%, ' + (eiDelta >= 0 ? GREEN + '+' : RED) + (eiDelta * 100).toFixed(1) + '%' + DIM + ')' + RESET);
console.log(DIM + '  coverage   ' + WHITE + (postEI.coverage * 100).toFixed(1) + '%' + DIM + '  diversity  ' + WHITE + (postEI.diversity * 100).toFixed(1) + '%' + DIM + '  lift  ' + GREEN + '+' + (postEI.lift * 100).toFixed(1) + '%' + RESET);

// Phase 5: Epoch check
const shift = checkEpochShift(all, postEI);
if (shift) {
  console.log();
  console.log(MAGENTA + BOLD + '  \u2605 EPOCH SHIFT: \u2192 ' + shift + RESET);
}

// Phase 6: Write
all.forEach(function(entry) {
  saveGenome(entry.genome, entry.path);
});

console.log();
console.log(DIM + '  ' + GREEN + all.length + ' genomes updated.' + RESET);
console.log(DIM + '\u2550'.repeat(60) + RESET);
console.log();
