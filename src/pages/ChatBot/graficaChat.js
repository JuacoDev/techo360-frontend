// Modelo de datos de la grafica del chat (paso 7.6). Funcion pura, sin React ni imports de Vite, para probarla con
// `node --test` (ver graficaChat.test.js). GraficaChat.jsx solo dibuja lo que aqui se prepara.
//
// Contrato (PROPUESTO, claude/fase2-3-contrato-grafica.md §5; el definitivo lo fija claude/fase7-6-payload.md):
//   grafica = {
//     especificacion: { v: 1, tipo, modo, variables[], zonas[], anios[] },   // ya validada; el modelo no emite titulo (fase7-1 §3)
//     datos: {
//       zonas: { "68001": "Bucaramanga", ... },                                        // nombres para mostrar
//       puntos: [{ variable, zona, anio, valor, es_real, origen, fiabilidad }, ...],  // filas ya resueltas
//       universo: { <variable>: { promedio, minimo, maximo } },                       // solo gauge y ranking (fase7-1 §2.5)
//     },
//   }
// El frontend NO consulta nada ni calcula cifras: dibuja `puntos`. Real/proyeccion sale de esProyeccionZona (misma
// regla unica del resto del frontend); la fiabilidad solo se muestra en lo proyectado.
import { buscarVariable, esProyeccionZona, formatearNumero } from "../Proyeccion/variablesProyeccion.js";

export const TIPOS_DIBUJABLES = ["lineas", "barras_ranking", "barras_agrupadas", "gauge"];

const esNumero = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

function puntosValidos(grafica) {
  const bruto = grafica?.datos?.puntos;
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((p) => p && esNumero(p.valor) && esNumero(p.anio) && p.zona != null && p.variable)
    .map((p) => ({
      variable: String(p.variable),
      zona: String(p.zona),
      anio: Number(p.anio),
      valor: Number(p.valor),
      proyeccion: esProyeccionZona(p),
      fiabilidad: esNumero(p.fiabilidad) ? Number(p.fiabilidad) : null,
    }));
}

function resumenProyeccion(puntos) {
  const proy = puntos.filter((p) => p.proyeccion);
  if (proy.length === 0) return { hay: false, desde: null, fiabilidadMin: null, fiabilidadMax: null };
  const fiab = proy.map((p) => p.fiabilidad).filter((f) => f !== null);
  return {
    hay: true,
    desde: Math.min(...proy.map((p) => p.anio)),
    fiabilidadMin: fiab.length ? Math.min(...fiab) : null,
    fiabilidadMax: fiab.length ? Math.max(...fiab) : null,
  };
}

// Texto de la nota de proyeccion; null si todo es dato real.
export function notaProyeccion(proy) {
  if (!proy?.hay) return null;
  let texto = `Proyección desde ${proy.desde}`;
  if (proy.fiabilidadMin !== null) {
    const a = formatearNumero(proy.fiabilidadMin, 0);
    const b = formatearNumero(proy.fiabilidadMax, 0);
    texto += a === b ? ` · fiabilidad ${a} %` : ` · fiabilidad ${a}–${b} %`;
  }
  return texto;
}

const universoDe = (grafica, variable) => {
  const u = grafica?.datos?.universo?.[variable];
  return u && typeof u === "object" ? u : null;
};

const nombreZona = (grafica, codigo) => grafica?.datos?.zonas?.[codigo] ?? codigo;

// Punto mas reciente de cada (variable, zona).
function ultimoPorSerie(puntos) {
  const mapa = new Map();
  for (const p of puntos) {
    const clave = `${p.variable}|${p.zona}`;
    const previo = mapa.get(clave);
    if (!previo || p.anio > previo.anio) mapa.set(clave, p);
  }
  return [...mapa.values()];
}

function lineas(grafica, puntos, variable) {
  const porZona = new Map();
  for (const p of puntos.filter((x) => x.variable === variable)) {
    if (!porZona.has(p.zona)) porZona.set(p.zona, new Map());
    porZona.get(p.zona).set(p.anio, p);
  }
  // Abstencion (plan 7.1): una linea necesita al menos dos puntos; las zonas con menos se descartan.
  const zonas = [...porZona.entries()].filter(([, m]) => m.size >= 2).map(([z]) => z);
  if (zonas.length === 0) return { ok: false, motivo: "Sin al menos dos puntos para dibujar la evolución." };
  const anios = [...new Set(zonas.flatMap((z) => [...porZona.get(z).keys()]))].sort((a, b) => a - b);
  // Cada zona son dos series: real y proyectada. La proyectada arranca en el ultimo punto real para que la
  // linea punteada continue la continua sin hueco.
  const series = [];
  const filas = anios.map((anio) => ({ anio }));
  for (const z of zonas) {
    const m = porZona.get(z);
    const nombre = nombreZona(grafica, z);
    const ordenados = [...m.values()].sort((a, b) => a.anio - b.anio);
    const hayReal = ordenados.some((p) => !p.proyeccion);
    const hayProy = ordenados.some((p) => p.proyeccion);
    const ultimoReal = [...ordenados].reverse().find((p) => !p.proyeccion);
    if (hayReal) series.push({ clave: z, nombre, proyeccion: false });
    if (hayProy) series.push({ clave: `${z}__proy`, nombre: hayReal ? `${nombre} (proyección)` : nombre, proyeccion: true, zona: z });
    for (const fila of filas) {
      const p = m.get(fila.anio);
      if (!p) continue;
      if (!p.proyeccion) fila[z] = p.valor;
      else fila[`${z}__proy`] = p.valor;
    }
    if (hayProy && ultimoReal) {
      const fila = filas.find((f) => f.anio === ultimoReal.anio);
      if (fila) fila[`${z}__proy`] = ultimoReal.valor;
    }
  }
  return { ok: true, filas, series, puntos: zonas.flatMap((z) => [...porZona.get(z).values()]) };
}

function ranking(grafica, puntos, variable) {
  const ultimos = ultimoPorSerie(puntos.filter((p) => p.variable === variable));
  if (ultimos.length === 0) return { ok: false, motivo: "Sin datos para ordenar." };
  const filas = ultimos
    .map((p) => ({ clave: p.zona, nombre: nombreZona(grafica, p.zona), valor: p.valor, anio: p.anio, proyeccion: p.proyeccion }))
    .sort((a, b) => b.valor - a.valor);
  const ref = universoDe(grafica, variable)?.promedio;
  return { ok: true, filas, promedio: esNumero(ref) ? Number(ref) : null, puntos: ultimos };
}

function agrupadas(grafica, puntos, variables) {
  const ultimos = ultimoPorSerie(puntos.filter((p) => variables.includes(p.variable)));
  if (ultimos.length === 0) return { ok: false, motivo: "Sin datos para agrupar." };
  const zonas = [...new Set(ultimos.map((p) => p.zona))];
  const filas = zonas.map((z) => {
    const fila = { clave: z, nombre: nombreZona(grafica, z), proyeccion: {} };
    for (const p of ultimos.filter((x) => x.zona === z)) {
      fila[p.variable] = p.valor;
      fila.proyeccion[p.variable] = p.proyeccion;
    }
    return fila;
  });
  const series = variables.filter((v) => ultimos.some((p) => p.variable === v)).map((v) => ({ clave: v, nombre: buscarVariable(v).nombre }));
  return { ok: true, filas, series, puntos: ultimos };
}

function medidor(grafica, puntos, variable) {
  const [punto] = ultimoPorSerie(puntos.filter((p) => p.variable === variable)).sort((a, b) => b.anio - a.anio);
  if (!punto) return { ok: false, motivo: "Sin dato para el medidor." };
  const cfg = buscarVariable(variable);
  // Escala: el score va de 0 a 1; el resto de variables permitidas (coberturas, deficits) son porcentajes.
  const maximo = cfg.unidad === "%" ? 100 : 1;
  const ref = universoDe(grafica, variable)?.promedio;
  return {
    ok: true,
    medidor: {
      valor: punto.valor,
      maximo,
      anio: punto.anio,
      zona: nombreZona(grafica, punto.zona),
      proyeccion: punto.proyeccion,
      fraccion: Math.min(1, Math.max(0, punto.valor / maximo)),
      nacional: esNumero(ref) ? Number(ref) : null,
    },
    puntos: [punto],
  };
}

// Devuelve { ok:false, motivo } cuando no hay nada que dibujar (el texto se muestra igual) o el modelo listo.
export function prepararGrafica(grafica) {
  const spec = grafica?.especificacion;
  if (!spec || typeof spec !== "object") return { ok: false, motivo: "Sin especificación." };
  if (!TIPOS_DIBUJABLES.includes(spec.tipo)) return { ok: false, motivo: `Tipo no admitido en el chat: ${spec.tipo}.` };
  const variables = Array.isArray(spec.variables) ? spec.variables : [];
  if (variables.length === 0) return { ok: false, motivo: "Sin variables." };
  const puntos = puntosValidos(grafica);
  if (puntos.length === 0) return { ok: false, motivo: "Sin datos." };

  let r;
  if (spec.tipo === "lineas") r = lineas(grafica, puntos, variables[0]);
  else if (spec.tipo === "barras_ranking") r = ranking(grafica, puntos, variables[0]);
  else if (spec.tipo === "barras_agrupadas") r = agrupadas(grafica, puntos, variables);
  else r = medidor(grafica, puntos, variables[0]);
  if (!r.ok) return r;

  const cfg = buscarVariable(variables[0]);
  // El titulo siempre se deriva de las variables: el modelo no emite `titulo`.
  const titulo = variables.length === 1 ? cfg.nombre : variables.map((v) => buscarVariable(v).nombre).join(" y ");
  return {
    ok: true,
    tipo: spec.tipo,
    titulo,
    variable: variables[0],
    unidad: cfg.unidad,
    decimales: cfg.decimales,
    filas: r.filas ?? [],
    series: r.series ?? [],
    medidor: r.medidor ?? null,
    promedio: r.promedio ?? null,
    proyeccion: resumenProyeccion(r.puntos),
  };
}
