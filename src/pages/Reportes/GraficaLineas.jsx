import { useId } from "react";

import { escalaVertical, indicesEtiquetas, PALETA_GRAFICA, tramos, trazo } from "./graficaGeometria.js";

const ANCHO = 760;
const ALTO = 280;
const MARGEN = { izquierda: 58, derecha: 18, arriba: 14, abajo: 32 };

const formato = (valor, decimales) =>
  valor.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: decimales });

// Grafica de lineas (una por zona) a lo largo de los años, en SVG propio:
// misma paleta y mismo tope de zonas que el PDF.
function GraficaLineas({ titulo, unidad, anios, series, totalSeries }) {
  const idTitulo = useId();
  const escala = escalaVertical(series);
  const interior = {
    ancho: ANCHO - MARGEN.izquierda - MARGEN.derecha,
    alto: ALTO - MARGEN.arriba - MARGEN.abajo,
  };
  const posicionX = (indice) =>
    MARGEN.izquierda + (anios.length === 1 ? interior.ancho / 2 : (indice / (anios.length - 1)) * interior.ancho);
  const posicionY = (valor) =>
    MARGEN.arriba + interior.alto - ((valor - escala.minimo) / (escala.maximo - escala.minimo)) * interior.alto;

  return (
    <figure className="rp-grafica" aria-labelledby={idTitulo}>
      <figcaption id={idTitulo} className="rp-grafica-titulo">
        {titulo}
        {unidad && <span className="rp-grafica-unidad">{unidad}</span>}
      </figcaption>

      {!escala ? (
        <p className="rp-hoja-vacio">Sin datos para este periodo y estas zonas.</p>
      ) : (
        <>
          <svg className="rp-grafica-svg" viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={`Gráfica de ${titulo} por año`}>
            {escala.marcas.map((marca) => (
              <g key={marca}>
                <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={posicionY(marca)} y2={posicionY(marca)} className="rp-grafica-rejilla" />
                <text x={MARGEN.izquierda - 8} y={posicionY(marca) + 4} textAnchor="end" className="rp-grafica-marca">
                  {formato(marca, escala.decimales)}
                </text>
              </g>
            ))}
            {indicesEtiquetas(anios.length).map((indice) => (
              <text key={anios[indice]} x={posicionX(indice)} y={ALTO - 10} textAnchor="middle" className="rp-grafica-marca">
                {anios[indice]}
              </text>
            ))}
            {series.map((serie, indiceSerie) => {
              const color = PALETA_GRAFICA[indiceSerie % PALETA_GRAFICA.length];
              const partes = tramos(serie.valores, posicionX, posicionY);
              return (
                <g key={serie.nombre} stroke={color} fill={color}>
                  {partes.map((parte) =>
                    parte.length > 1 ? (
                      <path key={parte[0].indice} d={trazo(parte)} fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                    ) : null
                  )}
                  {partes.flat().map((punto) => (
                    <circle key={punto.indice} cx={punto.x} cy={punto.y} r="3.2" stroke="#fff" strokeWidth="1.2">
                      <title>{`${serie.nombre} · ${anios[punto.indice]}: ${formato(punto.valor, 4)}${unidad ? ` ${unidad}` : ""}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
          </svg>

          <ul className="rp-grafica-leyenda">
            {series.map((serie, indiceSerie) => (
              <li key={serie.nombre}>
                <span className="rp-grafica-muestra" style={{ background: PALETA_GRAFICA[indiceSerie % PALETA_GRAFICA.length] }} aria-hidden="true" />
                {serie.nombre}
              </li>
            ))}
          </ul>
          {totalSeries > series.length && (
            <p className="rp-grafica-nota">
              Se muestran las primeras {series.length} de {totalSeries} zonas (igual que en el PDF); los datos completos están en las tablas.
            </p>
          )}
        </>
      )}
    </figure>
  );
}

export default GraficaLineas;
