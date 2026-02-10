export async function shopifyGraphQL(shop, token, query) {
  const res = await fetch(
    `https://${shop}/admin/api/2024-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token
      },
      body: JSON.stringify({ query })
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
