// Pruebas de extraerMensajeDetalle() -- este proyecto no tiene un
// runner de pruebas configurado (no hay vitest/jest en package.json).
// En vez de agregar uno nuevo solo para esta funcion, se usa el runner
// integrado de Node (node:test, estable desde Node 20) sobre
// mensajesError.js, que no importa nada (ni siquiera api.js, que
// depende de import.meta.env y por eso no se puede importar fuera de
// Vite).
//
// Uso: node --test src/services/mensajesError.test.js
import assert from "node:assert/strict";
import { test } from "node:test";

import { extraerMensajeDetalle } from "./mensajesError.js";

test("detail como string plano se devuelve tal cual", () => {
  assert.equal(
    extraerMensajeDetalle("El indicador no es válido."),
    "El indicador no es válido."
  );
});

test("detail como lista de errores de validacion de FastAPI ({msg, loc})", () => {
  const detail = [
    { loc: ["query", "anio"], msg: "El año debe ser mayor o igual a 2025", type: "greater_than_equal" },
    { loc: ["query", "indicador"], msg: "El indicador no coincide con el patrón esperado", type: "string_pattern_mismatch" },
  ];
  assert.equal(
    extraerMensajeDetalle(detail),
    "El año debe ser mayor o igual a 2025; El indicador no coincide con el patrón esperado"
  );
});

test("detail como lista con un solo error", () => {
  const detail = [{ loc: ["query", "anio"], msg: "año inválido", type: "value_error" }];
  assert.equal(extraerMensajeDetalle(detail), "año inválido");
});

test("detail como objeto unico con msg", () => {
  assert.equal(extraerMensajeDetalle({ msg: "El servicio no está disponible" }), "El servicio no está disponible");
});

test("detail como lista vacia devuelve null (nada que interpretar)", () => {
  assert.equal(extraerMensajeDetalle([]), null);
});

test("detail como lista de objetos sin msg devuelve null", () => {
  assert.equal(extraerMensajeDetalle([{ loc: ["query", "anio"] }]), null);
});

test("detail como objeto sin msg devuelve null (antes daba '[object Object]')", () => {
  assert.equal(extraerMensajeDetalle({ codigo: "ERR_X", detalle_interno: "..." }), null);
});

test("detail null o undefined devuelve null", () => {
  assert.equal(extraerMensajeDetalle(null), null);
  assert.equal(extraerMensajeDetalle(undefined), null);
});

test("detail numerico devuelve null (no es un formato esperado)", () => {
  assert.equal(extraerMensajeDetalle(42), null);
});
