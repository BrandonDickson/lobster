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
