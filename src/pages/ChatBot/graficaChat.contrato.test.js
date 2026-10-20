// Prueba de contrato con el backend (paso 7.6 / W2). Los payloads de fixtures/payloads_backend.json los produjo el
// codigo REAL del backend (`services.orquestador.grafica_payload.construir_payload` + `persistencia.payload_grafica`,
// techo360-backend `development` 95fe399) con lectores de datos simulados: la FORMA es la que sale por
// `MensajeResponse.grafica`; los valores son de prueba. Si el backend cambia el payload, regenerar el archivo.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepararGrafica, TIPOS_DIBUJABLES } from "./graficaChat.js";
import { normalizarIntercambio } from "../../services/estadosMensaje.js";

const payloads = JSON.parse(readFileSync(new URL("./fixtures/payloads_backend.json", import.meta.url), "utf8"));

test("el backend emite los 4 tipos dibujables y todos se preparan", () => {
  assert.deepEqual(Object.keys(payloads).sort(), [...TIPOS_DIBUJABLES].sort());
  for (const [tipo, p] of Object.entries(payloads)) {
    assert.equal(p.v, 1, tipo);
    assert.equal(p.tipo, tipo);
    assert.ok(Array.isArray(p.datos) && p.datos.length > 0, tipo);
    for (const d of p.datos) {
      assert.deepEqual(Object.keys(d).sort(), ["anio", "fiabilidad", "nombre", "origen", "valor", "variable", "zona"], tipo);
      assert.ok(["real", "proyeccion"].includes(d.origen));
      assert.equal(d.fiabilidad === null, d.origen === "real");
    }
    const m = prepararGrafica(p);
    assert.equal(m.ok, true, `${tipo}: ${m.motivo}`);
    assert.equal(m.tipo, tipo);
  }
});

test("lineas de Bucaramanga (humo 7.8, pregunta 5): real hasta 2024 y proyeccion 2025-2028 con fiabilidad", () => {
  const p = payloads.lineas;
  assert.deepEqual(p.zonas, ["68001"]);
  assert.equal(p.datos[0].nombre, "Bucaramanga (Santander)");
  assert.equal(p.universo, null);
  const m = prepararGrafica(p);
  assert.deepEqual(m.series.map((s) => [s.clave, s.proyeccion]), [["68001", false], ["68001__proy", true]]);
  assert.equal(m.filas.length, 11);
  assert.equal(m.proyeccion.desde, 2025);
  assert.equal(m.proyeccion.fiabilidadMin, 60);
  assert.equal(m.proyeccion.fiabilidadMax, 90);
});

test("universo.estadisticos del backend llega al gauge y al ranking", () => {
  for (const tipo of ["gauge", "barras_ranking"]) {
    const p = payloads[tipo];
    assert.deepEqual(p.universo.periodo, [2024, 2024]);
    const est = p.universo.estadisticos[p.variables[0]];
    assert.deepEqual(Object.keys(est).sort(), ["max", "media", "mediana", "min", "n", "q1", "q3"]);
    const m = prepararGrafica(p);
    const u = tipo === "gauge" ? m.medidor.universo : m.universo;
    assert.equal(u.media, est.media);
  }
});

test("barras_ranking ordena de mayor a menor y agrupadas trae una serie por variable", () => {
  const r = prepararGrafica(payloads.barras_ranking);
  assert.deepEqual(r.filas.map((f) => f.valor), [...r.filas.map((f) => f.valor)].sort((a, b) => b - a));
  assert.equal(r.filas.length, 3);
  assert.equal(prepararGrafica(payloads.barras_agrupadas).series.length, 2);
});

test("la respuesta de /mensajes/enviar con grafica null (sin gráfica) no cambia", () => {
  const r = normalizarIntercambio({ mensaje_usuario: { id: 1, rol: "usuario" }, mensaje_asistente: { id: 2, rol: "asistente", contenido: "texto", grafica: null } });
  assert.equal(r.mensaje_asistente.grafica, null);
  assert.equal(prepararGrafica(r.mensaje_asistente.grafica).ok, false);
});
