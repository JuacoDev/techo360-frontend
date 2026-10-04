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

// `tipo` (3 estados: confirmada/proyeccion/sin_dato) se sigue usando
// cuando ya hay zonaSeleccionada.indicadores real (ver PanelIndicadores
// mas abajo); `proyectado`/`onClick` son del estado "sin zona todavia"
// que agrega Luis (tarjetas clickeables para pedir una proyeccion
// puntual) -- ambos casos conviven, ninguno reemplaza al otro.
function TarjetaIndicador({ nombre, datos, tipo, proyectado, onClick, serieProyectada }) {
  const nombreFormateado = nombre.replace(/_/g, " ");
  const unidad = UNIDADES[nombre] || "";
  const claseTipo =
    tipo === "proyeccion" || proyectado
      ? " indicador-card-proyeccion"
      : tipo === "sin_dato"
        ? " indicador-card-sin-dato"
        : "";

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
  const [errorSerie, setErrorSerie] = useState(null);
  const [incluirGraficas, setIncluirGraficas] = useState(true);
  const [departamentosInforme, setDepartamentosInforme] = useState([]);
  const [municipiosInforme, setMunicipiosInforme] = useState([]);
  const [variablesInforme, setVariablesInforme] = useState([
  "score_privacion",
  "densidad_poblacional",
]);

  function agregarZonaInforme() {
  if (!zonaSeleccionada) return;

  if (zonaSeleccionada.nivel === "departamento") {
    setDepartamentosInforme((prev) => {
      const existe = prev.some(
        (zona) => zona.codigo === zonaSeleccionada.codigo
      );

      if (existe) return prev;

      return [...prev, zonaSeleccionada];
    });

    return;
  }

  if (zonaSeleccionada.nivel === "municipio") {
    setMunicipiosInforme((prev) => {
      const existe = prev.some(
        (zona) => zona.codigo === zonaSeleccionada.codigo
      );

      if (existe) return prev;

      return [...prev, zonaSeleccionada];
    });
  }
}


function eliminarDepartamentoInforme(codigo) {
  setDepartamentosInforme((prev) =>
    prev.filter((zona) => zona.codigo !== codigo)
  );
}

function eliminarMunicipioInforme(codigo) {
  setMunicipiosInforme((prev) =>
    prev.filter((zona) => zona.codigo !== codigo)
  );
}

function toggleVariable(variable) {
  setVariablesInforme((prev) =>
    prev.includes(variable)
      ? prev.filter((v) => v !== variable)
      : [...prev, variable]
  );
}
function generarInforme() {
  const payload = {
    incluirGraficas,
    variables: variablesInforme,
    departamentos: departamentosInforme,
    municipios: municipiosInforme,
    anioInicio,
    anioFin,
  };

  console.log("INFORME", payload);
}

  useEffect(() => {
  if (!zonaSeleccionada) return;

  if (zonaSeleccionada.nivel !== "municipio") return;

  manejarClickIndicador("densidad_poblacional");
}, [zonaSeleccionada, anioInicio, anioFin]);

   async function manejarClickIndicador(indicador) {
  if (!zonaSeleccionada) return;
  
    if (zonaSeleccionada?.nivel !== "municipio") {
    return;
}
  try {
    setCargando(true);
    setErrorSerie(null);

    const desde = anioInicio ?? 2024;
    const hasta = anioFin ?? 2030;
    const respuesta = await getProyeccion(
      zonaSeleccionada.codigo,
      indicador,
      desde,
      hasta
    );

    console.log("RESPUESTA COMPLETA", respuesta);
    console.log("SERIE", respuesta.serie);
    console.log("PRIMER ELEMENTO", respuesta?.serie?.[0]);


    setProyecciones((prev) => ({
      ...prev,
      [indicador]: respuesta.serie,
    }));

  } catch (error) {
  console.error(error);

  setErrorSerie(
    error?.message ||
    "No existe un modelo de proyección vigente para este municipio."
  );
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
          const confirmadas = entradas.filter(([, datos]) => !esSinDato(datos.origen) && !esProyeccion(datos.origen));
          const tarjetasProyeccion = entradas.filter(([, datos]) => !esSinDato(datos.origen) && esProyeccion(datos.origen));
          const sinDato = entradas.filter(([, datos]) => esSinDato(datos.origen));

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
                  <p className="panel-indicadores-proyeccion-disclaimer">
                    Las proyecciones se generan a partir de cálculos hechos
                    por Techo 360, con el fin de corregir y aprovechar las
                    fuentes de TerriData.
                  </p>
                  <div className={
                    modo === "proyeccion"
                      ? "panel-indicadores-grid-proyeccion"
                      : "panel-indicadores-grid"
                  }>
                    {tarjetasProyeccion.map(([nombre, datos]) => (
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
      <div className="panel-indicadores-grupo">
  <h3 className="panel-indicadores-subtitulo">
    📄 Informe
  </h3>

  <label className="informe-checkbox">
    <input
      type="checkbox"
      checked={incluirGraficas}
      onChange={(e) =>
        setIncluirGraficas(e.target.checked)
      }
    />
    Incluir gráficas
  </label>

  <div className="informe-seccion">
    <strong>Variables incluidas</strong>

    <label>
      <input
        type="checkbox"
        checked={variablesInforme.includes("score_privacion")}
        onChange={() =>
          toggleVariable("score_privacion")
        }
      />
      Score de Privación
    </label>

    <label>
      <input
        type="checkbox"
        checked={variablesInforme.includes("densidad_poblacional")}
        onChange={() =>
          toggleVariable("densidad_poblacional")
        }
      />
      Densidad poblacional
    </label>

    <label>
      <input
        type="checkbox"
        checked={variablesInforme.includes("cobertura_acueducto")}
        onChange={() =>
          toggleVariable("cobertura_acueducto")
        }
      />
      Cobertura acueducto
    </label>

    <label>
      <input
        type="checkbox"
        checked={variablesInforme.includes("cobertura_alcantarillado")}
        onChange={() =>
          toggleVariable("cobertura_alcantarillado")
        }
      />
      Cobertura alcantarillado
    </label>
  </div>

  <div className="informe-seccion">
  <strong>Departamentos</strong>

  <div className="informe-tags">
    {departamentosInforme.map((zona) => (
      <span
        key={zona.codigo}
        className="informe-tag"
      >
        {zona.nombre}

        <button
          type="button"
          onClick={() =>
            eliminarDepartamentoInforme(zona.codigo)
          }
        >
          ✕
        </button>
      </span>
    ))}
  </div>
</div>

<div className="informe-seccion">
  <strong>Municipios</strong>

  <div className="informe-tags">
    {municipiosInforme.map((zona) => (
      <span
        key={zona.codigo}
        className="informe-tag"
      >
        {zona.nombre}

        <button
          type="button"
          onClick={() =>
            eliminarMunicipioInforme(zona.codigo)
          }
        >
          ✕
        </button>
      </span>
    ))}
  </div>
</div>

  <button
    className="btn-proyeccion"
    onClick={agregarZonaInforme}
  >
    Añadir zona actual al informe
  </button>

  <button
  className="btn-proyeccion"
  type="button"
  onClick={generarInforme}
  >
    Generar informe
  </button>
</div>
      {cargando && <p>Cargando proyección...</p>}
      {errorSerie && (
        <p className="panel-proyeccion-error">
          {errorSerie}
        </p>
      )}
    </aside>
  );
}

export default PanelIndicadores;


