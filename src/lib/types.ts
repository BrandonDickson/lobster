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
