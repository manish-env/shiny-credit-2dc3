/**
 * GET /preorder/list — list variants that have preorder enabled (is_preorder = true).
 * Returns { rows: [ { sku, productTitle, preorderLimit, preorderMessage } ] }
 */

import { isValidShop } from "../lib/validate.js"
import { fetchPreorderList } from "../lib/shopify.js"

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

export async function preorderListRoute(req, env) {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405)
  }

  const shop = new URL(req.url).searchParams.get("shop")
  if (!isValidShop(shop)) {
    return json({ error: "Missing or invalid shop parameter" }, 400)
  }

  if (!env.TOKENS) {
    return json({ error: "Token store not available" }, 503)
  }

  const token = await env.TOKENS.get(shop)
  if (!token) {
    return json({ error: "App not installed for this shop" }, 401)
  }

  try {
    const rows = await fetchPreorderList(shop, token)
    return json({ rows })
  } catch (err) {
    return json(
      { error: "Failed to load preorder list", details: err?.message },
      502
    )
  }
}
