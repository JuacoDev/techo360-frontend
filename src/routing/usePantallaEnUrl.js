import { useCallback, useEffect, useRef, useState } from "react";

// Sincroniza el estado `screen` de App.jsx con la URL, sin react-router.
//
// La app sigue siendo "una sola pantalla a la vez" (el estado `screen`); este
// hook solo (1) lo inicializa desde la ruta, (2) empuja una entrada de
// historial cuando cambia de pantalla y (3) escucha popstate (Atras/Adelante).
// `setScreen` conserva la firma del setter de useState, asi que ningun
// componente hijo cambia.
//
// Las funciones puras de abajo (tabla de rutas, resolucion de la pantalla
// inicial, decision de push/replace) no tocan `window`: se prueban en Node
// (usePantallaEnUrl.test.js).

// Ruta -> pantalla "canonica". NO se usa /chatbot: en nginx `location /chatbot/`
// redirige /chatbot a /chatbot/ y lo manda al servicio del chatbot (tambien
// /auth, /otp y /api). Para la ruta de la pantalla del bot se usa /techobot.
// /reportes se anade aqui cuando la pantalla exista.
const RUTA_A_PANTALLA = {
  "/": "home",
  "/login": "login",
  "/registro": "registro",
  "/recuperar": "recuperacion1",
  "/mapa-calor": "loading",
  "/proyeccion": "proyeccion",
  "/techobot": "chatbot",
  "/perfil": "perfil",
};

// Pantalla -> ruta. Varias pantallas comparten ruta: "loading" y "app" son el
// mapa de calor (loading pasa a app solo cuando el mapa carga), y los pasos que
// dependen de estado en memoria (verificar-otp, recuperacion2) viven en la ruta
// de su primer paso, porque un F5 pierde ese estado.
const PANTALLA_A_RUTA = {
  home: "/",
  login: "/login",
  registro: "/registro",
  "verificar-otp": "/registro",
  recuperacion1: "/recuperar",
  recuperacion2: "/recuperar",
  loading: "/mapa-calor",
  app: "/mapa-calor",
  proyeccion: "/proyeccion",
  chatbot: "/techobot",
  perfil: "/perfil",
};

const PANTALLAS_PROTEGIDAS = new Set(["loading", "app", "proyeccion", "chatbot", "perfil"]);
const PANTALLAS_DE_ACCESO = new Set(["login", "registro", "verificar-otp", "recuperacion1", "recuperacion2"]);

export function normalizarRuta(ruta) {
  const sinExtras = String(ruta ?? "/").toLowerCase().split("?")[0].split("#")[0];
  const sinBarraFinal = sinExtras.replace(/\/+$/, "");
  return sinBarraFinal === "" ? "/" : sinBarraFinal;
}

export function pantallaDeRuta(ruta) {
  return RUTA_A_PANTALLA[normalizarRuta(ruta)] ?? null;
}

export function rutaDePantalla(pantalla) {
  return PANTALLA_A_RUTA[pantalla] ?? null;
}

export function esPantallaProtegida(pantalla) {
  return PANTALLAS_PROTEGIDAS.has(pantalla);
}

// ?volver=/mapa-calor -> "loading". Solo se aceptan rutas conocidas Y protegidas:
// cualquier otro valor (https://..., //otro.sitio, /login, /api/...) se ignora,
// asi el parametro no puede usarse como redireccion abierta.
function destinoDeVolver(volver) {
  if (typeof volver !== "string" || !volver.startsWith("/") || volver.startsWith("//")) return null;
  const pantalla = pantallaDeRuta(volver);
  return pantalla !== null && PANTALLAS_PROTEGIDAS.has(pantalla) ? pantalla : null;
}

// Pantalla con la que arranca la app (y a la que se vuelve en popstate) segun
// la URL y si hay sesion. `url` es la URL canonica final: si difiere de la
// actual, el hook la reemplaza (replaceState, sin entrada de historial nueva).
export function resolverPantallaInicial({ ruta, busqueda = "", haySesion }) {
  const rutaNormalizada = normalizarRuta(ruta);
  const pantalla = pantallaDeRuta(rutaNormalizada);
  const destino = destinoDeVolver(new URLSearchParams(busqueda).get("volver"));

  if (pantalla === null) return { screen: "home", destinoLogin: null, url: "/" };

  if (pantalla === "login") {
    if (haySesion) {
      const siguiente = destino ?? "home";
      return { screen: siguiente, destinoLogin: null, url: rutaDePantalla(siguiente) };
    }
    return {
      screen: "login",
      destinoLogin: destino,
      url: destino ? `/login?volver=${rutaDePantalla(destino)}` : "/login",
    };
  }

  if (PANTALLAS_PROTEGIDAS.has(pantalla) && !haySesion) {
    return { screen: "login", destinoLogin: pantalla, url: `/login?volver=${rutaNormalizada}` };
  }

  return { screen: pantalla, destinoLogin: null, url: rutaDePantalla(pantalla) };
}

// Que hacer con el historial al pasar de `anterior` a `siguiente`:
//  - "nada": la ruta no cambia (loading -> app, registro -> verificar-otp) o la
//    pantalla no tiene ruta todavia.
//  - "reemplazar": se sale de login/registro/recuperacion hacia otra pantalla;
//    reemplaza la entrada para que "Atras" no vuelva al formulario.
//  - "empujar": cualquier otro cambio de pantalla.
export function decidirNavegacion({ anterior, siguiente, rutaActual }) {
  const nueva = rutaDePantalla(siguiente);
  if (nueva === null || normalizarRuta(rutaActual) === nueva) return { accion: "nada", url: null };
  const saleDelAcceso = PANTALLAS_DE_ACCESO.has(anterior) && !PANTALLAS_DE_ACCESO.has(siguiente);
  return { accion: saleDelAcceso ? "reemplazar" : "empujar", url: nueva };
}

// obtenerToken: funcion que devuelve el token guardado (getToken de services/api).
// Devuelve [screen, setScreen, destinoLogin]; destinoLogin es la pantalla a la que
// volver tras iniciar sesion cuando se llego a una ruta protegida sin sesion.
export function usePantallaEnUrl(obtenerToken) {
  const haySesion = () => Boolean(obtenerToken && obtenerToken());
  const leerUrl = () => ({ ruta: window.location.pathname, busqueda: window.location.search });

  const [inicial] = useState(() => resolverPantallaInicial({ ...leerUrl(), haySesion: haySesion() }));
  const [screen, setScreenEstado] = useState(inicial.screen);
  const actual = useRef(inicial.screen);

  useEffect(() => {
    if (inicial.url !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", inicial.url);
    }

    const alVolver = () => {
      const resuelto = resolverPantallaInicial({ ...leerUrl(), haySesion: haySesion() });
      // Mismo lugar (p. ej. un <a href="#"> dispara popstate sin cambiar de ruta):
      // no tocar el estado, o "app" volveria a "loading" y remontaria el mapa.
      if (rutaDePantalla(actual.current) === rutaDePantalla(resuelto.screen)) return;
      if (resuelto.url !== window.location.pathname + window.location.search) {
        window.history.replaceState(null, "", resuelto.url);
      }
      actual.current = resuelto.screen;
      setScreenEstado(resuelto.screen);
    };

    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setScreen = useCallback((nuevo) => {
    const siguiente = typeof nuevo === "function" ? nuevo(actual.current) : nuevo;
    const { accion, url } = decidirNavegacion({
      anterior: actual.current,
      siguiente,
      rutaActual: window.location.pathname,
    });
    if (accion === "empujar") window.history.pushState(null, "", url);
    else if (accion === "reemplazar") window.history.replaceState(null, "", url);
    actual.current = siguiente;
    setScreenEstado(siguiente);
  }, []);

  return [screen, setScreen, inicial.destinoLogin];
}
