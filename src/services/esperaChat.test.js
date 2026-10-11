import test from "node:test";
import assert from "node:assert/strict";
import { faseEspera, formatearTranscurrido, segundosDesde } from "./esperaChat.js";

test("segundosDesde: enteros, nunca negativos y robusto a entradas invalidas", () => {
  assert.equal(segundosDesde(1000, 4999), 3);
  assert.equal(segundosDesde(5000, 1000), 0);
  assert.equal(segundosDesde(NaN, 1000), 0);
  assert.equal(segundosDesde(undefined, 1000), 0);
});

test("formatearTranscurrido: m:ss", () => {
  assert.equal(formatearTranscurrido(0), "0:00");
  assert.equal(formatearTranscurrido(7), "0:07");
  assert.equal(formatearTranscurrido(59.9), "0:59");
  assert.equal(formatearTranscurrido(125), "2:05");
  assert.equal(formatearTranscurrido(-3), "0:00");
  assert.equal(formatearTranscurrido("x"), "0:00");
});

test("faseEspera: leyendo -> redactando -> cola -> larga", () => {
  assert.equal(faseEspera(0).fase, "leyendo");
  assert.equal(faseEspera(14).fase, "leyendo");
  assert.equal(faseEspera(15).fase, "redactando");
  assert.equal(faseEspera(74).fase, "redactando");
  assert.equal(faseEspera(75).fase, "cola");
  assert.equal(faseEspera(149).fase, "cola");
  assert.equal(faseEspera(150).fase, "larga");
  assert.equal(faseEspera(400).fase, "larga");
  for (const s of [0, 30, 100, 200]) {
    const f = faseEspera(s);
    assert.ok(f.titulo.length > 0 && f.pista.length > 0);
  }
});
