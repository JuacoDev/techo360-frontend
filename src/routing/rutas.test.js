import test from "node:test";
import assert from "node:assert/strict";
import {
  RUTAS,
  debeReemplazar,
  destinoConSesionEnLogin,
  destinoDeBusqueda,
  destinoDeVolver,
  destinoTrasLogin,
  claveDeConversacion,
  estadoDeConversacion,
  esRutaDeAcceso,
  nombreDeModulo,
  esRutaProtegida,
  idConversacionDeEstado,
  normalizarRuta,
  rutaDeLogin,
} from "./rutas.js";

test("tabla: rutas de la app; la del bot es /techobot y /chatbot NO existe (colision con nginx)", () => {
  assert.deepEqual(RUTAS, {
    inicio: "/", login: "/login", registro: "/registro", recuperar: "/recuperar",
    mapaCalor: "/mapa-calor", proyeccion: "/proyeccion", perfil: "/perfil",
    reportes: "/reportes", techobot: "/techobot", chat: "/techobot/chat", chatNuevo: "/techobot/nueva",
  });
  for (const ruta of ["/chatbot", "/chatbot/3", "/auth", "/otp", "/api/zonas"]) {
    assert.equal(esRutaProtegida(ruta), false, ruta);
    assert.equal(destinoDeVolver(ruta), null, ruta);
  }
});

test("normalizarRuta: barra final, mayusculas, query y hash", () => {
  assert.equal(normalizarRuta("/Mapa-Calor/"), "/mapa-calor");
  assert.equal(normalizarRuta("/proyeccion?x=1#y"), "/proyeccion");
  assert.equal(normalizarRuta("/techobot/chat/"), "/techobot/chat");
  assert.equal(normalizarRuta(""), "/");
  assert.equal(normalizarRuta("///"), "/");
  assert.equal(normalizarRuta(undefined), "/");
});

test("protegidas: mapa, proyeccion, perfil, reportes, techobot, /techobot/chat y /techobot/nueva", () => {
  for (const r of ["/mapa-calor", "/proyeccion", "/perfil", "/reportes", "/techobot", "/techobot/chat", "/techobot/nueva", "/TechoBot/Chat/"]) {
    assert.equal(esRutaProtegida(r), true, r);
  }
  // el id ya no va en la URL: /techobot/12 deja de ser una ruta valida
  for (const r of ["/", "/login", "/registro", "/recuperar", "/x", "/techobot/12", "/techobot/abc", "/techobot/chat/12", "/techobot/-1", "/mapa-calor/otra"]) {
    assert.equal(esRutaProtegida(r), false, r);
  }
});

test("rutas de acceso", () => {
  for (const r of ["/login", "/registro", "/recuperar", "/login?volver=/perfil"]) assert.equal(esRutaDeAcceso(r), true, r);
  for (const r of ["/", "/mapa-calor", "/techobot"]) assert.equal(esRutaDeAcceso(r), false, r);
});

test("id de conversacion en el estado del historial (no en la URL)", () => {
  assert.equal(idConversacionDeEstado({ conversacionId: 12 }), 12);
  assert.equal(idConversacionDeEstado({ conversacionId: "12" }), 12);
  assert.equal(idConversacionDeEstado({ conversacionId: 0 }), 0);
  for (const e of [null, undefined, {}, { conversacionId: "abc" }, { conversacionId: -1 }, { conversacionId: 1.5 }, { conversacionId: "1234567890123" }, { conversacionId: true }, { otro: 3 }]) {
    assert.equal(idConversacionDeEstado(e), null, JSON.stringify(e));
  }
  assert.deepEqual(estadoDeConversacion(7), { conversacionId: 7 });
  assert.deepEqual(estadoDeConversacion(7, { desdeLista: true, conversacionId: 1 }), { desdeLista: true, conversacionId: 7 });
  assert.deepEqual(estadoDeConversacion(7, null), { conversacionId: 7 });
  // la ruta del chat es fija: el id no aparece en ella
  assert.equal(RUTAS.chat.includes("7"), false);
});

test("?volver= valido: rutas protegidas, incluido un chat abierto", () => {
  assert.equal(destinoDeVolver("/mapa-calor"), "/mapa-calor");
  assert.equal(destinoDeVolver("/techobot/chat"), "/techobot/chat");
  assert.equal(destinoDeVolver("/techobot/42"), null, "un id en ?volver= ya no se acepta");
  assert.equal(destinoDeVolver("/Perfil/"), "/perfil");
  assert.equal(destinoDeBusqueda("?volver=/techobot/chat"), "/techobot/chat");
  assert.equal(destinoDeBusqueda("?volver=%2Ftechobot%2Fchat"), "/techobot/chat");
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
  assert.equal(rutaDeLogin("/techobot/chat"), "/login?volver=/techobot/chat");
  assert.equal(rutaDeLogin("/techobot/9"), "/login");
  assert.equal(rutaDeLogin("/mapa-calor/"), "/login?volver=/mapa-calor");
  assert.equal(rutaDeLogin("//evil.com"), "/login");
  assert.equal(rutaDeLogin("/"), "/login");
});

test("tras login: ?volver= > sugerido > mapa de calor", () => {
  assert.equal(destinoTrasLogin({ busqueda: "?volver=/techobot/chat" }), "/techobot/chat");
  assert.equal(destinoTrasLogin({ busqueda: "?volver=/proyeccion", sugerido: "/" }), "/proyeccion");
  assert.equal(destinoTrasLogin({ busqueda: "", sugerido: "/" }), "/");
  assert.equal(destinoTrasLogin({ busqueda: "?volver=//evil.com" }), "/mapa-calor");
  assert.equal(destinoTrasLogin({ sugerido: "https://evil.com" }), "/mapa-calor");
  assert.equal(destinoTrasLogin(), "/mapa-calor");
});

test("con sesion en /login: al ?volver= valido o al inicio", () => {
  assert.equal(destinoConSesionEnLogin("?volver=/techobot/chat"), "/techobot/chat");
  assert.equal(destinoConSesionEnLogin("?volver=/login"), "/");
  assert.equal(destinoConSesionEnLogin(""), "/");
});

test("historial: salir del acceso reemplaza; entre pantallas de acceso o fuera de el, empuja", () => {
  assert.equal(debeReemplazar("/login", "/mapa-calor"), true);
  assert.equal(debeReemplazar("/login", "/"), true);
  assert.equal(debeReemplazar("/registro", "/mapa-calor"), true);
  assert.equal(debeReemplazar("/login", "/techobot/chat"), true);
  assert.equal(debeReemplazar("/login", "/registro"), false);
  assert.equal(debeReemplazar("/recuperar", "/login"), false);
  assert.equal(debeReemplazar("/", "/login"), false);
  assert.equal(debeReemplazar("/techobot", "/techobot/chat"), false);
  assert.equal(debeReemplazar("/mapa-calor", "/perfil"), false);
});

const UUID = "6f1c2d3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f";

test("public_id (UUID) en el estado del historial", () => {
  assert.equal(idConversacionDeEstado({ conversacionId: UUID }), UUID);
  assert.equal(idConversacionDeEstado({ conversacionId: UUID.toUpperCase() }), UUID, "se normaliza a minusculas");
  for (const malo of ["6f1c2d3e-4b5a", `${UUID}x`, `x${UUID}`, "6f1c2d3e4b5a4c6d8e9f0a1b2c3d4e5f", "../techobot"]) {
    assert.equal(idConversacionDeEstado({ conversacionId: malo }), null, malo);
  }
});

test("claveDeConversacion: public_id si el backend lo da, si no el id entero", () => {
  assert.equal(claveDeConversacion({ id: 11, public_id: UUID }), UUID);
  assert.equal(claveDeConversacion({ id: 11, public_id: UUID.toUpperCase() }), UUID);
  assert.equal(claveDeConversacion({ id: 11 }), 11, "backend sin public_id (antes del despliegue)");
  assert.equal(claveDeConversacion({ id: 11, public_id: null }), 11);
  assert.equal(claveDeConversacion({ id: 11, public_id: "no-es-uuid" }), 11);
  assert.equal(claveDeConversacion(null), null);
  // ida y vuelta: lo que se guarda en el estado se vuelve a leer igual
  for (const c of [{ id: 11, public_id: UUID }, { id: 11 }]) {
    assert.equal(idConversacionDeEstado(estadoDeConversacion(claveDeConversacion(c))), claveDeConversacion(c));
  }
});

test("nombreDeModulo: el header identifica el modulo por la ruta", () => {
  assert.equal(nombreDeModulo(RUTAS.mapaCalor), "Mapa de calor");
  assert.equal(nombreDeModulo(RUTAS.proyeccion), "Mapa de proyección");
  assert.equal(nombreDeModulo(RUTAS.reportes), "Visualizar y Generar Reportes");
  assert.equal(nombreDeModulo(RUTAS.perfil), "Perfil");
  for (const ruta of [RUTAS.techobot, RUTAS.chat, RUTAS.chatNuevo]) assert.equal(nombreDeModulo(ruta), "ChatBot");
  // tolera mayusculas, barra final y query
  assert.equal(nombreDeModulo("/Mapa-Calor/?x=1"), "Mapa de calor");
  // el inicio y las rutas desconocidas no llevan modulo
  assert.equal(nombreDeModulo(RUTAS.inicio), null);
  assert.equal(nombreDeModulo("/no-existe"), null);
  assert.equal(nombreDeModulo(undefined), null);
});
