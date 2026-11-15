// Summary of a vegetation series (latest value + same time last year). No server code: also used in the browser.
import type { NdviResumen, PuntoNdvi } from "./types";

export function resumenNdvi(serie: PuntoNdvi[]): NdviResumen {
  const ultimo = serie.at(-1) ?? null;
  let anioAnterior: PuntoNdvi | null = null;
  if (ultimo) {
    const objetivo = Date.parse(ultimo.fecha) - 365 * 86_400_000;
    anioAnterior = serie.reduce<PuntoNdvi | null>((mejor, p) => {
      const dif = Math.abs(Date.parse(p.fecha) - objetivo);
      return dif < 20 * 86_400_000 && (!mejor || dif < Math.abs(Date.parse(mejor.fecha) - objetivo)) ? p : mejor;
    }, null);
  }
  return { serie, ultimo, anioAnterior };
}
