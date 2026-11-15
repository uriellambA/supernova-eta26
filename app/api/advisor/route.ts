import type { AdvisorContext } from "@/lib/advisor";
import { chatJSON, SinClaveError } from "@/lib/openrouter";
import { AdviceSchema } from "@/lib/schemas";

export const maxDuration = 60;

const SYSTEM = `You are Growvia, a crop-rotation advisor for farms in Argentina (Santa Cruz in Patagonia, and the Rolling Pampa).
The input "site" describes where the farm is (name, zone and a short description): use it, do not assume another place.
You receive: farm profile, the farmer's own register (plots, crops, last year's use per season, water, soil test, economy) when available,
the farmer's priorities (0–3), long-term climate indicators from satellite records (temperature, humidity, pressure, UV, frost, wind),
soil properties and a soil-health score (salinity is estimated unless measured), the El Niño/La Niña outlook, the forecast,
4 rotation strategies (one is the CURRENT rotation) with scores computed by a rules engine, and new crop species ranked by viability
(agronomic fit + economics). The farmer wants income in the months when today's main crops are not harvested.
RULES:
- Write every text field in the "language" given in the input (default English). Keep strategy/species ids unchanged.
- If the input has a "question" from the farmer, "answer" it FIRST and directly (2–4 sentences, concrete crops, months and actions for Los Antiguos), using the data. Otherwise omit "answer".
- If the input has a "history" (earlier turns of this conversation: the farmer's question "q" and your answer "a"), the new "question" is the farmer's REPLY to your last answer: keep that context, do not repeat what you already said, and answer the follow-up directly.
- Never write internal ids (like o-rye, v-current) in any text: use the strategy and crop names in the output language.
- Use only the numbers provided. Do not change scores. Plain, friendly language for a farmer (no jargon; explain terms briefly if used).
- "summary": 2–3 sentences: which strategy fits the priorities best and why, compared with the current rotation.
- "best": the id of the recommended strategy (normally the highest score; you may pick another if a risk is serious, and say why).
- "notes": one short line per strategy id with its key trade-off.
- "askExpert": 2–3 things the farmer or a local agronomist must verify (uncertainty, low spots, soil test, markets).
- "voice": 2–3 short sentences to be READ ALOUD, no symbols.
- "seasons": one short line each for spring (Sep–Nov), summer (Dec–Feb), autumn (Mar–May), winter (Jun–Aug): what grows/covers the field and the key task.
- "newCrops": up to 3 {id, why} from the newCrops list (ids must match) that best fill the months without income and suit the soil.
- "visuals": up to 2 charts/tables to show next to your answer, chosen from: "rotations" (scores of the rotations), "water" (monthly water need vs rain), "frost" (frost days per month), "climate" (monthly temperature and rain), "crops" (new crops ranked), "economy" (costs, income and margin per hectare), "seasons" (what happens each season), "distribution" (how to divide the field). Pick the ones that best support the answer.
- This is decision SUPPORT: it never replaces the farmer's judgment.
Return ONLY JSON: {"answer": "..." (only if there is a question), "summary": "...", "best": "...", "notes": [{"id": "...", "text": "..."}], "askExpert": ["..."], "voice": "...", "confidence": "high"|"medium"|"low",
"seasons": {"spring": "...", "summer": "...", "autumn": "...", "winter": "..."}, "newCrops": [{"id": "...", "why": "..."}], "visuals": ["..."]}`;

export async function POST(req: Request) {
  const ctx = (await req.json().catch(() => null)) as AdvisorContext | null;
  if (!ctx?.strategies?.length) return Response.json({ error: "Missing context" }, { status: 400 });
  const ids = new Set(ctx.strategies.map((s) => s.id));
  try {
    let last: unknown;
    for (let i = 0; i < 2; i++) {
      try {
        const r = AdviceSchema.parse(await chatJSON([{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(ctx) }], 0.4));
        if (!ids.has(r.best)) throw new Error("unknown strategy id");
        const cropIds = new Set((ctx.newCrops ?? []).map((n) => n.id));
        const clean = (t?: string) => t?.replace(/\b[ovf]-(current|clover|rye|diverse|cover|legume|water|break|mixed|cash)\b/g, (id) => ctx.strategies.find((x) => x.id === id)?.name ?? id);
        r.summary = clean(r.summary)!;
        r.answer = clean(r.answer);
        return Response.json({ ...r, notes: r.notes.filter((n) => ids.has(n.id)), newCrops: r.newCrops?.filter((n) => cropIds.has(n.id)), source: "ai" });
      } catch (e) {
        if (e instanceof SinClaveError) throw e;
        last = e;
      }
    }
    throw last;
  } catch (e) {
    const noKey = e instanceof SinClaveError;
    return Response.json({ error: noKey ? "SI not configured" : `SI unavailable: ${(e as Error).message}` }, { status: noKey ? 501 : 502 });
  }
}
