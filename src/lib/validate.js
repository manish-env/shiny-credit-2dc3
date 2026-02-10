export function isValidShop(shop) {
  return (
    typeof shop === "string" &&
    shop.endsWith(".myshopify.com") &&
    /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)
  )
}
