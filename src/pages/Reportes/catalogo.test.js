import test from "node:test";
import assert from "node:assert/strict";
import { crearEtiquetaMunicipio, letra, nombreDePlantilla, PLANTILLAS, PLANTILLA_POR_DEFECTO, romano } from "./catalogo.js";

const departamentos = [
  { codigo: "68", nombre: "Santander" },
  { codigo: "05", nombre: "Antioquia" },
  { codigo: "11", nombre: "Bogotá D.C." },
];
const etiqueta = crearEtiquetaMunicipio(departamentos);

test("municipio con su departamento: 'Nombre, Departamento'", () => {
  assert.equal(etiqueta({ codigo: "68001", codigo_departamento: "68", nombre: "Bucaramanga" }), "Bucaramanga, Santander");
  assert.equal(etiqueta({ codigo: "05001", codigo_departamento: "05", nombre: "Medellín" }), "Medellín, Antioquia");
});

test("Bogotá va sin departamento", () => {
  assert.equal(etiqueta({ codigo: "11001", codigo_departamento: "11", nombre: "Bogotá, D.C." }), "Bogotá, D.C.");
  assert.equal(etiqueta({ codigo: "11001", codigo_departamento: "99", nombre: "Bogotá, D.C." }), "Bogotá, D.C.");
});

test("sin departamento conocido queda solo el nombre", () => {
  assert.equal(etiqueta({ codigo: "99999", codigo_departamento: "XX", nombre: "Otro" }), "Otro");
  assert.equal(etiqueta({ codigo: "99999", nombre: "Otro" }), "Otro");
});

test("romano y letra (numeración IEEE de tablas y subsecciones)", () => {
  assert.deepEqual([1, 4, 9, 14, 40, 90, 2026].map(romano), ["I", "IV", "IX", "XIV", "XL", "XC", "MMXXVI"]);
  assert.deepEqual([0, 1, 25, 26, 27, 51, 52].map(letra), ["A", "B", "Z", "AA", "AB", "AZ", "BA"]);
});

test("plantillas: dos por formato y la de por defecto existe", () => {
  for (const formato of ["pdf", "excel"]) {
    assert.equal(PLANTILLAS[formato].length, 2);
    assert.ok(PLANTILLAS[formato].some((plantilla) => plantilla.id === PLANTILLA_POR_DEFECTO[formato]));
  }
  assert.deepEqual(PLANTILLAS.pdf.map((p) => p.id), ["apa", "ieee"]);
  assert.deepEqual(PLANTILLAS.excel.map((p) => p.id), ["completo", "comparativo"]);
  assert.equal(nombreDePlantilla("pdf", "ieee"), "IEEE");
  assert.equal(nombreDePlantilla("pdf", "comparativo"), "");
});
