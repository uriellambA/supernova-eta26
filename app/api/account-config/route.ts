// Public sign-in settings for the browser: the Supabase project URL and its PUBLIC key, read from the server's
// environment at request time. Accepts any variable name that mentions SUPABASE (with or without NEXT_PUBLIC_).
// Never returns a secret key. When something is missing it lists the variable NAMES it saw (never their values).
export async function GET(req: Request) {
  void req.url; // run on every request (no prerender)
  const names = Object.keys(process.env).filter((k) => /SUPABASE/i.test(k)).sort();
  const val = (k: string) => (process.env[k] ?? "").trim();
  const secretName = (k: string) => /SERVICE|SECRET|JWT|PASSWORD|DB_|DATABASE|POSTGRES/i.test(k);
  const urlName = names.find((k) => /URL/i.test(k) && !secretName(k) && /^https:\/\//.test(val(k)));
  const keyName =
    names.find((k) => /ANON|PUBLISHABLE/i.test(k) && !secretName(k) && val(k)) ??
    names.find((k) => /KEY/i.test(k) && !secretName(k) && val(k) && !isSecret(val(k)));
  const url = urlName ? val(urlName).replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "") : "";
  const key = keyName ? val(keyName) : "";
  const problem = !url ? "missing-url" : !key ? "missing-key" : isSecret(key) ? "secret-key" : null;
  const body = problem ? { enabled: false, problem, seen: names } : { enabled: true, url, key };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
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
