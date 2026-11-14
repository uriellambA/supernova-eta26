"use client";
import type { Estado } from "@/hooks/useRecurso";
import type { NieveResumen } from "@/lib/types";
import { EstadoDatos } from "../EstadoDatos";
import { TermometroNieve } from "../TermometroNieve";
import { Aviso, Cargando, Tarjeta } from "../ui";

export function TabNieve({ nieve }: { nieve: Estado<NieveResumen> }) {
  if (nieve.estado === "cargando") return <Cargando texto="Midiendo la nieve de la cordillera…" />;
  if (!nieve.data) return <Aviso tipo="error">No pudimos calcular la nieve: {nieve.error}</Aviso>;
  const n = nieve.data;
  const pct = Math.round(n.indice * 100);
  return (
    <div className="space-y-4">
      <EstadoDatos estado={nieve} fuente={n.fuente} simulado={n.simulado} />
      <Tarjeta titulo="🏔️ Termómetro de nieve: el agua de tu verano">
        <p className="mb-4 text-sm text-slate-600">
          El agua de riego del Alto Valle viene del deshielo. El Canal Principal toma del <b>río Neuquén</b> (dique Ballester), y el <b>Limay</b> se suma en Neuquén capital.
          Más nieve en invierno quiere decir más agua en el verano.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {n.cuencas.map((c) => <TermometroNieve key={c.id} c={c} />)}
        </div>
        <div className={`mt-4 rounded-xl p-3 text-sm ${n.indice >= 0.9 ? "bg-sky-50 text-sky-950" : n.indice >= 0.6 ? "bg-amber-50 text-amber-950" : "bg-red-50 text-red-950"}`}>
          <b>Índice para el Alto Valle: {pct} % de lo normal.</b>{" "}
          {n.indice >= 0.9
            ? "Buen año de nieve: no se esperan restricciones de agua."
            : n.indice >= 0.6
              ? "Algo menos de nieve que lo normal: el riego puede venir ajustado al final del verano. Los embalses amortiguan, pero conviene planificar."
              : "Poca nieve: el verano puede traer turnos más espaciados. Priorizá el goteo y los cultivos que menos agua piden."}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Nevadas acumuladas desde el 1/4 hasta {n.hasta}, comparadas con el mismo período de los 20 años anteriores. Con datos hasta el {n.hasta}.
          Para ver la nieve en imágenes de satélite de NASA, activá la capa «❄️ NASA nieve (MODIS NDSI)» en el mapa de inicio.
        </p>
      </Tarjeta>
    </div>
  );
}
