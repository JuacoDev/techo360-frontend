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
};

// Valor del parametro :id para una conversacion que todavia no existe; al
// crearse con el primer mensaje, la URL se reemplaza por /techobot/<id>.
export const ID_CONVERSACION_NUEVA = "nueva";

const RUTAS_PROTEGIDAS = new Set([
  RUTAS.mapaCalor,
  RUTAS.proyeccion,
  RUTAS.perfil,
  RUTAS.reportes,
  RUTAS.techobot,
]);

const RUTAS_DE_ACCESO = new Set([RUTAS.login, RUTAS.registro, RUTAS.recuperar]);

const PATRON_CHAT = /^\/techobot\/([^/]+)$/;
const PATRON_ID = /^\d{1,12}$/;

export function normalizarRuta(ruta) {
  const sinExtras = String(ruta ?? "/").toLowerCase().split("?")[0].split("#")[0];
  const sinBarraFinal = sinExtras.replace(/\/+$/, "");
  return sinBarraFinal === "" ? "/" : sinBarraFinal;
}

// "12" y "nueva" son ids validos; cualquier otro valor (abc, -1, 1.5) no.
export function esIdConversacionValido(id) {
  return typeof id === "string" && (id === ID_CONVERSACION_NUEVA || PATRON_ID.test(id));
}

// /techobot/12 -> "12"; /techobot/nueva -> "nueva"; cualquier otra ruta -> null.
export function idConversacionDeRuta(ruta) {
  const coincidencia = PATRON_CHAT.exec(normalizarRuta(ruta));
  return coincidencia && esIdConversacionValido(coincidencia[1]) ? coincidencia[1] : null;
}

export function rutaDeConversacion(id) {
  return `${RUTAS.techobot}/${id}`;
}

export function esRutaProtegida(ruta) {
  const r = normalizarRuta(ruta);
  return RUTAS_PROTEGIDAS.has(r) || idConversacionDeRuta(r) !== null;
}

export function esRutaDeAcceso(ruta) {
  return RUTAS_DE_ACCESO.has(normalizarRuta(ruta));
}

// ?volver=/mapa-calor -> "/mapa-calor". Solo se aceptan rutas conocidas Y
// protegidas (incluido /techobot/<id> valido): cualquier otro valor
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
