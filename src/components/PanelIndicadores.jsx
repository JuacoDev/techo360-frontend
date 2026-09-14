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

// Prefijo comun a los origenvar de proyeccion generados por
// ingestion/proyeccion_2024.py (backend) -- distingue en la tarjeta un
// dato real de una proyeccion, sin depender de una lista exacta de
// nombres (nuevos metodos de proyeccion futuros solo necesitan seguir
// el mismo prefijo "proyeccion-" para que la tarjeta los reconozca).
const PREFIJO_PROYECCION = "proyeccion-";

function esProyeccion(origen) {
  return typeof origen === "string" && origen.startsWith(PREFIJO_PROYECCION);
}

function PanelIndicadores({ zonaSeleccionada }) {
  return (
    <aside className="panel-indicadores" aria-label="Indicadores de la zona seleccionada">
      <div className="panel-indicadores-header">
        <h2>
          Estadísticas de: {zonaSeleccionada ? zonaSeleccionada.nombre : "Seleccione una zona"}
        </h2>
      </div>

      {zonaSeleccionada && "score_privacion" in zonaSeleccionada && (
        <div className="panel-indicadores-score">
          <strong className="indicador-nombre">Score de Privación</strong>
          <p className="indicador-valor">
            {zonaSeleccionada.score_privacion != null
              ? zonaSeleccionada.score_privacion.toFixed(4)
              : "Sin dato"}
          </p>
        </div>
      )}

      <div className="panel-indicadores-grid">
        {zonaSeleccionada && zonaSeleccionada.indicadores
          ? Object.entries(zonaSeleccionada.indicadores).map(([nombre, datos]) => {
              // Reemplazar "_" por espacios
              const nombreFormateado = nombre.replace(/_/g, " ");
              const unidad = UNIDADES[nombre] || "";

              const proyectado = esProyeccion(datos.origen);

              return (
                <div className={`indicador-card${proyectado ? " indicador-card-proyeccion" : ""}`} key={nombre}>
                  <strong className="indicador-nombre">{nombreFormateado}</strong>
                  <p className="indicador-valor">
                    {datos.valor ?? "Sin dato"} {datos.valor ? unidad : ""}
                  </p>
                  {proyectado ? (
                    <p className="indicador-proyeccion-badge">
                      Proyección
                      {datos.intervalo_confianza != null && ` · Fiabilidad: ${datos.intervalo_confianza}%`}
                    </p>
                  ) : (
                    <>
                      {datos.origen && (
                        <p className="indicador-fuente">
                          Fuente: {datos.origen}
                          {datos.anio_real && `, Año: ${datos.anio_real}`}
                        </p>
                      )}
                      {datos.intervalo_confianza != null && (
                        <p className="indicador-fuente">IC: {datos.intervalo_confianza}</p>
                      )}
                    </>
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
