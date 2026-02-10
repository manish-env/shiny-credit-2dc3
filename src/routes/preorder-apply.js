/**
 * POST /preorder/apply
 * Bulk set preorder metafields on variants by SKU.
 *
 * Body:
 * {
 *   shop: "store.myshopify.com",
 *   rows: [
 *     { sku, is_preorder, preorder_limit, preorder_message }
 *   ]
 * }
 *
 * Metafields (namespace "preorder"):
 * - is_preorder (boolean)
 * - preorder_limit (number_integer)
 * - preorder_message (single_line_text_field)
 */

import { isValidShop } from "../lib/validate.js"
import {
  fetchSkuToVariantIdMap,
  metafieldsSetBatch
} from "../lib/shopify.js"

const NAMESPACE = "preorder"

/* -----------------------------
 * Helpers
 * ----------------------------- */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  })
}

function normalizeBoolean(v) {
  const s = String(v ?? "").trim().toLowerCase()
  if (s === "" || s === "false" || s === "0" || s === "no") return "false"
  return "true"
}

function normalizeInt(v) {
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) && n >= 0 ? String(n) : "0"
}

/* -----------------------------
 * Route
 * ----------------------------- */

export async function preorderApplyRoute(req, env) {
  /* ---- CORS / Preflight ---- */
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  /* ---- Parse Body ---- */
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  /* ---- Shop Validation ---- */
  const shop =
    (body?.shop || new URL(req.url).searchParams.get("shop"))?.trim()

  if (!isValidShop(shop)) {
    return json(
      { error: "Missing or invalid shop parameter" },
      400
    )
  }

  /* ---- Token Check ---- */
  if (!env.TOKENS) {
    return json({ error: "Token store not available" }, 503)
  }

  const token = await env.TOKENS.get(shop)
  if (!token) {
    return json(
      { error: "App not installed for this shop" },
      401
    )
  }

  /* ---- Rows Validation ---- */
  const rows = Array.isArray(body?.rows) ? body.rows : []

  if (rows.length === 0) {
    return json({
      success: false,
      applied: 0,
      skipped: 0,
      errors: ["No rows provided"]
    })
  }

  /* ---- Core Logic ---- */
  try {
    const skuToVariantId =
      await fetchSkuToVariantIdMap(shop, token)

    const metafields = []

    for (const row of rows) {
      const sku =
        row?.sku != null ? String(row.sku).trim() : ""

      if (!sku) continue

      const variantId =
        skuToVariantId[sku.toLowerCase()]

      if (!variantId) continue

      const ownerId = variantId.startsWith("gid://")
        ? variantId
        : `gid://shopify/ProductVariant/${variantId}`

      metafields.push(
        {
          ownerId,
          namespace: NAMESPACE,
          key: "is_preorder",
          value: normalizeBoolean(row.is_preorder),
          type: "boolean"
        },
        {
          ownerId,
          namespace: NAMESPACE,
          key: "preorder_limit",
          value: normalizeInt(row.preorder_limit),
          type: "number_integer"
        },
        {
          ownerId,
          namespace: NAMESPACE,
          key: "preorder_message",
          value: String(row.preorder_message ?? "").slice(
            0,
            5000
          ),
          type: "single_line_text_field"
        }
      )
    }

    /* ---- Shopify Batch Limit: 25 ---- */
    const errors = []

    for (let i = 0; i < metafields.length; i += 25) {
      const batch = metafields.slice(i, i + 25)
      const result = await metafieldsSetBatch(
        shop,
        token,
        batch
      )

      const userErrors = result?.userErrors ?? []
      for (const e of userErrors) {
        errors.push({
          message: e.message,
          field: e.field
        })
      }
    }

    const applied = Math.floor(metafields.length / 3)
    const skipped = rows.length - applied

    return json({
      success: errors.length === 0,
      applied,
      skipped,
      totalRows: rows.length,
      storeVariantSkusCount:
        Object.keys(skuToVariantId).length,
      errors: errors.length ? errors : undefined
    })
  } catch (err) {
    return json(
      {
        error: "Failed to apply preorder data",
        details: err?.message || String(err)
      },
      502
    )
  }
}
