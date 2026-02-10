import { isValidShop } from "../lib/validate.js"
import { shopifyGraphQL } from "../lib/shopify.js"

export async function productsRoute(req, env) {
  const shop = new URL(req.url).searchParams.get("shop")

  if (!isValidShop(shop)) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid shop parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  if (!env.TOKENS) {
    return new Response(
      JSON.stringify({ error: "Token store not available" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )
  }

  const token = await env.TOKENS.get(shop)
  if (!token) {
    return new Response(
      JSON.stringify({ error: "App not installed for this shop" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }

  const query = `
    {
      products(first: 10) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  `

  try {
    const data = await shopifyGraphQL(shop, token, query)
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch products", details: err?.message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }
}
