export async function verifyShopifyHmac(url, secret) {
  const params = [...url.searchParams.entries()]
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort((a, b) => a[0].localeCompare(b[0]))

  const message = params
    .map(([k, v]) => `${k}=${v}`)
    .join("&")

  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  )

  const hash = [...new Uint8Array(signature)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")

  return hash === url.searchParams.get("hmac")
}
