import type { ClimaResumen, DatosChacrero, Nivel, NieveResumen } from "./types";

export const CORRECCION_BAJO = -1.5; // °C: un bajo heladizo suele ser más frío que la celda satelital

export type Luz = { id: string; titulo: string; nivel: Nivel; texto: string; fuente: string };

export function nivelPuntaje(p: number): Nivel {
  return p >= 70 ? "verde" : p >= 40 ? "amarillo" : "rojo";
}

const diaSemana = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "numeric" });

export function luzHelada(clima: ClimaResumen, ch: DatosChacrero): Luz {
  const corr = ch.bajoHeladizo ? CORRECCION_BAJO : 0;
  const prox = clima.dias.filter((d) => !d.pasado).slice(0, 7);
  const peor = prox.reduce((a, b) => (b.tmin < a.tmin ? b : a), prox[0]);
  if (!peor) return { id: "helada", titulo: "Helada", nivel: "amarillo", texto: "Sin pronóstico", fuente: "Open-Meteo" };
  const t = +(peor.tmin + corr).toFixed(1);
  const nivel: Nivel = t <= 0 ? "rojo" : t <= 2 ? "amarillo" : "verde";
  const cuando = `${diaSemana(peor.fecha)}${peor.horaMin ? ` a las ${peor.horaMin}` : ""}`;
  const texto =
    nivel === "rojo"
      ? `Helada de ${t} °C el ${cuando}. Prepará la defensa.`
      : nivel === "amarillo"
        ? `Mínima de ${t} °C el ${cuando}. Atento.`
        : `Sin heladas en 7 días (mínima ${t} °C).`;
  return { id: "helada", titulo: "Helada", nivel, texto: texto + (corr ? " (corregido por bajo heladizo)" : ""), fuente: "Open-Meteo" };
}

export function luzViento(clima: ClimaResumen): Luz {
  const prox = clima.dias.filter((d) => !d.pasado).slice(0, 3);
  const max = Math.max(...prox.map((d) => d.rafagas), 0);
  const nivel: Nivel = max > 60 ? "rojo" : max >= 40 ? "amarillo" : "verde";
  const texto =
    nivel === "rojo" ? `Ráfagas de hasta ${Math.round(max)} km/h. No pulverices.` : nivel === "amarillo" ? `Ráfagas de ${Math.round(max)} km/h. Pulverizá temprano.` : `Viento tranquilo (${Math.round(max)} km/h).`;
  return { id: "viento", titulo: "Viento", nivel, texto, fuente: "Open-Meteo" };
}

export function luzRiego(ratio: number | null, deficit: number | null): Luz {
  if (ratio === null || deficit === null)
    return { id: "riego", titulo: "Riego", nivel: "amarillo", texto: "Cargá cuándo regaste en «Mi chacra».", fuente: "Lo dijiste vos" };
  const nivel: Nivel = ratio > 0.8 ? "rojo" : ratio >= 0.5 ? "amarillo" : "verde";
  const texto =
    nivel === "rojo" ? `El suelo perdió ~${Math.round(deficit)} mm. Regá o pedí turno.` : nivel === "amarillo" ? `Se consumió ~${Math.round(deficit)} mm. Planificá el riego.` : `Humedad OK (−${Math.round(deficit)} mm).`;
  return { id: "riego", titulo: "Riego", nivel, texto, fuente: "Open-Meteo + vos" };
}

export function luzNieve(n: NieveResumen): Luz {
  const pct = Math.round(n.indice * 100);
  const nivel: Nivel = n.indice >= 0.9 ? "verde" : n.indice >= 0.6 ? "amarillo" : "rojo";
  const texto =
    nivel === "verde" ? `Nieve al ${pct} % de lo normal. Buen año de agua.` : nivel === "amarillo" ? `Nieve al ${pct} % de lo normal. Cuidá el agua.` : `Nieve al ${pct} % de lo normal. Verano con poca agua.`;
  return { id: "nieve", titulo: "Nieve", nivel, texto, fuente: n.simulado ? "Simulado" : "ERA5 / NASA GIBS" };
}
