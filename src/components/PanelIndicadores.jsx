import React from "react";
import "../Css/StyleComponents.css";

const INDICADORES = [
  "densidad_poblacional",
  "cobertura_acueducto",
  "cobertura_alcantarillado",
  "tenencia_informal_terrenos",
  "deficit_habitacional_cuantitativo",
  "deficit_habitacional_cualitativo",
  "deficit_habitacional_total",
];

// Mapeo de unidades por indicador
const UNIDADES = {
  densidad_poblacional: "hab/km²",
  cobertura_acueducto: "%",
  cobertura_alcantarillado: "%",
  tenencia_informal_terrenos: "%",
  deficit_habitacional_cuantitativo: "%",
  deficit_habitacional_cualitativo: "%",
  deficit_habitacional_total: "%",
};

function PanelIndicadores({ zonaSeleccionada }) {
  return (
    <aside className="panel-indicadores" aria-label="Indicadores de la zona seleccionada">
      <div className="panel-indicadores-header">
        <h2>
          Estadísticas de: {zonaSeleccionada ? zonaSeleccionada.nombre : "Seleccione una zona"}
        </h2>
      </div>

      <div className="panel-indicadores-grid">
        {zonaSeleccionada && zonaSeleccionada.indicadores
          ? Object.entries(zonaSeleccionada.indicadores).map(([nombre, datos]) => {
              // Reemplazar "_" por espacios
              const nombreFormateado = nombre.replace(/_/g, " ");
              const unidad = UNIDADES[nombre] || "";

              return (
                <div className="indicador-card" key={nombre}>
                  <strong className="indicador-nombre">{nombreFormateado}</strong>
                  <p className="indicador-valor">
                    {datos.valor ?? "Sin dato"} {datos.valor ? unidad : ""}
                  </p>
                  {datos.origen && (
                    <p className="indicador-fuente">
                      Fuente: {datos.origen}
                      {datos.anio_real && `, Año: ${datos.anio_real}`}
                    </p>
                  )}
                  {datos.intervalo_confianza && (
                    <p className="indicador-fuente">IC: {datos.intervalo_confianza}</p>
                  )}
                </div>
              );
            })
          : INDICADORES.map((indicador) => {
              const nombreFormateado = indicador.replace(/_/g, " ");
              const unidad = UNIDADES[indicador] || "";
              return (
                <div className="indicador-card" key={indicador}>
                  <strong className="indicador-nombre">{nombreFormateado}</strong>
                  <p className="indicador-valor">Sin dato {unidad}</p>
                </div>
              );
            })}
      </div>
    </aside>
  );
}

export default PanelIndicadores;
