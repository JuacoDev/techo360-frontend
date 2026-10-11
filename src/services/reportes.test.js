import test from "node:test";
import assert from "node:assert/strict";
import { armarSolicitudReporte, mensajeDeError, validarPeriodo, enCurso } from "./reportesDatos.js";

const base = {
  formato: "excel",
  anioInicio: "2020",
  anioFin: 2025,
  titulo: "  ",
  introduccion: "intro",
  conclusiones: "fin",
  incluirGraficas: true,
  comentarios: { 68001: "ok", 68: "   ", "05001": "" },
  variables: [{ id: "score_privacion", nombre: "Score" }, "densidad_poblacional"],
  departamentos: [{ codigo: "68", nombre: "Santander" }],
  municipios: [{ codigo: "68001" }, { codigo: 5001 }],
};

test("armarSolicitudReporte: forma anidada que exige el backend", () => {
  const s = armarSolicitudReporte(base);
  assert.deepEqual(s, {
    formato: "excel",
    periodo: { anio_inicio: 2020, anio_fin: 2025 },
    opciones: {
      titulo: "Informe de Indicadores",
      introduccion: "intro",
      conclusiones: "fin",
      incluir_graficas: true,
      comentarios: { 68001: "ok" },
    },
    variables: ["score_privacion", "densidad_poblacional"],
    zonas: { departamentos: ["68"], municipios: ["68001", "5001"] },
  });
  assert.equal("titulo" in s, false);
  assert.equal("departamentos" in s, false);
});

test("validarPeriodo: rango del backend (2000-2042) e inicio <= fin", () => {
  assert.equal(validarPeriodo(2020, 2025), "");
  assert.match(validarPeriodo(1999, 2025), /entre 2000 y 2042/);
  assert.match(validarPeriodo(2020, 2043), /entre 2000 y 2042/);
  assert.match(validarPeriodo(2025, 2020), /no puede ser mayor/);
  assert.match(validarPeriodo("", 2020), /entre 2000 y 2042/);
});

test("mensajeDeError: texto, lista de FastAPI y respaldo (nunca [object Object])", () => {
  assert.equal(mensajeDeError({ detail: "Municipios inexistentes: 68999." }, "x"), "Municipios inexistentes: 68999.");
  const lista = { detail: [{ loc: ["body", "periodo"], msg: "Field required" }, { loc: ["body", "zonas"], msg: "Field required" }] };
  assert.equal(mensajeDeError(lista, "x"), "periodo: Field required · zonas: Field required");
  assert.equal(mensajeDeError({}, "respaldo"), "respaldo");
  assert.equal(mensajeDeError({ detail: [] }, "respaldo"), "respaldo");
  assert.doesNotMatch(mensajeDeError(lista, "x"), /object Object/);
});

test("enCurso: pendiente y procesando siguen; listo y error terminan", () => {
  assert.equal(enCurso({ estado: "pendiente" }), true);
  assert.equal(enCurso({ estado: "procesando" }), true);
  assert.equal(enCurso({ estado: "listo" }), false);
  assert.equal(enCurso({ estado: "error" }), false);
  assert.equal(enCurso(null), false);
});
