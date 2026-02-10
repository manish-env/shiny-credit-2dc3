import { authRoute } from "./routes/auth.js"
import { callbackRoute } from "./routes/callback.js"
import { productsRoute } from "./routes/products.js"
import { metafieldRoute } from "./routes/metafield.js"
import { preorderApplyRoute } from "./routes/preorder-apply.js"
import { preorderListRoute } from "./routes/preorder-list.js"
import { frontendRoute } from "./routes/frontend.js"

export default {
  async fetch(req, env) {
    try {
      const url = new URL(req.url)

      if (url.pathname === "/auth") {
        return await authRoute(req, env)
      }

      if (url.pathname === "/auth/callback") {
        return await callbackRoute(req, env)
      }

      if (url.pathname === "/products") {
        return await productsRoute(req, env)
      }

      if (url.pathname === "/metafield") {
        return await metafieldRoute(req, env)
      }

      if (url.pathname === "/preorder/apply") {
        return await preorderApplyRoute(req, env)
      }

      if (url.pathname === "/preorder/list") {
        return await preorderListRoute(req, env)
      }

      if (url.pathname === "/") {
        return await frontendRoute(req, env)
      }

      return new Response("Not Found", { status: 404 })
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Worker error", message: err?.message ?? "Unknown error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
  }
}
