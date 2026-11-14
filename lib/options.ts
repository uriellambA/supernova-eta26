import { cropById } from "@/config/crops";
import { STRATEGIES } from "@/config/rotations";
import { EFFICIENCY, seasonNeed } from "./riego";
import type { FarmProfile, IndicadoresNasa, Nivel } from "./types";

export type Option = { id: "geothermal" | "hydroponics" | "drip"; title: string; emoji: string; fit: number; level: Nivel; headline: string; facts: string[]; steps: string[]; cost: string };
const clamp = (x: number, a = 0.05, b = 0.95) => Math.max(a, Math.min(b, x));
const lvl = (f: number): Nivel => (f >= 0.66 ? "good" : f >= 0.4 ? "watch" : "alert");

/** "What can I do?" — three practical upgrades evaluated with the field data. */
export function farmOptions(c: IndicadoresNasa, farm: FarmProfile): Option[] {
  const coldMonths = c.mensual.filter((m) => m.tmin < 0).length;
  const groundTemp = c.tempMedia; // soil at 2–3 m stays close to the mean annual air temperature
  const julyMin = c.mensual[6]?.tmin ?? 0;

  // Drip
  const main = cropById(STRATEGIES.find((s) => s.system === farm.system && s.current)?.years[0].main) ?? cropById("cherry")!;
  const net = seasonNeed(main.kc, c.mensual) || main.water;
  const now = (net / EFFICIENCY[farm.irrigation]) * 10; // m³/ha
  const drip = (net / EFFICIENCY.drip) * 10;
  const saved = Math.max(0, now - drip);
  const dripFit = farm.irrigation === "drip" ? 0.2 : clamp(0.45 + saved / 8000 + (farm.water === "low" ? 0.2 : 0));

  // Hydroponics in a greenhouse
  const hydroFit = clamp(0.4 + (200 - c.libreHeladas) / 250 + c.diasHeladaAnio / 400 + (farm.water === "low" ? 0.15 : 0));

  // Geothermal (ground-coupled heating for greenhouses / frost protection)
  const geoFit = clamp(0.2 + c.diasHeladaAnio / 300 + coldMonths * 0.05);

  return [
    {
      id: "drip", title: "Drip irrigation", emoji: "💧", fit: dripFit, level: lvl(dripFit),
      headline: farm.irrigation === "drip" ? "You already use drip: fine-tune it with the forecast." : `Save about ${Math.round(saved).toLocaleString("en-US")} m³ of water per hectare each season.`,
      facts: [
        `${main.name} needs ~${Math.round(net)} mm of irrigation per season on your field.`,
        `${farm.irrigation[0].toUpperCase() + farm.irrigation.slice(1)} irrigation is ~${Math.round(EFFICIENCY[farm.irrigation] * 100)}% efficient; drip is ~90%.`,
        "Less water on bare soil also means fewer weeds and less salt build-up.",
      ],
      steps: ["Start with one block or the most valuable crop", "Add a filter and pressure regulator at the canal inlet", "Water by evaporation (ET0), not by the calendar"],
      cost: "Medium · pays back faster in dry years",
    },
    {
      id: "hydroponics", title: "Hydroponics greenhouse", emoji: "🥬", fit: hydroFit, level: lvl(hydroFit),
      headline: `Grow leafy greens and strawberries beyond your ${c.libreHeladas} frost-free days, with up to 90% less water.`,
      facts: [
        `Outdoor season is short: ${c.libreHeladas} frost-free days and frost on ~${c.diasHeladaAnio} days a year.`,
        "Recirculating systems (NFT, towers) use 80–90% less water than open field.",
        "No soil needed: good for sandy or tired soils while you rebuild them with covers.",
      ],
      steps: ["Begin with a 100–200 m² tunnel with wind protection", "NFT channels for lettuce and herbs", "Sell to local shops and tourism in summer"],
      cost: "Medium–high · steady local income",
    },
    {
      id: "geothermal", title: "Geothermal energy", emoji: "🌡️", fit: geoFit, level: lvl(geoFit),
      headline: `The ground 2–3 m deep stays near ${groundTemp} °C all year, while July nights average ${julyMin} °C.`,
      facts: [
        `${coldMonths} months a year have average minimums below 0 °C.`,
        "Earth-air tubes or a ground-source heat pump can keep a greenhouse above freezing with little fuel.",
        "Pairs well with hydroponics to produce through winter.",
      ],
      steps: ["Bury 2–3 m deep pipes (earth-air heat exchanger) under the greenhouse", "Add thermal mass (water barrels) and night curtains", "Upgrade to a heat pump if you scale up"],
      cost: "High upfront · low running cost",
    },
  ].sort((a, b) => b.fit - a.fit) as Option[];
}
