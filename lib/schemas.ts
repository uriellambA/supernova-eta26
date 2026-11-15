import { z } from "zod";
import { VISUALS } from "./types";

export const FarmSchema = z.object({
  system: z.enum(["orchard", "vegetables", "forage"]).nullable().catch(null),
  areaHa: z.number().positive().nullable().catch(null),
  irrigation: z.enum(["flood", "furrow", "sprinkler", "drip"]).nullable().catch(null),
  water: z.enum(["low", "medium", "high"]).nullable().catch(null),
  notes: z.string().nullable().catch(null),
  followUp: z.array(z.string()).catch([]),
});

export const AdviceSchema = z.object({
  summary: z.string(),
  answer: z.string().optional().catch(undefined),
  best: z.string(),
  notes: z.array(z.object({ id: z.string(), text: z.string() })).catch([]),
  askExpert: z.array(z.string()).catch([]),
  voice: z.string(),
  confidence: z.enum(["high", "medium", "low"]).catch("medium"),
  seasons: z.object({ spring: z.string(), summer: z.string(), autumn: z.string(), winter: z.string() }).optional().catch(undefined),
  newCrops: z.array(z.object({ id: z.string(), why: z.string() })).optional().catch(undefined),
  visuals: z.array(z.enum(VISUALS)).max(3).optional().catch(undefined),
});
