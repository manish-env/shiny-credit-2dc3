export async function frontendRoute(req, env) {
  return env.ASSETS.fetch(req)
}
