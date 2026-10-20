// Pruebas del renderizador de graficas del chat (7.6) con el payload REAL de W1 (claude/fase7-6-payload.md).
// Parte pura: graficaChat.js. Parte de componente: se carga el .jsx con Vite en modo SSR (sin DOM ni dependencias
// nuevas) y se mira el SVG que Recharts produce. Las combinaciones tipo x modo salen del catalogo del frontend
// (replica del backend), no de una lista escrita a mano.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { etiquetaPeriodo, notaProyeccion, prepararGrafica, TIPOS_DIBUJABLES } from "./graficaChat.js";
import { MODOS, TIPOS_GRAFICA, VARIABLES_GRAFICA, validarCombinacion } from "../Reportes/graficasCatalogo.js";
import { normalizarIntercambio } from "../../services/estadosMensaje.js";
import { AVISO_CHAT_NUEVO, avisoChatNuevo } from "../../services/esperaChat.js";

const NOMBRES = { "68001": "Bucaramanga (Santander)", "05001": "Medellín (Antioquia)", "11001": "Bogotá, D.C. (Bogotá, D.C.)", "76001": "Cali (Valle del Cauca)", "08001": "Barranquilla (Atlántico)" };
const CODIGOS = Object.keys(NOMBRES);

const real = (variable, zona, anio, valor) => ({ variable, zona, nombre: NOMBRES[zona], anio, valor, origen: "real", fiabilidad: null });
const proy = (variable, zona, anio, valor, fiabilidad) => ({ variable, zona, nombre: NOMBRES[zona], anio, valor, origen: "proyeccion", fiabilidad });
const universo = (variables, periodo = [2024, 2024]) => ({
  periodo,
  estadisticos: Object.fromEntries(variables.map((v) => [v, { media: 70.2, min: 4, q1: 58.1, mediana: 72.4, q3: 85, max: 99.9, n: 1100 }])),
});
const payload = (tipo, modo, variables, zonas, anios, datos, extra = {}) => ({ v: 1, tipo, modo, variables, zonas, anios, datos, universo: null, ...extra });

const A = "cobertura_acueducto";
const aniosSerie = [2019, 2020, 2021, 2022, 2023, 2024];
const serie = (variable, zona, base) => aniosSerie.map((a, i) => real(variable, zona, a, +(base + i).toFixed(1)));

const lineasReal = () => payload("lineas", "individual", [A], ["68001"], aniosSerie, serie(A, "68001", 90));
const lineasProy = () =>
  payload("lineas", "individual", [A], ["68001"], [2024, 2025, 2026], [real(A, "68001", 2024, 97.2), proy(A, "68001", 2025, 97.2, 80), proy(A, "68001", 2026, 97.2, 62)]);
const ranking = () =>
  payload("barras_ranking", "comparar", ["deficit_habitacional_cuantitativo"], ["68001", "05001", "11001"], [2024],
    [["68001", 6.5], ["05001", 9.1], ["11001", 4.2]].map(([z, v]) => real("deficit_habitacional_cuantitativo", z, 2024, v)),
    { universo: universo(["deficit_habitacional_cuantitativo"]) });
const agrupadas = () =>
  payload("barras_agrupadas", "individual", [A, "cobertura_alcantarillado"], ["68001"], [2024], [real(A, "68001", 2024, 97.2), real("cobertura_alcantarillado", "68001", 2024, 94.5)]);
const gauge = () => payload("gauge", "individual", [A], ["68001"], [2024], [real(A, "68001", 2024, 97.2)], { universo: universo([A]) });

// ---- modelo puro ----

test("lineas: una serie real, ordenada por año, con el nombre 'Municipio (Departamento)'", () => {
  const m = prepararGrafica(lineasReal());
  assert.equal(m.ok, true);
  assert.deepEqual(m.filas.map((f) => f.anio), aniosSerie);
  assert.deepEqual(m.series.map((s) => [s.clave, s.nombre]), [["68001", "Bucaramanga (Santander)"]]);
  assert.equal(m.proyeccion.hay, false);
  assert.equal(notaProyeccion(m.proyeccion), null);
});

test("lineas: origen 'proyeccion' es serie aparte desde el ultimo real, con fiabilidad", () => {
  const m = prepararGrafica(lineasProy());
  assert.deepEqual(m.series.map((s) => [s.clave, s.proyeccion]), [["68001", false], ["68001__proy", true]]);
  assert.equal(m.filas.find((f) => f.anio === 2024)["68001__proy"], 97.2); // empalme
  assert.equal(m.filas.find((f) => f.anio === 2025)["68001"], undefined);
  assert.equal(notaProyeccion(m.proyeccion), "Proyección desde 2025 · fiabilidad 62–80 %");
});

test("origen distinto de 'real' cuenta como proyeccion (misma regla que Reportes)", () => {
  const g = lineasReal();
  g.datos[5].origen = "estimado";
  assert.equal(prepararGrafica(g).proyeccion.hay, true);
});

test("lineas: abstencion con un solo punto, sin datos o con datos invalidos", () => {
  const uno = lineasReal();
  uno.datos = uno.datos.slice(0, 1);
  assert.equal(prepararGrafica(uno).ok, false);
  assert.equal(prepararGrafica({ ...lineasReal(), datos: [] }).ok, false);
  const roto = lineasReal();
  roto.datos[1].valor = null;
  roto.datos[2].valor = "x";
  roto.datos = roto.datos.slice(0, 3);
  assert.equal(prepararGrafica(roto).ok, false); // queda 1 punto
});

test("barras_ranking: orden descendente, nombre completo y universo con media y periodo", () => {
  const m = prepararGrafica(ranking());
  assert.deepEqual(m.filas.map((f) => f.nombre), ["Medellín (Antioquia)", "Bucaramanga (Santander)", "Bogotá, D.C. (Bogotá, D.C.)"]);
  assert.equal(m.universo.media, 70.2);
  assert.deepEqual(m.universo.periodo, [2024, 2024]);
  assert.equal(etiquetaPeriodo([2019, 2024]), " (2019–2024)");
  assert.equal(etiquetaPeriodo([2024, 2024]), " (2024)");
});

test("universo null o roto: sin linea de referencia, sin error", () => {
  for (const u of [null, undefined, "x", {}, { estadisticos: null }, { estadisticos: { deficit_habitacional_cuantitativo: { media: "no" } } }]) {
    const g = ranking();
    g.universo = u;
    const m = prepararGrafica(g);
    assert.equal(m.ok, true);
    assert.equal(m.universo, null);
  }
});

test("barras_ranking: marca la fila proyectada", () => {
  const g = ranking();
  g.datos[0] = proy("deficit_habitacional_cuantitativo", "68001", 2030, 6.0, 55);
  const m = prepararGrafica(g);
  assert.equal(m.filas.find((f) => f.clave === "68001").proyeccion, true);
  assert.equal(m.proyeccion.hay, true);
});

test("barras_agrupadas: una serie por variable y valores por zona", () => {
  const m = prepararGrafica(agrupadas());
  assert.deepEqual(m.series.map((s) => s.clave), [A, "cobertura_alcantarillado"]);
  assert.equal(m.filas[0].cobertura_alcantarillado, 94.5);
});

test("gauge: escala 100 para porcentajes y 1 para el score; universo con media; valor fuera de rango acotado", () => {
  const m = prepararGrafica(gauge());
  assert.equal(m.medidor.maximo, 100);
  assert.ok(Math.abs(m.medidor.fraccion - 0.972) < 1e-9);
  assert.equal(m.medidor.universo.media, 70.2);
  const score = prepararGrafica(payload("gauge", "individual", ["score_privacion"], ["68001"], [2024], [real("score_privacion", "68001", 2024, 0.42)]));
  assert.equal(score.medidor.maximo, 1);
  assert.equal(score.medidor.universo, null);
  const g = gauge();
  g.datos = [proy(A, "68001", 2030, 130, 50)];
  const p = prepararGrafica(g);
  assert.equal(p.medidor.proyeccion, true);
  assert.equal(p.medidor.fraccion, 1);
});

test("titulo: se usa si el payload lo trae (<= 80), si no se deriva de las variables", () => {
  assert.equal(prepararGrafica(lineasReal()).titulo, "Cobertura de acueducto");
  assert.equal(prepararGrafica({ ...lineasReal(), titulo: "  Evolución en Bucaramanga " }).titulo, "Evolución en Bucaramanga");
  assert.equal(prepararGrafica({ ...lineasReal(), titulo: "x".repeat(200) }).titulo.length, 80);
});

// ---- bloques invalidos: se ignoran sin lanzar ----

const INVALIDOS = [
  ["null", null],
  ["undefined", undefined],
  ["cadena", "```grafica {}```"],
  ["numero", 7],
  ["arreglo", [lineasReal()]],
  ["objeto vacio", {}],
  ["v desconocida", { ...lineasReal(), v: 2 }],
  ["sin v", (() => { const g = lineasReal(); delete g.v; return g; })()],
  ["tipo no dibujable", { ...lineasReal(), tipo: "radar" }],
  ["tipo no cadena", { ...lineasReal(), tipo: { x: 1 } }],
  ["variables vacias", { ...lineasReal(), variables: [] }],
  ["variables no arreglo", { ...lineasReal(), variables: "cobertura_acueducto" }],
  ["datos cadena", { ...lineasReal(), datos: "x" }],
  ["datos null", { ...lineasReal(), datos: null }],
  ["datos con basura", { ...lineasReal(), datos: [null, 1, "x", [], {}, { valor: 1 }] }],
  ["valores NaN/Infinity/booleanos", { ...lineasReal(), datos: lineasReal().datos.map((d, i) => ({ ...d, valor: [NaN, Infinity, true, "", null, undefined][i] })) }],
  ["formato viejo (especificacion)", { especificacion: { tipo: "lineas" }, datos: { puntos: [] } }],
];

test("payload invalido o no dibujable: prepararGrafica devuelve ok:false y nunca lanza", () => {
  for (const [nombre, g] of INVALIDOS) {
    const m = prepararGrafica(g);
    assert.equal(m.ok, false, nombre);
    assert.ok(typeof m.motivo === "string", nombre);
  }
});

// ---- las combinaciones del catalogo: lo que el modelo emite y lo que el backend acepta ----

// Para cada tipo x modo del catalogo, una combinacion de variables y numero de zonas que validarCombinacion acepta.
function combinaciones() {
  const lista = [];
  for (const tipo of TIPOS_GRAFICA) {
    for (const modo of MODOS.filter((m) => tipo.modos.has(m.id))) {
      const nZonas = modo.id === "individual" ? 1 : modo.id === "comparar" ? 2 : Math.max(tipo.minZonasGeneral ?? 2, 3);
      let elegida = null;
      for (let n = tipo.minVariables; n <= tipo.maxVariables && !elegida; n++) {
        const candidatas = [
          ["cobertura_acueducto", "cobertura_alcantarillado", "deficit_habitacional_cuantitativo", "deficit_habitacional_cualitativo"].slice(0, n),
          ["deficit_habitacional_cuantitativo", "deficit_habitacional_cualitativo"].slice(0, n),
          VARIABLES_GRAFICA.slice(0, n),
          VARIABLES_GRAFICA.slice(-n),
        ];
        elegida = candidatas.find((v) => v.length === n && validarCombinacion(tipo.id, modo.id, v, nZonas) === null) ?? null;
      }
      assert.ok(elegida, `sin combinacion valida para ${tipo.id}/${modo.id}`);
      lista.push({ tipo: tipo.id, modo: modo.id, variables: elegida, zonas: CODIGOS.slice(0, nZonas) });
    }
  }
  return lista;
}

// Un payload completo como lo armaria W1 para esa combinacion (varios anios solo en lineas).
function payloadDe({ tipo, modo, variables, zonas }) {
  const anios = tipo === "lineas" ? aniosSerie : [2024];
  const datos = [];
  for (const v of variables) for (const z of zonas) for (const a of anios) datos.push(real(v, z, a, 20 + datos.length));
  return payload(tipo, modo, variables, zonas, anios, datos, { universo: universo(variables) });
}

let servidor;
let GraficaChat;
let RespuestaBot;
before(async () => {
  servidor = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  GraficaChat = (await servidor.ssrLoadModule("/src/pages/ChatBot/GraficaChat.jsx")).default;
  RespuestaBot = (await servidor.ssrLoadModule("/src/pages/ChatBot/RespuestaBot.jsx")).default;
});
after(async () => {
  await servidor?.close();
});

const html = (grafica) => renderToStaticMarkup(createElement(GraficaChat, { grafica }));

test("todas las combinaciones tipo x modo del catalogo: las 4 dibujables se dibujan, el resto se ignora sin error", () => {
  const todas = combinaciones();
  assert.equal(new Set(todas.map((c) => c.tipo)).size, 16);
  let dibujadas = 0;
  let ignoradas = 0;
  for (const c of todas) {
    const out = html(payloadDe(c));
    if (TIPOS_DIBUJABLES.includes(c.tipo)) {
      assert.match(out, /recharts-wrapper/, `${c.tipo}/${c.modo}`); // recharts 3 no emite <svg> en SSR: el SVG se verifica en navegador
      assert.ok(out.includes(`data-tipo="${c.tipo}"`), `${c.tipo}/${c.modo}`);
      dibujadas++;
    } else {
      assert.equal(out, "", `${c.tipo}/${c.modo}`);
      ignoradas++;
    }
  }
  assert.equal(dibujadas + ignoradas, todas.length);
  assert.ok(dibujadas >= 6 && ignoradas > 0);
  console.log(`# combinaciones tipo x modo: ${todas.length} (dibujadas ${dibujadas}, ignoradas ${ignoradas})`);
});

test("los bloques que emite el modelo (fase7-1 §3) se dibujan con el payload de W1", () => {
  const casos = [
    payload("lineas", "individual", [A], ["68001"], aniosSerie, serie(A, "68001", 90)),
    payload("lineas", "comparar", [A], ["68001", "05001"], aniosSerie, [...serie(A, "68001", 90), ...serie(A, "05001", 92)]),
    ranking(),
    agrupadas(),
    payload("barras_agrupadas", "comparar", [A, "cobertura_alcantarillado"], ["68001", "05001"], [2024],
      ["68001", "05001"].flatMap((z) => [real(A, z, 2024, 96), real("cobertura_alcantarillado", z, 2024, 93)])),
    gauge(),
  ];
  for (const g of casos) {
    const out = html(g);
    assert.match(out, /recharts-wrapper/, `${g.tipo}/${g.modo}`);
    assert.ok(!out.includes("Proyección"), "todo real: sin marca de proyeccion");
  }
  // la leyenda usa el nombre completo "Municipio (Departamento)"
  assert.ok(prepararGrafica(casos[1]).series.some((s) => s.nombre === "Medellín (Antioquia)")); // la leyenda se pinta solo en navegador
});

test("componente: proyeccion muestra badge, nota con fiabilidad y linea punteada", () => {
  const out = html(lineasProy());
  assert.ok(out.includes("chat-grafica-badge"));
  assert.ok(out.includes("Proyección desde 2025 · fiabilidad 62–80 %"));
  // la linea punteada (dasharray 5 4) la dibuja Recharts solo en navegador; el modelo marca la serie como proyeccion
  assert.equal(prepararGrafica(lineasProy()).series.filter((x) => x.proyeccion).length, 1);
});

test("componente: gauge y ranking muestran el promedio nacional con su periodo", () => {
  const g = gauge();
  g.universo = universo([A], [2019, 2024]);
  assert.ok(html(g).includes("promedio nacional (2019–2024) 70,2 %"));
  assert.ok(html(ranking()).includes("promedio nacional (2024)"));
  const sin = ranking();
  sin.universo = null;
  assert.ok(!html(sin).includes("promedio nacional"));
});

test("componente: payload invalido o sin datos => nada, sin lanzar", () => {
  for (const [nombre, g] of INVALIDOS) assert.equal(html(g), "", nombre);
});

test("componente: texto con HTML (nombre, titulo) se escapa", () => {
  const g = lineasReal();
  g.titulo = "<img src=x onerror=alert(1)>";
  g.datos = g.datos.map((d) => ({ ...d, nombre: "<b>Bucaramanga</b>" }));
  const out = html(g);
  assert.ok(!out.includes("<img"));
  assert.ok(!out.includes("<b>"));
});

test("RespuestaBot: el texto se muestra igual con grafica null, invalida o no dibujable", () => {
  for (const g of [null, undefined, "roto", { v: 9 }, { ...lineasReal(), tipo: "radar" }, { ...lineasReal(), datos: "x" }]) {
    const out = renderToStaticMarkup(createElement(RespuestaBot, { texto: "Respuesta de **prueba**.", grafica: g }));
    assert.ok(out.includes("<strong>prueba</strong>"), String(g));
    assert.ok(!out.includes("<svg"));
  }
});

// ---- integracion con el resto del chat ----

test("la grafica del backend pasa intacta por la normalizacion de mensajes", () => {
  const g = lineasReal();
  const r = normalizarIntercambio({ mensaje_usuario: { id: 1, rol: "usuario" }, mensaje_asistente: { id: 2, rol: "asistente", contenido: "hola", grafica: g } });
  assert.equal(r.mensaje_asistente.grafica, g);
  assert.equal(r.mensaje_asistente.estado, "respondido");
});

test("aviso de chat nuevo: sigue funcionando con los roles reales del backend", () => {
  const u = { rol: "usuario", contenido: "hola" };
  const a = { rol: "asistente", contenido: "hola", grafica: lineasReal() };
  assert.equal(avisoChatNuevo({ respondiendo: true, mensajes: [u, a] }), AVISO_CHAT_NUEVO);
  assert.equal(avisoChatNuevo({ respondiendo: true, mensajes: [u] }), null);
  assert.equal(avisoChatNuevo({ respondiendo: false, mensajes: [u, a] }), null);
});
