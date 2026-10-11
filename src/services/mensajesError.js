// Normaliza el "detail" de una respuesta de error de FastAPI a un
// string legible -- puede venir como string plano (nuestros propios
// HTTPException(detail=str(...))) o como la lista de errores de
// validacion automatica de FastAPI (cada uno {msg, loc, type}; a veces
// un objeto unico con esa misma forma). Sin esto, `new Error(detail)`
// coacciona un array/objeto a su representacion por defecto
// ("[object Object]") en vez de un mensaje legible. Devuelve null si no
// se pudo interpretar -- quien llama decide el mensaje generico de
// respaldo.
//
// Sin imports a proposito (ni siquiera de api.js, que depende de
// import.meta.env): asi se puede probar con el runner de pruebas
// integrado de Node (node --test), sin necesitar Vite ni un
// devDependency nuevo (vitest/jest) solo para esta funcion pura.
export function extraerMensajeDetalle(detail) {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const mensajes = detail
      .map((item) => (item && typeof item === "object" ? item.msg : null))
      .filter((msg) => typeof msg === "string" && msg.length > 0);
    return mensajes.length ? mensajes.join("; ") : null;
  }

  if (detail && typeof detail === "object" && typeof detail.msg === "string") {
    return detail.msg;
  }

  return null;
}

// Aviso cuando /techobot/:id apunta a una conversacion que no se pudo abrir
// (id inexistente, de otro usuario o error de red al leer sus mensajes).
export function avisoConversacionNoDisponible(status) {
  if (status === 403 || status === 404) return "Esa conversación no existe o no es tuya. Te mostramos tu historial.";
  if (status === undefined || status === null) return "Esa dirección no corresponde a una conversación. Te mostramos tu historial.";
  return "No se pudo abrir esa conversación. Te mostramos tu historial.";
}

// Texto amigable para un error del chat (mensaje en estado 'error' o fallo al
// enviar/reintentar). `detalle` es el error_detalle del servidor o el message del
// Error; `status` el HTTP si se conoce. Cubre el caso tipico del VPS: la
// respuesta tarda tanto (cola en Ollama) que el backend o nginx cortan (504).
export function mensajeAmigableErrorChat({ status, detalle } = {}) {
  const texto = typeof detalle === "string" ? detalle : "";
  if (status === 504 || /time ?out|timed out|tiempo de espera|tard[oó]|504/i.test(texto)) {
  return "TechoBot tardó demasiado en responder. La conversación se conservó y puedes utilizar el botón 'Reintentar' para volver a solicitar la respuesta.";
  }
  if (status === 503 || status === 502 || /no (est[aá] )?disponible|unavailable|503|502|bad gateway/i.test(texto)) {
    return "TechoBot no está disponible en este momento. Reintenta en unos minutos.";
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(texto)) {
    return "No hay conexión con el servidor. Revisa tu internet y reintenta.";
  }
  const legible = texto && texto.length <= 160 && !/traceback|exception|error:|\{|\[/i.test(texto);
  return legible ? texto : "No se pudo obtener una respuesta. Puedes reintentar.";
}
