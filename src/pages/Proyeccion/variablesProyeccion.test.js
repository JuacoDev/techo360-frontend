// Pruebas de variablesProyeccion.js -- runner integrado de Node (node:test), mismo criterio que
// combinarProyeccion.test.js.
//
// Uso: node --test src/pages/Proyeccion/variablesProyeccion.test.js
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  VARIABLES_PROYECCION,
  VARIABLE_POR_DEFECTO,
  aniosSinCargar,
  buscarVariable,
  claveCache,
  crearNormalizador,
  escaparHtml,
  esProyeccionOrigen,
  esProyeccionZona,
  estadoDeAnios,
  etiquetasLeyenda,
  formatearValor,
  htmlTooltipMunicipio,
  resumirAnios,
  serieDesdeMapa,
  serieDesdeServicio,
  textoFiabilidad,
} from "./variablesProyeccion.js";

test("el catalogo tiene las 8 variables del backend y el score es la de por defecto", () => {
  assert.deepEqual(
    VARIABLES_PROYECCION.map((v) => v.id),
    [
      "score_privacion",
      "densidad_poblacional",
      "cobertura_acueducto",
      "cobertura_alcantarillado",
      "deficit_habitacional_cuantitativo",
      "deficit_habitacional_cualitativo",
      "deficit_habitacional_total",
      "tenencia_informal_terrenos",
    ]
  );
  assert.equal(VARIABLE_POR_DEFECTO, "score_privacion");
  assert.equal(buscarVariable("desconocida").id, "score_privacion");
  // densidad y score se arman con los años del mapa; las otras 6 vienen de /serie
  assert.deepEqual(VARIABLES_PROYECCION.filter((v) => v.serie === "mapa").map((v) => v.id), ["score_privacion", "densidad_poblacional"]);
  assert.equal(VARIABLES_PROYECCION.filter((v) => v.serie === "servicio").length, 6);
});

test("colores: score directo, deficit/tenencia valor/100, coberturas invertidas", () => {
  assert.equal(crearNormalizador("score_privacion", [])(0.37), 0.37);
  assert.equal(crearNormalizador("score_privacion", [])(1.4), 1); // acotado
  assert.equal(crearNormalizador("deficit_habitacional_total", [])(25), 0.25);
  assert.equal(crearNormalizador("tenencia_informal_terrenos", [])(100), 1);
  assert.equal(crearNormalizador("cobertura_acueducto", [])(100), 0); // cobertura total = blanco
  assert.equal(crearNormalizador("cobertura_alcantarillado", [])(0), 1); // sin cobertura = rojo
  assert.equal(crearNormalizador("cobertura_acueducto", [])(75), 0.25);
  for (const v of VARIABLES_PROYECCION) {
    const n = crearNormalizador(v, [{ valor: 1 }, { valor: 10 }]);
    assert.equal(n(null), null, v.id);
    assert.equal(n(undefined), null, v.id);
    assert.equal(n("x"), null, v.id);
  }
});

test("densidad: escala logaritmica por año entre el minimo y el maximo positivos", () => {
  const zonas = [{ valor: 1 }, { valor: 10 }, { valor: 100 }, { valor: 10000 }, { valor: 0 }, { valor: null }];
  const n = crearNormalizador("densidad_poblacional", zonas);
  assert.equal(n(1), 0);
  assert.equal(n(10000), 1);
  assert.ok(Math.abs(n(100) - 0.5) < 1e-9);
  assert.equal(n(0), 0); // 0 no tiene logaritmo: queda en el extremo bajo, no en gris
  assert.equal(n(null), null);
  // otra escala por otro año
  const n2 = crearNormalizador("densidad_poblacional", [{ valor: 2 }, { valor: 200 }]);
  assert.equal(n2(2), 0);
  assert.equal(n2(200), 1);
  assert.ok(Math.abs(n2(20) - 0.5) < 1e-9);
  // sin valores positivos -> todo gris
  assert.equal(crearNormalizador("densidad_poblacional", [{ valor: 0 }])(5), null);
});

test("etiquetas de la leyenda", () => {
  assert.deepEqual(etiquetasLeyenda("score_privacion", []), ["0.0", "0.25", "0.5", "0.75", "1.0"]);
  assert.deepEqual(etiquetasLeyenda("deficit_habitacional_total", []), ["0 %", "25 %", "50 %", "75 %", "100 %"]);
  assert.deepEqual(etiquetasLeyenda("cobertura_acueducto", []), ["100 %", "75 %", "50 %", "25 %", "0 %"]);
  const marcas = etiquetasLeyenda("densidad_poblacional", [{ valor: 1 }, { valor: 10000 }]);
  assert.equal(marcas.length, 5);
  assert.equal(marcas[0], "1");
  assert.ok(marcas[4].replace(/\D/g, "") === "10000");
});

test("es proyeccion: el booleano del backend manda; sin el, el prefijo proyeccion-", () => {
  assert.equal(esProyeccionZona({ es_real: false, origen: "TerriData" }), true);
  assert.equal(esProyeccionZona({ es_real: true, origen: "proyeccion-x" }), false);
  assert.equal(esProyeccionZona({ origen: "proyeccion-techo360-ultimo-valor" }), true);
  // INC-001: la densidad proyectada (poblacion DANE / area) se guarda como proyeccion-poblacion-sobre-area
  assert.equal(esProyeccionZona({ origen: "proyeccion-poblacion-sobre-area" }), true);
  assert.equal(esProyeccionZona({ origen: "TerriData" }), false);
  assert.equal(esProyeccionZona(null), false);
});

test("regla unica de proyeccion por originvar: prefijo, sufijo y nombre legado (INC-001)", () => {
  // prefijo "proyeccion-" (incluye el nombre actual de la densidad proyectada)
  for (const o of ["proyeccion-poblacion-sobre-area", "proyeccion-techo360-ultimo-valor", "proyeccion-x"]) {
    assert.equal(esProyeccionOrigen(o), true, o);
  }
  // sufijo "-proyeccion"
  assert.equal(esProyeccionOrigen("TerriData-proyeccion"), true);
  // prefijo LEGADO "DANE-proyeccion-poblacion-" (ya no esta en la base, pero sigue siendo proyeccion)
  for (const o of ["DANE-proyeccion-poblacion-2024", "DANE-proyeccion-poblacion-2042"]) {
    assert.equal(esProyeccionOrigen(o), true, o);
  }
});

test("regla unica: el dato real no es proyeccion, aunque el texto contenga la palabra", () => {
  for (const o of ["IGAC Catastro", "TerriData", "DANE-CNPV2018", "DANE-poblacion", "mi-proyeccion-final", "Proyeccion-x", "x-Proyeccion"]) {
    assert.equal(esProyeccionOrigen(o), false, o);
  }
  for (const o of [null, undefined, "", 123, {}]) {
    assert.equal(esProyeccionOrigen(o), false, String(o));
  }
});

test("regla unica: donde la API entrega es_real, ese valor gana al nombre del origen", () => {
  assert.equal(esProyeccionZona({ es_real: true, origen: "proyeccion-poblacion-sobre-area" }), false);
  assert.equal(esProyeccionZona({ es_real: true, origen: "DANE-proyeccion-poblacion-2030" }), false);
  assert.equal(esProyeccionZona({ es_real: true, origen: "TerriData-proyeccion" }), false);
  assert.equal(esProyeccionZona({ es_real: false, origen: "IGAC Catastro" }), true);
  assert.equal(esProyeccionZona({ es_real: false, origen: null }), true);
  // sin es_real (payload de indicadores): decide el nombre
  assert.equal(esProyeccionZona({ origen: "proyeccion-poblacion-sobre-area" }), true);
  assert.equal(esProyeccionZona({ origen: "TerriData-proyeccion" }), true);
  assert.equal(esProyeccionZona({ origen: "DANE-proyeccion-poblacion-2030" }), true);
  assert.equal(esProyeccionZona({ origen: "IGAC Catastro" }), false);
  assert.equal(esProyeccionZona({ origen: "TerriData" }), false);
});

test("fiabilidad: lo que entrega la API, sin asumir un valor fijo", () => {
  assert.equal(textoFiabilidad({ fiabilidad: 60 }), "Fiabilidad = 60%");
  assert.equal(textoFiabilidad({ fiabilidad: 30 }), "Fiabilidad = 30%");
  assert.equal(textoFiabilidad({ fiabilidad: 42.5 }), "Fiabilidad = 42,5%");
  assert.equal(textoFiabilidad({ fiabilidad: null }), null);
  assert.equal(textoFiabilidad({}), null);
});

test("formato del valor con unidad", () => {
  assert.equal(formatearValor("score_privacion", 0.3641), "0,3641");
  assert.equal(formatearValor("cobertura_acueducto", 96.75), "96,75 %");
  assert.equal(formatearValor("densidad_poblacional", 6758.56), "6.758,6 hab/km²");
  assert.equal(formatearValor("cobertura_acueducto", null), "Sin dato");
});

test("serie desde el mapa: los años no cargados salen «sin cargar», nunca cero", () => {
  const datos = {
    2026: [{ codigo_municipio: "05001", valor: 10, es_real: false, origen: "proyeccion-x", fiabilidad: 55 }],
    2027: [{ codigo_municipio: "05001", valor: 11, es_real: false, origen: "proyeccion-poblacion-sobre-area", fiabilidad: 30 }],
    2028: [{ codigo_municipio: "99999", valor: 5 }], // el municipio no esta en ese año
  };
  const serie = serieDesdeMapa("05001", datos);
  assert.equal(serie.length, 19);
  assert.equal(serie[0].anio, 2024);
  assert.equal(serie.at(-1).anio, 2042);
  assert.deepEqual(serie.find((p) => p.anio === 2026), { anio: 2026, valor: 10, cargado: true, es_real: false, origen: "proyeccion-x", fiabilidad: 55 });
  assert.equal(serie.find((p) => p.anio === 2027).es_real, false);
  for (const anio of [2024, 2025, 2028, 2030]) {
    const p = serie.find((x) => x.anio === anio);
    assert.equal(p.valor, null, anio);
    assert.equal(p.cargado, false, anio);
  }
  assert.equal(aniosSinCargar(serie).length, 17);
});

test("serie del servicio: 19 puntos con es_real/origen/fiabilidad por punto", () => {
  const crudo = Array.from({ length: 19 }, (_, i) => ({
    anio: 2024 + i,
    valor: 90 + i / 10,
    es_real: i === 0,
    origen: i === 0 ? "TerriData" : "proyeccion-techo360-ultimo-valor",
    fiabilidad: i === 0 ? 100 : i === 1 ? 60 : 30,
  }));
  const serie = serieDesdeServicio(crudo);
  assert.equal(serie.length, 19);
  assert.equal(serie[0].es_real, true);
  assert.equal(serie[1].es_real, false);
  assert.deepEqual(serie.slice(0, 3).map((p) => p.fiabilidad), [100, 60, 30]);
  assert.equal(aniosSinCargar(serie).length, 0);
  // faltan años en la respuesta -> «sin cargar»
  const parcial = serieDesdeServicio(crudo.filter((p) => p.anio !== 2030));
  assert.deepEqual(aniosSinCargar(parcial), [2030]);
  assert.deepEqual(aniosSinCargar(serieDesdeServicio(undefined)).length, 19);
});

test("resumen de años", () => {
  assert.equal(resumirAnios([2025, 2026, 2027, 2028, 2029]), "2025-2029");
  assert.equal(resumirAnios([2024, 2026, 2027]), "2024, 2026, 2027");
  assert.equal(resumirAnios([2030]), "2030");
  assert.equal(resumirAnios([]), "");
});

test("estado de los años en el cache por (variable, año)", () => {
  const cache = { [claveCache("cobertura_acueducto", 2027)]: [], [claveCache("cobertura_acueducto", 2028)]: [{}] };
  const fallos = { [claveCache("cobertura_acueducto", 2029)]: "504", [claveCache("score_privacion", 2027)]: "x" };
  const e = estadoDeAnios(cache, fallos, "cobertura_acueducto", 2027, 2030);
  assert.deepEqual(e.cargados, [2027, 2028]);
  assert.deepEqual(e.fallidos, [{ anio: 2029, mensaje: "504" }]);
  // otra variable no se mezcla
  assert.deepEqual(estadoDeAnios(cache, fallos, "score_privacion", 2027, 2030), { cargados: [], fallidos: [{ anio: 2027, mensaje: "x" }] });
});

test("tooltip: valor, origen y badge de proyeccion con la fiabilidad; escapa HTML", () => {
  const proy = htmlTooltipMunicipio("Medellín", "cobertura_acueducto", { valor: 96.75, es_real: false, origen: "proyeccion-techo360-ultimo-valor", fiabilidad: 60 }, 2025);
  assert.match(proy, /Medellín/);
  assert.match(proy, /96,75 %/);
  assert.match(proy, /Origen: proyeccion-techo360-ultimo-valor/);
  assert.match(proy, /tooltip-proy-badge/);
  assert.match(proy, /Fiabilidad = 60%/);
  const real = htmlTooltipMunicipio("X", "cobertura_acueducto", { valor: 80, es_real: true, origen: "TerriData", fiabilidad: 100 }, 2024);
  assert.doesNotMatch(real, /tooltip-proy-badge/);
  assert.match(real, /Dato real/);
  assert.match(htmlTooltipMunicipio("X", "cobertura_acueducto", undefined, 2025), /sin dato/);
  assert.equal(escaparHtml("<b>&\"'"), "&lt;b&gt;&amp;&quot;&#39;");
  assert.doesNotMatch(htmlTooltipMunicipio("<img onerror=1>", "score_privacion", { valor: 0.5, es_real: true }, 2025), /<img/);
});
