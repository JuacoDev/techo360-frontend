import test from "node:test";
import assert from "node:assert/strict";
import {
  RUTAS,
  debeReemplazar,
  destinoConSesionEnLogin,
  destinoDeBusqueda,
  destinoDeVolver,
  destinoTrasLogin,
  esIdConversacionValido,
  esRutaDeAcceso,
  esRutaProtegida,
  idConversacionDeRuta,
  normalizarRuta,
  rutaDeConversacion,
  rutaDeLogin,
} from "./rutas.js";

test("tabla: rutas de la app; la del bot es /techobot y /chatbot NO existe (colision con nginx)", () => {
  assert.deepEqual(RUTAS, {
    inicio: "/", login: "/login", registro: "/registro", recuperar: "/recuperar",
    mapaCalor: "/mapa-calor", proyeccion: "/proyeccion", perfil: "/perfil",
    reportes: "/reportes", techobot: "/techobot",
  });
  for (const ruta of ["/chatbot", "/chatbot/3", "/auth", "/otp", "/api/zonas"]) {
    assert.equal(esRutaProtegida(ruta), false, ruta);
    assert.equal(destinoDeVolver(ruta), null, ruta);
  }
});

test("normalizarRuta: barra final, mayusculas, query y hash", () => {
  assert.equal(normalizarRuta("/Mapa-Calor/"), "/mapa-calor");
  assert.equal(normalizarRuta("/proyeccion?x=1#y"), "/proyeccion");
  assert.equal(normalizarRuta("/techobot/12/"), "/techobot/12");
  assert.equal(normalizarRuta(""), "/");
  assert.equal(normalizarRuta("///"), "/");
  assert.equal(normalizarRuta(undefined), "/");
});

test("protegidas: mapa, proyeccion, perfil, reportes, techobot y /techobot/:id valido", () => {
  for (const r of ["/mapa-calor", "/proyeccion", "/perfil", "/reportes", "/techobot", "/techobot/12", "/techobot/nueva", "/TechoBot/7/"]) {
    assert.equal(esRutaProtegida(r), true, r);
  }
  for (const r of ["/", "/login", "/registro", "/recuperar", "/x", "/techobot/abc", "/techobot/1/2", "/techobot/-1", "/mapa-calor/otra"]) {
    assert.equal(esRutaProtegida(r), false, r);
  }
});

test("rutas de acceso", () => {
  for (const r of ["/login", "/registro", "/recuperar", "/login?volver=/perfil"]) assert.equal(esRutaDeAcceso(r), true, r);
  for (const r of ["/", "/mapa-calor", "/techobot"]) assert.equal(esRutaDeAcceso(r), false, r);
});

test("/techobot/:id: id numerico o 'nueva'; lo demas no es conversacion", () => {
  assert.equal(idConversacionDeRuta("/techobot/12"), "12");
  assert.equal(idConversacionDeRuta("/techobot/nueva"), "nueva");
  assert.equal(idConversacionDeRuta("/techobot"), null);
  for (const r of ["/techobot/abc", "/techobot/1.5", "/techobot/", "/techobot/12/x", "/chatbot/12", "/techobot/1234567890123"]) {
    assert.equal(idConversacionDeRuta(r), null, r);
  }
  assert.equal(esIdConversacionValido("0"), true);
  assert.equal(esIdConversacionValido(undefined), false);
  assert.equal(esIdConversacionValido("12abc"), false);
  assert.equal(rutaDeConversacion(12), "/techobot/12");
});

test("?volver= valido: rutas protegidas, incluido un chat abierto", () => {
  assert.equal(destinoDeVolver("/mapa-calor"), "/mapa-calor");
  assert.equal(destinoDeVolver("/techobot/42"), "/techobot/42");
  assert.equal(destinoDeVolver("/Perfil/"), "/perfil");
  assert.equal(destinoDeBusqueda("?volver=/techobot/42"), "/techobot/42");
  assert.equal(destinoDeBusqueda("?volver=%2Ftechobot%2F42"), "/techobot/42");
});

test("?volver= invalido se ignora (no es redireccion abierta)", () => {
  const malos = [
    "https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com", "/login", "/registro", "/", "/api/zonas",
    "/chatbot", "mapa-calor", "", "javascript:alert(1)", "/techobot/abc", "/perfil?x=//evil.com", "/perfil#x", null, undefined, 42,
  ];
  for (const volver of malos) assert.equal(destinoDeVolver(volver), null, String(volver));
  assert.equal(destinoDeBusqueda("?volver=https%3A%2F%2Fevil.com"), null);
  assert.equal(destinoDeBusqueda(""), null);
  assert.equal(destinoDeBusqueda(undefined), null);
});

test("rutaDeLogin: guarda el destino solo si es valido", () => {
  assert.equal(rutaDeLogin("/techobot/9"), "/login?volver=/techobot/9");
  assert.equal(rutaDeLogin("/mapa-calor/"), "/login?volver=/mapa-calor");
  assert.equal(rutaDeLogin("//evil.com"), "/login");
  assert.equal(rutaDeLogin("/"), "/login");
});

test("tras login: ?volver= > sugerido > mapa de calor", () => {
  assert.equal(destinoTrasLogin({ busqueda: "?volver=/techobot/9" }), "/techobot/9");
  assert.equal(destinoTrasLogin({ busqueda: "?volver=/proyeccion", sugerido: "/" }), "/proyeccion");
  assert.equal(destinoTrasLogin({ busqueda: "", sugerido: "/" }), "/");
  assert.equal(destinoTrasLogin({ busqueda: "?volver=//evil.com" }), "/mapa-calor");
  assert.equal(destinoTrasLogin({ sugerido: "https://evil.com" }), "/mapa-calor");
  assert.equal(destinoTrasLogin(), "/mapa-calor");
});

test("con sesion en /login: al ?volver= valido o al inicio", () => {
  assert.equal(destinoConSesionEnLogin("?volver=/techobot/3"), "/techobot/3");
  assert.equal(destinoConSesionEnLogin("?volver=/login"), "/");
  assert.equal(destinoConSesionEnLogin(""), "/");
});

test("historial: salir del acceso reemplaza; entre pantallas de acceso o fuera de el, empuja", () => {
  assert.equal(debeReemplazar("/login", "/mapa-calor"), true);
  assert.equal(debeReemplazar("/login", "/"), true);
  assert.equal(debeReemplazar("/registro", "/mapa-calor"), true);
  assert.equal(debeReemplazar("/login", "/techobot/4"), true);
  assert.equal(debeReemplazar("/login", "/registro"), false);
  assert.equal(debeReemplazar("/recuperar", "/login"), false);
  assert.equal(debeReemplazar("/", "/login"), false);
  assert.equal(debeReemplazar("/techobot", "/techobot/4"), false);
  assert.equal(debeReemplazar("/mapa-calor", "/perfil"), false);
});
