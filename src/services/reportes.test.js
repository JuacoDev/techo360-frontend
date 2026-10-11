import test from "node:test";
import assert from "node:assert/strict";
import { armarSolicitudReporte, mensajeDeError, solicitudAEstado, tiempoRelativo, validarPeriodo, enCurso } from "./reportesDatos.js";

const base = {
  formato: "excel",
  plantilla: "comparativo",
  anioInicio: "2020",
  anioFin: 2025,
  titulo: "  ",
  introduccion: "intro",
  conclusiones: "fin",
  graficas: [
    { id: "g1", tipo: "coropletico", modo: "general", variables: ["score_privacion"], zonas: ["68001"], titulo: "  Mapa  " },
    { id: "g2", tipo: "lineas", modo: "individual", variables: ["score_privacion"], zonas: ["68001"], titulo: "" },
  ],
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
      plantilla: "comparativo",
      comentarios: { 68001: "ok" },
    },
    variables: ["score_privacion", "densidad_poblacional"],
    zonas: { departamentos: ["68"], municipios: ["68001", "5001"] },
    // el modo general no manda zonas (usa todas las seleccionadas); el orden de la lista se conserva
    graficas: [
      { id: "g1", tipo: "coropletico", modo: "general", variables: ["score_privacion"], zonas: [], titulo: "Mapa" },
      { id: "g2", tipo: "lineas", modo: "individual", variables: ["score_privacion"], zonas: ["68001"], titulo: "" },
    ],
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

test("armarSolicitudReporte: sin gráficas incluir_graficas es false y 'reemplaza' solo viaja al editar", () => {
  const sin = armarSolicitudReporte({ ...base, graficas: [] });
  assert.equal(sin.opciones.incluir_graficas, false);
  assert.deepEqual(sin.graficas, []);
  assert.equal("reemplaza" in sin, false);
  const editando = armarSolicitudReporte({ ...base, reemplaza: 12 });
  assert.equal(editando.reemplaza, 12);
});

test("solicitudAEstado es la inversa de armarSolicitudReporte (seguir editando un reporte del historial)", () => {
  const solicitud = armarSolicitudReporte({ ...base, titulo: "Mi informe" });
  const estado = solicitudAEstado(solicitud);
  assert.equal(estado.formato, "excel");
  assert.equal(estado.plantilla, "comparativo");
  assert.equal(estado.anioInicio, 2020);
  assert.equal(estado.anioFin, 2025);
  assert.equal(estado.titulo, "Mi informe");
  assert.equal(estado.introduccion, "intro");
  assert.deepEqual(estado.comentarios, { 68001: "ok" });
  assert.deepEqual(estado.variables, ["score_privacion", "densidad_poblacional"]);
  assert.deepEqual(estado.departamentos, ["68"]);
  assert.deepEqual(estado.municipios, ["68001", "5001"]);
  assert.deepEqual(estado.graficas.map((g) => g.id), ["g1", "g2"], "mismo orden");
  assert.deepEqual(estado.graficas[1], { id: "g2", tipo: "lineas", modo: "individual", variables: ["score_privacion"], zonas: ["68001"], titulo: "" });
  // ida y vuelta: lo guardado se vuelve a armar igual
  const vuelta = armarSolicitudReporte({
    ...estado,
    variables: estado.variables,
    departamentos: estado.departamentos.map((codigo) => ({ codigo })),
    municipios: estado.municipios.map((codigo) => ({ codigo })),
  });
  assert.deepEqual(vuelta, solicitud);
});

test("solicitudAEstado tolera configuraciones antiguas o incompletas", () => {
  const estado = solicitudAEstado({ formato: "pdf", periodo: { anio_inicio: 2021, anio_fin: 2024 }, variables: ["score_privacion"], zonas: { departamentos: [], municipios: ["68001"] } });
  assert.equal(estado.plantilla, null);
  assert.equal(estado.titulo, "Informe de Indicadores");
  assert.deepEqual(estado.graficas, []);
  assert.deepEqual(estado.comentarios, {});
  assert.deepEqual(solicitudAEstado(null).graficas, []);
});

test("tiempoRelativo: 'hace cuánto' del historial en español", () => {
  const ahora = Date.parse("2026-10-11T12:00:00Z");
  const hace = (segundos) => new Date(ahora - segundos * 1000).toISOString();
  assert.equal(tiempoRelativo(hace(10), ahora), "hace un momento");
  assert.equal(tiempoRelativo(hace(5 * 60), ahora), "hace 5 min");
  assert.equal(tiempoRelativo(hace(3 * 3600), ahora), "hace 3 h");
  assert.equal(tiempoRelativo(hace(30 * 3600), ahora), "ayer");
  assert.equal(tiempoRelativo(hace(4 * 86400), ahora), "hace 4 días");
  assert.equal(tiempoRelativo(hace(14 * 86400), ahora), "hace 2 semanas");
  assert.equal(tiempoRelativo(hace(70 * 86400), ahora), "hace 2 meses");
  assert.equal(tiempoRelativo(hace(400 * 86400), ahora), "hace 1 año");
  assert.equal(tiempoRelativo("no es una fecha", ahora), "");
  assert.equal(tiempoRelativo(hace(-30), ahora), "hace un momento", "fechas futuras por desfase de reloj");
});
