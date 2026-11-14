import { extraerLocal } from "@/lib/extraccionLocal";
import { chatJSON, SinClaveError } from "@/lib/openrouter";
import { ExtraccionSchema } from "@/lib/schemas";
import { CHACRERO_VACIO } from "@/lib/types";

const SYSTEM = `Sos un asistente que ordena la información que un chacrero del Alto Valle (Río Negro y Neuquén, Argentina) cuenta sobre su chacra.
Devolvé SOLO un JSON con esta forma:
{"datos": {"superficieHa": number|null, "usoActual": string|null, "edadMonte": number|null,
"riego": "manto"|"surco"|"aspersion"|"goteo"|null, "turnoDias": number|null, "diasDesdeRiego": number|null,
"pozo": boolean|null, "defensaHeladas": "ninguna"|"aspersion"|"calefactores"|"ventiladores"|null,
"mallaAntigranizo": boolean|null, "cortinas": boolean|null, "textura": "arenoso"|"franco"|"arcilloso"|null,
"salinidad": "no"|"algo"|"mucha"|null, "napaAlta": boolean|null, "bajoHeladizo": boolean|null,
"presupuesto": "bajo"|"medio"|"alto"|null, "plazoAnios": number|null, "destino": string|null, "notas": string|null},
"faltaPreguntar": [hasta 4 preguntas cortas, en español rioplatense, sobre lo que falta y más importa para decidir qué cultivar]}
Reglas: no inventes; si algo no se dice, null. "Salitre" = salinidad. "El fondo/el bajo se hiela" = bajoHeladizo true.
"Riego por manto" o "inundación" = manto. La aspersión como defensa contra heladas va en defensaHeladas, no en riego.
En "notas" resumí en una frase otros datos útiles (plagas, historia, objetivos).`;

export async function POST(req: Request) {
  const { texto } = (await req.json().catch(() => ({}))) as { texto?: string };
  if (!texto || texto.trim().length < 3) return Response.json({ error: "Texto vacío" }, { status: 400 });
  try {
    const raw = await chatJSON([
      { role: "system", content: SYSTEM },
      { role: "user", content: texto.slice(0, 4000) },
    ], 0.1);
    const r = ExtraccionSchema.parse(raw);
    return Response.json({ datos: { ...CHACRERO_VACIO, ...r.datos }, faltaPreguntar: r.faltaPreguntar, generadoPor: "ia" });
  } catch (e) {
    const local = extraerLocal(texto);
    return Response.json({ ...local, generadoPor: "reglas", aviso: e instanceof SinClaveError ? "IA no configurada" : "La IA no respondió; usamos reglas básicas" });
  }
}
