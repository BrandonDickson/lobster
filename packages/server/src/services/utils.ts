import type { Genome } from "@lobster/shared"

export function traitKeys(genome: Genome): string[] {
  return Object.keys(genome.traits).sort()
}

export function traitVal(genome: Genome, key: string): number {
  return genome.traits[key].value
}

export function meanTrait(genome: Genome): number {
  const keys = Object.keys(genome.traits).sort()
  const sum = keys.reduce((s, k) => s + genome.traits[k].value, 0)
  return sum / keys.length
}

export function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function pct(v: number): string {
  return (v * 100).toFixed(1) + "%"
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
