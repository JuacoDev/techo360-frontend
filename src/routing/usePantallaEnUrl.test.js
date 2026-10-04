import test from "node:test";
import assert from "node:assert/strict";
import {
  decidirNavegacion,
  esPantallaProtegida,
  normalizarRuta,
  pantallaDeRuta,
  resolverPantallaInicial,
  rutaDePantalla,
} from "./usePantallaEnUrl.js";

const conSesion = (ruta, busqueda = "") => resolverPantallaInicial({ ruta, busqueda, haySesion: true });
const sinSesion = (ruta, busqueda = "") => resolverPantallaInicial({ ruta, busqueda, haySesion: false });

test("tabla: cada ruta conocida da su pantalla", () => {
  assert.equal(pantallaDeRuta("/"), "home");
  assert.equal(pantallaDeRuta("/login"), "login");
  assert.equal(pantallaDeRuta("/registro"), "registro");
  assert.equal(pantallaDeRuta("/recuperar"), "recuperacion1");
  assert.equal(pantallaDeRuta("/mapa-calor"), "loading");
  assert.equal(pantallaDeRuta("/proyeccion"), "proyeccion");
  assert.equal(pantallaDeRuta("/techobot"), "chatbot");
  assert.equal(pantallaDeRuta("/perfil"), "perfil");
});

test("tabla: la ruta del bot es /techobot y /chatbot NO existe (colision con nginx)", () => {
  assert.equal(rutaDePantalla("chatbot"), "/techobot");
  assert.equal(pantallaDeRuta("/chatbot"), null);
  for (const ruta of ["/auth", "/otp", "/api", "/chatbot"]) assert.equal(pantallaDeRuta(ruta), null);
});

test("tabla: cada pantalla de App.jsx tiene ruta; las que comparten ruta caen en la del primer paso", () => {
  const esperadas = {
    home: "/", login: "/login", registro: "/registro", "verificar-otp": "/registro",
    recuperacion1: "/recuperar", recuperacion2: "/recuperar", loading: "/mapa-calor", app: "/mapa-calor",
    proyeccion: "/proyeccion", chatbot: "/techobot", perfil: "/perfil",
  };
  for (const [pantalla, ruta] of Object.entries(esperadas)) assert.equal(rutaDePantalla(pantalla), ruta, pantalla);
});

test("tabla: una pantalla sin ruta (p. ej. reportes, aun no anadida) da null", () => {
  assert.equal(rutaDePantalla("reportes"), null);
  assert.equal(rutaDePantalla("inventada"), null);
});

test("ida y vuelta: pantalla -> ruta -> pantalla canonica", () => {
  for (const pantalla of ["home", "login", "registro", "recuperacion1", "loading", "proyeccion", "chatbot", "perfil"]) {
    assert.equal(pantallaDeRuta(rutaDePantalla(pantalla)), pantalla, pantalla);
  }
  assert.equal(pantallaDeRuta(rutaDePantalla("app")), "loading");
});

test("normalizarRuta: barra final, mayusculas, query y hash", () => {
  assert.equal(normalizarRuta("/Mapa-Calor/"), "/mapa-calor");
  assert.equal(normalizarRuta("/proyeccion?x=1#y"), "/proyeccion");
  assert.equal(normalizarRuta(""), "/");
  assert.equal(normalizarRuta("///"), "/");
  assert.equal(normalizarRuta(undefined), "/");
});

test("ruta desconocida -> home y la URL pasa a /", () => {
  for (const ruta of ["/ruta-inventada", "/chatbot", "/auth/login", "/api/zonas", "//evil.com", "/mapa-calor/otra"]) {
    for (const r of [conSesion(ruta), sinSesion(ruta)]) {
      assert.deepEqual(r, { screen: "home", destinoLogin: null, url: "/" }, ruta);
    }
  }
});

test("rutas protegidas CON sesion entran directo", () => {
  assert.deepEqual(conSesion("/mapa-calor"), { screen: "loading", destinoLogin: null, url: "/mapa-calor" });
  assert.deepEqual(conSesion("/proyeccion"), { screen: "proyeccion", destinoLogin: null, url: "/proyeccion" });
  assert.deepEqual(conSesion("/techobot"), { screen: "chatbot", destinoLogin: null, url: "/techobot" });
  assert.deepEqual(conSesion("/perfil"), { screen: "perfil", destinoLogin: null, url: "/perfil" });
  assert.deepEqual(conSesion("/Mapa-Calor/"), { screen: "loading", destinoLogin: null, url: "/mapa-calor" });
});

test("rutas protegidas SIN sesion -> login con ?volver= y destino para despues", () => {
  assert.deepEqual(sinSesion("/mapa-calor"), { screen: "login", destinoLogin: "loading", url: "/login?volver=/mapa-calor" });
  assert.deepEqual(sinSesion("/proyeccion"), { screen: "login", destinoLogin: "proyeccion", url: "/login?volver=/proyeccion" });
  assert.deepEqual(sinSesion("/techobot"), { screen: "login", destinoLogin: "chatbot", url: "/login?volver=/techobot" });
  assert.deepEqual(sinSesion("/perfil"), { screen: "login", destinoLogin: "perfil", url: "/login?volver=/perfil" });
});

test("rutas publicas no piden sesion", () => {
  for (const [ruta, pantalla] of [["/", "home"], ["/registro", "registro"], ["/recuperar", "recuperacion1"]]) {
    assert.equal(sinSesion(ruta).screen, pantalla);
    assert.equal(sinSesion(ruta).destinoLogin, null);
  }
});

test("/login: sin sesion se queda (con o sin destino); con sesion sale", () => {
  assert.deepEqual(sinSesion("/login"), { screen: "login", destinoLogin: null, url: "/login" });
  assert.deepEqual(sinSesion("/login", "?volver=/techobot"), { screen: "login", destinoLogin: "chatbot", url: "/login?volver=/techobot" });
  assert.deepEqual(conSesion("/login"), { screen: "home", destinoLogin: null, url: "/" });
  assert.deepEqual(conSesion("/login", "?volver=/proyeccion"), { screen: "proyeccion", destinoLogin: null, url: "/proyeccion" });
});

test("?volver= invalido se ignora (no es redireccion abierta)", () => {
  for (const volver of ["https://evil.com", "//evil.com", "/login", "/registro", "/", "/api/zonas", "/chatbot", "mapa-calor", "", "javascript:alert(1)"]) {
    const r = sinSesion("/login", `?volver=${encodeURIComponent(volver)}`);
    assert.deepEqual(r, { screen: "login", destinoLogin: null, url: "/login" }, volver);
    const c = conSesion("/login", `?volver=${encodeURIComponent(volver)}`);
    assert.deepEqual(c, { screen: "home", destinoLogin: null, url: "/" }, volver);
  }
});

test("la URL final resuelta es estable (resolverla de nuevo no cambia nada)", () => {
  for (const [ruta, busqueda, haySesion] of [["/mapa-calor", "", false], ["/techobot", "", true], ["/login", "?volver=/perfil", false], ["/x", "", true]]) {
    const a = resolverPantallaInicial({ ruta, busqueda, haySesion });
    const [r, b = ""] = a.url.split("?");
    const otra = resolverPantallaInicial({ ruta: r, busqueda: b ? `?${b}` : "", haySesion });
    assert.equal(otra.url, a.url);
    assert.equal(otra.screen, a.screen);
  }
});

test("pantallas protegidas", () => {
  for (const p of ["loading", "app", "proyeccion", "chatbot", "perfil"]) assert.equal(esPantallaProtegida(p), true, p);
  for (const p of ["home", "login", "registro", "verificar-otp", "recuperacion1", "recuperacion2"]) assert.equal(esPantallaProtegida(p), false, p);
});

test("historial: cambio de pantalla empuja una entrada", () => {
  assert.deepEqual(decidirNavegacion({ anterior: "home", siguiente: "proyeccion", rutaActual: "/" }), { accion: "empujar", url: "/proyeccion" });
  assert.deepEqual(decidirNavegacion({ anterior: "app", siguiente: "chatbot", rutaActual: "/mapa-calor" }), { accion: "empujar", url: "/techobot" });
  assert.deepEqual(decidirNavegacion({ anterior: "home", siguiente: "login", rutaActual: "/" }), { accion: "empujar", url: "/login" });
});

test("historial: loading -> app NO anade entrada (misma ruta)", () => {
  assert.deepEqual(decidirNavegacion({ anterior: "loading", siguiente: "app", rutaActual: "/mapa-calor" }), { accion: "nada", url: null });
});

test("historial: pasos del mismo flujo de acceso con la misma ruta no anaden entrada", () => {
  assert.equal(decidirNavegacion({ anterior: "registro", siguiente: "verificar-otp", rutaActual: "/registro" }).accion, "nada");
  assert.equal(decidirNavegacion({ anterior: "recuperacion1", siguiente: "recuperacion2", rutaActual: "/recuperar" }).accion, "nada");
});

test("historial: salir del login/registro/recuperacion REEMPLAZA (Atras no vuelve al formulario)", () => {
  assert.deepEqual(decidirNavegacion({ anterior: "login", siguiente: "loading", rutaActual: "/login" }), { accion: "reemplazar", url: "/mapa-calor" });
  assert.deepEqual(decidirNavegacion({ anterior: "login", siguiente: "home", rutaActual: "/login" }), { accion: "reemplazar", url: "/" });
  assert.deepEqual(decidirNavegacion({ anterior: "verificar-otp", siguiente: "loading", rutaActual: "/registro" }), { accion: "reemplazar", url: "/mapa-calor" });
  assert.deepEqual(decidirNavegacion({ anterior: "recuperacion2", siguiente: "login", rutaActual: "/recuperar" }), { accion: "empujar", url: "/login" });
});

test("historial: login <-> registro (ambos de acceso) empuja", () => {
  assert.equal(decidirNavegacion({ anterior: "login", siguiente: "registro", rutaActual: "/login" }).accion, "empujar");
  assert.equal(decidirNavegacion({ anterior: "registro", siguiente: "login", rutaActual: "/registro" }).accion, "empujar");
});

test("historial: setScreen('login') estando en /login?volver=... no cambia la URL", () => {
  assert.equal(decidirNavegacion({ anterior: "login", siguiente: "login", rutaActual: "/login" }).accion, "nada");
});

test("historial: una pantalla sin ruta (reportes, hasta que se anada) no toca el historial", () => {
  assert.deepEqual(decidirNavegacion({ anterior: "home", siguiente: "reportes", rutaActual: "/" }), { accion: "nada", url: null });
});
