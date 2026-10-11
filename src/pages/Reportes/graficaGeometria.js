// Geometria de las graficas de linea de la vista previa (sin dependencias, testeable en Node).

export const PALETA_GRAFICA = [
  "#126782", "#E4572E", "#2E933C", "#F3A712", "#7B2CBF",
  "#17BEBB", "#D81159", "#6C757D", "#8D5B4C", "#3A86FF",
];

const esNumero = (valor) => typeof valor === "number" && Number.isFinite(valor);

function numeroAgradable(valor, redondear) {
  const exponente = Math.floor(Math.log10(valor));
  const fraccion = valor / 10 ** exponente;
  let agradable;
  if (redondear) agradable = fraccion < 1.5 ? 1 : fraccion < 3 ? 2 : fraccion < 7 ? 5 : 10;
  else agradable = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10;
  return agradable * 10 ** exponente;
}

// Escala vertical con marcas "redondas". null si no hay ningun valor finito.
export function escalaVertical(series, marcasDeseadas = 5) {
  const valores = series.flatMap((serie) => serie.valores).filter(esNumero);
  if (valores.length === 0) return null;
  let minimo = Math.min(...valores);
  let maximo = Math.max(...valores);
  if (minimo === maximo) {
    const holgura = minimo === 0 ? 1 : Math.abs(minimo) * 0.1;
    minimo -= holgura;
    maximo += holgura;
  }
  const paso = numeroAgradable(numeroAgradable(maximo - minimo, false) / (marcasDeseadas - 1), true);
  const inicio = Math.floor(minimo / paso) * paso;
  const fin = Math.ceil(maximo / paso) * paso;
  const marcas = [];
  for (let valor = inicio; valor <= fin + paso / 2; valor += paso) {
    marcas.push(Number(valor.toFixed(10)));
  }
  const decimales = Math.min(4, Math.max(0, -Math.floor(Math.log10(paso))));
  return { minimo: marcas[0], maximo: marcas[marcas.length - 1], marcas, decimales };
}

// Tramos continuos de puntos [{x, y, valor, indice}] (un hueco -- valor faltante -- corta la linea).
export function tramos(valores, posicionX, posicionY) {
  const resultado = [];
  let actual = [];
  valores.forEach((valor, indice) => {
    if (esNumero(valor)) {
      actual.push({ x: posicionX(indice), y: posicionY(valor), valor, indice });
    } else if (actual.length > 0) {
      resultado.push(actual);
      actual = [];
    }
  });
  if (actual.length > 0) resultado.push(actual);
  return resultado;
}

export const trazo = (puntos) => puntos.map((punto, i) => `${i === 0 ? "M" : "L"}${punto.x.toFixed(1)},${punto.y.toFixed(1)}`).join(" ");

// Indices de los años que llevan etiqueta en el eje X (como mucho `maximo`).
export function indicesEtiquetas(cantidad, maximo = 12) {
  const salto = Math.max(1, Math.ceil(cantidad / maximo));
  return Array.from({ length: cantidad }, (_, i) => i).filter((i) => i % salto === 0);
}
