"use client";
import { CULTIVOS } from "@/config/cultivos/alto-valle";
import { REGION } from "@/config/regions/alto-valle";
import { NOMBRE_SISTEMA, type calcularRiego } from "@/lib/riego";
import type { Luz } from "@/lib/semaforo";
import type { DatosChacrero, NieveResumen, SistemaRiego } from "@/lib/types";
import { Aviso, Dato, Fuente, Semaforo, Tarjeta, campo } from "../ui";

export type ConfigRiego = { cultivoId: string; caudalGotero: number; goterosHa: number };

export function TabRiego({
  ch, setCh, cfg, setCfg, res, luz, nieve,
}: {
  ch: DatosChacrero; setCh: (c: DatosChacrero) => void; cfg: ConfigRiego; setCfg: (c: ConfigRiego) => void;
  res: ReturnType<typeof calcularRiego> | null; luz: Luz | null; nieve: NieveResumen | null;
}) {
  const upd = <K extends keyof DatosChacrero>(k: K, v: DatosChacrero[K]) => setCh({ ...ch, [k]: v });
  const sistema = ch.riego ?? REGION.riego.sistemaDefault;
  const fmt = (n: number) => n.toLocaleString("es-AR");
  return (
    <div className="space-y-4">
      <Tarjeta titulo="💧 Calculadora de riego" extra={<Fuente>Open-Meteo ET0 · NASA POWER · FAO-56</Fuente>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Cultivo</span>
            <select className={campo} value={cfg.cultivoId} onChange={(e) => setCfg({ ...cfg, cultivoId: e.target.value })}>
              {CULTIVOS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Superficie (ha)</span>
            <input type="number" min={0.1} step={0.1} className={campo} value={ch.superficieHa ?? 1} onChange={(e) => upd("superficieHa", Number(e.target.value) || null)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Sistema</span>
            <select className={campo} value={sistema} onChange={(e) => upd("riego", e.target.value as SistemaRiego)}>
              {(Object.keys(NOMBRE_SISTEMA) as SistemaRiego[]).map((s) => <option key={s} value={s}>{NOMBRE_SISTEMA[s]}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Turno cada (días)</span>
            <input type="number" min={1} max={16} className={campo} value={ch.turnoDias ?? REGION.riego.turnoDefaultDias} onChange={(e) => upd("turnoDias", Number(e.target.value) || null)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Último riego hace (días)</span>
            <input type="number" min={0} max={10} className={campo} value={ch.diasDesdeRiego ?? ""} placeholder="?" onChange={(e) => upd("diasDesdeRiego", e.target.value === "" ? null : Number(e.target.value))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Suelo</span>
            <select className={campo} value={ch.textura ?? "franco"} onChange={(e) => upd("textura", e.target.value as DatosChacrero["textura"])}>
              <option value="arenoso">Arenoso</option><option value="franco">Franco</option><option value="arcilloso">Arcilloso</option>
            </select>
          </label>
          {sistema === "goteo" && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Caudal del gotero (L/h)</span>
                <input type="number" min={0.5} step={0.1} className={campo} value={cfg.caudalGotero} onChange={(e) => setCfg({ ...cfg, caudalGotero: Number(e.target.value) || 0 })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Goteros por ha</span>
                <input type="number" min={100} step={100} className={campo} value={cfg.goterosHa} onChange={(e) => setCfg({ ...cfg, goterosHa: Number(e.target.value) || 0 })} />
              </label>
            </>
          )}
        </div>
      </Tarjeta>

      {!res ? (
        <Aviso>Esperando el pronóstico para calcular…</Aviso>
      ) : (
        <>
          {luz && <Semaforo nivel={luz.nivel} titulo="Estado del riego hoy" texto={luz.texto} fuente={luz.fuente} />}
          <Tarjeta titulo={`Para tu próximo turno (${res.diasCalculados} días)`}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Dato etiqueta="El cultivo va a consumir" valor={res.etcTurno} unidad="mm" />
              <Dato etiqueta="Lluvia aprovechable" valor={res.lluviaEfTurno} unidad="mm" />
              <Dato etiqueta={`Hay que aplicar (${NOMBRE_SISTEMA[sistema].toLowerCase()})`} valor={res.brutaTurno} unidad="mm" ayuda={`Neto ${res.netaTurno} mm ÷ eficiencia`} />
              <Dato etiqueta="Volumen" valor={fmt(res.m3Turno)} unidad="m³" ayuda={`Para ${ch.superficieHa ?? 1} ha`} />
              {sistema === "goteo" && <Dato etiqueta="Horas de goteo" valor={res.horasGoteo} unidad="h" ayuda="En total para el período" />}
            </div>
          </Tarjeta>
          {res.temporada && (
            <Tarjeta titulo="📅 Temporada completa (septiembre a abril)" extra={<Fuente>NASA POWER (climatología)</Fuente>}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Dato etiqueta="Necesidad neta del cultivo" valor={fmt(res.temporada.netaMm)} unidad="mm" />
                <Dato etiqueta={`Con ${NOMBRE_SISTEMA[sistema].toLowerCase()}`} valor={fmt(res.temporada.m3Sistema)} unidad="m³" />
                <Dato etiqueta="Con goteo" valor={fmt(res.temporada.m3Goteo)} unidad="m³" />
                <Dato etiqueta="Ahorro pasando a goteo" valor={res.temporada.ahorroM3 > 0 ? fmt(res.temporada.ahorroM3) : "—"} unidad={res.temporada.ahorroM3 > 0 ? "m³" : ""} />
              </div>
              {res.temporada.ahorroM3 > 0 && (
                <p className="mt-3 text-sm text-emerald-900">
                  💡 Con goteo usarías ~<b>{Math.round((res.temporada.ahorroM3 / res.temporada.m3Sistema) * 100)} % menos agua</b> por temporada.
                </p>
              )}
            </Tarjeta>
          )}
          {nieve && nieve.indice < 0.9 && (
            <Aviso tipo="alerta">🏔️ La nieve en la cordillera está al {Math.round(nieve.indice * 100)} % de lo normal: el agua del verano puede venir justa. Priorizá los cultivos que menos agua piden y el goteo.</Aviso>
          )}
          <p className="text-xs text-slate-500">
            Cálculo: consumo = ET0 × Kc del cultivo · lluvia aprovechable = 75 % de lluvias &gt; 5 mm · eficiencias: manto 45 %, surco 55 %, aspersión 75 %, goteo 90 %. Valores orientativos: validar con INTA Alto Valle.
          </p>
        </>
      )}
    </div>
  );
}
