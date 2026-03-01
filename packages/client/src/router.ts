import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router"
import { Root } from "./routes/__root.js"
import { Index } from "./routes/index.js"

const rootRoute = createRootRoute({ component: Root })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Index })

const routeTree = rootRoute.addChildren([indexRoute])
export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
