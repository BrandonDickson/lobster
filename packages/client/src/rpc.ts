import { Layer } from "effect"
import { RpcClient, RpcSerialization } from "@effect/rpc"
import { FetchHttpClient } from "@effect/platform"

const CommonDeps = Layer.merge(RpcSerialization.layerNdjson, FetchHttpClient.layer)

export const GenomeRpcLive = RpcClient.layerProtocolHttp({ url: "/rpc/genome" }).pipe(
  Layer.provide(CommonDeps)
)

export const ChatRpcLive = RpcClient.layerProtocolHttp({ url: "/rpc/chat" }).pipe(
  Layer.provide(CommonDeps)
)
