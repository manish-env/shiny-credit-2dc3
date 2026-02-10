export function isValidShop(shop) {
  return (
    shop != null &&
    typeof shop === "string" &&
    shop.endsWith(".myshopify.com") &&
    /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)
  )
}
