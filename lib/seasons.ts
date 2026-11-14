import { cropById } from "@/config/crops";
import { SPECIES } from "@/config/species";
import { SEASONS, type SeasonId } from "./agro";
import type { SpeciesFit } from "./suitability";
import type { Strategy, StrategyResult } from "./types";

export type SeasonCell = { crop: string | null; label: string; kind: "crop" | "cover" | "bare" | "tree" };

/** What occupies the field in each season of each rotation year (from crop growth months). */
export function seasonGrid(s: Strategy): SeasonCell[][] {
  return s.years.map((y) => {
    const main = cropById(y.main)!;
    const winter = cropById(y.winter);
    return SEASONS.map((se) => {
      const active = se.months.filter((m) => (main.kc[m - 1] ?? 0) > 0).length;
      if (s.system === "orchard") {
        const alley = cropById(s.alley ?? null);
        if (se.id === "winter") return alley ? { crop: alley.id, label: /alleys/i.test(alley.name) ? alley.name : `${alley.name} in alleys`, kind: "cover" as const } : { crop: null, label: "Dormant trees, bare alleys", kind: "bare" as const };
        return { crop: main.id, label: `${main.name}${alley ? ` + ${alley.name.toLowerCase()}` : ""}`, kind: "tree" as const };
      }
      if (active >= 2) return { crop: main.id, label: main.name, kind: main.kind === "cover" ? ("cover" as const) : ("crop" as const) };
      if (winter && (se.id === "winter" || se.id === "autumn" || active === 0)) return { crop: winter.id, label: winter.name, kind: winter.kind === "cover" || winter.kind === "forage" ? ("cover" as const) : ("crop" as const) };
      if (active === 1) return { crop: main.id, label: `${main.name} (part)`, kind: "crop" as const };
      return { crop: null, label: "Bare soil", kind: "bare" as const };
    });
  });
}

export type SeasonPlan = Record<SeasonId, { focus: string; tasks: string[]; harvest: string[] }>;

/** A year-round plan: the chosen rotation plus new species that fill each season. */
export function yearPlan(best: StrategyResult | undefined, fits: SpeciesFit[], zone: "patagonia" | "pampa" = "patagonia"): SeasonPlan {
  const good = fits.filter((f) => f.viability >= 55 && f.species.status === "new");
  const harvestIn = (months: readonly number[]) =>
    good.filter((f) => f.species.harvest.some((m) => months.includes(m))).slice(0, 3).map((f) => `${f.species.emoji} ${f.species.name}`);
  const sys = best?.strategy.system ?? "orchard";
  const winterCover = best ? seasonGrid(best.strategy).flat().find((c) => c.kind === "cover")?.label : undefined;
  const cur = (months: readonly number[]) => SPECIES.filter((s) => (s.zone ?? "patagonia") === zone && s.status === "current" && s.harvest.some((m) => months.includes(m))).map((s) => `${s.emoji} ${s.name}`);
  if (zone === "pampa") {
    return {
      spring: { focus: "Sow summer crops on covered soil", tasks: ["Terminate cover crops 3–4 weeks before sowing", "Sow maize when the soil reaches 10 °C, soybean at 14 °C", "Direct seeding: never plow the slopes"], harvest: [...cur(SEASONS[0].months), ...harvestIn(SEASONS[0].months)] },
      summer: { focus: "Crop growth, pests and the wheat → second soybean switch", tasks: ["Harvest wheat/barley and sow second soybean the same week", "Monitor stink bugs and caterpillars; spray only above thresholds", "Check soil water before deciding inputs (La Niña years)"], harvest: [...cur(SEASONS[1].months), ...harvestIn(SEASONS[1].months)] },
      autumn: { focus: "Harvest and sow the winter crop or cover", tasks: ["Harvest soybean and maize; leave the residue on the field", `Sow ${winterCover ? winterCover.toLowerCase() : "wheat, barley or a vetch + oats cover"} right after harvest`, "Soil sampling (0–20 cm): organic matter, P, N, pH"], harvest: [...cur(SEASONS[2].months), ...harvestIn(SEASONS[2].months)] },
      winter: { focus: "Winter crops and covers protect the slopes", tasks: ["Fertilize wheat/barley by soil test", "Plan next season's rotation and contracts", "Clean and repair terraces and grassed waterways"], harvest: [...cur(SEASONS[3].months), ...harvestIn(SEASONS[3].months)] },
    };
  }
  return {
    spring: {
      focus: "Protect bloom from frost, keep soil covered against wind",
      tasks: [sys === "orchard" ? "Roll or mow the alley cover before bloom (bare, moist soil releases more heat)" : "Turn in winter covers 3–4 weeks before planting", "Frost watch every night Sep–Nov", "Set irrigation by evaporation, not calendar"],
      harvest: [...cur(SEASONS[0].months), ...harvestIn(SEASONS[0].months)],
    },
    summer: {
      focus: "Main harvest and water management",
      tasks: ["Irrigate at night; check the snowpack index for late-summer water", "Harvest crews: plan labor for cherries and berries", "Shade/UV protection on berries"],
      harvest: [...cur(SEASONS[1].months), ...harvestIn(SEASONS[1].months)],
    },
    autumn: {
      focus: "After the cherries: second income and sowing covers",
      tasks: [`Sow ${winterCover ? winterCover.toLowerCase() : "a winter cover (rye or oats + vetch)"} right after harvest`, "Plant garlic and saffron corms", "Soil test (pH, salinity, organic matter) before the next season"],
      harvest: [...cur(SEASONS[2].months), ...harvestIn(SEASONS[2].months)],
    },
    winter: {
      focus: "Soil rests covered; plan and prune",
      tasks: ["Prune orchards and berries", "Plant new hedgerows/windbreaks when dormant", "Greenhouse greens (with geothermal heat) for winter income"],
      harvest: [...cur(SEASONS[3].months), ...harvestIn(SEASONS[3].months)],
    },
  };
}
