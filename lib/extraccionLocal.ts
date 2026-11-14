import { CHACRERO_VACIO, type DatosChacrero } from "./types";

/** Extracción básica por reglas (respaldo cuando no hay IA o no hay conexión). */
export function extraerLocal(texto: string): { datos: DatosChacrero; faltaPreguntar: string[] } {
  const t = texto.toLowerCase();
  const d: DatosChacrero = { ...CHACRERO_VACIO, notas: texto.slice(0, 500) };
  const num = (re: RegExp) => {
    const m = t.match(re);
    return m ? Number(m[1].replace(",", ".")) : null;
  };
  d.superficieHa = num(/(\d+(?:[.,]\d+)?)\s*(?:ha\b|hect)/);
  d.turnoDias = num(/(?:cada|turno de)\s*(\d+)\s*d[ií]as/);
  d.diasDesdeRiego = num(/(?:regu[eé]|regamos|riego)\s*hace\s*(\d+)\s*d[ií]as/);
  d.edadMonte = num(/(\d+)\s*a[ñn]os\s*(?:de edad|de antig|viej)/) ?? num(/(?:perales|manzanos|monte|plantas)[^.,]{0,25}?de\s*(\d+)\s*a[ñn]os/);
  d.plazoAnios = num(/en\s*(\d+)\s*(?:o\s*\d+\s*)?a[ñn]os/);
  if (/goteo/.test(t)) d.riego = "goteo";
  else if (/aspersi[oó]n/.test(t) && !/defensa|helada/.test(t)) d.riego = "aspersion";
  else if (/surco/.test(t)) d.riego = "surco";
  else if (/manto|inundaci/.test(t)) d.riego = "manto";
  if (/pozo|perforaci/.test(t)) d.pozo = true;
  if (/calefactor|quemador/.test(t)) d.defensaHeladas = "calefactores";
  else if (/ventilador|molino/.test(t)) d.defensaHeladas = "ventiladores";
  else if (/aspersi[oó]n.*(helada|defensa)|(helada|defensa).*aspersi[oó]n/.test(t)) d.defensaHeladas = "aspersion";
  else if (/sin defensa|no tengo defensa/.test(t)) d.defensaHeladas = "ninguna";
  if (/malla/.test(t)) d.mallaAntigranizo = !/sin malla|no tengo malla/.test(t);
  if (/[aá]lamo|cortina/.test(t)) d.cortinas = true;
  if (/se (me )?hiela|bajo|helad[oa]s? fuerte/.test(t)) d.bajoHeladizo = true;
  if (/muy salit|mucho salit|mucha sal/.test(t)) d.salinidad = "mucha";
  else if (/salit|salin/.test(t)) d.salinidad = "algo";
  if (/napa/.test(t)) d.napaAlta = true;
  if (/arenos/.test(t)) d.textura = "arenoso";
  else if (/arcill|pesado/.test(t)) d.textura = "arcilloso";
  else if (/franco/.test(t)) d.textura = "franco";
  if (/peral|pera/.test(t)) d.usoActual = "Frutales de pepita (pera)";
  else if (/manzan/.test(t)) d.usoActual = "Frutales de pepita (manzana)";
  else if (/alfalfa|pastura/.test(t)) d.usoActual = "Alfalfa / pastura";
  else if (/huerta|hortaliz|verdura/.test(t)) d.usoActual = "Hortalizas";
  if (/poca plata|bajo presupuesto|sin plata/.test(t)) d.presupuesto = "bajo";
  const falta: string[] = [];
  if (d.superficieHa === null) falta.push("¿Cuántas hectáreas tiene?");
  if (d.riego === null) falta.push("¿Cómo riega? (manto, surco, aspersión o goteo)");
  if (d.textura === null) falta.push("¿Cómo es el suelo? (arenoso, franco o arcilloso)");
  if (d.defensaHeladas === null) falta.push("¿Tiene defensa contra heladas?");
  if (d.presupuesto === null) falta.push("¿Con qué presupuesto cuenta? (bajo, medio o alto)");
  return { datos: d, faltaPreguntar: falta };
}
