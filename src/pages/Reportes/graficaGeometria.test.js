import test from "node:test";
import assert from "node:assert/strict";
import { escalaVertical, indicesEtiquetas, tramos, trazo } from "./graficaGeometria.js";

test("escalaVertical: marcas redondas que cubren los datos", () => {
  const e = escalaVertical([{ valores: [0.43, 0.67, null] }, { valores: [0.5] }]);
  assert.ok(e.minimo <= 0.43 && e.maximo >= 0.67);
  assert.ok(e.marcas.length >= 3 && e.marcas.length <= 9);
  assert.deepEqual(e.marcas, [...e.marcas].sort((a, b) => a - b));
});

test("escalaVertical: serie constante o en cero no divide por cero", () => {
  for (const v of [1, 0, -5, 1e9]) {
    const e = escalaVertical([{ valores: [v, v, v] }]);
    assert.ok(e.maximo > e.minimo, `valor ${v}`);
    assert.ok(e.minimo <= v && e.maximo >= v);
  }
});

test("escalaVertical: sin valores finitos devuelve null (NaN, inf y null se ignoran)", () => {
  assert.equal(escalaVertical([{ valores: [null, NaN, Infinity, -Infinity] }]), null);
  assert.equal(escalaVertical([]), null);
  assert.ok(escalaVertical([{ valores: [NaN, 3, Infinity] }]));
});

test("tramos: un hueco corta la linea y un punto suelto es un tramo", () => {
  const t = tramos([1, 2, null, 4, null, null, 7], (i) => i * 10, (v) => 100 - v);
  assert.deepEqual(t.map((x) => x.length), [2, 1, 1]);
  assert.equal(trazo(t[0]), "M0.0,99.0 L10.0,98.0");
  assert.deepEqual(tramos([null, NaN], (i) => i, (v) => v), []);
});

test("indicesEtiquetas: como mucho 12 etiquetas aunque haya 43 años", () => {
  assert.equal(indicesEtiquetas(6).length, 6);
  assert.ok(indicesEtiquetas(43).length <= 12);
  assert.equal(indicesEtiquetas(43)[0], 0);
});
