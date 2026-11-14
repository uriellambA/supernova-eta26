import type { FarmProfile } from "./types";

/** Rule-based reading of the farmer's description (fallback when SI is not available). English + Spanish keywords. */
export function readFarmText(text: string): Partial<FarmProfile> & { followUp: string[] } {
  const t = text.toLowerCase();
  const out: Partial<FarmProfile> & { followUp: string[] } = { followUp: [], notes: text.slice(0, 400) };
  const ha = t.match(/(\d+(?:[.,]\d+)?)\s*(?:ha\b|hect)/);
  if (ha) out.areaHa = Number(ha[1].replace(",", "."));
  if (/cherr|cerez|orchard|frutal|apple|manzan|berry|frambues/.test(t)) out.system = "orchard";
  else if (/alfalf|pasture|pastur|forage|forraj|hay|fardo/.test(t)) out.system = "forage";
  else if (/potato|papa|garlic|ajo|vegetable|hortaliz|verdura|lettuce|lechuga/.test(t)) out.system = "vegetables";
  if (/drip|goteo/.test(t)) out.irrigation = "drip";
  else if (/sprinkler|aspersi/.test(t)) out.irrigation = "sprinkler";
  else if (/furrow|surco/.test(t)) out.irrigation = "furrow";
  else if (/flood|manto|inunda/.test(t)) out.irrigation = "flood";
  if (/little water|not enough water|poca agua|falta agua|escasez|short of water/.test(t)) out.water = "low";
  else if (/plenty of water|enough water|mucha agua|sobra agua/.test(t)) out.water = "high";
  if (!out.system) out.followUp.push("What do you grow now? (orchard, vegetables or forage)");
  if (!out.irrigation) out.followUp.push("How do you irrigate? (flood, furrow, sprinkler or drip)");
  if (!out.water) out.followUp.push("Is irrigation water usually enough in January–February?");
  return out;
}
