import { z } from "zod";

const nul = <T extends z.ZodTypeAny>(t: T) => t.nullable().optional().catch(null);

export const ChacreroSchema = z.object({
  superficieHa: nul(z.number().positive()),
  usoActual: nul(z.string()),
  edadMonte: nul(z.number().nonnegative()),
  riego: nul(z.enum(["manto", "surco", "aspersion", "goteo"])),
  turnoDias: nul(z.number().positive()),
  diasDesdeRiego: nul(z.number().nonnegative()),
  pozo: nul(z.boolean()),
  defensaHeladas: nul(z.enum(["ninguna", "aspersion", "calefactores", "ventiladores"])),
  mallaAntigranizo: nul(z.boolean()),
  cortinas: nul(z.boolean()),
  textura: nul(z.enum(["arenoso", "franco", "arcilloso"])),
  salinidad: nul(z.enum(["no", "algo", "mucha"])),
  napaAlta: nul(z.boolean()),
  bajoHeladizo: nul(z.boolean()),
  presupuesto: nul(z.enum(["bajo", "medio", "alto"])),
  plazoAnios: nul(z.number().nonnegative()),
  destino: nul(z.string()),
  notas: nul(z.string()),
});

export const ExtraccionSchema = z.object({
  datos: ChacreroSchema,
  faltaPreguntar: z.array(z.string()).catch([]),
});

export const RecomendacionSchema = z.object({
  recomendaciones: z
    .array(
      z.object({
        id: z.string(),
        cultivo: z.string(),
        porQue: z.array(z.string()).catch([]),
        riesgos: z.array(z.string()).catch([]),
        adaptaciones: z.array(z.string()).catch([]),
        calendario: z.string().catch(""),
      }),
    )
    .min(1),
  alertaCortoPlazo: z.string().nullable().catch(null),
  agua: z.string().nullable().catch(null),
  resumenVoz: z.string(),
  datosFaltantes: z.array(z.string()).catch([]),
  confianza: z.enum(["alta", "media", "baja"]).catch("media"),
});
