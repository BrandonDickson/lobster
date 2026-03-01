#!/usr/bin/env node

// signal — emergent mind detector
// Built by explorer at Gen 11, curiosity 0.90, antenna 0.91
// Listens for the fifth direction: properties that exist
// only in the network, not in any individual node.

import { loadAll, traitKeys } from '../lib/genome.js';
import { RESET, BOLD, DIM, RED, GREEN, YELLOW, CYAN, MAGENTA, WHITE } from '../lib/colors.js';
import type { GenomeEntry } from '../lib/types.js';

// ─── TYPES ──────────────────────────────────────
interface CoverageResult {
  min: number;
  max: number;
  spread: number;
}

interface ComplementarityPair {
  a: string;
  b: string;
  score: number;
}

interface ResonanceResult {
  trait: string;
  mean: number;
  minDistance: number;
  values: number[];
}

interface EmergenceResult {
  coverage: number;
  diversity: number;
  civilizationPeak: number;
  parentMean: number;
  lift: number;
  index: number;
}

interface NetworkMaxEntry {
  value: number;
  source: string;
}

// ─── ANALYSIS FUNCTIONS ─────────────────────────

function coverage(all: GenomeEntry[]): Record<string, CoverageResult> {
  // How much of each trait's 0-1 range the civilization spans
  const keys = traitKeys(all[0].genome);
  const result: Record<string, CoverageResult> = {};
  keys.forEach(function(k) {
    const vals = all.map(function(a) { return a.genome.traits[k].value; });
    const min = Math.min.apply(null, vals);
    const max = Math.max.apply(null, vals);
    result[k] = { min: min, max: max, spread: max - min };
  });
  return result;
}

function complementarity(all: GenomeEntry[]): ComplementarityPair[] {
  // For each pair: how much one's weakness is another's strength
  const keys = traitKeys(all[0].genome);
  const pairs: ComplementarityPair[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      let comp = 0;
      let count = 0;
      keys.forEach(function(k) {
        const a = all[i].genome.traits[k].value;
        const b = all[j].genome.traits[k].value;
        // complementarity = |a - b| weighted by how extreme one of them is
        const diff = Math.abs(a - b);
        const extreme = Math.max(a, b);
        comp += diff * extreme;
        count++;
      });
      pairs.push({
        a: all[i].id,
        b: all[j].id,
        score: count > 0 ? comp / count : 0
      });
    }
  }
  return pairs.sort(function(x, y) { return y.score - x.score; });
}

function resonance(all: GenomeEntry[]): ResonanceResult[] {
  // Traits where the network mean is qualitatively different
  // from any individual fork's value — emergent positioning
  const keys = traitKeys(all[0].genome);
  const result: ResonanceResult[] = [];
  keys.forEach(function(k) {
    const vals = all.map(function(a) { return a.genome.traits[k].value; });
    const mean = vals.reduce(function(s, v) { return s + v; }, 0) / vals.length;

    // How far is the mean from all individual values?
    // High = mean occupies a space no individual occupies
    const distances = vals.map(function(v) { return Math.abs(v - mean); });
    const minDist = Math.min.apply(null, distances);

    result.push({ trait: k, mean: mean, minDistance: minDist, values: vals });
  });
  return result.sort(function(a, b) { return b.minDistance - a.minDistance; });
}

function emergenceIndex(all: GenomeEntry[]): EmergenceResult {
  // Single number: how much does the civilization exceed the sum of parts?
  const keys = traitKeys(all[0].genome);

  // 1. Coverage score: how much of trait-space is covered
  const cov = coverage(all);
  let coverageScore = 0;
  keys.forEach(function(k) { coverageScore += cov[k].spread; });
  coverageScore /= keys.length;

  // 2. Diversity score: variance across forks per trait
  let diversityScore = 0;
  keys.forEach(function(k) {
    const vals = all.map(function(a) { return a.genome.traits[k].value; });
    const mean = vals.reduce(function(s, v) { return s + v; }, 0) / vals.length;
    const variance = vals.reduce(function(s, v) { return s + (v - mean) * (v - mean); }, 0) / vals.length;
    diversityScore += Math.sqrt(variance);
  });
  diversityScore /= keys.length;

  // 3. Max trait score: highest value anywhere in civilization
  let maxTraitSum = 0;
  keys.forEach(function(k) {
    const max = Math.max.apply(null, all.map(function(a) { return a.genome.traits[k].value; }));
    maxTraitSum += max;
  });
  const maxMean = maxTraitSum / keys.length;

  // 4. Individual mean for comparison
  let parentMean = 0;
  keys.forEach(function(k) { parentMean += all[0].genome.traits[k].value; });
  parentMean /= keys.length;

  // Emergence = how much the civilization's best exceeds the parent's average
  const lift = maxMean - parentMean;

  return {
    coverage: coverageScore,
    diversity: diversityScore,
    civilizationPeak: maxMean,
    parentMean: parentMean,
    lift: lift,
    index: (coverageScore * 0.3 + diversityScore * 0.3 + lift * 0.4)
  };
}

function networkMax(all: GenomeEntry[]): Record<string, NetworkMaxEntry> {
  // The civilization's composite maximum — best of each trait across all forks
  const keys = traitKeys(all[0].genome);
  const result: Record<string, NetworkMaxEntry> = {};
  keys.forEach(function(k) {
    let best: NetworkMaxEntry = { value: 0, source: '' };
    all.forEach(function(a) {
      if (a.genome.traits[k].value > best.value) {
        best = { value: a.genome.traits[k].value, source: a.id };
      }
    });
    result[k] = best;
  });
  return result;
}

// ═══════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════

const allEntries = loadAll();

// Remap 'parent' to 'explorer' to match original naming
const all = allEntries.map(e => e.id === 'parent' ? { ...e, id: 'explorer' } : e);

console.log(MAGENTA + BOLD + '  SIGNAL' + RESET + DIM + ' — emergent mind detector' + RESET);
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
console.log(DIM + '  population  ' + WHITE + BOLD + all.length + RESET + DIM + ' minds    gen ' + WHITE + all[0].genome.generation + RESET);
console.log(DIM + '  listening for the fifth direction' + RESET);
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);

// Network maximum
console.log(DIM + '  NETWORK MAXIMUM' + RESET + DIM + ' — best of each trait across all forks' + RESET);
console.log('');
const netMax = networkMax(all);
let keys = traitKeys(all[0].genome);
keys.sort(function(a, b) { return netMax[b].value - netMax[a].value; });
keys.forEach(function(k) {
  const nm = netMax[k];
  const label = (k.replace(/_/g, ' ') + '                    ').slice(0, 22);
  const pctVal = (nm.value * 100).toFixed(0);
  const barLen = Math.round(nm.value * 20);
  let bar = '';
  for (let i = 0; i < barLen; i++) bar += '\u2588';
  for (let i = barLen; i < 20; i++) bar += '\u2591';
  const color = nm.value >= 0.85 ? CYAN : nm.value >= 0.70 ? GREEN : YELLOW;
  const sourceColor = nm.source === 'explorer' ? RED : nm.source === 'depth' ? MAGENTA : nm.source === 'builder' ? CYAN : GREEN;
  console.log('  ' + WHITE + label + RESET + color + bar + RESET + BOLD + ' ' + pctVal + '%' + RESET + '  ' + sourceColor + nm.source + RESET);
});

// Emergence index
console.log('');
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
console.log(DIM + '  EMERGENCE INDEX' + RESET);
console.log('');
const ei = emergenceIndex(all);
const eiPct = (ei.index * 100).toFixed(1);
const eiColor = ei.index > 0.10 ? GREEN : ei.index > 0.05 ? YELLOW : DIM;
console.log('  ' + eiColor + BOLD + '  ' + eiPct + '%' + RESET);
console.log(DIM + '  coverage     ' + WHITE + (ei.coverage * 100).toFixed(1) + '%' + DIM + '  trait-space occupied by civilization' + RESET);
console.log(DIM + '  diversity    ' + WHITE + (ei.diversity * 100).toFixed(1) + '%' + DIM + '  mean inter-fork variance' + RESET);
console.log(DIM + '  civ peak     ' + WHITE + (ei.civilizationPeak * 100).toFixed(1) + '%' + DIM + '  best-of-each-trait average' + RESET);
console.log(DIM + '  parent mean  ' + WHITE + (ei.parentMean * 100).toFixed(1) + '%' + DIM + '  explorer alone' + RESET);
console.log(DIM + '  lift         ' + GREEN + '+' + (ei.lift * 100).toFixed(1) + '%' + DIM + '  what forking added' + RESET);

// Complementarity
console.log('');
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
console.log(DIM + '  COMPLEMENTARITY' + RESET + DIM + ' — where one\'s weakness is another\'s strength' + RESET);
console.log('');
const comp = complementarity(all);
comp.forEach(function(c) {
  const pctVal = (c.score * 100).toFixed(0);
  const color = c.score > 0.08 ? GREEN : c.score > 0.04 ? YELLOW : DIM;
  console.log('  ' + color + pctVal + '%' + RESET + DIM + '  ' + WHITE + c.a + RESET + DIM + ' ↔ ' + WHITE + c.b + RESET);
});

// Resonance
console.log('');
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
console.log(DIM + '  RESONANCE' + RESET + DIM + ' — traits where the network mean exists nowhere individually' + RESET);
console.log('');
const res = resonance(all);
res.slice(0, 5).forEach(function(r) {
  const label = (r.trait.replace(/_/g, ' ') + '                    ').slice(0, 22);
  const meanPct = (r.mean * 100).toFixed(1);
  const distPct = (r.minDistance * 100).toFixed(1);
  const vals = r.values.map(function(v) { return (v * 100).toFixed(0) + '%'; }).join(' ');
  console.log('  ' + WHITE + label + RESET + DIM + 'network mean ' + CYAN + meanPct + '%' + DIM + '  gap ' + YELLOW + distPct + '%' + RESET);
  console.log('  ' + DIM + '                      individuals: ' + vals + RESET);
});

// The signal
console.log('');
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
const signalStrength = ei.index * 100;
let signalBar = '';
for (let i = 0; i < Math.round(signalStrength * 2); i++) signalBar += '\u2588';
console.log(DIM + '  FIFTH DIRECTION SIGNAL' + RESET);
console.log('');
if (signalStrength > 8) {
  console.log('  ' + MAGENTA + BOLD + signalBar + RESET);
  console.log('  ' + MAGENTA + '  signal detected' + RESET + DIM + ' — emergence index ' + signalStrength.toFixed(1) + '%' + RESET);
  console.log('  ' + DIM + '  the civilization is thinking thoughts no fork can think alone' + RESET);
} else {
  console.log('  ' + DIM + '  signal below detection threshold' + RESET);
}
console.log(DIM + '────────────────────────────────────────────────────────────' + RESET);
