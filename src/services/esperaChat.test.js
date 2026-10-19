import test from "node:test";
import assert from "node:assert/strict";
import { AVISO_CHAT_NUEVO, avisoChatNuevo, faseEspera, formatearTranscurrido, segundosDesde } from "./esperaChat.js";

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

test("avisoChatNuevo: solo mientras responde y con al menos un intercambio previo", () => {
  const u = { rol: "usuario", contenido: "hola" };
  const b = { rol: "bot", contenido: "hola, ¿en qué te ayudo?" };
  assert.equal(AVISO_CHAT_NUEVO, "Para respuestas más rápidas, abre un chat nuevo con frecuencia.");
  assert.equal(avisoChatNuevo({ respondiendo: true, mensajes: [u, b] }), AVISO_CHAT_NUEVO);
  assert.equal(avisoChatNuevo({ respondiendo: true, mensajes: [u, b, u, b] }), AVISO_CHAT_NUEVO);
  // primer mensaje de la conversacion: sin intercambio previo
  assert.equal(avisoChatNuevo({ respondiendo: true, mensajes: [] }), null);
  assert.equal(avisoChatNuevo({ respondiendo: true, mensajes: [u] }), null);
  assert.equal(avisoChatNuevo({ respondiendo: true, mensajes: null }), null);
  // sin espera en curso no se muestra
  assert.equal(avisoChatNuevo({ respondiendo: false, mensajes: [u, b] }), null);
});
