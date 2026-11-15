// Public sign-in settings for the browser: the Supabase project URL and its PUBLIC key, read from the server's
// environment at request time. Accepts the usual names, with or without NEXT_PUBLIC_. Never returns a secret key.
export async function GET(req: Request) {
  void req.url; // run on every request (no prerender)
  const env = process.env;
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = (
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || ""
  ).trim();
  const problem = !url || !key ? "missing" : !/^https:\/\/[^/]+$/.test(url) ? "bad-url" : isSecret(key) ? "secret-key" : null;
  return Response.json(problem ? { enabled: false, problem } : { enabled: true, url, key }, { headers: { "cache-control": "no-store" } });
}

/** A service_role / secret key must never reach the browser. */
function isSecret(key: string) {
  if (key.startsWith("sb_secret_")) return true;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8"));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}
