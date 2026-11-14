"use client";
// A "session" = one SI analysis of a field, saved on the device and shareable as a link.
// The link carries the whole session compressed in the URL hash (#…), so nothing is stored on a server.
import { speciesById } from "@/config/species";
import { SEASONS, shortDate } from "./agro";
import { getLang, translate } from "./i18n";
import { guardar, leer } from "./storage";
import type { Hazard } from "./contingency";
import { yearPlan } from "./seasons";
import type { SpeciesFit } from "./suitability";
import type { AdvisorResult, ClimaResumen, FarmProfile, IndicadoresNasa, SoilResumen, StrategyResult } from "./types";

export type SavedSession = {
  v: 1;
  id: string;
  createdAt: string;
  lang: "en" | "es";
  place: string;
  lat: number;
  lon: number;
  farm: Pick<FarmProfile, "system" | "areaHa" | "irrigation">;
  question?: string;
  advice: {
    summary: string;
    answer?: string;
    voice?: string;
    source: "ai" | "rules";
    confidence: string;
    askExpert: string[];
    seasons?: { spring: string; summer: string; autumn: string; winter: string };
  };
  best: { name: string; score: number };
  current: { name: string; score: number } | null;
  ranking: { name: string; score: number; current: boolean; water: number; bare: number; erosion: number; n: number; benefit?: string; risk?: string }[];
  crops: { name: string; why: string; viability: number; harvest: number[] }[];
  tasks: string[];
  climate?: { frostFree: number; lastFrost: string; rain: number; et0: number };
  soil?: { texture: string; om: number; ph: number };
};

const T = (s: string) => (getLang() === "es" ? translate(s) ?? s : s);

export function buildSession(o: {
  zone?: "patagonia" | "pampa";
  place: string; lat: number; lon: number; farm: FarmProfile; question?: string; advice: AdvisorResult; results: StrategyResult[];
  fits: SpeciesFit[]; risks: Hazard[]; forecast: ClimaResumen | null; climate: IndicadoresNasa | null; soil: SoilResumen | null;
}): SavedSession {
  const sorted = [...o.results].sort((a, b) => b.score - a.score);
  const best = o.results.find((r) => r.strategy.id === o.advice.best) ?? sorted[0];
  const cur = o.results.find((r) => r.strategy.current) ?? null;
  const picks = o.advice.newCrops?.length
    ? o.advice.newCrops.map((n) => ({ n, f: o.fits.find((f) => f.species.id === n.id) }))
    : o.fits.filter((f) => f.species.status === "new").slice(0, 3).map((f) => ({ n: { id: f.species.id, why: f.species.why }, f }));
  // Tasks for this week: active hazards + what the current season asks for
  const month = new Date().getMonth() + 1;
  const season = SEASONS.find((s) => (s.months as readonly number[]).includes(month))!;
  const plan = yearPlan(best, o.fits, o.zone ?? "patagonia");
  const tasks = [
    ...o.risks.filter((h) => h.level !== "good").slice(0, 3).map((h) => `${h.emoji} ${T(h.name)}: ${T(h.status)} → ${T(h.before[0])}`),
    ...plan[season.id].tasks.slice(0, 3).map((t) => `✅ ${T(t)}`),
  ];
  return {
    v: 1,
    id: `s-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    lang: getLang(),
    place: T(o.place),
    lat: +o.lat.toFixed(4),
    lon: +o.lon.toFixed(4),
    farm: { system: o.farm.system, areaHa: o.farm.areaHa, irrigation: o.farm.irrigation },
    question: o.question?.trim() || undefined,
    advice: {
      summary: o.advice.source === "rules" ? T(o.advice.summary) : o.advice.summary,
      answer: o.advice.answer && (o.advice.source === "rules" ? T(o.advice.answer) : o.advice.answer),
      source: o.advice.source,
      confidence: o.advice.confidence,
      askExpert: o.advice.askExpert.map((a) => (o.advice.source === "rules" ? T(a) : a)),
      seasons: o.advice.seasons && (o.advice.source === "rules"
        ? { spring: T(o.advice.seasons.spring), summer: T(o.advice.seasons.summer), autumn: T(o.advice.seasons.autumn), winter: T(o.advice.seasons.winter) }
        : o.advice.seasons),
    },
    best: { name: T(best.strategy.name), score: best.score },
    current: cur ? { name: T(cur.strategy.name), score: cur.score } : null,
    ranking: sorted.map((r, i) => ({
      name: T(r.strategy.name), score: r.score, current: !!r.strategy.current,
      water: r.metrics.waterMm, bare: r.metrics.bareMonths, erosion: Math.round(r.metrics.erosion * 100), n: r.metrics.nitrogen,
      ...((i === 0 || r.strategy.current) && { benefit: r.benefits[0] ? T(r.benefits[0]) : undefined, risk: r.risks[0] ? T(r.risks[0]) : undefined }),
    })),
    crops: picks.slice(0, 3).map(({ n, f }) => ({
      name: T(speciesById(n.id)?.name ?? n.id), why: o.advice.source === "ai" && o.advice.newCrops?.length ? n.why : T(speciesById(n.id)?.why ?? n.why),
      viability: f?.viability ?? 0, harvest: speciesById(n.id)?.harvest ?? [],
    })),
    tasks,
    climate: o.climate ? { frostFree: o.climate.libreHeladas, lastFrost: shortDate(o.climate.ultimaHeladaMedia), rain: o.climate.lluviaAnual, et0: o.climate.et0Anual } : undefined,
    soil: o.soil ? { texture: T(o.soil.texture), om: o.soil.organicMatter, ph: o.soil.ph } : undefined,
  };
}

// ---------- Saved on this device ----------
export async function listSessions(): Promise<SavedSession[]> {
  return (await leer<SavedSession[]>("sessions"))?.v ?? [];
}
export async function saveSession(s: SavedSession) {
  const all = (await listSessions()).filter((x) => x.id !== s.id);
  const next = [s, ...all].slice(0, 40);
  await guardar("sessions", next);
  return next;
}
export async function deleteSession(id: string) {
  const next = (await listSessions()).filter((x) => x.id !== id);
  await guardar("sessions", next);
  return next;
}

// ---------- Link encoding (compressed JSON in the URL hash) ----------
const b64url = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSession(s: SavedSession): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(s));
  if (typeof CompressionStream !== "undefined") return `z.${b64url(await pipe(raw, new CompressionStream("deflate-raw")))}`;
  return `j.${b64url(raw)}`;
}
export async function decodeSession(code: string): Promise<SavedSession> {
  const [kind, data] = [code.slice(0, 2), code.slice(2)];
  const bytes = kind === "z." ? await pipe(unb64url(data), new DecompressionStream("deflate-raw")) : unb64url(data);
  const s = JSON.parse(new TextDecoder().decode(bytes)) as SavedSession;
  if (s?.v !== 1 || !s.best) throw new Error("not a Growvia session");
  return s;
}
export async function sessionLink(s: SavedSession) {
  return `${window.location.origin}/s#${await encodeSession(s)}`;
}

// ---------- WhatsApp messages ----------
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function whatsappText(s: SavedSession, kind: "summary" | "team", link: string) {
  const es = s.lang === "es";
  const L = (en: string, sp: string) => (es ? sp : en);
  const M = es ? MONTHS_ES : MONTHS_EN;
  const date = new Date(s.createdAt).toLocaleDateString(es ? "es-AR" : "en-US", { day: "numeric", month: "long" });
  if (kind === "team") {
    return [
      `🌱 *Growvia · ${s.place}*`,
      `📅 ${L("Tasks", "Tareas")} · ${date}`,
      "",
      `*${L("This week", "Esta semana")}*`,
      ...(s.tasks.length ? s.tasks : [L("✅ Normal work: no weather alerts.", "✅ Trabajo normal: sin alertas de clima.")]),
      "",
      `🔄 ${L("Rotation we are following", "Rotación que seguimos")}: *${s.best.name}*`,
      s.advice.seasons ? `🗓️ ${L("Now", "Ahora")}: ${seasonNow(s)}` : "",
      "",
      `${L("Full plan", "Plan completo")} 👉 ${link}`,
    ].filter((x) => x !== "").join("\n");
  }
  return [
    `🌱 *Growvia · ${s.place}* (${s.farm.areaHa} ha)`,
    `📅 ${date}`,
    "",
    s.question ? `❓ _${s.question}_\n💬 ${s.advice.answer ?? s.advice.summary}\n` : "",
    `🏆 *${L("Recommended rotation", "Rotación recomendada")}*: ${s.best.name} — ${s.best.score}/100`,
    s.current && s.current.name !== s.best.name ? `↔️ ${L("Current rotation", "Rotación actual")}: ${s.current.name} — ${s.current.score}/100` : "",
    "",
    `📝 ${s.advice.summary}`,
    "",
    s.advice.seasons ? `*${L("Plan by season", "Plan por estación")}*` : "",
    ...(s.advice.seasons
      ? [
          `🌸 ${L("Spring", "Primavera")}: ${s.advice.seasons.spring}`,
          `☀️ ${L("Summer", "Verano")}: ${s.advice.seasons.summer}`,
          `🍂 ${L("Autumn", "Otoño")}: ${s.advice.seasons.autumn}`,
          `❄️ ${L("Winter", "Invierno")}: ${s.advice.seasons.winter}`,
          "",
        ]
      : []),
    s.crops.length ? `*${L("New crops to try", "Cultivos nuevos para probar")}*` : "",
    ...s.crops.map((c) => `🌿 ${c.name} (${c.harvest.map((m) => M[m - 1]).join("/")}) — ${c.why}`),
    "",
    s.advice.askExpert.length ? `⚠️ ${L("Check with a local expert", "Consultar con un experto local")}: ${s.advice.askExpert.slice(0, 2).join(" · ")}` : "",
    "",
    `📊 ${L("Full report", "Informe completo")} 👉 ${link}`,
    `_${L("Decision support: it does not replace your judgment.", "Apoyo a la decisión: no reemplaza tu criterio.")}_`,
  ].filter((x) => x !== "").join("\n");
}

export function seasonNow(s: SavedSession) {
  const m = new Date().getMonth() + 1;
  const id = SEASONS.find((x) => (x.months as readonly number[]).includes(m))!.id;
  return s.advice.seasons?.[id] ?? "";
}

export const openWhatsApp = (text: string) => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
