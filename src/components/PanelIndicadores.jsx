import React, { useState , useEffect } from "react"
import "../Css/StyleComponents.css";
import { getProyeccion } from "../services/api";
import { useIrA } from "../routing/useIrA.js";
import { RUTAS } from "../routing/rutas.js";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  const datosGrafico = (serieProyectada || [])
    .map((punto) => ({
      año: String(punto.año ?? punto.anio ?? ""),
      valor: Number(punto.valor),
    }))
    .filter((punto) => punto.año && Number.isFinite(punto.valor));
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

      {datosGrafico.length > 0 && (
        <div className="indicador-serie">
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={datosGrafico}>
              <XAxis dataKey="año" />
              <YAxis />
              <Tooltip formatter={(valor) => [`${valor} ${unidad}`, "Valor"]} />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="#f57c00"
                strokeWidth={2}
                strokeDasharray="0"
                dot={{
                  r: 4,
                  fill: "#f57c00",
                  stroke: "#f57c00",
                  strokeWidth: 1,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 italic mt-2">
            ⚠️ Proyección estimada (Modelo LightGBM). No es un dato observado.
          </p>
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
  const irA = useIrA();
  const [cargando, setCargando] = useState(false);
  const [proyecciones, setProyecciones] = useState({});
  const [errorSerie, setErrorSerie] = useState(null);

  // La serie proyectada solo existe para un MUNICIPIO (el backend exige un
  // codigo DIVIPOLA de 5 digitos) y solo tiene sentido en el mapa de
  // proyeccion, que es el unico que pasa anioInicio/anioFin. En el mapa de
  // calor, o con un departamento seleccionado, no se llama al backend:
  // antes se pedia con desde=undefined&hasta=undefined (o con el codigo de
  // un departamento) y siempre devolvia 422.
  const puedeProyectar =
    modo === "proyeccion" &&
    zonaSeleccionada?.nivel === "municipio" &&
    anioInicio != null &&
    anioFin != null;

  const [vista, setVista] = useState("indicadores");
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
  irA(RUTAS.reportes, {
    state: {
      informe: {
        incluirGraficas,
        variables: variablesInforme,
        departamentos: departamentosInforme,
        municipios: municipiosInforme,
        anioInicio,
        anioFin,
      },
    },
  });
}

  useEffect(() => {
  if (!puedeProyectar) {
    setErrorSerie(null);
    return;
  }

  if (zonaSeleccionada.nivel !== "municipio") return;

  manejarClickIndicador("densidad_poblacional");
}, [zonaSeleccionada, anioInicio, anioFin, modo]);

   async function manejarClickIndicador(indicador) {
  if (!puedeProyectar) return;
  
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
      <div className="panel-indicadores-tabs" role="tablist" aria-label="Secciones del panel">
        <button
          type="button"
          role="tab"
          id="tab-indicadores"
          aria-selected={vista === "indicadores"}
          aria-controls="panel-vista"
          className={`panel-indicadores-tab${vista === "indicadores" ? " is-active" : ""}`}
          onClick={() => setVista("indicadores")}
        >
          Panel de indicadores
        </button>
        <button
          type="button"
          role="tab"
          id="tab-informe"
          aria-selected={vista === "informe"}
          aria-controls="panel-vista"
          className={`panel-indicadores-tab${vista === "informe" ? " is-active" : ""}`}
          onClick={() => setVista("informe")}
        >
          Generar informe
        </button>
      </div>

      <div className="panel-indicadores-header">
        <h2>
          Zona seleccionada: {zonaSeleccionada ? zonaSeleccionada.nombre : "Ninguna"}
        </h2>
      </div>

      {vista === "indicadores" && (
      <>
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
      </>
      )}

      {vista === "informe" && (
      <div className="panel-informe">
  <div className="panel-informe-encabezado">
    <div>
      <p className="panel-informe-kicker">Generador de informes</p>
      <h3 className="panel-informe-titulo">Configura tu informe</h3>
      <p className="panel-informe-ayuda">
        Selecciona las variables y agrega zonas desde el mapa.
      </p>
    </div>
  </div>

  <label className="informe-opcion-principal">
    <input
      type="checkbox"
      checked={incluirGraficas}
      onChange={(e) =>
        setIncluirGraficas(e.target.checked)
      }
    />
    <span>
      <strong>Incluir gráficas</strong>
      <small>Agrega una visualización al documento final.</small>
    </span>
  </label>

  <div className="informe-seccion">
    <div className="informe-seccion-titulo">
      <strong>Variables incluidas</strong>
      <span>{variablesInforme.length} seleccionadas</span>
    </div>

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
  <div className="informe-seccion-titulo">
    <strong>Departamentos</strong>
    <span>{departamentosInforme.length}</span>
  </div>

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
          <span aria-hidden="true">x</span>
          <span className="sr-only">Quitar {zona.nombre}</span>
        </button>
      </span>
    ))}
  </div>
</div>

<div className="informe-seccion">
  <div className="informe-seccion-titulo">
    <strong>Municipios</strong>
    <span>{municipiosInforme.length}</span>
  </div>

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
          <span aria-hidden="true">x</span>
          <span className="sr-only">Quitar {zona.nombre}</span>
        </button>
      </span>
    ))}
  </div>
</div>

  <button
    className="btn-informe-secundario"
    type="button"
    onClick={agregarZonaInforme}
    disabled={!zonaSeleccionada}
  >
    + Añadir zona actual
  </button>

  <div className="informe-acciones">
    <button
      className="btn-informe-primario"
      type="button"
      onClick={generarInforme}
    >
      Abrir generador completo
    </button>
    <span className="informe-acciones-ayuda">Podrás editar el contenido antes de enviarlo.</span>
  </div>

  <div className="informe-preview">
  <div className="informe-seccion-titulo">
    <strong>Vista previa</strong>
    <span>{departamentosInforme.length + municipiosInforme.length} zonas</span>
  </div>

  <div className="informe-seccion">
    <strong>Departamentos seleccionados</strong>

    {departamentosInforme.length === 0 ? (
      <p className="informe-vacio">Añade un departamento desde el mapa.</p>
    ) : (
      departamentosInforme.map((departamento) => (
        <div
          key={departamento.codigo}
          className="informe-preview-item"
        >
          <strong>{departamento.nombre}</strong>

          <div>
            Score de Privación:
            {" "}
            {departamento.score_privacion?.toFixed(4)}
          </div>
        </div>
      ))
    )}
  </div>

  <div className="informe-seccion">
    <strong>Municipios seleccionados</strong>

    {municipiosInforme.length === 0 ? (
      <p className="informe-vacio">Añade un municipio desde el mapa.</p>
    ) : (
      municipiosInforme.map((municipio) => (
        <div
          key={municipio.codigo}
          className="informe-preview-item"
        >
          <strong>{municipio.nombre}</strong>

          <div>
            Score de Privación:
            {" "}
            {municipio.score_privacion?.toFixed(4)}
          </div>
        </div>
      ))
    )}
  </div>

  <div className="informe-seccion">
    <strong>Variables seleccionadas</strong>

    {variablesInforme.map((variable) => (
      <div key={variable}>
        {variable}
      </div>
    ))}
  </div>

  <div className="informe-seccion">
    <strong>Periodo</strong>

    <div>
      {anioInicio} - {anioFin}
    </div>
  </div>

  <div className="informe-seccion">
    <strong>Gráficas</strong>

    <div>
      {incluirGraficas ? "Sí" : "No"}
    </div>
  </div>
</div>
</div>
      )}
      {cargando && <p>Cargando proyección...</p>}
      {modo === "proyeccion" && errorSerie && (
        <p className="panel-proyeccion-error">
          {errorSerie}
        </p>
      )}
    </aside>
  );
}

export default PanelIndicadores;
