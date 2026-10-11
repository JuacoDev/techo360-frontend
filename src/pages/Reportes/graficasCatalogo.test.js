import test from "node:test";
import assert from "node:assert/strict";
import {
  estadoDeGrafica,
  modosDelTipo,
  nuevoIdGrafica,
  reordenar,
  TIPOS_GRAFICA,
  validarCombinacion,
  variablesDisponibles,
  variablesIniciales,
} from "./graficasCatalogo.js";

test("hay 16 tipos y cada uno admite al menos un modo", () => {
  assert.equal(TIPOS_GRAFICA.length, 16);
  assert.equal(new Set(TIPOS_GRAFICA.map((t) => t.id)).size, 16);
  for (const tipo of TIPOS_GRAFICA) assert.ok(modosDelTipo(tipo.id).length >= 1, tipo.id);
});

// Mismos casos que el backend (services/tests_reportes_graficas.py)
test("combinaciones válidas (las mismas que valida el backend)", () => {
  const validas = [
    ["coropletico", "general", ["score_privacion"], 8],
    ["barras_ranking", "general", ["score_privacion"], 8],
    ["barras_agrupadas", "comparar", ["cobertura_acueducto", "cobertura_alcantarillado"], 3],
    ["barras_agrupadas", "individual", ["cobertura_acueducto", "cobertura_alcantarillado"], 1],
    ["barras_apiladas", "general", ["deficit_habitacional_cuantitativo", "deficit_habitacional_cualitativo"], 8],
    ["barras_apiladas", "comparar", ["cobertura_acueducto"], 2],
    ["lineas", "comparar", ["cobertura_acueducto"], 3],
    ["radar", "comparar", ["score_privacion", "cobertura_acueducto", "cobertura_alcantarillado", "densidad_poblacional"], 2],
    ["dispersion", "general", ["score_privacion", "cobertura_acueducto", "densidad_poblacional"], 8],
    ["histograma", "general", ["cobertura_acueducto"], 8],
    ["boxplot", "general", ["score_privacion"], 8],
    ["bullet", "individual", ["cobertura_acueducto"], 1],
    ["gauge", "individual", ["score_privacion"], 1],
    ["dumbbell", "general", ["cobertura_acueducto", "cobertura_alcantarillado"], 8],
    ["donut", "individual", ["deficit_habitacional_cuantitativo", "deficit_habitacional_cualitativo"], 1],
    ["treemap", "general", ["deficit_habitacional_cuantitativo"], 8],
    ["correlaciones", "general", ["score_privacion", "cobertura_acueducto", "cobertura_alcantarillado"], 8],
    ["paneles", "general", ["score_privacion", "cobertura_acueducto", "densidad_poblacional"], 8],
  ];
  for (const [tipo, modo, variables, zonas] of validas) assert.equal(validarCombinacion(tipo, modo, variables, zonas), null, `${tipo}/${modo}`);
  assert.deepEqual(new Set(validas.map((v) => v[0])), new Set(TIPOS_GRAFICA.map((t) => t.id)));
});

test("combinaciones inválidas (las mismas que rechaza el backend)", () => {
  const invalidas = [
    ["barras_agrupadas", "general", ["score_privacion", "densidad_poblacional"], 8],
    ["barras_agrupadas", "general", ["cobertura_acueducto"], 8],
    ["barras_apiladas", "general", ["cobertura_acueducto", "cobertura_alcantarillado"], 8],
    ["barras_apiladas", "general", ["score_privacion"], 8],
    ["donut", "individual", ["cobertura_acueducto", "cobertura_alcantarillado"], 1],
    ["gauge", "individual", ["densidad_poblacional"], 1],
    ["histograma", "individual", ["score_privacion"], 1],
    ["bullet", "comparar", ["score_privacion"], 3],
    ["radar", "comparar", ["score_privacion", "cobertura_acueducto"], 2],
    ["correlaciones", "general", ["score_privacion", "cobertura_acueducto", "cobertura_alcantarillado"], 2],
    ["lineas", "comparar", ["score_privacion"], 1],
    ["lineas", "comparar", ["score_privacion"], 11],
    ["lineas", "individual", ["score_privacion"], 2],
    ["no_existe", "general", ["score_privacion"], 3],
  ];
  for (const [tipo, modo, variables, zonas] of invalidas) assert.notEqual(validarCombinacion(tipo, modo, variables, zonas), null, `${tipo}/${modo}/${variables}`);
});

test("al elegir un tipo solo se ofrecen los modos compatibles", () => {
  assert.deepEqual(modosDelTipo("histograma").map((m) => m.id), ["general"]);
  assert.deepEqual(modosDelTipo("bullet").map((m) => m.id), ["individual"]);
  assert.deepEqual(modosDelTipo("radar").map((m) => m.id), ["individual", "comparar"]);
  assert.deepEqual(modosDelTipo("lineas").map((m) => m.id), ["individual", "comparar", "general"]);
});

test("variablesDisponibles: unidad única, apiladas, donut y gauge", () => {
  // barras agrupadas: tras elegir un porcentaje solo quedan porcentajes
  assert.deepEqual(variablesDisponibles("barras_agrupadas", ["cobertura_acueducto"]).sort(), ["cobertura_acueducto", "cobertura_alcantarillado", "deficit_habitacional_cualitativo", "deficit_habitacional_cuantitativo"].sort());
  // al elegir el score solo queda el score (no hay otro índice)
  assert.deepEqual(variablesDisponibles("barras_agrupadas", ["score_privacion"]), ["score_privacion"]);
  // apiladas: una cobertura sola, o los dos déficits
  assert.equal(variablesDisponibles("barras_apiladas", []).length, 4);
  assert.deepEqual(variablesDisponibles("barras_apiladas", ["cobertura_acueducto"]), ["cobertura_acueducto"]);
  assert.deepEqual(variablesDisponibles("barras_apiladas", ["deficit_habitacional_cuantitativo"]).sort(), ["deficit_habitacional_cualitativo", "deficit_habitacional_cuantitativo"]);
  // donut y gauge
  assert.deepEqual(variablesIniciales("donut").length, 2);
  assert.ok(!variablesDisponibles("gauge", []).includes("densidad_poblacional"));
  // con el máximo marcado solo se pueden desmarcar las elegidas
  assert.deepEqual(variablesDisponibles("lineas", ["score_privacion"]), ["score_privacion"]);
  // radar: unidades mezcladas permitidas (se normalizan)
  assert.equal(variablesDisponibles("radar", ["score_privacion", "densidad_poblacional"]).length, 6);
});

test("estadoDeGrafica: se marca incompleta si se quita una zona o ya no cumple las reglas", () => {
  const g = { id: "a", tipo: "lineas", modo: "comparar", variables: ["score_privacion"], zonas: ["68001", "05001"] };
  assert.equal(estadoDeGrafica(g, ["68", "68001", "05001"]).ok, true);
  const sinZona = estadoDeGrafica(g, ["68", "68001"]);
  assert.equal(sinZona.ok, false);
  assert.match(sinZona.mensaje, /no está seleccionada/);
  const general = { id: "b", tipo: "correlaciones", modo: "general", variables: ["score_privacion", "cobertura_acueducto", "cobertura_alcantarillado"], zonas: [] };
  assert.equal(estadoDeGrafica(general, ["1", "2", "3", "4"]).ok, true);
  assert.equal(estadoDeGrafica(general, ["1", "2"]).ok, false);
});

test("reordenar mueve un elemento sin mutar y respeta los límites", () => {
  const lista = ["a", "b", "c", "d"];
  assert.deepEqual(reordenar(lista, 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(reordenar(lista, 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(reordenar(lista, 1, 1), lista);
  assert.equal(reordenar(lista, -1, 2), lista);
  assert.equal(reordenar(lista, 1, 9), lista);
  assert.deepEqual(lista, ["a", "b", "c", "d"], "no muta");
});

test("nuevoIdGrafica cumple el patrón del backend y no se repite", () => {
  const ids = new Set(Array.from({ length: 200 }, () => nuevoIdGrafica()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{1,40}$/);
});
