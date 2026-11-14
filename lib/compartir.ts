import { APP_NAME } from "@/config/app";
import type { Luz } from "./semaforo";
import type { CultivoPuntaje, NieveResumen } from "./types";

const ICONO = { verde: "🟢", amarillo: "🟡", rojo: "🔴" } as const;

export function armarResumen(o: {
  lugar: string; ha: number | null; luces: Luz[]; ranking: CultivoPuntaje[] | null;
  nieve: NieveResumen | null; riegoMm: number | null; url: string;
}) {
  const l: string[] = [];
  l.push(`🍐 Mi chacra en ${o.lugar}${o.ha ? ` (${o.ha} ha)` : ""}`);
  if (o.luces.length) l.push(`🚦 Hoy: ${o.luces.map((x) => `${ICONO[x.nivel]} ${x.titulo}`).join(" · ")}`);
  const roja = o.luces.find((x) => x.nivel === "rojo");
  if (roja) l.push(`⚠️ ${roja.texto}`);
  if (o.ranking?.length) l.push(`✨ Recomendado: ${o.ranking.slice(0, 3).map((r, i) => `${i + 1}) ${r.nombre.split("(")[0].trim()} ${ICONO[r.semaforo]}${r.puntaje}`).join(" ")}`);
  if (o.nieve) l.push(`🏔️ Nieve en la cordillera: ${Math.round(o.nieve.indice * 100)} % de lo normal`);
  if (o.riegoMm !== null) l.push(`💧 Riego sugerido próximo turno: ${o.riegoMm} mm`);
  l.push(`Datos: NASA POWER · MODIS · Open-Meteo — ${APP_NAME}`);
  l.push(o.url);
  return l.join("\n");
}

export async function compartirWhatsApp(texto: string) {
  if (typeof navigator !== "undefined" && navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ title: APP_NAME, text: texto });
      return;
    } catch {
      /* el usuario canceló: usamos el enlace de WhatsApp */
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
}
