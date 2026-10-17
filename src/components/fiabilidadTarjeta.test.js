// Pruebas de fiabilidadTarjeta.js -- runner integrado de Node (node:test), mismo criterio que variablesProyeccion.test.js.
// Uso: node --test src/components/fiabilidadTarjeta.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { fiabilidadTarjeta } from "./fiabilidadTarjeta.js";

test("proyeccion con fiabilidad: devuelve el porcentaje (densidad 2024, origen proyeccion-poblacion-sobre-area)", () => {
  assert.equal(fiabilidadTarjeta({ valor: 4011.96, origen: "proyeccion-poblacion-sobre-area", intervalo_confianza: 30 }), 30);
  assert.equal(fiabilidadTarjeta({ valor: 3.59, origen: "proyeccion-techo360-ultimo-valor-igac-2026", intervalo_confianza: 50.0 }), 50);
});

test("proyeccion por sufijo y por prefijo legado tambien lleva badge", () => {
  assert.equal(fiabilidadTarjeta({ origen: "TerriData-proyeccion", intervalo_confianza: 40 }), 40);
  assert.equal(fiabilidadTarjeta({ origen: "DANE-proyeccion-poblacion-2024", intervalo_confianza: 30 }), 30);
});

test("la fiabilidad puede llegar como texto numerico (JSON de Decimal)", () => {
  assert.equal(fiabilidadTarjeta({ origen: "proyeccion-x", intervalo_confianza: "45.5" }), 45.5);
});

test("es_real manda sobre el nombre del origen", () => {
  assert.equal(fiabilidadTarjeta({ origen: "TerriData", es_real: false, intervalo_confianza: 30 }), 30);
  assert.equal(fiabilidadTarjeta({ origen: "proyeccion-x", es_real: true, intervalo_confianza: 30 }), null);
});

test("dato confirmado: sin badge aunque traiga un intervalo", () => {
  assert.equal(fiabilidadTarjeta({ valor: 80, origen: "TerriData", intervalo_confianza: null }), null);
  assert.equal(fiabilidadTarjeta({ valor: 80, origen: "TerriData", intervalo_confianza: 30 }), null);
  assert.equal(fiabilidadTarjeta({ valor: 6.8, origen: "DANE-CNPV2018" }), null);
});

test("proyeccion sin fiabilidad (null, vacio, no numerica, ausente): sin badge y sin lanzar", () => {
  for (const intervalo of [null, undefined, "", "n/a", NaN]) {
    assert.equal(fiabilidadTarjeta({ origen: "proyeccion-x", intervalo_confianza: intervalo }), null);
  }
  assert.equal(fiabilidadTarjeta({ origen: "proyeccion-x" }), null);
});

test("sin dato (origen nulo) y entradas vacias: sin badge y sin lanzar", () => {
  assert.equal(fiabilidadTarjeta({ valor: null, origen: null, intervalo_confianza: null }), null);
  assert.equal(fiabilidadTarjeta({ valor: null }), null);
  assert.equal(fiabilidadTarjeta({}), null);
  assert.equal(fiabilidadTarjeta(null), null);
  assert.equal(fiabilidadTarjeta(undefined), null);
});

test("el prop historico proyectado=true fuerza el modo proyeccion", () => {
  assert.equal(fiabilidadTarjeta({ intervalo_confianza: 60 }, true), 60);
  assert.equal(fiabilidadTarjeta({ intervalo_confianza: null }, true), null);
});
