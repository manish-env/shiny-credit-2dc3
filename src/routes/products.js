import { isValidShop } from "../lib/validate.js"
import { shopifyGraphQL } from "../lib/shopify.js"

export async function productsRoute(req, env) {
  const shop = new URL(req.url).searchParams.get("shop")

  if (!isValidShop(shop)) {
    return new Response("Invalid shop", { status: 400 })
  }

  const token = await env.TOKENS.get(shop)
  if (!token) {
    return new Response("App not installed", { status: 401 })
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

  const data = await shopifyGraphQL(shop, token, query)

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  })
}
