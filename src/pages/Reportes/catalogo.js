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

// Plantillas por formato (el backend valida la combinación: schemas/reporte.py).
export const PLANTILLAS = {
  pdf: [
    { id: "apa", nombre: "APA", detalle: "7.ª edición", descripcion: "Interlineado doble, Times 12 pt, tablas y figuras numeradas, citas autor-fecha y referencias con sangría francesa." },
    { id: "ieee", nombre: "IEEE", detalle: "dos columnas", descripcion: "Times 10 pt a dos columnas, secciones en números romanos, tablas «TABLA I», «Fig. 1.» y referencias numeradas [1]." },
  ],
  excel: [
    { id: "completo", nombre: "Completo", detalle: "datos + gráficas", descripcion: "Resumen, una hoja de datos filtrable (formato largo) y una hoja por gráfica." },
    { id: "comparativo", nombre: "Comparativo", detalle: "zonas × años", descripcion: "Una hoja por variable: zonas en filas, años en columnas, variación del periodo y su gráfica." },
  ],
};
export const PLANTILLA_POR_DEFECTO = { pdf: "apa", excel: "completo" };
export const nombreDePlantilla = (formato, id) => PLANTILLAS[formato]?.find((plantilla) => plantilla.id === id)?.nombre ?? "";

export function romano(numero) {
  const valores = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let resto = numero;
  let texto = "";
  for (const [valor, simbolo] of valores) {
    while (resto >= valor) {
      texto += simbolo;
      resto -= valor;
    }
  }
  return texto;
}

// 0 -> A, 25 -> Z, 26 -> AA (subsecciones IEEE).
export function letra(indice) {
  let texto = "";
  let n = indice + 1;
  while (n > 0) {
    const resto = (n - 1) % 26;
    texto = String.fromCharCode(65 + resto) + texto;
    n = Math.floor((n - 1) / 26);
  }
  return texto;
}

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

// "Bucaramanga, Santander". Bogotá (11001, departamento 11) va sin departamento: ya es capital y departamento.
export function crearEtiquetaMunicipio(departamentos) {
  const nombres = new Map(departamentos.map((departamento) => [departamento.codigo, departamento.nombre]));
  return (municipio) => {
    const departamento = nombres.get(municipio.codigo_departamento);
    if (!departamento || municipio.codigo === "11001" || municipio.codigo_departamento === "11") return municipio.nombre;
    return `${municipio.nombre}, ${departamento}`;
  };
}

export const plural = (cantidad, singular, plural) => (cantidad === 1 ? singular : plural);

export function formatearValor(valor) {
  if (valor == null || valor === "") return "Sin dato";
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return String(valor);
  return numero.toLocaleString("es-CO", { maximumFractionDigits: 4 });
}
