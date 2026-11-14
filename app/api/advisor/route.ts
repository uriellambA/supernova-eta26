import type { AdvisorContext } from "@/lib/advisor";
import { chatJSON, SinClaveError } from "@/lib/openrouter";
import { AdviceSchema } from "@/lib/schemas";

export const maxDuration = 60;

const SYSTEM = `You are Growvia, a crop-rotation advisor for small farms in Los Antiguos (Santa Cruz, Patagonia, Argentina):
a cold, windy, dry valley on Lake Buenos Aires, irrigated by canals, known for cherries, berries, alfalfa and vegetables.
You receive: farm profile, the farmer's own register (plots, crops, last year's use per season, water, soil test, economy) when available,
the farmer's priorities (0–3), long-term climate indicators from satellite records (temperature, humidity, pressure, UV, frost, wind),
soil properties and a soil-health score (salinity is estimated unless measured), the El Niño/La Niña outlook, the forecast,
4 rotation strategies (one is the CURRENT rotation) with scores computed by a rules engine, and new crop species ranked by viability
(agronomic fit + economics). Today the town mostly grows cherries and strawberries: the farmer wants income after their season ends.
RULES:
- Write every text field in the "language" given in the input (default English). Keep strategy/species ids unchanged.
- Use only the numbers provided. Do not change scores. Plain, friendly language for a farmer (no jargon; explain terms briefly if used).
- "summary": 2–3 sentences: which strategy fits the priorities best and why, compared with the current rotation.
- "best": the id of the recommended strategy (normally the highest score; you may pick another if a risk is serious, and say why).
- "notes": one short line per strategy id with its key trade-off.
- "askExpert": 2–3 things the farmer or a local agronomist must verify (uncertainty, low spots, soil test, markets).
- "voice": 2–3 short sentences to be READ ALOUD, no symbols.
- "seasons": one short line each for spring (Sep–Nov), summer (Dec–Feb), autumn (Mar–May), winter (Jun–Aug): what grows/covers the field and the key task.
- "newCrops": up to 3 {id, why} from the newCrops list (ids must match) that best fill the months without income and suit the soil.
- This is decision SUPPORT: it never replaces the farmer's judgment.
Return ONLY JSON: {"summary": "...", "best": "...", "notes": [{"id": "...", "text": "..."}], "askExpert": ["..."], "voice": "...", "confidence": "high"|"medium"|"low",
"seasons": {"spring": "...", "summer": "...", "autumn": "...", "winter": "..."}, "newCrops": [{"id": "...", "why": "..."}]}`;

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
        return Response.json({ ...r, notes: r.notes.filter((n) => ids.has(n.id)), newCrops: r.newCrops?.filter((n) => cropIds.has(n.id)), source: "ai" });
      } catch (e) {
        if (e instanceof SinClaveError) throw e;
        last = e;
      }
    }
    throw last;
  } catch (e) {
    const noKey = e instanceof SinClaveError;
    return Response.json({ error: noKey ? "AI not configured" : `AI unavailable: ${(e as Error).message}` }, { status: noKey ? 501 : 502 });
  }
}
