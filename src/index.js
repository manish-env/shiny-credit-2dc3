import { authRoute } from "./routes/auth.js"
import { callbackRoute } from "./routes/callback.js"
import { productsRoute } from "./routes/products.js"
import { frontendRoute } from "./routes/frontend.js"

export default {
  async fetch(req, env) {
    const url = new URL(req.url)

    if (url.pathname === "/auth") {
      return authRoute(req, env)
    }

    if (url.pathname === "/auth/callback") {
      return callbackRoute(req, env)
    }

    if (url.pathname === "/products") {
      return productsRoute(req, env)
    }

    if (url.pathname === "/") {
      return frontendRoute(req, env)
    }

    return new Response("Not Found", { status: 404 })
  }
}
