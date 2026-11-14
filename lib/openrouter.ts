import { APP_NAME } from "@/config/app";

export class SinClaveError extends Error {
  constructor() {
    super("Falta OPENROUTER_API_KEY");
  }
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

/** Llama a OpenRouter pidiendo JSON. Usa el modelo principal y uno de respaldo. */
export async function chatJSON(messages: Msg[], temperature = 0.3): Promise<unknown> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new SinClaveError();
  const principal = process.env.OPENROUTER_MODEL || "openrouter/auto";
  const respaldo = process.env.OPENROUTER_FALLBACK_MODEL;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://vercel.app",
      "X-Title": APP_NAME,
    },
    body: JSON.stringify({
      model: principal,
      ...(respaldo ? { models: [principal, respaldo] } : {}),
      messages,
      temperature,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const txt: string = j?.choices?.[0]?.message?.content ?? "";
  const limpio = txt.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const ini = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  return JSON.parse(ini >= 0 ? limpio.slice(ini, fin + 1) : limpio);
}
