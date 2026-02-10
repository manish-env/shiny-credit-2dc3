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

const PRODUCTS_VARIANTS_QUERY = `
  query ProductsVariants($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          variants(first: 100) {
            edges {
              node {
                id
                sku
              }
            }
          }
        }
      }
    }
  }
`

/** Build a map of variant SKU -> variant GID (paginates until all products are fetched). */
export async function fetchSkuToVariantIdMap(shop, token) {
  const map = /** @type {Record<string, string>} */ ({})
  let cursor = null
  do {
    const data = await shopifyGraphQL(shop, token, PRODUCTS_VARIANTS_QUERY, { cursor })
    const products = data?.data?.products
    if (!products) break
    for (const { node: product } of products.edges ?? []) {
      for (const { node: v } of product.variants?.edges ?? []) {
        if (v.sku != null && v.sku !== "") {
          map[v.sku] = v.id
        }
      }
    }
    const pageInfo = products.pageInfo
    if (!pageInfo?.hasNextPage) break
    cursor = pageInfo.endCursor
  } while (true)
  return map
}
