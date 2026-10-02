// Pruebas de combinarProyeccion.js -- runner integrado de Node
// (node:test), mismo criterio que src/services/mensajesError.test.js:
// este proyecto no tiene vitest/jest configurado.
//
// Uso: node --test src/pages/Proyeccion/combinarProyeccion.test.js
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  avisoAniosFallidos,
  combinarResultadosProyeccion,
  mensajeErrorProyeccion,
} from "./combinarProyeccion.js";

test("todos los años salen bien -- exito, sin fallidos", () => {
  const resultadosPorAnio = {
    2027: [{ codigo_municipio: "05001", valor: 0.5 }],
    2028: [{ codigo_municipio: "05001", valor: 0.4 }],
  };
  const combinado = combinarResultadosProyeccion(resultadosPorAnio, {});

  assert.equal(combinado.exito, true);
  assert.deepEqual(combinado.aniosDisponibles, [2027, 2028]);
  assert.deepEqual(combinado.aniosFallidos, []);
  assert.equal(avisoAniosFallidos(combinado.aniosFallidos), null);
});

test("un año falla en medio del rango -- exito parcial, hueco en la lista", () => {
  const resultadosPorAnio = {
    2027: [{ codigo_municipio: "05001", valor: 0.5 }],
    2028: [{ codigo_municipio: "05001", valor: 0.45 }],
    2030: [{ codigo_municipio: "05001", valor: 0.3 }],
  };
  const fallosPorAnio = { 2029: "El servicio de proyección no respondió a tiempo." };

  const combinado = combinarResultadosProyeccion(resultadosPorAnio, fallosPorAnio);

  assert.equal(combinado.exito, true);
  // El hueco (2029) no aparece -- la barra debe saltarselo, no mostrar
  // un rango continuo 2027-2030.
  assert.deepEqual(combinado.aniosDisponibles, [2027, 2028, 2030]);
  assert.deepEqual(combinado.aniosFallidos, [
    { anio: 2029, mensaje: "El servicio de proyección no respondió a tiempo." },
  ]);
  assert.equal(avisoAniosFallidos(combinado.aniosFallidos), "No se pudieron generar los años: 2029");
});

test("varios años fallan -- el aviso los lista todos, ordenados", () => {
  const resultadosPorAnio = { 2027: [{ codigo_municipio: "05001", valor: 0.5 }] };
  const fallosPorAnio = {
    2030: "timeout",
    2029: "timeout",
  };

  const combinado = combinarResultadosProyeccion(resultadosPorAnio, fallosPorAnio);

  assert.equal(combinado.exito, true);
  assert.deepEqual(combinado.aniosFallidos.map((f) => f.anio), [2029, 2030]);
  assert.equal(avisoAniosFallidos(combinado.aniosFallidos), "No se pudieron generar los años: 2029, 2030");
});

test("todos los años fallan -- fallo total, sin años disponibles", () => {
  const fallosPorAnio = {
    2027: "El servicio de proyección no está disponible en este momento. Intenta de nuevo más tarde.",
    2028: "El servicio de proyección no está disponible en este momento. Intenta de nuevo más tarde.",
  };

  const combinado = combinarResultadosProyeccion({}, fallosPorAnio);

  assert.equal(combinado.exito, false);
  assert.deepEqual(combinado.aniosDisponibles, []);
  assert.equal(combinado.aniosFallidos.length, 2);
});

test("mensajeErrorProyeccion: 422 usa extraerMensajeDetalle si esta disponible", () => {
  const error = new Error("fallback");
  error.status = 422;
  error.detail = [{ msg: "El año pedido está fuera del rango disponible.", loc: ["query", "anio"] }];

  assert.equal(mensajeErrorProyeccion(error), "El año pedido está fuera del rango disponible.");
});

test("mensajeErrorProyeccion: 503 y 504 dan mensajes especificos", () => {
  const error503 = new Error("x");
  error503.status = 503;
  assert.match(mensajeErrorProyeccion(error503), /no está disponible/);

  const error504 = new Error("x");
  error504.status = 504;
  assert.match(mensajeErrorProyeccion(error504), /no respondió a tiempo/);
});

test("mensajeErrorProyeccion: sin status reconocido da el mensaje generico", () => {
  const error = new Error("network error");
  assert.equal(mensajeErrorProyeccion(error), "No se pudo generar la proyección. Intenta de nuevo.");
});
