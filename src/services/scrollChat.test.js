import test from "node:test";
import assert from "node:assert/strict";
import { decidirScroll, estaCercaDelFondo, firmaMensajes } from "./scrollChat.js";

const m = (id, rol) => ({ id, rol, contenido: "x" });
const base = [m(1, "usuario"), m(2, "asistente")];

test("estaCercaDelFondo: umbral de 80 px", () => {
  assert.equal(estaCercaDelFondo({ scrollTop: 920, scrollHeight: 1500, clientHeight: 500 }), true); // a 80 px
  assert.equal(estaCercaDelFondo({ scrollTop: 919, scrollHeight: 1500, clientHeight: 500 }), false);
  assert.equal(estaCercaDelFondo({ scrollTop: 0, scrollHeight: 300, clientHeight: 500 }), true); // sin scroll
});

test("firmaMensajes", () => {
  assert.deepEqual(firmaMensajes(base, null), { cantidad: 2, ultimoId: 2, ultimoRol: "asistente", enviando: null });
  assert.deepEqual(firmaMensajes([], "hola"), { cantidad: 0, ultimoId: null, ultimoRol: null, enviando: "hola" });
  assert.deepEqual(firmaMensajes(undefined), { cantidad: 0, ultimoId: null, ultimoRol: null, enviando: null });
});

test("al abrir: siempre al fondo", () => {
  assert.equal(decidirScroll({ estabaCerca: false, antes: null, despues: firmaMensajes(base) }), "fondo");
});

test("mensaje propio: al fondo aunque haya subido", () => {
  const antes = firmaMensajes(base);
  assert.equal(decidirScroll({ estabaCerca: false, antes, despues: firmaMensajes(base, "nueva pregunta") }), "fondo");
  assert.equal(decidirScroll({ estabaCerca: false, antes, despues: firmaMensajes([...base, m(3, "usuario")]) }), "fondo");
});

test("respuesta del bot: al fondo si estaba cerca; si subio, avisar", () => {
  const antes = firmaMensajes(base, "pregunta");
  const despues = firmaMensajes([...base, m(3, "usuario"), m(4, "asistente")]);
  assert.equal(decidirScroll({ estabaCerca: true, antes, despues }), "fondo");
  assert.equal(decidirScroll({ estabaCerca: false, antes, despues }), "avisar");
});

test("sondeo sin cambios: no arrastra si subio; se mantiene pegado si estaba al final", () => {
  const f = firmaMensajes(base);
  assert.equal(decidirScroll({ estabaCerca: false, antes: f, despues: firmaMensajes([...base]) }), "nada");
  assert.equal(decidirScroll({ estabaCerca: true, antes: f, despues: firmaMensajes([...base]) }), "fondo");
});

test("fin del envio sin mensajes nuevos (cancelado/error en el cuadro): no es nuevo", () => {
  const antes = firmaMensajes(base, "pregunta");
  assert.equal(decidirScroll({ estabaCerca: false, antes, despues: firmaMensajes(base, null) }), "nada");
});
