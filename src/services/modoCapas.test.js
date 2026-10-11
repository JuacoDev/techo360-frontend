import test from "node:test";
import assert from "node:assert/strict";
import { ESTADO_INICIAL_CAPAS, capaVisible, reducirModoCapas } from "./modoCapas.js";

const E = (modo, autoDesde = null) => ({ modo, autoDesde });
const modo = (m) => ({ tipo: "ELEGIR_MODO", modo: m });
const depto = (origen = "desplegable", codigo = "68") => ({ tipo: "ELEGIR_DEPARTAMENTO", origen, codigo });
const muni = (origen = "desplegable", codigo = "68001") => ({ tipo: "ELEGIR_MUNICIPIO", origen, codigo });
const limpiar = (origen = "desplegable") => ({ tipo: "LIMPIAR_SELECCION", origen });
const aplicar = (estado, eventos) => eventos.reduce(reducirModoCapas, estado);

test("estado inicial: Hibrido manual", () => {
  assert.deepEqual(ESTADO_INICIAL_CAPAS, E("hibrido"));
});

test("1. ELEGIR_MODO fija el modo y borra autoDesde (tambien con el modo ya activo)", () => {
  for (const m of ["municipios", "hibrido", "departamentos"]) {
    assert.deepEqual(reducirModoCapas(E("hibrido", "municipios"), modo(m)), E(m));
  }
  assert.deepEqual(reducirModoCapas(E("municipios"), modo("municipios")), E("municipios"));
  assert.deepEqual(reducirModoCapas(E("hibrido", "municipios"), modo("hibrido")), E("hibrido"), "tocar Hibrido (ya activo, automatico) lo vuelve manual");
  const s = E("hibrido");
  assert.equal(reducirModoCapas(s, modo("satelite")), s, "modo invalido se ignora");
});

test("2. ELEGIR_DEPARTAMENTO: Municipios -> Hibrido automatico; Hibrido y Departamentos no cambian", () => {
  assert.deepEqual(reducirModoCapas(E("municipios"), depto()), E("hibrido", "municipios"));
  const hm = E("hibrido");
  assert.equal(reducirModoCapas(hm, depto()), hm);
  const ha = E("hibrido", "municipios");
  assert.equal(reducirModoCapas(ha, depto()), ha, "conserva autoDesde");
  const d = E("departamentos");
  assert.equal(reducirModoCapas(d, depto()), d);
});

test("3. ELEGIR_MUNICIPIO: Hibrido automatico -> Municipios; Departamentos -> Hibrido manual; resto igual", () => {
  assert.deepEqual(reducirModoCapas(E("hibrido", "municipios"), muni()), E("municipios"));
  assert.deepEqual(reducirModoCapas(E("departamentos"), muni()), E("hibrido"));
  const hm = E("hibrido");
  assert.equal(reducirModoCapas(hm, muni()), hm, "Hibrido manual no cambia");
  const m = E("municipios");
  assert.equal(reducirModoCapas(m, muni()), m);
});

test("3b. Departamentos -> municipio -> Hibrido SIN retorno posterior", () => {
  const s = aplicar(E("departamentos"), [muni(), depto(), muni(), limpiar()]);
  assert.deepEqual(s, E("hibrido"));
});

test("4. LIMPIAR_SELECCION: vuelve a Municipios solo si el Hibrido era automatico", () => {
  assert.deepEqual(reducirModoCapas(E("hibrido", "municipios"), limpiar()), E("municipios"));
  for (const s of [E("hibrido"), E("municipios"), E("departamentos")]) assert.equal(reducirModoCapas(s, limpiar()), s);
});

test("toque manual despues del cambio automatico: no hay retorno", () => {
  // Municipios -> depto (auto Hibrido) -> usuario toca Hibrido -> municipio: se queda en Hibrido
  assert.deepEqual(aplicar(E("municipios"), [depto(), modo("hibrido"), muni()]), E("hibrido"));
  assert.deepEqual(aplicar(E("municipios"), [depto(), modo("hibrido"), limpiar()]), E("hibrido"));
  // ... o toca Departamentos: el municipio lo lleva a Hibrido manual, nunca a Municipios
  assert.deepEqual(aplicar(E("municipios"), [depto(), modo("departamentos"), muni()]), E("hibrido"));
});

test("el ciclo Municipios -> depto -> municipio -> Municipios se repite indefinidamente", () => {
  let s = E("municipios");
  for (let i = 0; i < 50; i++) {
    s = reducirModoCapas(s, depto());
    assert.deepEqual(s, E("hibrido", "municipios"), `vuelta ${i} tras depto`);
    s = reducirModoCapas(s, muni());
    assert.deepEqual(s, E("municipios"), `vuelta ${i} tras municipio`);
  }
  // variante con limpiar
  for (let i = 0; i < 10; i++) s = aplicar(s, [depto(), limpiar()]);
  assert.deepEqual(s, E("municipios"));
});

test("ignorados: clics en el mapa, sincronizacion programatica, valores vacios y eventos raros", () => {
  for (const s of [E("municipios"), E("hibrido", "municipios"), E("departamentos"), E("hibrido")]) {
    for (const ev of [depto("mapa"), muni("mapa"), limpiar("mapa"), depto("programatico"), muni(null), depto("desplegable", ""), muni("desplegable", ""), muni("desplegable", null), { tipo: "OTRO", origen: "desplegable" }, null, undefined]) {
      assert.equal(reducirModoCapas(s, ev), s, `${JSON.stringify(s)} + ${JSON.stringify(ev)}`);
    }
  }
});

test("trampa: elegir depto reinicia el select de municipio a '' -> no cuenta como ELEGIR_MUNICIPIO", () => {
  // secuencia que emite el buscador: depto (usuario) y el reinicio del municipio (valor vacio)
  assert.deepEqual(aplicar(E("municipios"), [depto(), muni("desplegable", "")]), E("hibrido", "municipios"));
});

test("trampa: re-sincronizar el departamento por codigo tras elegir municipio no genera bucle", () => {
  // usuario elige municipio (vuelve a Municipios); la barra re-sincroniza el depto por codigo (programatico)
  assert.deepEqual(aplicar(E("hibrido", "municipios"), [muni(), depto("programatico")]), E("municipios"));
});

test("eventos seguidos en el mismo tick se aplican en orden (reducer atomico)", () => {
  assert.deepEqual(aplicar(E("municipios"), [depto(), muni(), depto()]), E("hibrido", "municipios"));
});

test("capaVisible: el zoom solo decide en Hibrido (umbral 9)", () => {
  assert.equal(capaVisible("municipios", 5), "municipios");
  assert.equal(capaVisible("departamentos", 12), "departamentos");
  assert.equal(capaVisible("hibrido", 8), "departamentos");
  assert.equal(capaVisible("hibrido", 9), "municipios");
});
