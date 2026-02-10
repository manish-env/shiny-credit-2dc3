import { verifyShopifyHmac } from "../lib/hmac.js"
import { isValidShop } from "../lib/validate.js"

export async function callbackRoute(req, env) {
  const url = new URL(req.url)

  const valid = await verifyShopifyHmac(
    url,
    env.SHOPIFY_API_SECRET
  )

  if (!valid) {
    return new Response("Invalid HMAC", { status: 401 })
  }

  const shop = url.searchParams.get("shop")
  const code = url.searchParams.get("code")

  if (!isValidShop(shop) || !code) {
    return new Response("Missing params", { status: 400 })
  }

  const tokenRes = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.SHOPIFY_API_KEY,
        client_secret: env.SHOPIFY_API_SECRET,
        code
      })
    }
  )

  const { access_token } = await tokenRes.json()
  await env.TOKENS.put(shop, access_token)

  return Response.redirect(
    `${env.APP_URL}?shop=${shop}`,
    302
  )
}
