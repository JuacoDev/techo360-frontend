// Logica pura del selector de variable del Mapa de Proyeccion (sin React ni
// imports de Vite, para probarla con `node --test`, ver variablesProyeccion.test.js).
//
// Contrato del backend (GET /api/proyecciones/zonas?anio=<2025-2042>&indicador=<id>):
//   zonas[] = { codigo_municipio, valor, es_real, origen, fiabilidad } (el score anade componentes[]).
// GET /api/proyecciones/serie (6 variables nuevas): serie[] = { anio, valor, es_real, origen, fiabilidad }
// de 2024 a 2042. La fiabilidad VARIA por fila: aqui nunca se asume un valor fijo.

export const VARIABLE_POR_DEFECTO = "score_privacion";

// Primer y ultimo año de la serie de una variable (la serie del backend arranca en 2024).
export const ANIO_SERIE_INICIO = 2024;
export const ANIO_SERIE_FIN = 2042;

// color:
//   "directo"    el valor ya esta en [0, 1] (score).
//   "porcentaje" valor/100: mas = mas rojo (deficit, tenencia informal).
//   "invertido"  1 - valor/100: menos cobertura = mas rojo.
//   "log"        escala logaritmica entre el minimo y el maximo POSITIVOS del año mostrado (densidad).
// serie: "mapa"     la serie 2024-2042 se arma con los años ya cargados en el mapa (no se llama a /serie);
//        "servicio" se pide a /api/proyecciones/serie con desde=2024 y hasta=2042.
export const VARIABLES_PROYECCION = [
  {
    id: "score_privacion",
    nombre: "Score de Privación",
    unidad: "",
    decimales: 4,
    color: "directo",
    serie: "mapa",
    descripcion:
      "Índice de 0.0 a 1.0 que promedia las carencias en acueducto, alcantarillado y déficit habitacional. Un valor de 1.0 indica la máxima prioridad o necesidad de intervención.",
  },
  {
    id: "densidad_poblacional",
    nombre: "Densidad poblacional",
    unidad: "hab/km²",
    decimales: 1,
    color: "log",
    serie: "mapa",
    // Escala logaritmica: la densidad es muy asimetrica (de menos de 1 hab/km² en municipios rurales a mas de
    // 15,000 en Bogota); con una rampa lineal casi todo el mapa quedaria blanco y solo las capitales se verian.
    descripcion:
      "Habitantes por km². Escala logarítmica entre el mínimo y el máximo de cada año (la densidad es muy desigual entre municipios): más rojo = más densidad.",
  },
  {
    id: "cobertura_acueducto",
    nombre: "Cobertura de acueducto",
    unidad: "%",
    decimales: 2,
    color: "invertido",
    serie: "servicio",
    descripcion: "Porcentaje de hogares con servicio de acueducto. Más rojo = menos cobertura.",
  },
  {
    id: "cobertura_alcantarillado",
    nombre: "Cobertura de alcantarillado",
    unidad: "%",
    decimales: 2,
    color: "invertido",
    serie: "servicio",
    descripcion: "Porcentaje de hogares con servicio de alcantarillado. Más rojo = menos cobertura.",
  },
  {
    id: "deficit_habitacional_cuantitativo",
    nombre: "Déficit habitacional cuantitativo",
    unidad: "%",
    decimales: 2,
    color: "porcentaje",
    serie: "servicio",
    descripcion: "Porcentaje de viviendas que faltan. Más rojo = más déficit.",
  },
  {
    id: "deficit_habitacional_cualitativo",
    nombre: "Déficit habitacional cualitativo",
    unidad: "%",
    decimales: 2,
    color: "porcentaje",
    serie: "servicio",
    descripcion: "Porcentaje de viviendas por mejorar. Más rojo = más déficit.",
  },
  {
    id: "deficit_habitacional_total",
    nombre: "Déficit habitacional total",
    unidad: "%",
    decimales: 2,
    color: "porcentaje",
    serie: "servicio",
    descripcion: "Déficit habitacional total (cuantitativo + cualitativo), en porcentaje. Más rojo = más déficit.",
  },
  {
    id: "tenencia_informal_terrenos",
    nombre: "Tenencia informal de terrenos",
    unidad: "%",
    decimales: 2,
    color: "porcentaje",
    serie: "servicio",
    descripcion: "Porcentaje de predios con tenencia informal. Más rojo = más informalidad.",
  },
];

export function buscarVariable(id) {
  return VARIABLES_PROYECCION.find((v) => v.id === id) ?? VARIABLES_PROYECCION[0];
}

// Mismo criterio que el Panel de Indicadores (PanelIndicadores.jsx::esProyeccion): el origen EMPIEZA por "proyeccion-".
export const PREFIJO_PROYECCION = "proyeccion-";

export function esProyeccionOrigen(origen) {
  return typeof origen === "string" && origen.startsWith(PREFIJO_PROYECCION);
}

// Una zona/punto es proyeccion si el backend dice es_real=false; si no trae el booleano (respuesta vieja), se
// decide por el prefijo del origen.
export function esProyeccionZona(zona) {
  if (zona == null) return false;
  if (typeof zona.es_real === "boolean") return !zona.es_real;
  return esProyeccionOrigen(zona.origen);
}

export function claveCache(variable, anio) {
  return `${variable}|${anio}`;
}

function esNumero(valor) {
  return valor !== null && valor !== undefined && valor !== "" && Number.isFinite(Number(valor));
}

// Rango [min, max] POSITIVO de un año (para la escala logaritmica). null si no hay al menos un valor positivo.
function rangoPositivo(zonas) {
  let min = Infinity;
  let max = -Infinity;
  for (const z of zonas ?? []) {
    if (!esNumero(z?.valor)) continue;
    const v = Number(z.valor);
    if (v <= 0) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return Number.isFinite(min) ? { min, max } : null;
}

const acotar01 = (t) => Math.min(1, Math.max(0, t));

// Devuelve valor -> t en [0, 1] (que MapView pinta con el semaforo blanco/amarillo/rojo) o null (gris, sin dato).
// `zonas` son las del AÑO mostrado: solo la escala logaritmica depende de ellas.
export function crearNormalizador(variable, zonas) {
  const cfg = typeof variable === "string" ? buscarVariable(variable) : variable;
  if (cfg.color === "log") {
    const rango = rangoPositivo(zonas);
    return (valor) => {
      if (!esNumero(valor)) return null;
      if (!rango) return null;
      const v = Number(valor);
      if (rango.max === rango.min) return 0.5;
      const t = (Math.log10(Math.max(v, rango.min)) - Math.log10(rango.min)) / (Math.log10(rango.max) - Math.log10(rango.min));
      return acotar01(t);
    };
  }
  return (valor) => {
    if (!esNumero(valor)) return null;
    const v = Number(valor);
    if (cfg.color === "directo") return acotar01(v);
    if (cfg.color === "invertido") return acotar01(1 - v / 100);
    return acotar01(v / 100);
  };
}

export function formatearNumero(valor, decimales = 2) {
  if (!esNumero(valor)) return "Sin dato";
  return Number(valor).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: decimales });
}

export function formatearValor(variable, valor) {
  const cfg = typeof variable === "string" ? buscarVariable(variable) : variable;
  if (!esNumero(valor)) return "Sin dato";
  const numero = formatearNumero(valor, cfg.decimales);
  return cfg.unidad ? `${numero} ${cfg.unidad}` : numero;
}

function formatoCompacto(valor) {
  if (valor >= 100) return Math.round(valor).toLocaleString("es-CO");
  if (valor >= 10) return valor.toLocaleString("es-CO", { maximumFractionDigits: 0 });
  return valor.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

// Cinco etiquetas de la leyenda, de izquierda (blanco, t=0) a derecha (rojo, t=1).
export function etiquetasLeyenda(variable, zonas) {
  const cfg = typeof variable === "string" ? buscarVariable(variable) : variable;
  if (cfg.color === "directo") return ["0.0", "0.25", "0.5", "0.75", "1.0"];
  if (cfg.color === "porcentaje") return ["0 %", "25 %", "50 %", "75 %", "100 %"];
  if (cfg.color === "invertido") return ["100 %", "75 %", "50 %", "25 %", "0 %"];
  const rango = rangoPositivo(zonas);
  if (!rango) return ["", "", "", "", ""];
  const lmin = Math.log10(rango.min);
  const lmax = Math.log10(rango.max);
  return [0, 0.25, 0.5, 0.75, 1].map((t) => formatoCompacto(10 ** (lmin + t * (lmax - lmin))));
}

// Texto de fiabilidad tal como lo entrega la API (nunca un valor supuesto): "Fiabilidad = 60%" o null.
export function textoFiabilidad(zona) {
  if (zona == null || !esNumero(zona.fiabilidad)) return null;
  return `Fiabilidad = ${formatearNumero(zona.fiabilidad, 1)}%`;
}

// Serie 2024-2042 de un municipio ARMADA con los años ya cargados en el mapa (densidad y score; no se llama a
// /serie). Un año que no se cargo sale con cargado=false y valor=null: «sin cargar», nunca cero.
export function serieDesdeMapa(codigo, datosPorAnio, desde = ANIO_SERIE_INICIO, hasta = ANIO_SERIE_FIN) {
  const puntos = [];
  for (let anio = desde; anio <= hasta; anio++) {
    const zonas = datosPorAnio?.[anio];
    const zona = zonas ? zonas.find((z) => z.codigo_municipio === codigo) : undefined;
    if (!zonas || !zona || !esNumero(zona.valor)) {
      puntos.push({ anio, valor: null, cargado: false, es_real: null, origen: null, fiabilidad: null });
      continue;
    }
    puntos.push({
      anio,
      valor: Number(zona.valor),
      cargado: true,
      es_real: !esProyeccionZona(zona),
      origen: zona.origen ?? null,
      fiabilidad: esNumero(zona.fiabilidad) ? Number(zona.fiabilidad) : null,
    });
  }
  return puntos;
}

// Serie devuelta por /serie (6 variables) llevada al mismo formato; los años que el backend no entrega salen «sin cargar».
export function serieDesdeServicio(serie, desde = ANIO_SERIE_INICIO, hasta = ANIO_SERIE_FIN) {
  const porAnio = new Map((serie ?? []).map((p) => [Number(p.anio), p]));
  const puntos = [];
  for (let anio = desde; anio <= hasta; anio++) {
    const p = porAnio.get(anio);
    if (!p || !esNumero(p.valor)) {
      puntos.push({ anio, valor: null, cargado: false, es_real: null, origen: null, fiabilidad: null });
      continue;
    }
    puntos.push({
      anio,
      valor: Number(p.valor),
      cargado: true,
      es_real: !esProyeccionZona(p),
      origen: p.origen ?? null,
      fiabilidad: esNumero(p.fiabilidad) ? Number(p.fiabilidad) : null,
    });
  }
  return puntos;
}

export function aniosSinCargar(puntos) {
  return (puntos ?? []).filter((p) => !p.cargado).map((p) => p.anio);
}

// "2025, 2026 y 2027" / "2025-2029" para el aviso bajo la grafica.
export function resumirAnios(anios) {
  if (!anios || anios.length === 0) return "";
  const rangos = [];
  let inicio = anios[0];
  let previo = anios[0];
  for (let i = 1; i <= anios.length; i++) {
    const actual = anios[i];
    if (actual === previo + 1) {
      previo = actual;
      continue;
    }
    rangos.push(inicio === previo ? `${inicio}` : previo === inicio + 1 ? `${inicio}, ${previo}` : `${inicio}-${previo}`);
    inicio = actual;
    previo = actual;
  }
  return rangos.join(", ");
}

// Años del rango [inicio, fin] que ya estan en el cache de la variable y los que fallaron (y no estan en cache).
export function estadoDeAnios(cache, fallos, variable, inicio, fin) {
  const cargados = [];
  const fallidos = [];
  for (let anio = inicio; anio <= fin; anio++) {
    const clave = claveCache(variable, anio);
    if (cache[clave] !== undefined) cargados.push(anio);
    else if (fallos[clave] !== undefined) fallidos.push({ anio, mensaje: fallos[clave] });
  }
  return { cargados, fallidos };
}

// Escapa texto para el HTML del tooltip de Leaflet (que interpreta HTML).
export function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// HTML del tooltip de un municipio: nombre, valor del año, origen y, si es proyeccion, badge ambar + fiabilidad.
export function htmlTooltipMunicipio(nombre, variable, zona, anio) {
  const cfg = typeof variable === "string" ? buscarVariable(variable) : variable;
  const titulo = `<strong>${escaparHtml(nombre)}</strong>`;
  if (!zona) return `${titulo}<br><span class="tooltip-proy-sin-dato">${escaparHtml(cfg.nombre)}: sin dato</span>`;
  const lineas = [
    titulo,
    `${escaparHtml(cfg.nombre)}${anio != null ? ` (${anio})` : ""}: <b>${escaparHtml(formatearValor(cfg, zona.valor))}</b>`,
  ];
  if (zona.origen) lineas.push(`<span class="tooltip-proy-origen">Origen: ${escaparHtml(zona.origen)}</span>`);
  if (esProyeccionZona(zona)) {
    const fiab = textoFiabilidad(zona);
    lineas.push(`<span class="tooltip-proy-badge">Proyección${fiab ? ` · ${escaparHtml(fiab)}` : ""}</span>`);
  } else if (zona.origen || zona.es_real === true) {
    lineas.push(`<span class="tooltip-proy-real">Dato real</span>`);
  }
  return lineas.join("<br>");
}
