// Estados de los mensajes del chatbot (fase C). Funciones PURAS (sin React ni
// fetch): se prueban en Node (estadosMensaje.test.js).
//
// Cada mensaje de USUARIO tiene un estado:
//   pendiente / procesando  -> esperando la respuesta del asistente
//   error                   -> el asistente fallo (o nunca respondio)
//   cancelado               -> el usuario dejo de esperar
//   respondido              -> tiene respuesta (y los mensajes del asistente, siempre)
//
// Mientras exista un mensaje de usuario pendiente, procesando, en error o
// cancelado NO se puede enviar otra pregunta: hay que reintentarlo o eliminarlo
// (cancelar solo detiene la espera; un cancelado sigue bloqueando).
//
// Un backend anterior a la migracion no manda `estado`: se trata como
// 'respondido' (comportamiento de siempre).

export const SIN_RESOLVER = ["pendiente", "procesando", "error", "cancelado"];
export const EN_PROCESO = ["pendiente", "procesando"];

export const INTERVALO_SONDEO_MS = 4000;

export function estadoDe(mensaje) {
  return mensaje?.estado ?? "respondido";
}

export function normalizarMensaje(mensaje) {
  if (!mensaje || typeof mensaje !== "object") return mensaje;
  const estado = mensaje.estado ?? "respondido";
  const errorDetalle = mensaje.error_detalle ?? null;
  return mensaje.estado === estado && mensaje.error_detalle === errorDetalle
    ? mensaje
    : { ...mensaje, estado, error_detalle: errorDetalle };
}

export function normalizarMensajes(lista) {
  return Array.isArray(lista) ? lista.map(normalizarMensaje) : lista;
}

export function normalizarIntercambio(intercambio) {
  if (!intercambio || typeof intercambio !== "object") return intercambio;
  return {
    ...intercambio,
    mensaje_usuario: normalizarMensaje(intercambio.mensaje_usuario),
    mensaje_asistente: normalizarMensaje(intercambio.mensaje_asistente),
  };
}

const esDeUsuario = (mensaje) => mensaje?.rol === "usuario";

// El primer mensaje de usuario sin resolver (o null).
export function mensajeSinResolver(mensajes) {
  return (mensajes ?? []).find((m) => esDeUsuario(m) && SIN_RESOLVER.includes(estadoDe(m))) ?? null;
}

export function conversacionBloqueada(mensajes) {
  return mensajeSinResolver(mensajes) !== null;
}

// ¿Hay un mensaje esperando respuesta (para el sondeo)?
export function hayEnProceso(mensajes) {
  return (mensajes ?? []).some((m) => esDeUsuario(m) && EN_PROCESO.includes(estadoDe(m)));
}

// Que botones se ofrecen segun el estado (solo mensajes de usuario).
export function accionesDe(mensaje) {
  if (!esDeUsuario(mensaje)) return { reintentar: false, cancelar: false, eliminar: false };
  switch (estadoDe(mensaje)) {
    case "error":
      return { reintentar: true, cancelar: true, eliminar: true };
    case "cancelado":
      return { reintentar: true, cancelar: false, eliminar: true };
    case "procesando":
      return { reintentar: false, cancelar: true, eliminar: false }; // para eliminarlo, primero cancelar
    case "pendiente":
      return { reintentar: false, cancelar: true, eliminar: true };
    default:
      return { reintentar: false, cancelar: false, eliminar: false };
  }
}

export function etiquetaEstado(mensaje) {
  switch (estadoDe(mensaje)) {
    case "pendiente":
      return "Enviando…";
    case "procesando":
      return "Procesando…";
    case "error":
      return mensaje.error_detalle || "No se pudo obtener una respuesta.";
    case "cancelado":
      return "Cancelado.";
    default:
      return "";
  }
}

// Reemplaza (por id) o agrega al final un mensaje.
export function aplicarMensaje(lista, nuevo) {
  if (!nuevo) return lista;
  return lista.some((m) => m.id === nuevo.id) ? lista.map((m) => (m.id === nuevo.id ? nuevo : m)) : [...lista, nuevo];
}

export function quitarMensaje(lista, id) {
  return lista.filter((m) => m.id !== id);
}

// Resultado de enviar/reintentar con exito: el mensaje del usuario pasa a
// 'respondido' y se agrega la respuesta del asistente (sin duplicarla).
export function aplicarIntercambio(lista, intercambio) {
  return aplicarMensaje(aplicarMensaje(lista, intercambio.mensaje_usuario), intercambio.mensaje_asistente);
}
