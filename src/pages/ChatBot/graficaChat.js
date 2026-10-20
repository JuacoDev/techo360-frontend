// Modelo de datos de la grafica del chat (paso 7.6). Funcion pura, sin React ni imports de Vite, para probarla con
// `node --test` (ver graficaChat.test.js). GraficaChat.jsx solo dibuja lo que aqui se prepara.
//
// Payload REAL del backend (claude/fase7-6-payload.md, `MensajeResponse.grafica`, solo en el mensaje del asistente):
//   { v: 1, tipo, modo, variables[], zonas[], anios[], titulo?,
//     datos: [{ variable, zona, nombre: "Municipio (Departamento)", anio, valor, origen: "real"|"proyeccion", fiabilidad: null|0-100 }],
//     universo: null | { periodo: [desde, hasta], estadisticos: { <variable>: { media, min, q1, mediana, q3, max, n } } } }
// La especificacion ya viene validada; el frontend NO consulta nada ni calcula cifras: dibuja `datos`. Todo lo que no
// sea origen "real" es proyeccion (misma regla que Reportes); la fiabilidad solo se muestra en lo proyectado.
// Cualquier payload que no se pueda dibujar (v desconocida, tipo fuera de los 4 dibujables, forma rota, sin datos)
// devuelve { ok: false }: el chat muestra solo el texto y nunca falla por la grafica.
import { buscarVariable, formatearNumero } from "../Proyeccion/variablesProyeccion.js";

export const VERSION_PAYLOAD = 1;
export const TIPOS_DIBUJABLES = ["lineas", "barras_ranking", "barras_agrupadas", "gauge"];

const esNumero = (v) => v !== null && v !== undefined && v !== "" && typeof v !== "boolean" && Number.isFinite(Number(v));
const esObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const texto = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));

function puntosValidos(grafica) {
  if (!Array.isArray(grafica.datos)) return [];
  return grafica.datos
    .filter((p) => esObjeto(p) && esNumero(p.valor) && esNumero(p.anio) && p.zona != null && p.variable)
    .map((p) => ({
      variable: texto(p.variable),
      zona: texto(p.zona),
      nombre: texto(p.nombre),
      anio: Number(p.anio),
      valor: Number(p.valor),
      proyeccion: p.origen !== "real",
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
  let nota = `Proyección desde ${proy.desde}`;
  if (proy.fiabilidadMin !== null) {
    const a = formatearNumero(proy.fiabilidadMin, 0);
    const b = formatearNumero(proy.fiabilidadMax, 0);
    nota += a === b ? ` · fiabilidad ${a} %` : ` · fiabilidad ${a}–${b} %`;
  }
  return nota;
}

// Estadisticos nacionales de una variable ({ media, ... }) y su periodo; null si no vienen o estan rotos.
function universoDe(grafica, variable) {
  const u = grafica.universo;
  const est = esObjeto(u) && esObjeto(u.estadisticos) ? u.estadisticos[variable] : null;
  if (!esObjeto(est) || !esNumero(est.media)) return null;
  const periodo = Array.isArray(u.periodo) && u.periodo.length === 2 && u.periodo.every(esNumero) ? u.periodo.map(Number) : null;
  return { media: Number(est.media), periodo };
}

export function etiquetaPeriodo(periodo) {
  if (!periodo) return "";
  return periodo[0] === periodo[1] ? ` (${periodo[0]})` : ` (${periodo[0]}–${periodo[1]})`;
}

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

// Nombre para mostrar de una zona: el `nombre` que manda el backend ("Municipio (Departamento)"), o el codigo.
function nombresDeZona(puntos) {
  const nombres = new Map();
  for (const p of puntos) if (p.nombre && !nombres.has(p.zona)) nombres.set(p.zona, p.nombre);
  return (zona) => nombres.get(zona) ?? zona;
}

function lineas(puntos, variable, nombreZona) {
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
    const nombre = nombreZona(z);
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

function ranking(grafica, puntos, variable, nombreZona) {
  const ultimos = ultimoPorSerie(puntos.filter((p) => p.variable === variable));
  if (ultimos.length === 0) return { ok: false, motivo: "Sin datos para ordenar." };
  const filas = ultimos
    .map((p) => ({ clave: p.zona, nombre: nombreZona(p.zona), valor: p.valor, anio: p.anio, proyeccion: p.proyeccion }))
    .sort((a, b) => b.valor - a.valor);
  return { ok: true, filas, universo: universoDe(grafica, variable), puntos: ultimos };
}

function agrupadas(puntos, variables, nombreZona) {
  const ultimos = ultimoPorSerie(puntos.filter((p) => variables.includes(p.variable)));
  if (ultimos.length === 0) return { ok: false, motivo: "Sin datos para agrupar." };
  const zonas = [...new Set(ultimos.map((p) => p.zona))];
  const filas = zonas.map((z) => {
    const fila = { clave: z, nombre: nombreZona(z), proyeccion: {} };
    for (const p of ultimos.filter((x) => x.zona === z)) {
      fila[p.variable] = p.valor;
      fila.proyeccion[p.variable] = p.proyeccion;
    }
    return fila;
  });
  const series = variables.filter((v) => ultimos.some((p) => p.variable === v)).map((v) => ({ clave: v, nombre: buscarVariable(v).nombre }));
  return { ok: true, filas, series, puntos: ultimos };
}

function medidor(grafica, puntos, variable, nombreZona) {
  const [punto] = ultimoPorSerie(puntos.filter((p) => p.variable === variable)).sort((a, b) => b.anio - a.anio);
  if (!punto) return { ok: false, motivo: "Sin dato para el medidor." };
  const cfg = buscarVariable(variable);
  // Escala: el score va de 0 a 1; el resto de variables permitidas (coberturas, deficits) son porcentajes. Se muestra
  // el valor del municipio contra la escala; no se recalcula (fase7-6-payload §3, nota del score).
  const maximo = cfg.unidad === "%" ? 100 : 1;
  return {
    ok: true,
    medidor: {
      valor: punto.valor,
      maximo,
      anio: punto.anio,
      zona: nombreZona(punto.zona),
      proyeccion: punto.proyeccion,
      fraccion: Math.min(1, Math.max(0, punto.valor / maximo)),
      universo: universoDe(grafica, variable),
    },
    puntos: [punto],
  };
}

// Devuelve { ok:false, motivo } cuando no hay nada que dibujar (el texto se muestra igual) o el modelo listo.
export function prepararGrafica(grafica) {
  if (!esObjeto(grafica)) return { ok: false, motivo: "Sin gráfica." };
  if (grafica.v !== VERSION_PAYLOAD) return { ok: false, motivo: "Versión de payload desconocida." };
  if (!TIPOS_DIBUJABLES.includes(grafica.tipo)) return { ok: false, motivo: `Tipo no dibujable en el chat: ${texto(grafica.tipo)}.` };
  const variables = Array.isArray(grafica.variables) ? grafica.variables.filter((v) => typeof v === "string") : [];
  if (variables.length === 0) return { ok: false, motivo: "Sin variables." };
  const puntos = puntosValidos(grafica);
  if (puntos.length === 0) return { ok: false, motivo: "Sin datos." };
  const nombreZona = nombresDeZona(puntos);

  let r;
  if (grafica.tipo === "lineas") r = lineas(puntos, variables[0], nombreZona);
  else if (grafica.tipo === "barras_ranking") r = ranking(grafica, puntos, variables[0], nombreZona);
  else if (grafica.tipo === "barras_agrupadas") r = agrupadas(puntos, variables, nombreZona);
  else r = medidor(grafica, puntos, variables[0], nombreZona);
  if (!r.ok) return r;

  const cfg = buscarVariable(variables[0]);
  // `titulo` solo si el modelo lo emitio (texto plano <= 80); si no, se deriva de las variables.
  const titulo =
    typeof grafica.titulo === "string" && grafica.titulo.trim()
      ? grafica.titulo.trim().slice(0, 80)
      : variables.length === 1
        ? cfg.nombre
        : variables.map((v) => buscarVariable(v).nombre).join(" y ");
  return {
    ok: true,
    tipo: grafica.tipo,
    titulo,
    variable: variables[0],
    unidad: cfg.unidad,
    decimales: cfg.decimales,
    filas: r.filas ?? [],
    series: r.series ?? [],
    medidor: r.medidor ?? null,
    universo: r.universo ?? null,
    proyeccion: resumenProyeccion(r.puntos),
  };
}
