// Tabla de rutas y reglas de navegacion de la app (react-router, modo declarativo).
//
// Funciones puras: no tocan `window` ni react-router, asi se prueban con
// `node --test` (rutas.test.js). App.jsx declara los <Route> con estas mismas
// constantes y los componentes navegan con useIrA() (routing/useIrA.js).
//
// NO se usa /chatbot: en nginx `location /chatbot/` manda esa ruta al servicio
// del bot (igual que /auth, /otp y /api). La pantalla del bot vive en /techobot.

export const RUTAS = {
  inicio: "/",
  login: "/login",
  registro: "/registro", // incluye el paso verificar-otp (estado en memoria)
  recuperar: "/recuperar", // incluye el paso 2 de recuperacion (estado en memoria)
  mapaCalor: "/mapa-calor", // pantalla de carga -> mapa, en la misma ruta
  proyeccion: "/proyeccion",
  perfil: "/perfil",
  reportes: "/reportes",
  techobot: "/techobot", // lista de conversaciones
  // Chat abierto. El id de la conversacion NO va en la URL: viaja en el estado
  // del historial (history.state, via navigate(..., { state })), que sobrevive a
  // F5 y a Atras/Adelante pero no a un enlace copiado ni a una pestana nueva.
  chat: "/techobot/chat",
  // Conversacion que todavia no existe; al crearse con el primer mensaje se
  // reemplaza por /techobot/chat con el id en el estado.
  chatNuevo: "/techobot/nueva",
};

const RUTAS_PROTEGIDAS = new Set([
  RUTAS.mapaCalor,
  RUTAS.proyeccion,
  RUTAS.perfil,
  RUTAS.reportes,
  RUTAS.techobot,
  RUTAS.chat,
  RUTAS.chatNuevo,
]);

const RUTAS_DE_ACCESO = new Set([RUTAS.login, RUTAS.registro, RUTAS.recuperar]);

const PATRON_ID = /^\d{1,12}$/;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizarRuta(ruta) {
  const sinExtras = String(ruta ?? "/").toLowerCase().split("?")[0].split("#")[0];
  const sinBarraFinal = sinExtras.replace(/\/+$/, "");
  return sinBarraFinal === "" ? "/" : sinBarraFinal;
}

// Identificador de la conversacion guardado en el estado del historial
// ({ conversacionId }): el public_id (UUID, en minusculas) que da el backend, o el id
// entero (o su texto, de hasta 12 cifras) mientras el backend no lo exponga.
// Cualquier otra cosa -> null.
export function idConversacionDeEstado(estado) {
  const id = estado?.conversacionId;
  if (typeof id === "number") return Number.isSafeInteger(id) && id >= 0 ? id : null;
  if (typeof id === "string" && PATRON_ID.test(id)) return Number(id);
  if (typeof id === "string" && PATRON_UUID.test(id)) return id.toLowerCase();
  return null;
}

// Identificador que el frontend usa para una conversacion de la API: public_id si el
// backend ya lo devuelve (opaco, no enumerable), si no el id entero. Funciona antes y
// despues de desplegar el backend con public_id.
export function claveDeConversacion(conversacion) {
  const publico = conversacion?.public_id;
  if (typeof publico === "string" && PATRON_UUID.test(publico)) return publico.toLowerCase();
  return conversacion?.id ?? null;
}

// Estado para navegar a RUTAS.chat: conserva `extra` (p. ej. desdeLista) y fija el id.
export function estadoDeConversacion(id, extra = {}) {
  return { ...(extra ?? {}), conversacionId: id };
}

export function esRutaProtegida(ruta) {
  return RUTAS_PROTEGIDAS.has(normalizarRuta(ruta));
}

export function esRutaDeAcceso(ruta) {
  return RUTAS_DE_ACCESO.has(normalizarRuta(ruta));
}

// ?volver=/mapa-calor -> "/mapa-calor". Solo se aceptan rutas conocidas Y
// protegidas (incluido /techobot/chat, que no lleva id): cualquier otro valor
// (https://..., //otro.sitio, /login, /api/...) da null, asi el parametro no
// puede usarse como redireccion abierta.
export function destinoDeVolver(volver) {
  if (typeof volver !== "string" || !volver.startsWith("/") || volver.startsWith("//")) return null;
  if (volver.includes("\\") || volver.includes("?") || volver.includes("#")) return null;
  const ruta = normalizarRuta(volver);
  return esRutaProtegida(ruta) ? ruta : null;
}

// "?volver=/perfil&x=1" -> "/perfil" (o null).
export function destinoDeBusqueda(busqueda) {
  return destinoDeVolver(new URLSearchParams(busqueda ?? "").get("volver"));
}

// URL del login que, tras iniciar sesion, vuelve a `ruta` (si es un destino valido).
export function rutaDeLogin(ruta) {
  const destino = destinoDeVolver(ruta);
  return destino ? `${RUTAS.login}?volver=${destino}` : RUTAS.login;
}

// A donde ir tras un login correcto: el ?volver= valido; si no hay, el destino
// sugerido por quien abrio el login (p. ej. el Home publico pide volver a "/")
// y, por defecto, el mapa de calor (comportamiento previo de la app).
export function destinoTrasLogin({ busqueda, sugerido } = {}) {
  const destino = destinoDeBusqueda(busqueda);
  if (destino) return destino;
  if (sugerido === RUTAS.inicio) return RUTAS.inicio;
  return destinoDeVolver(sugerido) ?? RUTAS.mapaCalor;
}

// Con sesion activa, /login no se muestra: se va al ?volver= valido o al inicio.
export function destinoConSesionEnLogin(busqueda) {
  return destinoDeBusqueda(busqueda) ?? RUTAS.inicio;
}

// Historial: salir de login/registro/recuperacion hacia otra pantalla REEMPLAZA
// la entrada (Atras no vuelve al formulario); moverse entre pantallas de acceso
// (login <-> registro) o cualquier otro cambio, empuja.
export function debeReemplazar(desde, hacia) {
  return esRutaDeAcceso(desde) && !esRutaDeAcceso(hacia);
}
