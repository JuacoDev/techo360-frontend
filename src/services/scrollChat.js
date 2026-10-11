// Decision de scroll de la lista de mensajes del chat (funciones puras, se
// prueban con node --test en scrollChat.test.js; el hook esta en
// pages/ChatBot/useScrollDelChat.js).

// Distancia (px) al fondo por debajo de la cual se considera "pegado al final".
export const UMBRAL_FONDO_PX = 80;

export function estaCercaDelFondo({ scrollTop, scrollHeight, clientHeight }, umbral = UMBRAL_FONDO_PX) {
  return scrollHeight - scrollTop - clientHeight <= umbral;
}

// Resumen de lo que hay en la lista: basta para saber si llego algo nuevo.
export function firmaMensajes(mensajes, textoEnviando) {
  const ultimo = mensajes?.length ? mensajes[mensajes.length - 1] : null;
  return {
    cantidad: mensajes?.length ?? 0,
    ultimoId: ultimo?.id ?? null,
    ultimoRol: ultimo?.rol ?? null,
    enviando: textoEnviando ?? null,
  };
}

// "fondo": ir al final sin animacion; "avisar": hay algo nuevo pero el usuario
// subio a leer (no se le arrastra, se muestra el boton); "nada": sin cambios.
//  - Al abrir (sin firma anterior) siempre al fondo.
//  - Mensaje nuevo propio (envio en curso o ultimo mensaje de usuario nuevo): al fondo.
//  - Mensaje nuevo ajeno: al fondo solo si ya estaba cerca del final.
//  - Re-render sin mensajes nuevos (sondeo, cambio de estado): si estaba cerca,
//    se mantiene pegado al final (p. ej. aparece una tarjeta de estado).
export function decidirScroll({ estabaCerca, antes, despues }) {
  if (!antes) return "fondo";
  const empezoEnvio = Boolean(despues.enviando) && despues.enviando !== antes.enviando;
  const cambioUltimo = despues.ultimoId !== antes.ultimoId;
  const hayNuevo = empezoEnvio || cambioUltimo || despues.cantidad > antes.cantidad;
  if (!hayNuevo) return estabaCerca ? "fondo" : "nada";
  const esPropio = empezoEnvio || (cambioUltimo && despues.ultimoRol === "usuario");
  if (estabaCerca || esPropio) return "fondo";
  return "avisar";
}
