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

// Tercer estado explicito (ver caso real verificado con Ebejico/05240,
// municipios sin cobertura_acueducto/alcantarillado en 2024, y con los
// 816 municipios sin dato real de tenencia_informal_terrenos tras el
// fix de ingestion/igac_catastro_adapter.py): origen=null NO es lo
// mismo que "fuente confirmada" (no hay fuente) ni "proyeccion" (no es
// un relleno estimado con metodo conocido) -- es ausencia total de
// fila en mapcalordb para esa variable+año. Antes caia por defecto en
// "confirmadas" solo porque !esProyeccion(null) es true.
function esSinDato(origen) {
  return origen == null;
}

function TarjetaIndicador({ nombre, datos, tipo }) {
  const nombreFormateado = nombre.replace(/_/g, " ");
  const unidad = UNIDADES[nombre] || "";
  const claseTipo = tipo === "proyeccion" ? " indicador-card-proyeccion" : tipo === "sin_dato" ? " indicador-card-sin-dato" : "";

  return (
    <div className={`indicador-card${claseTipo}`}>
      <strong className="indicador-nombre">{nombreFormateado}</strong>
      <p className="indicador-valor">
        {datos.valor ?? "Sin dato"} {datos.valor ? unidad : ""}
      </p>
      {tipo === "proyeccion" && datos.intervalo_confianza != null && (
        <p className="indicador-proyeccion-badge">Fiabilidad: {datos.intervalo_confianza}%</p>
      )}
      {tipo === "confirmada" && datos.origen && (
        <p className="indicador-fuente">
          Fuente: {datos.origen}
          {datos.anio_real && `, Año: ${datos.anio_real}`}
        </p>
      )}
      {tipo === "sin_dato" && (
        <p className="indicador-sin-dato-badge">Sin cobertura de esta fuente para esta zona/año</p>
      )}
    </div>
  );
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

      {zonaSeleccionada && zonaSeleccionada.indicadores ? (
        (() => {
          const entradas = Object.entries(zonaSeleccionada.indicadores);
          const confirmadas = entradas.filter(([, datos]) => !esSinDato(datos.origen) && !esProyeccion(datos.origen));
          const proyecciones = entradas.filter(([, datos]) => !esSinDato(datos.origen) && esProyeccion(datos.origen));
          const sinDato = entradas.filter(([, datos]) => esSinDato(datos.origen));

          return (
            <>
              {confirmadas.length > 0 && (
                <div className="panel-indicadores-grupo">
                  <h3 className="panel-indicadores-subtitulo">Fuentes confirmadas</h3>
                  <div className="panel-indicadores-grid">
                    {confirmadas.map(([nombre, datos]) => (
                      <TarjetaIndicador key={nombre} nombre={nombre} datos={datos} tipo="confirmada" />
                    ))}
                  </div>
                </div>
              )}

              {proyecciones.length > 0 && (
                <div className="panel-indicadores-grupo">
                  <h3 className="panel-indicadores-subtitulo">Proyecciones</h3>
                  <div className="panel-indicadores-grid">
                    {proyecciones.map(([nombre, datos]) => (
                      <TarjetaIndicador key={nombre} nombre={nombre} datos={datos} tipo="proyeccion" />
                    ))}
                  </div>
                </div>
              )}

              {sinDato.length > 0 && (
                <div className="panel-indicadores-grupo">
                  <h3 className="panel-indicadores-subtitulo">Sin dato</h3>
                  <div className="panel-indicadores-grid">
                    {sinDato.map(([nombre, datos]) => (
                      <TarjetaIndicador key={nombre} nombre={nombre} datos={datos} tipo="sin_dato" />
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()
      ) : (
        <div className="panel-indicadores-grid">
          {INDICADORES.map((indicador) => {
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
      )}
    </aside>
  );
}

export default PanelIndicadores;
