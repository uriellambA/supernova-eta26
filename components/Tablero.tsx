"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CULTIVOS } from "@/config/cultivos/alto-valle";
import { REGION } from "@/config/regions/alto-valle";
import { useRecurso } from "@/hooks/useRecurso";
import { armarResumen, compartirWhatsApp } from "@/lib/compartir";
import { armarContexto } from "@/lib/contexto";
import { calcularRiego, RESERVA_MM } from "@/lib/riego";
import { rankingCultivos } from "@/lib/scoring";
import { luzHelada, luzNieve, luzRiego, luzViento, type Luz } from "@/lib/semaforo";
import { claveChacra, guardar, leer } from "@/lib/storage";
import { CHACRERO_VACIO, type ClimaResumen, type DatosChacrero, type IndicadoresNasa, type NdviResumen, type NieveResumen, type RecomendacionIA } from "@/lib/types";
import { Asesor } from "./Asesor";
import { BotonEscuchar } from "./BotonVoz";
import { Informe } from "./Informe";
import { TabChacra } from "./tabs/TabChacra";
import { TabClima } from "./tabs/TabClima";
import { TabNasa } from "./tabs/TabNasa";
import { TabNieve } from "./tabs/TabNieve";
import { TabRiego, type ConfigRiego } from "./tabs/TabRiego";
import { Aviso, Semaforo, botonSecundario } from "./ui";

const TABS = [
  { id: "nasa", t: "🛰️ NASA" },
  { id: "chacra", t: "👨‍🌾 Mi chacra" },
  { id: "clima", t: "🌦️ Clima" },
  { id: "riego", t: "💧 Riego" },
  { id: "nieve", t: "🏔️ Nieve" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const cultivoDesdeUso = (uso: string | null) => {
  const u = (uso ?? "").toLowerCase();
  const c = CULTIVOS.find((x) => u.includes(x.id) || u.includes(x.nombre.split(" ")[0].toLowerCase()));
  return c?.id ?? (u.includes("pera") ? "peral" : u.includes("manzana") ? "manzano" : "peral");
};

export function Tablero() {
  const sp = useSearchParams();
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const valido = Number.isFinite(lat) && Number.isFinite(lon) && sp.get("lat") !== null;
  const lugar = sp.get("n") || REGION.zonas.find((z) => z.id === sp.get("zona"))?.nombre || "Mi chacra";
  const q = valido ? `lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}` : null;

  const nasa = useRecurso<IndicadoresNasa>(q && `/api/nasa?${q}`);
  const ndvi = useRecurso<NdviResumen>(q && `/api/ndvi?${q}`);
  const clima = useRecurso<ClimaResumen>(q && `/api/weather?${q}`);
  const nieve = useRecurso<NieveResumen>(valido ? "/api/nieve" : null);

  const clave = valido ? claveChacra(lat, lon) : "";
  const [tab, setTab] = useState<TabId>("nasa");
  const [ch, setChState] = useState<DatosChacrero>(CHACRERO_VACIO);
  const [cfg, setCfg] = useState<ConfigRiego>({ cultivoId: "peral", caudalGotero: 2, goterosHa: 5000 });
  const [reco, setRecoState] = useState<RecomendacionIA | null>(null);

  // Cargar lo guardado en el teléfono (IndexedDB)
  useEffect(() => {
    if (!clave) return;
    leer<DatosChacrero>(`chacrero:${clave}`).then((r) => {
      if (r) {
        setChState({ ...CHACRERO_VACIO, ...r.v });
        setCfg((c) => ({ ...c, cultivoId: cultivoDesdeUso(r.v.usoActual) }));
      }
    });
    leer<RecomendacionIA>(`reco:${clave}`).then((r) => r && setRecoState(r.v));
  }, [clave]);

  const setCh = useCallback((c: DatosChacrero) => {
    setChState(c);
    if (clave) guardar(`chacrero:${clave}`, c);
  }, [clave]);
  const setReco = useCallback((r: RecomendacionIA) => {
    setRecoState(r);
    if (clave) guardar(`reco:${clave}`, r);
  }, [clave]);

  const ranking = useMemo(() => (nasa.data ? rankingCultivos(nasa.data, ch, nieve.data) : null), [nasa.data, ch, nieve.data]);

  const cultivoRiego = CULTIVOS.find((c) => c.id === cfg.cultivoId) ?? CULTIVOS[0];
  const riego = useMemo(() => {
    if (!clima.data) return null;
    return calcularRiego(
      {
        cultivo: cultivoRiego,
        ha: ch.superficieHa ?? 1,
        sistema: ch.riego ?? REGION.riego.sistemaDefault,
        turnoDias: Math.min(16, ch.turnoDias ?? REGION.riego.turnoDefaultDias),
        diasDesdeRiego: Math.min(10, ch.diasDesdeRiego ?? 0),
        textura: (ch.textura ?? "franco") as keyof typeof RESERVA_MM,
        caudalGotero: cfg.caudalGotero,
        goterosHa: cfg.goterosHa,
      },
      clima.data.dias,
      nasa.data?.mensual ?? null,
    );
  }, [clima.data, nasa.data, ch, cfg, cultivoRiego]);

  const luces: Luz[] = useMemo(() => {
    const l: Luz[] = [];
    if (clima.data) l.push(luzHelada(clima.data, ch), luzViento(clima.data));
    l.push(luzRiego(ch.diasDesdeRiego !== null && riego ? riego.ratio : null, ch.diasDesdeRiego !== null && riego ? riego.deficit : null));
    if (nieve.data) l.push(luzNieve(nieve.data));
    return l;
  }, [clima.data, nieve.data, ch, riego]);

  const armar = useCallback(
    () => (nasa.data && ranking ? armarContexto(lugar, lat, lon, nasa.data, ch, clima.data, nieve.data, ndvi.data, ranking) : null),
    [nasa.data, ranking, lugar, lat, lon, ch, clima.data, nieve.data, ndvi.data],
  );

  const compartir = () =>
    compartirWhatsApp(
      armarResumen({ lugar, ha: ch.superficieHa, luces, ranking, nieve: nieve.data, riegoMm: riego ? riego.brutaTurno : null, url: window.location.href }),
    );

  const resumenHoy = luces.map((l) => `${l.titulo}: ${l.texto}`).join(". ");

  if (!valido)
    return (
      <main className="mx-auto max-w-xl flex-1 p-6">
        <Aviso tipo="error">Falta la ubicación de la chacra.</Aviso>
        <Link href="/" className={`${botonSecundario} mt-4`}>← Elegir en el mapa</Link>
      </main>
    );

  return (
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-4 print:hidden">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <Link href="/" className="text-sm font-semibold text-emerald-800">← Cambiar chacra</Link>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">📍 {lugar}</h1>
            <p className="text-sm text-slate-500">
              {lat.toFixed(3)}, {lon.toFixed(3)} · {REGION.nombre}
              {ch.superficieHa ? ` · ${ch.superficieHa} ha` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {luces.length > 0 && <BotonEscuchar texto={`Estado de hoy en ${lugar}. ${resumenHoy}`} etiqueta="Escuchar el día" />}
            <button className={botonSecundario} onClick={compartir}>📲 WhatsApp</button>
            <button className={botonSecundario} onClick={() => window.print()}>📄 PDF</button>
          </div>
        </div>

        <section aria-label="Estado de hoy" className="mb-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">🚦 Estado de hoy</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {luces.map((l) => <Semaforo key={l.id} nivel={l.nivel} titulo={l.titulo} texto={l.texto} fuente={l.fuente} />)}
            {clima.estado === "cargando" && <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />}
          </div>
        </section>

        <nav className="sticky top-[61px] z-[900] -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 bg-[var(--fondo)]/95 px-4 py-2 backdrop-blur" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${tab === t.id ? "bg-emerald-700 text-white shadow" : "text-slate-700 hover:bg-white"}`}
            >
              {t.t}
            </button>
          ))}
        </nav>

        <div role="tabpanel">
          {tab === "nasa" && <TabNasa nasa={nasa} ndvi={ndvi} bajo={!!ch.bajoHeladizo} />}
          {tab === "chacra" && <TabChacra ch={ch} setCh={setCh} />}
          {tab === "clima" && <TabClima clima={clima} bajo={!!ch.bajoHeladizo} />}
          {tab === "riego" && <TabRiego ch={ch} setCh={setCh} cfg={cfg} setCfg={setCfg} res={riego} luz={luces.find((l) => l.id === "riego") ?? null} nieve={nieve.data} />}
          {tab === "nieve" && <TabNieve nieve={nieve} />}
        </div>
      </main>

      <Asesor ranking={ranking} armar={armar} clima={clima.data} ch={ch} reco={reco} setReco={setReco} onCompartir={compartir} listo={!!ranking} />

      <Informe
        lugar={lugar} lat={lat} lon={lon} ch={ch} luces={luces} nasa={nasa.data} ranking={ranking} reco={reco}
        riego={riego} nieve={nieve.data} cultivoRiego={cultivoRiego.nombre}
      />
    </>
  );
}
