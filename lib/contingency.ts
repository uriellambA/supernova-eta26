import { shortDate } from "./agro";
import type { ClimaResumen, EnsoResumen, IndicadoresNasa, Nivel, NieveResumen } from "./types";

export type Hazard = {
  id: string;
  name: string;
  emoji: string;
  level: Nivel;
  status: string; // what the data says right now
  history: string; // how often it happened in the record
  before: string[];
  during: string[];
  after: string[];
};

const dayName = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** Weather and climate contingencies for Los Antiguos with a live status from the forecast. */
export function hazards(c: IndicadoresNasa, f: ClimaResumen | null, snow: NieveResumen | null, enso: EnsoResumen | null, zone: "patagonia" | "pampa" = "patagonia"): Hazard[] {
  const next = f?.dias.filter((d) => !d.pasado).slice(0, 10) ?? [];
  const frost = next.filter((d) => d.tmin <= 0);
  const gust = next.reduce((m, d) => Math.max(m, d.rafagas), 0);
  const heat = next.filter((d) => d.tmax >= 30);
  const uvHigh = next.filter((d) => (d.uv ?? 0) >= 8);
  const rain7 = next.slice(0, 7).reduce((s, d) => s + d.lluvia, 0);
  const lateYears = c.aniosHeladaTardia;
  const n = c.calendario.anios.length;
  const phase = enso?.current?.phase ?? null;

  const list: Hazard[] = [
    {
      id: "frost", name: "Late spring frost", emoji: "🥶",
      level: frost.length ? (frost.some((d) => d.tmin <= -2) ? "alert" : "watch") : "good",
      status: frost.length ? `Frost forecast: ${frost.map((d) => `${dayName(d.fecha)} ${d.tmin} °C`).join(", ")}` : "No frost in the next 10 days.",
      history: `Frost after Nov 1 in ${lateYears} of ${n} years; last spring frost on average ${shortDate(c.ultimaHeladaMedia)}.`,
      before: ["Check sprinklers/fans and fuel for heaters", "Keep alley grass short and soil moist: it releases more heat at night", "Do not prune or fertilize right before a cold night"],
      during: ["Start overhead sprinkling above 0 °C and keep it on until ice melts", "Run wind machines in calm, clear nights (inversion)"],
      after: ["Cut a few flowers: brown center = damaged", "Adjust thinning and yield estimates; tell your buyer early"],
    },
    {
      id: "wind", name: "Strong westerly winds", emoji: "💨",
      level: gust >= 80 ? "alert" : gust >= 60 ? "watch" : "good",
      status: next.length ? `Strongest gust next 10 days: ${Math.round(gust)} km/h.` : "Forecast not available.",
      history: `Spring wind averages ${c.vientoPrimavera} m/s; Sep–Dec is the windiest and driest time for bare soil.`,
      before: ["Keep soil covered (cover crops, mulch, stubble)", "Plant or repair windbreaks (poplar, calafate, rosehip)", "Anchor tunnels and young trees"],
      during: ["Do not spray or burn", "Delay sowing on bare ground"],
      after: ["Check broken branches and torn plastic", "Irrigate: wind dries soil and leaves fast"],
    },
    {
      id: "drought", name: "Dry year / low snowpack", emoji: "🏜️",
      level: snow ? (snow.indice < 0.6 ? "alert" : snow.indice < 0.9 ? "watch" : "good") : "watch",
      status: snow ? `Snowpack feeding the canals: ${Math.round(snow.indice * 100)}% of normal. Rain next 7 days: ${rain7.toFixed(1)} mm.` : "Snowpack data not available.",
      history: `Rain is ${c.lluviaAnual} mm/yr against ${c.et0Anual} mm of evaporation${c.tendenciaLluvia ? `; recent years ${c.tendenciaLluvia.difPct > 0 ? "+" : ""}${c.tendenciaLluvia.difPct}% vs earlier` : ""}.`,
      before: ["Prioritize water for perennials (trees, berries) over annuals", "Switch the most valuable block to drip", "Choose the water-saver rotation and low-water crops (garlic, saffron, calafate)"],
      during: ["Irrigate at night, by evaporation (ET0), not by calendar", "Mulch to cut soil evaporation by up to a third"],
      after: ["Rebuild organic matter: it holds more water next year"],
    },
    {
      id: "heat", name: "Heat & sunburn", emoji: "🔥",
      level: heat.length ? "watch" : uvHigh.length ? "watch" : "good",
      status: heat.length ? `Days ≥ 30 °C: ${heat.map((d) => dayName(d.fecha)).join(", ")}` : uvHigh.length ? `Very high UV (≥ 8) on ${uvHigh.length} days.` : "No heat waves forecast.",
      history: `About ${c.mensual.reduce((s, m) => s + m.diasCalor, 0).toFixed(0)} days ≥ 30 °C per year${c.uvVerano ? `; summer UV index around ${c.uvVerano}` : ""}.`,
      before: ["Shade nets on berries; kaolin on exposed fruit", "Water early in the morning"],
      during: ["Avoid field work at midday; workers need shade and water"],
      after: ["Check fruit for sunburn before packing"],
    },
    {
      id: "hail", name: "Summer storms & hail", emoji: "🌨️",
      level: next.some((d) => d.lluvia > 15) ? "watch" : "good",
      status: next.some((d) => d.lluvia > 15) ? "Heavy rain (> 15 mm) in the forecast: check drainage and ripe fruit." : "No heavy rain forecast.",
      history: "Hail is rare but costly for cherries near harvest (Dec–Jan). Rain at harvest cracks cherries.",
      before: ["Consider hail/rain covers for the most valuable block", "Check crop insurance options"],
      during: ["Pause harvest; wet cherries crack in boxes"],
      after: ["Fungicide on damaged fruit; sort before selling"],
    },
    {
      id: "ash", name: "Volcanic ash", emoji: "🌋",
      level: "good",
      status: "No current alert (check the national volcano observatory if there is activity).",
      history: "The 1991 Hudson eruption buried the valley in ash. The ash is still part of the local soil.",
      before: ["Keep a stock of clean water and feed for animals", "Know how to cover wells and seal tanks"],
      during: ["Protect eyes and lungs; keep animals indoors", "Do not irrigate with ash-laden water"],
      after: ["Incorporate thin ash layers into the soil (they add minerals)", "Thick layers: remove from roofs and greenhouses fast"],
    },
  ];

  if (zone === "pampa") {
    const rain3 = next.slice(0, 3).reduce((s, d) => s + d.lluvia, 0);
    const dryDays = next.filter((d) => d.lluvia < 1).length;
    // Volcanic ash and snowpack do not apply here; add water excess and drought instead
    for (const id of ["ash", "drought"]) {
      const i = list.findIndex((h) => h.id === id);
      if (i >= 0) list.splice(i, 1);
    }
    list.push(
      {
        id: "flood", name: "Heavy rain, waterlogging & water erosion", emoji: "🌊",
        level: rain3 > 60 ? "alert" : rain3 > 30 ? "watch" : "good",
        status: `Rain next 3 days: ${rain3.toFixed(0)} mm.`,
        history: `About ${c.lluviaAnual} mm of rain per year, concentrated in spring–summer storms that wash bare slopes.`,
        before: ["Keep residue or a cover crop on slopes", "Clear grassed waterways and terraces", "Avoid heavy machinery on wet soil"],
        during: ["Do not enter flooded lots (compaction)", "Note where water stands: those spots need drainage or a different crop"],
        after: ["Check stands and replant if needed", "Measure soil loss in rills; plan contour sowing"],
      },
      {
        id: "dry", name: "Dry spell / La Niña drought", emoji: "🏜️",
        level: dryDays >= 9 && next.length ? "watch" : "good",
        status: next.length ? `${dryDays} of the next ${next.length} days without rain.` : "Forecast not available.",
        history: "La Niña years usually bring drier springs and summers to the Rolling Pampa: maize and second soybean suffer most.",
        before: ["Choose drought-tolerant crops (sorghum) or lower plant density", "Keep residue on the surface: it saves soil water"],
        during: ["Delay fertilizer and inputs until it rains", "Prioritize the lots with more stored water"],
        after: ["Record yields by lot to adjust next season"],
      },
    );
  }

  // El Niño / La Niña seasonal outlook
  if (phase) {
    list.splice(1, 0, {
      id: "enso", name: phase === "Neutral" ? "Pacific neutral year" : `${phase} year`, emoji: phase === "El Niño" ? "🌊" : phase === "La Niña" ? "🧊" : "⚖️",
      level: phase === "Neutral" ? "good" : "watch",
      status: `Pacific index ${enso!.current!.anomaly > 0 ? "+" : ""}${enso!.current!.anomaly} °C (${enso!.current!.season} ${enso!.current!.year}).`,
      history: "See the table below: what each phase meant on your field in the last 20 years. In southern Patagonia the effect is weaker than further north, so use it as a tendency, not a forecast.",
      before: phase === "La Niña"
        ? ["Plan for a drier season: secure water turns and drip on key blocks", "Expect clear, cold nights: get frost protection ready"]
        : phase === "El Niño"
          ? ["Wetter, milder winters are more likely: good for snowpack and reservoirs", "Watch for fungal disease in wet springs"]
          : ["No strong signal: follow the normal plan and the weekly forecast"],
      during: ["Re-check the 16-day forecast every week"],
      after: ["Record yields and dates: they improve next year's advice"],
    });
  }
  return list;
}
