/**
 * POST /preorder/apply — bulk set preorder metafields on variants by SKU.
 * Body: { shop, rows: [ { sku, is_preorder, preorder_limit, preorder_message } ] }
 * Metafields (namespace "preorder"): is_preorder (boolean), preorder_limit (number_integer), preorder_message (single_line_text_field).
 */

import { isValidShop } from "../lib/validate.js"
import { fetchSkuToVariantIdMap, metafieldsSetBatch } from "../lib/shopify.js"

const NAMESPACE = "preorder"

function json(res, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

function normalizeBoolean(v) {
  if (v === true || v === "true" || v === "1" || String(v).toLowerCase() === "yes") return "true"
  return "false"
}

function normalizeInt(v) {
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) && n >= 0 ? String(n) : "0"
}

export async function preorderApplyRoute(req, env) {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const shop = (body?.shop || new URL(req.url).searchParams.get("shop"))?.trim()
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

  const rows = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) {
    return json({ error: "No rows provided", applied: 0, skipped: 0, errors: [] })
  }

  try {
    const skuToVariantId = await fetchSkuToVariantIdMap(shop, token)
    const metafields = []

    for (const row of rows) {
      const sku = row?.sku != null ? String(row.sku).trim() : ""
      if (!sku) continue
      const variantId = skuToVariantId[sku]
      if (!variantId) continue

      const ownerId = variantId.startsWith("gid://") ? variantId : `gid://shopify/ProductVariant/${variantId}`

      metafields.push(
        { ownerId, namespace: NAMESPACE, key: "is_preorder", value: normalizeBoolean(row.is_preorder), type: "boolean" },
        { ownerId, namespace: NAMESPACE, key: "preorder_limit", value: normalizeInt(row.preorder_limit), type: "number_integer" },
        { ownerId, namespace: NAMESPACE, key: "preorder_message", value: String(row.preorder_message ?? "").slice(0, 5000), type: "single_line_text_field" }
      )
    }

    const errors = []
    for (let i = 0; i < metafields.length; i += 25) {
      const batch = metafields.slice(i, i + 25)
      const result = await metafieldsSetBatch(shop, token, batch)
      const userErrors = result?.userErrors ?? []
      for (const e of userErrors) {
        errors.push({ message: e.message, field: e.field })
      }
    }

    const applied = Math.floor(metafields.length / 3)
    const skipped = rows.length - applied

    return json({
      success: errors.length === 0,
      applied,
      skipped,
      totalRows: rows.length,
      errors: errors.length ? errors : undefined
    })
  } catch (err) {
    return json(
      { error: "Failed to apply preorder data", details: err?.message },
      502
    )
  }
}
