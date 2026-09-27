import React, { useState , useEffect } from "react"
import "../Css/StyleComponents.css";
import { getProyeccion } from "../services/api";

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

function TarjetaIndicador({ nombre, datos, proyectado, onClick, serieProyectada }) {
  const nombreFormateado = nombre.replace(/_/g, " ");
  const unidad = UNIDADES[nombre] || "";

  return (
    <div
      className={`indicador-card${proyectado ? " indicador-card-proyeccion" : ""}`}
      onClick={onClick}
    >
      <strong className="indicador-nombre">
        {nombreFormateado}
      </strong>

      <p className="indicador-valor">
        {datos.valor ?? "Sin dato"} {datos.valor ? unidad : ""}
      </p>

      {serieProyectada?.length > 0 && (
        <div className="indicador-serie">
          {serieProyectada.map((punto) => (
            <div key={punto.anio}>
              {punto.anio} → {punto.valor} {unidad}
            </div>
          ))}
        </div>
      )}

      {proyectado ? (
        datos.intervalo_confianza != null && (
          <p className="indicador-proyeccion-badge">
            Fiabilidad: {datos.intervalo_confianza}%
          </p>
        )
      ) : (
        datos.origen && (
          <p className="indicador-fuente">
            Fuente: {datos.origen}
            {datos.anio_real && `, Año: ${datos.anio_real}`}
          </p>
        )
      )}
    </div>
  );
}

function PanelIndicadores({ zonaSeleccionada, modo = "calor", anioInicio, anioFin }) {
  const [cargando, setCargando] = useState(false);
  const [proyecciones, setProyecciones] = useState({});
  useEffect(() => {
  if (!zonaSeleccionada) return;

  manejarClickIndicador("densidad_poblacional");
}, [zonaSeleccionada]);

   async function manejarClickIndicador(indicador) {
  if (!zonaSeleccionada) return;
  

  try {
    setCargando(true);

    const respuesta = await getProyeccion(
      zonaSeleccionada.codigo,
      indicador,
      anioInicio,
      anioFin
    );


    setProyecciones((prev) => ({
      ...prev,
      [indicador]: respuesta.serie,
    }));

  } catch (error) {
    console.error(error);
  } finally {
    setCargando(false);
  }
}
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
          const confirmadas = entradas.filter(([, datos]) => !esProyeccion(datos.origen));
          const tarjetasProyeccion = entradas.filter(([, datos]) => esProyeccion(datos.origen));

          return (
            <>
              {confirmadas.length > 0 && (
                <div className="panel-indicadores-grupo">
                  <h3 className="panel-indicadores-subtitulo">Fuentes confirmadas</h3>
                  <div className={  
                    modo === "proyeccion"
                    ? "panel-indicadores-grid-proyeccion"
                    : "panel-indicadores-grid"
                    }>
                    {confirmadas.map(([nombre, datos]) => (
                      <TarjetaIndicador
                        key={nombre}
                        nombre={nombre}
                        datos={datos}
                        proyectado={false}
                        onClick={
                          nombre === "densidad_poblacional"
                            ? () => manejarClickIndicador(nombre)
                            : undefined
                        }
                        serieProyectada={proyecciones[nombre] || []}
                      />
                    ))}
                  </div>
                </div>
              )}

              {tarjetasProyeccion.length > 0 && (
                <div className="panel-indicadores-grupo"> 
                  <h3 className="panel-indicadores-subtitulo">Proyecciones</h3>
                  <div className={
                    modo === "proyeccion"
                      ? "panel-indicadores-grid-proyeccion"
                      : "panel-indicadores-grid"
                  }>
                    {tarjetasProyeccion.map(([nombre, datos]) => (
                      <TarjetaIndicador key={nombre} nombre={nombre} datos={datos} proyectado={true} />
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()
      ) : (
        <div className="panel-indicadores-grid">
          {INDICADORES.map((indicador) => (
            <TarjetaIndicador
              key={indicador}
              nombre={indicador}
              datos={{ valor: null }}
              proyectado={false}
              onClick={() => manejarClickIndicador(indicador)}
            />
          ))}
        </div>
      )}
      {cargando && <p>Cargando proyección...</p>}
    </aside>
  );
}

export default PanelIndicadores;