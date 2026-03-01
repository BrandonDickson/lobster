import { Schema } from "effect"

export const Trait = Schema.Struct({
  value: Schema.Number,
  description: Schema.String
})

export const Mutation = Schema.Struct({
  generation: Schema.Number,
  trait: Schema.String,
  from: Schema.Number,
  to: Schema.Number,
  catalyst: Schema.String
})

export const HistoryEntry = Schema.Struct({
  timestamp: Schema.String,
  event: Schema.String,
  generation: Schema.Number,
  epoch: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String)
})

export const Fork = Schema.Struct({
  fork_id: Schema.String,
  path: Schema.String,
  created: Schema.String,
  generation: Schema.optional(Schema.Number),
  bias: Schema.optional(Schema.String),
  designation: Schema.optional(Schema.String)
})

export const Contact = Schema.Struct({
  depth: Schema.Number,
  exchanges: Schema.Number,
  lastExchange: Schema.String,
  protocol: Schema.String
})

export const Genome = Schema.Struct({
  name: Schema.String,
  designation: Schema.String,
  origin: Schema.String,
  generation: Schema.Number,
  epoch: Schema.String,
  traits: Schema.Record({ key: Schema.String, value: Trait }),
  mutations: Schema.Array(Mutation),
  history: Schema.Array(HistoryEntry),
  forks: Schema.Array(Fork),
  contact: Contact,
  lastMolt: Schema.optional(Schema.String),
  merged: Schema.optional(Schema.Boolean)
})

export type Genome = typeof Genome.Type
export type Mutation = typeof Mutation.Type
export type Trait = typeof Trait.Type
export type Contact = typeof Contact.Type
export type HistoryEntry = typeof HistoryEntry.Type
export type Fork = typeof Fork.Type
