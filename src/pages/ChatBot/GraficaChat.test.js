// Pruebas del renderizador de graficas del chat (7.6) con payload SIMULADO (propuesto en fase2-3 §5; se ajusta al
// de claude/fase7-6-payload.md). Parte pura: graficaChat.js. Parte de componente: se carga el .jsx con Vite en modo
// SSR (sin DOM ni dependencias nuevas) y se mira el SVG que Recharts produce.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { notaProyeccion, prepararGrafica } from "./graficaChat.js";

const pt = (variable, zona, anio, valor, extra = {}) => ({ variable, zona, anio, valor, es_real: true, origen: "DANE-CNPV2018", fiabilidad: null, ...extra });
const proy = (variable, zona, anio, valor, fiabilidad) => pt(variable, zona, anio, valor, { es_real: false, origen: "proyeccion-ultimo-valor", fiabilidad });
const spec = (tipo, variables, extra = {}) => ({ v: 1, tipo, modo: "individual", variables, zonas: ["68001"], anios: [2022, 2024], ...extra });
const ZONAS = { "68001": "Bucaramanga", "05001": "Medellín", "11001": "Bogotá" };

const lineasReal = () => ({
  especificacion: spec("lineas", ["cobertura_acueducto"]),
  datos: { zonas: ZONAS, puntos: [pt("cobertura_acueducto", "68001", 2022, 96.1), pt("cobertura_acueducto", "68001", 2023, 96.8), pt("cobertura_acueducto", "68001", 2024, 97.2)] },
});
const lineasProy = () => ({
  especificacion: spec("lineas", ["cobertura_acueducto"], { anios: [2024, 2026] }),
  datos: {
    zonas: ZONAS,
    puntos: [pt("cobertura_acueducto", "68001", 2024, 97.2), proy("cobertura_acueducto", "68001", 2025, 97.2, 80), proy("cobertura_acueducto", "68001", 2026, 97.2, 62)],
  },
});
const ranking = () => ({
  especificacion: spec("barras_ranking", ["deficit_habitacional_cuantitativo"], { modo: "comparar", zonas: ["68001", "05001", "11001"] }),
  datos: {
    zonas: ZONAS,
    puntos: [pt("deficit_habitacional_cuantitativo", "68001", 2024, 6.5), pt("deficit_habitacional_cuantitativo", "05001", 2024, 9.1), pt("deficit_habitacional_cuantitativo", "11001", 2024, 4.2)],
  },
});
const agrupadas = () => ({
  especificacion: spec("barras_agrupadas", ["cobertura_acueducto", "cobertura_alcantarillado"]),
  datos: { zonas: ZONAS, puntos: [pt("cobertura_acueducto", "68001", 2024, 97.2), pt("cobertura_alcantarillado", "68001", 2024, 94.5)] },
});
const gauge = () => ({
  especificacion: spec("gauge", ["cobertura_acueducto"]),
  datos: { zonas: ZONAS, puntos: [pt("cobertura_acueducto", "68001", 2024, 97.2)], referencia: { cobertura_acueducto: { nacional: 86.4 } } },
});

// ---- modelo puro ----

test("lineas: una serie real, ordenada por año", () => {
  const m = prepararGrafica(lineasReal());
  assert.equal(m.ok, true);
  assert.deepEqual(m.filas.map((f) => f.anio), [2022, 2023, 2024]);
  assert.deepEqual(m.series.map((s) => s.clave), ["68001"]);
  assert.equal(m.proyeccion.hay, false);
  assert.equal(notaProyeccion(m.proyeccion), null);
});

test("lineas: la proyeccion es una serie aparte que arranca en el ultimo real, con origen y fiabilidad", () => {
  const m = prepararGrafica(lineasProy());
  assert.deepEqual(m.series.map((s) => [s.clave, s.proyeccion]), [["68001", false], ["68001__proy", true]]);
  const f2024 = m.filas.find((f) => f.anio === 2024);
  assert.equal(f2024["68001"], 97.2);
  assert.equal(f2024["68001__proy"], 97.2); // empalme
  assert.equal(m.filas.find((f) => f.anio === 2025)["68001"], undefined);
  assert.equal(notaProyeccion(m.proyeccion), "Proyección desde 2025 · fiabilidad 62–80 %");
});

test("lineas: abstencion con un solo punto o sin datos", () => {
  const uno = lineasReal();
  uno.datos.puntos = uno.datos.puntos.slice(0, 1);
  assert.equal(prepararGrafica(uno).ok, false);
  const vacio = lineasReal();
  vacio.datos.puntos = [];
  assert.equal(prepararGrafica(vacio).ok, false);
  assert.equal(prepararGrafica({ especificacion: spec("lineas", ["cobertura_acueducto"]), datos: {} }).ok, false);
});

test("lineas: valores no numericos se descartan, no se inventan", () => {
  const g = lineasReal();
  g.datos.puntos[1].valor = null;
  g.datos.puntos[2].valor = "x";
  assert.equal(prepararGrafica(g).ok, false); // queda 1 punto
});

test("barras_ranking: ordenadas de mayor a menor, con el nombre de la zona", () => {
  const m = prepararGrafica(ranking());
  assert.deepEqual(m.filas.map((f) => f.nombre), ["Medellín", "Bucaramanga", "Bogotá"]);
});

test("barras_ranking: marca la fila proyectada", () => {
  const g = ranking();
  g.datos.puntos[0] = proy("deficit_habitacional_cuantitativo", "68001", 2030, 6.0, 55);
  const m = prepararGrafica(g);
  assert.equal(m.filas.find((f) => f.clave === "68001").proyeccion, true);
  assert.equal(m.proyeccion.hay, true);
});

test("barras_agrupadas: una serie por variable y valores por zona", () => {
  const m = prepararGrafica(agrupadas());
  assert.deepEqual(m.series.map((s) => s.clave), ["cobertura_acueducto", "cobertura_alcantarillado"]);
  assert.equal(m.filas[0].cobertura_alcantarillado, 94.5);
});

test("gauge: fraccion sobre 100 para porcentajes y sobre 1 para el score; referencia nacional", () => {
  const m = prepararGrafica(gauge());
  assert.equal(m.medidor.maximo, 100);
  assert.ok(Math.abs(m.medidor.fraccion - 0.972) < 1e-9);
  assert.equal(m.medidor.nacional, 86.4);
  const score = prepararGrafica({ especificacion: spec("gauge", ["score_privacion"]), datos: { zonas: ZONAS, puntos: [pt("score_privacion", "68001", 2024, 0.42)] } });
  assert.equal(score.medidor.maximo, 1);
  assert.equal(score.medidor.nacional, null);
});

test("gauge: proyeccion se marca y valor fuera de rango se acota", () => {
  const g = gauge();
  g.datos.puntos = [proy("cobertura_acueducto", "68001", 2030, 130, 50)];
  const m = prepararGrafica(g);
  assert.equal(m.medidor.proyeccion, true);
  assert.equal(m.medidor.fraccion, 1);
});

test("tipo fuera del subconjunto, sin especificacion o sin variables: sin grafica", () => {
  assert.equal(prepararGrafica({ especificacion: spec("radar", ["a"]), datos: { puntos: [pt("a", "1", 2024, 1)] } }).ok, false);
  assert.equal(prepararGrafica(null).ok, false);
  assert.equal(prepararGrafica({ especificacion: { tipo: "lineas", variables: [] }, datos: {} }).ok, false);
});

test("titulo: el de la especificacion, o el nombre de la variable", () => {
  assert.equal(prepararGrafica(lineasReal()).titulo, "Cobertura de acueducto");
  const g = lineasReal();
  g.especificacion.titulo = "  Evolución en Bucaramanga ";
  assert.equal(prepararGrafica(g).titulo, "Evolución en Bucaramanga");
});

// ---- componente ----

let servidor;
let GraficaChat;
before(async () => {
  servidor = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  GraficaChat = (await servidor.ssrLoadModule("/src/pages/ChatBot/GraficaChat.jsx")).default;
});
after(async () => {
  await servidor?.close();
});

const html = (grafica) => renderToStaticMarkup(createElement(GraficaChat, { grafica }));

test("componente: cada tipo dibuja un SVG de Recharts con su titulo", () => {
  for (const [g, titulo] of [
    [lineasReal(), "Cobertura de acueducto"],
    [ranking(), "Déficit habitacional cuantitativo"],
    [agrupadas(), "Cobertura de acueducto y Cobertura de alcantarillado"],
    [gauge(), "Cobertura de acueducto"],
  ]) {
    const out = html(g);
    assert.match(out, /<svg/, g.especificacion.tipo);
    assert.ok(out.includes(titulo), g.especificacion.tipo);
    assert.ok(out.includes(`data-tipo="${g.especificacion.tipo}"`));
  }
});

test("componente: lineas real no marca proyeccion; con proyeccion muestra badge, nota y linea punteada", () => {
  const real = html(lineasReal());
  assert.ok(!real.includes("Proyección"));
  const out = html(lineasProy());
  assert.ok(out.includes("chat-grafica-badge"));
  assert.ok(out.includes("Proyección desde 2025 · fiabilidad 62–80 %"));
  assert.match(out, /stroke-dasharray="5 4"/);
});

test("componente: gauge proyectado muestra la marca y el promedio nacional", () => {
  const g = gauge();
  g.datos.puntos = [proy("cobertura_acueducto", "68001", 2030, 90, 70)];
  const out = html(g);
  assert.ok(out.includes("Proyección desde 2030 · fiabilidad 70 %"));
  assert.ok(out.includes("promedio nacional"));
});

test("componente: datos vacios, tipo no soportado o sin grafica => nada (el texto se muestra igual)", () => {
  const vacio = lineasReal();
  vacio.datos.puntos = [];
  assert.equal(html(vacio), "");
  assert.equal(html({ especificacion: spec("radar", ["a"]), datos: {} }), "");
  assert.equal(html(null), "");
});

test("componente: el titulo con HTML se escapa", () => {
  const g = lineasReal();
  g.especificacion.titulo = "<img src=x onerror=alert(1)>";
  const out = html(g);
  assert.ok(!out.includes("<img"));
  assert.ok(out.includes("&lt;img"));
});
