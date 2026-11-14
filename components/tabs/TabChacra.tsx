"use client";
import { useState } from "react";
import type { DatosChacrero } from "@/lib/types";
import { extraerLocal } from "@/lib/extraccionLocal";
import { useOnline } from "@/hooks/useOnline";
import { BotonDictar } from "../BotonVoz";
import { Aviso, Fuente, Tarjeta, botonPrimario, campo } from "../ui";

const EJEMPLO =
  "Tengo 10 hectáreas en Allen, perales Williams de 40 años, riego a manto con turno cada 10 días, regué hace 6 días. El fondo de la chacra se me hiela siempre y abajo es medio salitroso. No tengo defensa contra heladas. Quiero algo que me dé plata en 4 años.";

type Opcion<T> = { v: T; t: string };
function Selector<T extends string | boolean>({ etiqueta, valor, opciones, onCambio }: { etiqueta: string; valor: T | null; opciones: Opcion<T>[]; onCambio: (v: T | null) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{etiqueta}</span>
      <select className={campo} value={valor === null ? "" : String(valor)} onChange={(e) => onCambio(e.target.value === "" ? null : (opciones.find((o) => String(o.v) === e.target.value)?.v ?? null))}>
        <option value="">— no sé / sin dato —</option>
        {opciones.map((o) => (
          <option key={String(o.v)} value={String(o.v)}>{o.t}</option>
        ))}
      </select>
    </label>
  );
}
function Numero({ etiqueta, valor, onCambio, unidad }: { etiqueta: string; valor: number | null; onCambio: (v: number | null) => void; unidad?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{etiqueta}{unidad ? ` (${unidad})` : ""}</span>
      <input type="number" inputMode="decimal" min={0} className={campo} value={valor ?? ""} onChange={(e) => onCambio(e.target.value === "" ? null : Number(e.target.value))} />
    </label>
  );
}
const SI_NO: Opcion<boolean>[] = [{ v: true, t: "Sí" }, { v: false, t: "No" }];

export function TabChacra({ ch, setCh }: { ch: DatosChacrero; setCh: (c: DatosChacrero) => void }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"" | "pensando">("");
  const [preguntas, setPreguntas] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [detectados, setDetectados] = useState<string[]>([]);
  const online = useOnline();
  const upd = <K extends keyof DatosChacrero>(k: K, v: DatosChacrero[K]) => setCh({ ...ch, [k]: v });

  async function interpretar() {
    if (texto.trim().length < 3) return;
    setEstado("pensando");
    setAviso(null);
    let r: { datos: DatosChacrero; faltaPreguntar: string[]; generadoPor?: string; aviso?: string };
    try {
      if (!online) throw new Error("offline");
      const res = await fetch("/api/farmer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
      if (!res.ok) throw new Error(String(res.status));
      r = await res.json();
    } catch {
      r = { ...extraerLocal(texto), generadoPor: "reglas", aviso: "Sin conexión: usamos reglas básicas" };
    }
    const nuevos = Object.entries(r.datos).filter(([k, v]) => v !== null && v !== "" && k !== "notas");
    setCh({ ...ch, ...Object.fromEntries(nuevos), notas: r.datos.notas ?? ch.notas });
    setDetectados(nuevos.map(([k]) => k));
    setPreguntas(r.faltaPreguntar ?? []);
    setAviso(r.generadoPor === "ia" ? "🤖 La IA ordenó tus datos. Revisalos abajo y corregí lo que haga falta." : `⚙️ ${r.aviso ?? "Usamos reglas básicas"}. Revisá los datos abajo.`);
    setEstado("");
  }

  const marca = (k: keyof DatosChacrero) => (detectados.includes(k) ? "rounded-xl ring-2 ring-emerald-500/60 ring-offset-2" : "");

  return (
    <div className="space-y-4">
      <Tarjeta titulo="👨‍🌾 Contame de tu chacra" extra={<Fuente>Lo dijiste vos · procesado con IA</Fuente>}>
        <p className="mb-2 text-sm text-slate-600">Escribí o dictá como se lo contarías a un vecino. La IA lo ordena y te pregunta lo que falta.</p>
        <textarea className={`${campo} min-h-32`} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={EJEMPLO} />
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <BotonDictar valor={texto} onCambio={setTexto} />
          <button type="button" className={botonPrimario} onClick={interpretar} disabled={estado === "pensando" || texto.trim().length < 3}>
            {estado === "pensando" ? "Pensando…" : "🤖 Ordenar con IA"}
          </button>
          <button type="button" className="text-sm text-emerald-800 underline" onClick={() => setTexto(EJEMPLO)}>
            Usar ejemplo de Don Raúl
          </button>
        </div>
        {aviso && <div className="mt-3"><Aviso>{aviso}</Aviso></div>}
        {preguntas.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <b>Para afinar la recomendación, contame:</b>
            <ul className="mt-1 list-disc pl-5">{preguntas.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="📋 Datos de la chacra">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className={marca("superficieHa")}><Numero etiqueta="Superficie" unidad="ha" valor={ch.superficieHa} onCambio={(v) => upd("superficieHa", v)} /></div>
          <label className={`block text-sm ${marca("usoActual")}`}>
            <span className="mb-1 block font-medium text-slate-700">Uso actual</span>
            <input className={campo} value={ch.usoActual ?? ""} onChange={(e) => upd("usoActual", e.target.value || null)} placeholder="Ej.: perales Williams" />
          </label>
          <div className={marca("edadMonte")}><Numero etiqueta="Edad del monte" unidad="años" valor={ch.edadMonte} onCambio={(v) => upd("edadMonte", v)} /></div>
          <div className={marca("riego")}><Selector etiqueta="Sistema de riego" valor={ch.riego} onCambio={(v) => upd("riego", v)} opciones={[{ v: "manto", t: "Manto" }, { v: "surco", t: "Surco" }, { v: "aspersion", t: "Aspersión" }, { v: "goteo", t: "Goteo" }]} /></div>
          <div className={marca("turnoDias")}><Numero etiqueta="Turno de riego cada" unidad="días" valor={ch.turnoDias} onCambio={(v) => upd("turnoDias", v)} /></div>
          <div className={marca("diasDesdeRiego")}><Numero etiqueta="Último riego hace" unidad="días" valor={ch.diasDesdeRiego} onCambio={(v) => upd("diasDesdeRiego", v)} /></div>
          <div className={marca("pozo")}><Selector etiqueta="¿Tiene pozo?" valor={ch.pozo} onCambio={(v) => upd("pozo", v)} opciones={SI_NO} /></div>
          <div className={marca("defensaHeladas")}><Selector etiqueta="Defensa contra heladas" valor={ch.defensaHeladas} onCambio={(v) => upd("defensaHeladas", v)} opciones={[{ v: "ninguna", t: "Ninguna" }, { v: "aspersion", t: "Aspersión" }, { v: "calefactores", t: "Calefactores" }, { v: "ventiladores", t: "Ventiladores / molinos" }]} /></div>
          <div className={marca("bajoHeladizo")}><Selector etiqueta="¿Tiene un bajo que se hiela?" valor={ch.bajoHeladizo} onCambio={(v) => upd("bajoHeladizo", v)} opciones={SI_NO} /></div>
          <div className={marca("mallaAntigranizo")}><Selector etiqueta="Malla antigranizo" valor={ch.mallaAntigranizo} onCambio={(v) => upd("mallaAntigranizo", v)} opciones={SI_NO} /></div>
          <div className={marca("cortinas")}><Selector etiqueta="Cortinas de álamos" valor={ch.cortinas} onCambio={(v) => upd("cortinas", v)} opciones={SI_NO} /></div>
          <div className={marca("textura")}><Selector etiqueta="Suelo" valor={ch.textura} onCambio={(v) => upd("textura", v)} opciones={[{ v: "arenoso", t: "Arenoso (liviano)" }, { v: "franco", t: "Franco" }, { v: "arcilloso", t: "Arcilloso (pesado)" }]} /></div>
          <div className={marca("salinidad")}><Selector etiqueta="Salitre" valor={ch.salinidad} onCambio={(v) => upd("salinidad", v)} opciones={[{ v: "no", t: "No" }, { v: "algo", t: "Algo" }, { v: "mucha", t: "Mucho" }]} /></div>
          <div className={marca("napaAlta")}><Selector etiqueta="Napa alta" valor={ch.napaAlta} onCambio={(v) => upd("napaAlta", v)} opciones={SI_NO} /></div>
          <div className={marca("presupuesto")}><Selector etiqueta="Presupuesto" valor={ch.presupuesto} onCambio={(v) => upd("presupuesto", v)} opciones={[{ v: "bajo", t: "Bajo" }, { v: "medio", t: "Medio" }, { v: "alto", t: "Alto" }]} /></div>
          <div className={marca("plazoAnios")}><Numero etiqueta="¿En cuántos años querés producir?" unidad="años" valor={ch.plazoAnios} onCambio={(v) => upd("plazoAnios", v)} /></div>
          <label className="block text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium text-slate-700">Notas</span>
            <input className={campo} value={ch.notas ?? ""} onChange={(e) => upd("notas", e.target.value || null)} />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">💾 Se guarda en tu teléfono (no hace falta cuenta). Los cambios actualizan el semáforo, el riego y la recomendación.</p>
      </Tarjeta>
    </div>
  );
}
