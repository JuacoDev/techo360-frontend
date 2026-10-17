// Fiabilidad (% 0-100) que muestra la tarjeta de un indicador del panel. Funcion pura, sin imports de Vite,
// para probarla con `node --test` (ver fiabilidadTarjeta.test.js).
//
// Regla (misma que el resto del frontend): una tarjeta es PROYECCION si esProyeccionZona() lo dice (es_real=false o
// originVar con prefijo "proyeccion-"); cualquier otro origen es dato confirmado y no lleva badge. El backend
// reusa intervalo_confianza como % de fiabilidad. Devuelve el numero a mostrar o null (sin badge).
//
// `proyectado` es el prop historico de TarjetaIndicador (true fuerza el modo proyeccion); nadie lo pasaba, por lo que el
// badge nunca se pintaba. Ya no se depende de el: la clasificacion sale de los datos de la tarjeta.
import { esProyeccionZona } from "../pages/Proyeccion/variablesProyeccion.js";

export function fiabilidadTarjeta(datos, proyectado = false) {
  if (datos == null) return null;
  if (!proyectado && !esProyeccionZona(datos)) return null;
  const bruto = datos.intervalo_confianza;
  if (bruto === null || bruto === undefined || bruto === "") return null;
  const numero = Number(bruto);
  return Number.isFinite(numero) ? numero : null;
}
