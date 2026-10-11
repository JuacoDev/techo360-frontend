// Variables que el backend acepta en un reporte (schemas/reporte.py, VariableReporte).
export const VARIABLES = [
  { id: "score_privacion", nombre: "Score de Privación", unidad: "", descripcion: "Índice compuesto de 0 a 1" },
  { id: "cobertura_acueducto", nombre: "Cobertura de Acueducto", unidad: "%", descripcion: "Hogares con servicio" },
  { id: "cobertura_alcantarillado", nombre: "Cobertura de Alcantarillado", unidad: "%", descripcion: "Hogares con servicio" },
  { id: "deficit_habitacional_cuantitativo", nombre: "Déficit Habitacional Cuantitativo", unidad: "%", descripcion: "Viviendas que faltan" },
  { id: "deficit_habitacional_cualitativo", nombre: "Déficit Habitacional Cualitativo", unidad: "%", descripcion: "Viviendas por mejorar" },
  { id: "densidad_poblacional", nombre: "Densidad Poblacional", unidad: "hab/km²", descripcion: "Habitantes por km²" },
];

export const FORMATOS = [
  { id: "pdf", nombre: "PDF", icono: "doc", descripcion: "Documento con tablas y gráficas, listo para compartir." },
  { id: "excel", nombre: "Excel", icono: "tabla", descripcion: "Hojas con los datos completos y gráficas editables." },
];

// Atajos de periodo (el backend acepta 2000-2042).
export const PERIODOS_RAPIDOS = [
  { etiqueta: "2020 – 2025", inicio: 2020, fin: 2025 },
  { etiqueta: "2015 – 2025", inicio: 2015, fin: 2025 },
  { etiqueta: "2024 – 2035", inicio: 2024, fin: 2035 },
];

export const LIMITE_LISTA_ZONAS = 150;

export const normalizarTexto = (texto) =>
  String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const plural = (cantidad, singular, plural) => (cantidad === 1 ? singular : plural);

export function formatearValor(valor) {
  if (valor == null || valor === "") return "Sin dato";
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return String(valor);
  return numero.toLocaleString("es-CO", { maximumFractionDigits: 4 });
}
