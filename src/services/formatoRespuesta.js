// Legibilidad de las respuestas de TechoBot (solo presentacion, sin tocar el
// texto del modelo): si la respuesta llega como UN unico bloque largo, se parte
// en parrafos de 2-3 oraciones. Si el modelo ya emitio saltos dobles, o hay
// listas, codigo, citas o titulos, se respeta tal cual. Pura: se prueba con
// node --test (formatoRespuesta.test.js).

export const LARGO_MINIMO_PARA_PARTIR = 280;

// Abreviaturas que terminan en punto y no cierran oracion (en minusculas, sin punto).
const ABREVIATURAS = new Set([
  "sr", "sra", "srta", "dr", "dra", "ing", "lic", "prof", "art", "arts", "núm", "num", "no", "nro",
  "pág", "pag", "págs", "av", "cra", "cl", "dpto", "depto", "mpio", "aprox", "vs", "ud", "uds", "cap", "fig", "vol", "ej",
]);

const LINEA_ESTRUCTURADA = /^\s*(?:[-*+•]\s|\d+[.)]\s|>|#{1,6}\s|```|~~~|\|)/m;

// Fin de oracion: . ! ? o … (con comillas/parentesis de cierre opcionales),
// espacio, y la siguiente empieza en mayuscula, signo de apertura o cifra.
const FIN_ORACION = /([.!?…]+["”»)]*)(\s+)(?=[A-ZÁÉÍÓÚÑÜ¿¡"“«(0-9*_])/g;

function esAbreviatura(textoPrevio, puntuacion) {
  if (puntuacion !== ".") return false;
  const token = /(\S+)$/.exec(textoPrevio)?.[1] ?? "";
  const limpio = token.replace(/^[("“«*_]+/, "");
  if (/^(?:[A-Za-zÁÉÍÓÚÑ]{1,2}\.)+[A-Za-zÁÉÍÓÚÑ]{1,2}$/.test(limpio)) return true; // S.A, D.C, EE.UU, E.S.P
  if (/^[A-ZÁÉÍÓÚÑ]$/.test(limpio)) return true; // inicial: "J. Perez"
  return ABREVIATURAS.has(limpio.toLowerCase());
}

export function dividirEnOraciones(texto) {
  const oraciones = [];
  let inicio = 0;
  for (const m of texto.matchAll(FIN_ORACION)) {
    const finPuntuacion = m.index + m[1].length;
    if (esAbreviatura(texto.slice(inicio, m.index), m[1].replace(/["”»)]+$/, ""))) continue;
    oraciones.push(texto.slice(inicio, finPuntuacion).trim());
    inicio = finPuntuacion + m[2].length;
  }
  const resto = texto.slice(inicio).trim();
  if (resto) oraciones.push(resto);
  return oraciones;
}

// Agrupa oraciones en parrafos de 2-3 (corta en 2 si el parrafo ya es largo) y
// evita un ultimo parrafo de una sola oracion.
function agrupar(oraciones) {
  const grupos = [];
  let actual = [];
  for (const o of oraciones) {
    actual.push(o);
    const largo = actual.join(" ").length;
    if (actual.length === 3 || (actual.length === 2 && largo >= 220)) {
      grupos.push(actual);
      actual = [];
    }
  }
  if (actual.length) {
    const previo = grupos[grupos.length - 1];
    if (actual.length === 1 && previo?.length === 2) previo.push(actual[0]);
    else if (actual.length === 1 && previo?.length === 3) grupos.push([previo.pop(), actual[0]]);
    else grupos.push(actual);
  }
  return grupos.map((g) => g.join(" "));
}

export function formatearRespuestaBot(texto) {
  if (typeof texto !== "string") return "";
  const limpio = texto.trim();
  if (limpio.length <= LARGO_MINIMO_PARA_PARTIR) return limpio;
  if (/\n\s*\n/.test(limpio)) return limpio; // el modelo ya separo parrafos
  if (LINEA_ESTRUCTURADA.test(limpio) || limpio.includes("`")) return limpio; // listas, codigo, citas, titulos, tablas
  const oraciones = dividirEnOraciones(limpio.replace(/\s*\n\s*/g, " "));
  if (oraciones.length < 3) return limpio;
  return agrupar(oraciones).join("\n\n");
}
