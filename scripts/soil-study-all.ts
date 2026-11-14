/**
 * Growvia — full soil study of EVERY site in one go.
 *
 *   npm run soil-study:all               # online (NASA POWER, MODIS, SoilGrids…)
 *   npm run soil-study:all -- --offline  # no internet: regional reference + simulated climate
 *   npm run soil-study:all -- --grid 3   # any extra option is passed to each site's study
 *
 * Runs `scripts/soil-study.ts --site <id>` for each site in config/sites.ts (centre + 4 points, each with
 * its own farming system and irrigation), writes docs/soil-study/<site>/… and then a combined summary in
 * docs/soil-study/summary.md + summary.csv. A site that fails does not stop the others.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SITES } from "../config/sites";

const extra = process.argv.slice(2).filter((a, i, all) => !["--site", "--out", "--all"].includes(a) && !["--site", "--out"].includes(all[i - 1]));
const root = "docs/soil-study";
mkdirSync(root, { recursive: true });

type Row = { site: string; ok: boolean; seconds: number; error?: string };
const runs: Row[] = [];
const t0 = Date.now();
console.log(`Growvia · soil study of ${SITES.length} sites${extra.length ? ` (${extra.join(" ")})` : ""}\n`);

for (const [i, s] of SITES.entries()) {
  console.log(`━━ [${i + 1}/${SITES.length}] ${s.name} (${s.region}) ━━`);
  const t = Date.now();
  const r = spawnSync(process.execPath, ["--import", "tsx", "scripts/soil-study.ts", "--site", s.id, "--out", join(root, s.id), ...extra], { stdio: "inherit" });
  const ok = r.status === 0;
  runs.push({ site: s.id, ok, seconds: Math.round((Date.now() - t) / 1000), error: ok ? undefined : r.error?.message ?? `exit code ${r.status}` });
  console.log(ok ? "" : `✗ ${s.name} failed, continuing with the next site\n`);
}

// ---------- combined summary ----------
type Study = {
  point: { name: string; lat: number; lon: number };
  soil: { texture: string; organicMatter: number; ph: number; waterHolding: number };
  sal?: { ece?: number };
  health?: { score?: number };
  climate: { libreHeladas: number; lluviaAnual: number; et0Anual: number };
  results: { name: string; score: number; current: boolean }[];
  species: { name: string; viability: number }[];
};
const md: string[] = ["# Soil study — all Growvia sites", "", `Generated ${new Date().toISOString().slice(0, 10)} · ${extra.includes("--offline") ? "OFFLINE (reference values)" : "online data"}`, ""];
const csvRows: (string | number)[][] = [["site", "point", "lat", "lon", "texture", "om_pct", "ph", "awc_mm", "salinity_dsm", "soil_health", "frost_free_days", "rain_mm", "et0_mm", "best_rotation", "best_score", "current_score", "top_species"]];
md.push("| Site | Texture (centre) | OM % | pH | Water holding | Frost-free days | Rain / ET0 mm | Best rotation | Score (current) | Top species |", "|---|---|---|---|---|---|---|---|---|---|");
for (const s of SITES) {
  const f = join(root, s.id, "data.json");
  if (!existsSync(f)) { md.push(`| ${s.name} | — | — | — | — | — | — | study failed | — | — |`); continue; }
  const data = JSON.parse(readFileSync(f, "utf8")) as Study[];
  for (const d of data) {
    const best = d.results[0], cur = d.results.find((r) => r.current);
    const top = [...d.species].sort((a, b) => b.viability - a.viability).slice(0, 3).map((x) => x.name).join(" | ");
    csvRows.push([s.name, d.point.name, d.point.lat, d.point.lon, d.soil.texture, d.soil.organicMatter, d.soil.ph, d.soil.waterHolding, d.sal?.ece ?? "", d.health?.score ?? "", d.climate.libreHeladas, d.climate.lluviaAnual, d.climate.et0Anual, best?.name ?? "", best?.score ?? "", cur?.score ?? "", top]);
  }
  const c = data[0];
  const best = c.results[0], cur = c.results.find((r) => r.current);
  md.push(`| [${s.name}](${s.id}/report.md) | ${c.soil.texture} | ${c.soil.organicMatter} | ${c.soil.ph} | ${c.soil.waterHolding} mm | ${c.climate.libreHeladas} | ${c.climate.lluviaAnual} / ${c.climate.et0Anual} | ${best?.name ?? "—"} | ${best?.score ?? "—"} (${cur?.score ?? "—"}) | ${[...c.species].sort((a, b) => b.viability - a.viability).slice(0, 3).map((x) => x.name).join(", ")} |`);
}
md.push("", "Each site folder has `report.md`, `data.json`, `points.csv`, `profile.csv` and `species.csv` (centre + 4 points ~1.5 km around it).", "", "## Runs", "");
for (const r of runs) md.push(`- ${r.ok ? "✓" : "✗"} ${r.site} · ${r.seconds} s${r.error ? ` · ${r.error}` : ""}`);
md.push("", "Values are approximate: validate with a laboratory soil test and local advice (INTA).");
const csv = csvRows.map((r) => r.map((v) => (typeof v === "string" && /[,"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n") + "\n";
writeFileSync(join(root, "summary.md"), md.join("\n") + "\n");
writeFileSync(join(root, "summary.csv"), csv);

const okN = runs.filter((r) => r.ok).length;
console.log(`\n${okN === runs.length ? "✓" : "!"} ${okN}/${runs.length} sites done in ${Math.round((Date.now() - t0) / 1000)} s → ${root}/summary.md, summary.csv and one folder per site`);
process.exit(okN === runs.length ? 0 : 1);
