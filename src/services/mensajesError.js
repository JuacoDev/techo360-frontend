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
