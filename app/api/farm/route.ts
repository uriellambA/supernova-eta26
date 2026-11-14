import { readFarmText } from "@/lib/farmText";
import { chatJSON } from "@/lib/openrouter";
import { FarmSchema } from "@/lib/schemas";

const SYSTEM = `You help a farmer in Los Antiguos (Santa Cruz, Patagonia, Argentina) describe their farm. The text may be in Spanish or English.
Return ONLY JSON: {"system": "orchard"|"vegetables"|"forage"|null, "areaHa": number|null,
"irrigation": "flood"|"furrow"|"sprinkler"|"drip"|null, "water": "low"|"medium"|"high"|null,
"notes": string|null (one short English sentence with other useful facts: pests, soil, goals, equipment),
"followUp": [up to 3 short English questions about missing info that matters for choosing a crop rotation]}
Rules: do not invent. Cherries/berries/fruit trees = orchard. Alfalfa/pasture/hay = forage. Potatoes/garlic/vegetables = vegetables.
"manto" = flood, "surco" = furrow, "goteo" = drip, "aspersión" = sprinkler.`;

export async function POST(req: Request) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || text.trim().length < 3) return Response.json({ error: "Empty text" }, { status: 400 });
  try {
    const r = FarmSchema.parse(await chatJSON([{ role: "system", content: SYSTEM }, { role: "user", content: text.slice(0, 3000) }], 0.1));
    const clean = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null));
    return Response.json({ ...clean, source: "ai" });
  } catch {
    return Response.json({ ...readFarmText(text), source: "rules" });
  }
}
