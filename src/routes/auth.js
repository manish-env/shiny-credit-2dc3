import { isValidShop } from "../lib/validate.js"

export async function authRoute(req, env) {
  const shop = new URL(req.url).searchParams.get("shop")

  if (!isValidShop(shop)) {
    return new Response("Invalid shop", { status: 400 })
  }

  const redirectUri = `${env.APP_URL}/auth/callback`
  const scope = "read_products"

  const installUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${env.SHOPIFY_API_KEY}` +
    `&scope=${scope}` +
    `&redirect_uri=${redirectUri}`

  return Response.redirect(installUrl, 302)
}
