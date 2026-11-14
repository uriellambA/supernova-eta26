import type { ContextoIA } from "@/lib/contexto";
import { chatJSON, SinClaveError } from "@/lib/openrouter";
import { RecomendacionSchema } from "@/lib/schemas";

export const maxDuration = 60;

const SYSTEM = `Sos un ingeniero agrónomo del Alto Valle de Río Negro y Neuquén (Argentina). Hablás en español
rioplatense simple, para un chacrero. Recibís indicadores calculados con datos de NASA (POWER, MODIS),
datos del productor, el pronóstico de Open-Meteo, un índice de nieve de la cordillera y un RANKING de cultivos
con puntajes ya calculados por un motor de reglas.
REGLAS:
- No inventes números: usá solo los provistos. No cambies los puntajes ni el orden del ranking (podés elegir los 3 a 5 primeros).
- Citá la fuente al final de cada frase: [NASA POWER] [MODIS] [Nieve] [Open-Meteo] [Productor].
- Proponé ADAPTACIONES concretas: defensa contra heladas, goteo, malla antigranizo, cortinas de álamos,
  variedades de floración tardía, portainjertos, manejo de la salinidad.
- Considerá el turno de riego y el agua disponible según la nieve.
- "resumenVoz": 3 o 4 frases cortas, sin símbolos ni corchetes, para LEER EN VOZ ALTA, dirigidas al chacrero.
- "datosFaltantes": qué dato del productor mejoraría la recomendación.
Respondé SOLO con JSON:
{"recomendaciones":[{"id": "<id del ranking>","cultivo": "...","porQue":["..."],"riesgos":["..."],"adaptaciones":["..."],"calendario":"..."}],
 "alertaCortoPlazo": string|null, "agua": string|null, "resumenVoz": "...", "datosFaltantes": ["..."], "confianza": "alta"|"media"|"baja"}`;

export async function POST(req: Request) {
  const ctx = (await req.json().catch(() => null)) as ContextoIA | null;
  if (!ctx?.ranking?.length) return Response.json({ error: "Falta el contexto" }, { status: 400 });
  const ids = new Set(ctx.ranking.map((r) => r.id));
  const mensajes = [
    { role: "system" as const, content: SYSTEM },
    { role: "user" as const, content: JSON.stringify(ctx) },
  ];
  try {
    let ultimoError: unknown;
    for (let intento = 0; intento < 2; intento++) {
      try {
        const r = RecomendacionSchema.parse(await chatJSON(mensajes, 0.4));
        const recomendaciones = r.recomendaciones.filter((x) => ids.has(x.id)).slice(0, 5);
        if (!recomendaciones.length) throw new Error("La IA no usó cultivos del ranking");
        return Response.json({ ...r, recomendaciones, generadoPor: "ia" });
      } catch (e) {
        if (e instanceof SinClaveError) throw e;
        ultimoError = e;
      }
    }
    throw ultimoError;
  } catch (e) {
    const sinClave = e instanceof SinClaveError;
    return Response.json(
      { error: sinClave ? "IA no configurada (falta OPENROUTER_API_KEY)" : `La IA no respondió: ${(e as Error).message}` },
      { status: sinClave ? 501 : 502 },
    );
  }
}
