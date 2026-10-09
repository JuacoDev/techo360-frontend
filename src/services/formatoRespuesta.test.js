import test from "node:test";
import assert from "node:assert/strict";
import { dividirEnOraciones, formatearRespuestaBot } from "./formatoRespuesta.js";

const parrafos = (t) => t.split("\n\n");

test("respuesta corta: sin cambios (solo trim)", () => {
  assert.equal(formatearRespuestaBot("  Hola, ¿en qué te ayudo?  "), "Hola, ¿en qué te ayudo?");
  assert.equal(formatearRespuestaBot(null), "");
});

test("bloque largo: parrafos de 2-3 oraciones sin perder texto", () => {
  const oraciones = [
    "El déficit habitacional mide los hogares que no tienen una vivienda adecuada.",
    "Se divide en cuantitativo y cualitativo según el tipo de carencia.",
    "El cuantitativo cuenta los hogares que necesitan una vivienda nueva.",
    "El cualitativo cuenta las viviendas que pueden mejorarse.",
    "Ambos se calculan con datos del censo y de encuestas del DANE.",
    "Techo 360 los muestra por municipio en el mapa de calor.",
    "Puedes compararlos con la herramienta de reportes.",
  ];
  const texto = oraciones.join(" ");
  const r = formatearRespuestaBot(texto);
  const ps = parrafos(r);
  assert.ok(ps.length >= 2, r);
  for (const p of ps) {
    const n = dividirEnOraciones(p).length;
    assert.ok(n >= 2 && n <= 3, `${n}: ${p}`);
  }
  assert.equal(ps.join(" "), texto);
});

test("no parte en abreviaturas ni siglas (S.A., D.C., EE.UU., Dr.)", () => {
  const texto =
    "La empresa Aguas de Bogotá S.A. E.S.P. presta el servicio en la ciudad. " +
    "Bogotá D.C. Tiene una cobertura alta según el último reporte disponible del sistema. " +
    "El Dr. Pérez coordinó el estudio con apoyo de EE.UU. Y de otras entidades internacionales. " +
    "Los resultados se publicaron en el informe anual. La cobertura de acueducto supera el promedio nacional.";
  const oraciones = dividirEnOraciones(texto);
  assert.ok(oraciones.some((o) => o.includes("S.A. E.S.P. presta")), oraciones.join(" | "));
  assert.ok(oraciones.some((o) => o.includes("Bogotá D.C. Tiene")));
  assert.ok(oraciones.some((o) => o.includes("El Dr. Pérez")));
  assert.ok(oraciones.some((o) => o.includes("EE.UU. Y de otras")));
  const r = formatearRespuestaBot(texto);
  for (const pedazo of ["S.A. E.S.P. presta", "D.C. Tiene", "Dr. Pérez", "EE.UU. Y"]) assert.ok(r.includes(pedazo), pedazo);
});

test("no parte decimales con coma ni miles con punto", () => {
  const texto =
    "El score de privación de Bucaramanga es 0,3332 en la escala normalizada. " +
    "El municipio tiene 1.104 hogares en déficit cuantitativo según el reporte. " +
    "La densidad es de 4.512,7 habitantes por kilómetro cuadrado en el área urbana. " +
    "Estos valores pueden cambiar con la próxima actualización de datos del sistema.";
  const r = formatearRespuestaBot(texto);
  for (const cifra of ["0,3332", "1.104", "4.512,7"]) assert.ok(r.includes(cifra), cifra);
  assert.equal(dividirEnOraciones(texto).length, 4);
});

test("respeta los saltos dobles que ya emitió el modelo", () => {
  const texto = "Primer párrafo con varias ideas. Otra idea más. Y una tercera idea que alarga el texto bastante para pasar el umbral de longitud.\n\nSegundo párrafo. Con más texto. ".repeat(3);
  assert.equal(formatearRespuestaBot(texto), texto.trim());
});

test("no toca listas, código, citas ni títulos", () => {
  const relleno = "Esta es una oración de relleno para superar el umbral. ".repeat(6);
  for (const estructura of ["- primer punto\n- segundo punto", "1. paso uno\n2. paso dos", "Usa `codigo` aquí.", "```\nx = 1\n```", "> una cita", "## Título"]) {
    const texto = `${relleno}\n${estructura}`;
    assert.equal(formatearRespuestaBot(texto), texto.trim(), estructura);
  }
});

test("no pone negrita en cifras ni añade marcado", () => {
  const texto = "La cobertura de acueducto es 87,5 por ciento. ".repeat(8);
  const r = formatearRespuestaBot(texto);
  assert.ok(!r.includes("**") && !r.includes("__"));
});
