/**
 * POST /metafield — set a metafield on a product variant.
 * Body: { shop, variantId, namespace, key, value, type }
 */

import { isValidShop } from "../lib/validate.js"
import { metafieldsSet } from "../lib/shopify.js"

const ALLOWED_TYPES = [
  "single_line_text_field",
  "multi_line_text_field",
  "number_integer",
  "number_decimal",
  "boolean",
  "date",
  "date_time",
  "json"
]

function json(res, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

export async function metafieldRoute(req, env) {
  if (req.method !== "POST") {
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

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const { variantId, namespace, key, value, type } = body ?? {}
  if (!variantId || !namespace || !key || typeof value !== "string") {
    return json({
      error: "Missing required fields: variantId, namespace, key, value"
    }, 400)
  }

  const metafieldType = (type && ALLOWED_TYPES.includes(type))
    ? type
    : "single_line_text_field"

  // Ensure variantId is a GID
  const ownerId = variantId.startsWith("gid://")
    ? variantId
    : `gid://shopify/ProductVariant/${variantId}`

  try {
    const result = await metafieldsSet(shop, token, {
      ownerId,
      namespace: String(namespace).trim(),
      key: String(key).trim(),
      value: String(value),
      type: metafieldType
    })

    const userErrors = result?.userErrors ?? []
    if (userErrors.length > 0) {
      return json({
        error: "Metafield validation failed",
        userErrors
      }, 400)
    }

    return json({ success: true, metafields: result?.metafields ?? [] })
  } catch (err) {
    return json(
      { error: "Failed to set metafield", details: err?.message },
      502
    )
  }
}
