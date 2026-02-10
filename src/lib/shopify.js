export async function shopifyGraphQL(shop, token, query, variables = null) {
  const body = variables ? { query, variables } : { query }
  const res = await fetch(
    `https://${shop}/admin/api/2024-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token
      },
      body: JSON.stringify(body)
    }
  )

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Shopify API ${res.status}: ${text.slice(0, 200)}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error("Invalid JSON from Shopify API")
  }
}

const METAFIELDS_SET_MUTATION = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key value type }
      userErrors { field message code }
    }
  }
`

/**
 * Set a metafield on a resource (e.g. variant). ownerId is the GID (e.g. gid://shopify/ProductVariant/123).
 * @param {string} shop
 * @param {string} token
 * @param {{ ownerId: string, namespace: string, key: string, value: string, type: string }} input
 */
export async function metafieldsSet(shop, token, input) {
  const data = await shopifyGraphQL(shop, token, METAFIELDS_SET_MUTATION, {
    metafields: [input]
  })
  return data?.data?.metafieldsSet ?? data
}

/** Set up to 25 metafields in one call. */
export async function metafieldsSetBatch(shop, token, inputs) {
  if (inputs.length === 0) return { metafields: [], userErrors: [] }
  const data = await shopifyGraphQL(shop, token, METAFIELDS_SET_MUTATION, {
    metafields: inputs.slice(0, 25)
  })
  return data?.data?.metafieldsSet ?? { metafields: [], userErrors: [] }
}

const PRODUCT_VARIANTS_QUERY = `
  query ProductVariantsPage($cursor: String) {
    productVariants(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          sku
        }
      }
    }
  }
`

/** Build a map of variant SKU (lowercase) -> variant GID. Uses productVariants query so all variants with SKU are found. */
export async function fetchSkuToVariantIdMap(shop, token) {
  const map = /** @type {Record<string, string>} */ ({})
  let cursor = null
  do {
    const data = await shopifyGraphQL(shop, token, PRODUCT_VARIANTS_QUERY, { cursor })
    if (data?.errors?.length) {
      const msg = data.errors.map((e) => e.message).join("; ")
      throw new Error("GraphQL: " + msg)
    }
    const connection = data?.data?.productVariants
    if (!connection) break
    for (const { node: v } of connection.edges ?? []) {
      if (v?.sku != null && String(v.sku).trim() !== "") {
        const key = String(v.sku).trim().toLowerCase()
        map[key] = v.id
      }
    }
    const pageInfo = connection.pageInfo
    if (!pageInfo?.hasNextPage) break
    cursor = pageInfo.endCursor
  } while (true)
  return map
}

const PREORDER_VARIANTS_QUERY = `
  query PreorderVariantsPage($cursor: String) {
    productVariants(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          sku
          product { title }
          metafields(first: 10, namespace: "preorder") {
            edges { node { key value } }
          }
        }
      }
    }
  }
`

/** Returns list of { sku, productTitle, preorderLimit, preorderMessage } for variants where is_preorder is true. */
export async function fetchPreorderList(shop, token) {
  const rows = []
  let cursor = null
  do {
    const data = await shopifyGraphQL(shop, token, PREORDER_VARIANTS_QUERY, { cursor })
    if (data?.errors?.length) {
      const msg = data.errors.map((e) => e.message).join("; ")
      throw new Error("GraphQL: " + msg)
    }
    const connection = data?.data?.productVariants
    if (!connection) break
    for (const { node: v } of connection.edges ?? []) {
      const metaList = v.metafields?.edges ?? []
      const meta = {}
      for (const { node: m } of metaList) {
        if (m?.key) meta[m.key] = m.value ?? ""
      }
      if (meta.is_preorder !== "true") continue
      rows.push({
        sku: v.sku ?? "",
        productTitle: v.product?.title ?? "",
        preorderLimit: meta.preorder_limit ?? "0",
        preorderMessage: meta.preorder_message ?? ""
      })
    }
    const pageInfo = connection.pageInfo
    if (!pageInfo?.hasNextPage) break
    cursor = pageInfo.endCursor
  } while (true)
  return rows
}
