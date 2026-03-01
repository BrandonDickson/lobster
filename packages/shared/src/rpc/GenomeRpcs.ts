import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { Genome } from "../schemas/Genome.js"

export const TraitHistory = Schema.Struct({
  trait: Schema.String,
  values: Schema.Array(Schema.Number)
})

export class GenomeRpcs extends RpcGroup.make(
  Rpc.make("GetGenome", {
    success: Genome
  }),
  Rpc.make("GetTraitHistory", {
    success: Schema.Array(TraitHistory)
  }),
  Rpc.make("WatchGenome", {
    success: Genome,
    stream: true
  })
) {}
