import { Layer } from "effect"
import { RpcClient, RpcSerialization } from "@effect/rpc"
import { FetchHttpClient } from "@effect/platform"

// layerProtocolHttp requires RpcSerialization + HttpClient as input
// Provide those via layerNdjson and FetchHttpClient.layer
export const RpcLive = RpcClient.layerProtocolHttp({ url: "/rpc" }).pipe(
  Layer.provide(RpcSerialization.layerNdjson),
  Layer.provide(FetchHttpClient.layer)
)
