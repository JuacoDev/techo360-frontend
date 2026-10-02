// Logica pura del fallo parcial de generarProyeccion -- separada de
// Proyectadas.jsx para poder probarla con el runner integrado de Node
// (node --test), sin Vite (api.js depende de import.meta.env). Solo
// importa de services/mensajesError.js, que tampoco tiene imports.
import { extraerMensajeDetalle } from "../../services/mensajesError.js";

// Traduce el status HTTP que ya trae el Error (ver error.status en
// getProyeccionZonas, api.js) a un mensaje que el usuario pueda
// entender -- antes esto solo se mandaba a console.error y el usuario
// se quedaba con un spinner que desaparecia sin ninguna pista de que
// paso.
export function mensajeErrorProyeccion(error) {
  if (error?.status === 422) {
    return (
      extraerMensajeDetalle(error.detail) ||
      error.message ||
      "El año pedido está fuera del rango de datos disponibles para la proyección."
    );
  }
  if (error?.status === 503) {
    return "El servicio de proyección no está disponible en este momento. Intenta de nuevo más tarde.";
  }
  if (error?.status === 504) {
    return "El servicio de proyección no respondió a tiempo. Intenta de nuevo en unos segundos.";
  }
  return "No se pudo generar la proyección. Intenta de nuevo.";
}

// resultadosPorAnio: { [anio]: zonas[] } -- solo los años que SI
// tuvieron exito (generarProyeccion los va llenando año por año).
// fallosPorAnio: { [anio]: mensaje } -- los que fallaron, ya traducidos
// con mensajeErrorProyeccion().
//
// aniosDisponibles sale ordenado ascendente y puede tener huecos (si
// 2029 fallo entre 2027-2030, aniosDisponibles = [2027, 2028, 2030] --
// la barra de año debe recorrer ESTA lista, no un rango continuo, para
// saltarse el hueco en vez de mostrar un año sin datos).
export function combinarResultadosProyeccion(resultadosPorAnio, fallosPorAnio) {
  const aniosDisponibles = Object.keys(resultadosPorAnio)
    .map(Number)
    .sort((a, b) => a - b);

  const aniosFallidos = Object.keys(fallosPorAnio)
    .map(Number)
    .sort((a, b) => a - b)
    .map((anio) => ({ anio, mensaje: fallosPorAnio[anio] }));

  return {
    datosPorAnio: resultadosPorAnio,
    aniosDisponibles,
    aniosFallidos,
    // Si ni un solo año salio bien, es un fallo total -- igual que
    // antes: error bloqueante, barra deshabilitada, sin cache.
    exito: aniosDisponibles.length > 0,
  };
}

// Mensaje no bloqueante para los años que fallaron DENTRO de una
// generacion que si tuvo exito en al menos uno -- null si no hubo
// ninguno (no renderizar nada).
export function avisoAniosFallidos(aniosFallidos) {
  if (!aniosFallidos || aniosFallidos.length === 0) return null;
  const anios = aniosFallidos.map((f) => f.anio).join(", ");
  return `No se pudieron generar los años: ${anios}`;
}
