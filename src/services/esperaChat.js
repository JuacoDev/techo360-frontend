// Espera de una respuesta de TechoBot: en el VPS (sin GPU) una respuesta tarda
// ~45 s y, con cola, puede pasar de 3 minutos. Estas funciones puras dan el
// texto de cada fase y el contador para que la pantalla comunique la espera
// (se prueban con node --test en esperaChat.test.js).

// Segundos enteros transcurridos desde `desdeMs` hasta `ahoraMs` (nunca negativos:
// la fecha de un mensaje viene del reloj del servidor y puede ir adelantada).
export function segundosDesde(desdeMs, ahoraMs) {
  if (!Number.isFinite(desdeMs) || !Number.isFinite(ahoraMs)) return 0;
  return Math.max(0, Math.floor((ahoraMs - desdeMs) / 1000));
}

// 7 -> "0:07"; 125 -> "2:05".
export function formatearTranscurrido(segundos) {
  const s = Math.max(0, Math.floor(Number(segundos) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Fase de la espera segun los segundos: un titulo corto y una pista que ajusta
// la expectativa (sin prometer tiempos exactos).
export function faseEspera(segundos) {
  if (segundos < 15) {
    return { fase: "leyendo", titulo: "TechoBot está leyendo tu consulta", pista: "Las respuestas suelen tardar cerca de un minuto." };
  }
  if (segundos < 75) {
    return { fase: "redactando", titulo: "TechoBot está redactando la respuesta", pista: "Puedes seguir en esta página; la respuesta aparecerá aquí." };
  }
  if (segundos < 150) {
    return { fase: "cola", titulo: "Sigue trabajando en tu respuesta", pista: "Puede haber otras consultas en cola. Gracias por la paciencia." };
  }
  return {
  fase: "larga", titulo: "La respuesta está tardando más de lo habitual", pista: "Algunas consultas pueden tardar hasta 200 segundos. Puedes seguir esperando o cancelar y reintentar."};
}
