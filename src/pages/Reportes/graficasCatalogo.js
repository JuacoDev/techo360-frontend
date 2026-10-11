// Catálogo de gráficas del reporte y sus reglas de compatibilidad (tipo × modo × variables).
//
// Réplica del backend (techo360-backend/services/reportes_graficas_catalogo.py), que es quien valida
// la solicitud. Si se cambia una regla allá, hay que cambiarla aquí: las pruebas de los dos lados
// fijan los mismos casos. Aquí sirve para mostrar SOLO lo compatible al elegir un tipo.

export const VARIABLES_GRAFICA = [
  "score_privacion",
  "cobertura_acueducto",
  "cobertura_alcantarillado",
  "deficit_habitacional_cuantitativo",
  "deficit_habitacional_cualitativo",
  "densidad_poblacional",
];
const COBERTURAS = ["cobertura_acueducto", "cobertura_alcantarillado"];
const DEFICITS = ["deficit_habitacional_cuantitativo", "deficit_habitacional_cualitativo"];

// Un eje por unidad: porcentajes, índices y hab/km² nunca se mezclan.
export const GRUPO_UNIDAD = {
  score_privacion: "indice",
  cobertura_acueducto: "porcentaje",
  cobertura_alcantarillado: "porcentaje",
  deficit_habitacional_cuantitativo: "porcentaje",
  deficit_habitacional_cualitativo: "porcentaje",
  densidad_poblacional: "densidad",
};

export const MAX_ZONAS_COMPARAR = 10;
export const MAX_GRAFICAS = 20;

export const MODOS = [
  { id: "individual", nombre: "Un territorio", descripcion: "Una sola zona de las seleccionadas." },
  { id: "comparar", nombre: "Comparar", descripcion: `De 2 a ${MAX_ZONAS_COMPARAR} zonas de las seleccionadas.` },
  { id: "general", nombre: "General", descripcion: "Todas las zonas seleccionadas en el reporte." },
];

const todos = (...ids) => new Set(ids);

export const TIPOS_GRAFICA = [
  { id: "coropletico", nombre: "Mapa coroplético", icono: "mapa", descripcion: "Colorea cada territorio según el valor (promedio del periodo).", modos: todos("comparar", "general"), minVariables: 1, maxVariables: 1, minZonasGeneral: 2 },
  { id: "barras_ranking", nombre: "Barras ordenadas", icono: "barras", descripcion: "Barras horizontales de mayor a menor para comparar territorios.", modos: todos("comparar", "general"), minVariables: 1, maxVariables: 1, minZonasGeneral: 2 },
  { id: "barras_agrupadas", nombre: "Barras agrupadas", icono: "agrupadas", descripcion: "Varias variables del mismo tipo lado a lado (p. ej. acueducto y alcantarillado).", modos: todos("individual", "comparar", "general"), minVariables: 2, maxVariables: 4, mismaUnidad: true },
  { id: "barras_apiladas", nombre: "Barras apiladas", icono: "apiladas", descripcion: "Déficit cuantitativo + cualitativo apilados, o cubierto y sin cobertura al 100 %.", modos: todos("individual", "comparar", "general"), minVariables: 1, maxVariables: 2, permitidas: todos(...COBERTURAS, ...DEFICITS) },
  { id: "lineas", nombre: "Evolución anual", icono: "lineas", descripcion: "Líneas año a año (solo con datos por año).", modos: todos("individual", "comparar", "general"), minVariables: 1, maxVariables: 1 },
  { id: "radar", nombre: "Radar", icono: "radar", descripcion: "Perfil frente al promedio nacional; todo se normaliza de 0 a 100.", modos: todos("individual", "comparar"), minVariables: 3, maxVariables: 6 },
  { id: "dispersion", nombre: "Dispersión", icono: "dispersion", descripcion: "Un punto por zona: una variable contra otra (la tercera da el tamaño).", modos: todos("comparar", "general"), minVariables: 2, maxVariables: 3, minZonasGeneral: 3 },
  { id: "histograma", nombre: "Histograma", icono: "histograma", descripcion: "Cómo se distribuyen los valores entre las zonas.", modos: todos("general"), minVariables: 1, maxVariables: 1, minZonasGeneral: 3 },
  { id: "boxplot", nombre: "Diagrama de caja", icono: "boxplot", descripcion: "Mediana, cuartiles y valores atípicos entre las zonas.", modos: todos("general"), minVariables: 1, maxVariables: 1, minZonasGeneral: 3 },
  { id: "bullet", nombre: "Bullet", icono: "bullet", descripcion: "El valor de la zona frente al promedio nacional y los cuartiles del país.", modos: todos("individual"), minVariables: 1, maxVariables: 1 },
  { id: "gauge", nombre: "Gauge", icono: "gauge", descripcion: "Medidor de un valor con el promedio nacional como referencia.", modos: todos("individual"), minVariables: 1, maxVariables: 1, permitidas: new Set(VARIABLES_GRAFICA.filter((v) => v !== "densidad_poblacional")) },
  { id: "dumbbell", nombre: "Brecha (dumbbell)", icono: "dumbbell", descripcion: "La brecha entre dos variables por zona.", modos: todos("comparar", "general"), minVariables: 2, maxVariables: 2, mismaUnidad: true },
  { id: "donut", nombre: "Donut de déficits", icono: "donut", descripcion: "Proporción entre el déficit cuantitativo y el cualitativo.", modos: todos("individual"), minVariables: 2, maxVariables: 2, permitidas: todos(...DEFICITS) },
  { id: "treemap", nombre: "Treemap", icono: "treemap", descripcion: "Rectángulos con área y color proporcionales al valor.", modos: todos("general"), minVariables: 1, maxVariables: 1, minZonasGeneral: 2 },
  { id: "correlaciones", nombre: "Correlaciones", icono: "correlaciones", descripcion: "Mapa de calor de la correlación entre variables.", modos: todos("general"), minVariables: 3, maxVariables: 6, minZonasGeneral: 4 },
  { id: "paneles", nombre: "Paneles", icono: "paneles", descripcion: "El mismo gráfico repetido por variable, cada una con su escala.", modos: todos("comparar", "general"), minVariables: 2, maxVariables: 6, minZonasGeneral: 2 },
];

export const tipoPorId = (id) => TIPOS_GRAFICA.find((tipo) => tipo.id === id);
export const modoPorId = (id) => MODOS.find((modo) => modo.id === id);

// Mensaje de error si la combinación no es válida; null si lo es (mismas reglas que el backend).
export function validarCombinacion(tipoId, modo, variables, zonasDelModo) {
  const tipo = tipoPorId(tipoId);
  if (!tipo) return `Tipo de gráfica desconocido: ${tipoId}.`;
  if (!tipo.modos.has(modo)) return `«${tipo.nombre}» no admite el modo ${modo}.`;
  const cantidad = variables.length;
  if (cantidad < tipo.minVariables || cantidad > tipo.maxVariables) {
    const rango = tipo.minVariables === tipo.maxVariables ? `${tipo.minVariables}` : `${tipo.minVariables} a ${tipo.maxVariables}`;
    return `«${tipo.nombre}» necesita ${rango} variable(s).`;
  }
  if (tipo.permitidas && variables.some((v) => !tipo.permitidas.has(v))) return `«${tipo.nombre}» no admite alguna de las variables elegidas.`;
  if (tipo.mismaUnidad && new Set(variables.map((v) => GRUPO_UNIDAD[v])).size > 1) return `«${tipo.nombre}» no mezcla unidades distintas en un mismo eje.`;
  if (tipoId === "barras_apiladas" && cantidad === 2 && !DEFICITS.every((v) => variables.includes(v))) return "Las barras apiladas de dos variables son para los dos déficits.";
  if (tipoId === "donut" && !DEFICITS.every((v) => variables.includes(v))) return "El donut muestra la proporción entre el déficit cuantitativo y el cualitativo.";
  if (modo === "individual" && zonasDelModo !== 1) return "El modo individual usa exactamente una zona.";
  if (modo === "comparar" && (zonasDelModo < 2 || zonasDelModo > MAX_ZONAS_COMPARAR)) return `Comparar requiere entre 2 y ${MAX_ZONAS_COMPARAR} zonas.`;
  if (modo === "general" && zonasDelModo < (tipo.minZonasGeneral ?? 1)) return `«${tipo.nombre}» en modo general necesita al menos ${tipo.minZonasGeneral ?? 1} zonas seleccionadas.`;
  return null;
}

// Modos que admite un tipo, en el orden de MODOS.
export const modosDelTipo = (tipoId) => MODOS.filter((modo) => tipoPorId(tipoId)?.modos.has(modo.id));

// Variables que se pueden marcar ahora, dado el tipo y lo ya marcado. Las ya marcadas siempre se
// pueden desmarcar (la interfaz solo bloquea las demás).
export function variablesDisponibles(tipoId, marcadas) {
  const tipo = tipoPorId(tipoId);
  if (!tipo) return [];
  let base = VARIABLES_GRAFICA.filter((v) => !tipo.permitidas || tipo.permitidas.has(v));
  if (marcadas.length >= tipo.maxVariables) return base.filter((v) => marcadas.includes(v));
  if (tipo.mismaUnidad && marcadas.length > 0) {
    const grupo = GRUPO_UNIDAD[marcadas[0]];
    base = base.filter((v) => GRUPO_UNIDAD[v] === grupo);
  }
  if (tipoId === "barras_apiladas" && marcadas.length > 0) {
    // una cobertura sola (cubierto + sin cobertura) o los dos déficits juntos
    base = marcadas.some((v) => COBERTURAS.includes(v)) ? base.filter((v) => marcadas.includes(v)) : base.filter((v) => DEFICITS.includes(v));
  }
  return base;
}

// Variables con las que arranca un tipo (el donut necesita los dos déficits).
export const variablesIniciales = (tipoId) => (tipoId === "donut" ? [...DEFICITS] : []);

// ¿Cuántas zonas usa la gráfica con la selección actual del reporte?
export function zonasDelModo(grafica, codigosSeleccionados) {
  return grafica.modo === "general" ? codigosSeleccionados.length : grafica.zonas.length;
}

// Estado de una gráfica ya añadida frente a la selección actual (si se quitó una zona, queda incompleta).
export function estadoDeGrafica(grafica, codigosSeleccionados) {
  const conjunto = new Set(codigosSeleccionados);
  const fuera = grafica.zonas.filter((codigo) => !conjunto.has(codigo));
  if (grafica.modo !== "general" && fuera.length > 0) {
    return { ok: false, mensaje: `Falta ${fuera.length === 1 ? "una zona" : `${fuera.length} zonas`} que ya no está seleccionada; no se incluirá.` };
  }
  const error = validarCombinacion(grafica.tipo, grafica.modo, grafica.variables, zonasDelModo(grafica, codigosSeleccionados));
  return error ? { ok: false, mensaje: `${error} No se incluirá.` } : { ok: true, mensaje: "" };
}

// Mueve un elemento de `desde` a `hasta` (arrastrar y soltar o botones subir/bajar); no muta la lista.
export function reordenar(lista, desde, hasta) {
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= lista.length || hasta >= lista.length) return lista;
  const copia = [...lista];
  const [movido] = copia.splice(desde, 1);
  copia.splice(hasta, 0, movido);
  return copia;
}

export function nuevoIdGrafica(aleatorio = Math.random) {
  const sufijo = Array.from({ length: 8 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(aleatorio() * 36)]).join("");
  return `g${Date.now().toString(36)}${sufijo}`;
}
