import { useState } from "react";
import { useLocation } from "react-router";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import { API_URL, fetchConSesion } from "../../services/api";
import "../../Css/StyleReportes.css";

const VARIABLES = [
  {
    id: "score_privacion",
    nombre: "Score de Privación",
  },
  {
    id: "cobertura_acueducto",
    nombre: "Cobertura de Acueducto",
  },
  {
    id: "cobertura_alcantarillado",
    nombre: "Cobertura de Alcantarillado",
  },
  {
    id: "deficit_habitacional_cuantitativo",
    nombre: "Déficit Habitacional Cuantitativo",
  },
  {
    id: "deficit_habitacional_cualitativo",
    nombre: "Déficit Habitacional Cualitativo",
  },
  {
    id: "densidad_poblacional",
    nombre: "Densidad Poblacional",
  },
];

const UNIDADES = {
  score_privacion: "",
  densidad_poblacional: "hab/km²",
  cobertura_acueducto: "%",
  cobertura_alcantarillado: "%",
  deficit_habitacional_cuantitativo: "%",
  deficit_habitacional_cualitativo: "%",
};


// Se arregló para implementar react-router: se quitó la prop setScreen (CabezaDeNavegacion navega con useNavigate).
function Reportes({
  onLogout,
  departamentos,
  datosMunicipios,
}) {
  const { state } = useLocation();
  const informeInicial = state?.informe;

  // =========================
  // Estados
  // =========================

  const [incluirGraficas, setIncluirGraficas] = useState(
    () => informeInicial?.incluirGraficas ?? true
  );
  const [formatoReporte, setFormatoReporte] = useState("pdf");

  const [anioInicio, setAnioInicio] = useState(
    () => informeInicial?.anioInicio ?? 2020
  );
  const [anioFin, setAnioFin] = useState(
    () => informeInicial?.anioFin ?? 2025
  );

  const [departamentosSeleccionados, setDepartamentosSeleccionados] =
    useState(() => informeInicial?.departamentos ?? []);

  const [municipiosSeleccionados, setMunicipiosSeleccionados] = useState(
    () => informeInicial?.municipios ?? []
  );

  const [busquedaDepartamento, setBusquedaDepartamento] = useState("");
  const [busquedaMunicipio, setBusquedaMunicipio] = useState("");

  const [variablesSeleccionadas, setVariablesSeleccionadas] = useState(() =>
    (informeInicial?.variables ?? [])
      .map((id) => VARIABLES.find((variable) => variable.id === id))
      .filter(Boolean)
  );

  const [comentarios, setComentarios] = useState({});

const [tituloInforme, setTituloInforme] = useState(
  "Informe de Indicadores"
);

const [introduccion, setIntroduccion] = useState("");

const [conclusiones, setConclusiones] = useState("");

const [errorSolicitud, setErrorSolicitud] = useState("");




async function generarReporte() {
  setErrorSolicitud("");

  try {
    const response = await fetchConSesion(
      `${API_URL}/api/reportes/generar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: tituloInforme,
          introduccion,
          conclusiones,
          incluir_graficas: incluirGraficas,
          anio_inicio: anioInicio,
          anio_fin: anioFin,
          formato: formatoReporte,
          variables: variablesSeleccionadas.map((variable) => variable.id),
          departamentos: departamentosSeleccionados.map((item) => item.codigo),
          municipios: municipiosSeleccionados.map((item) => item.codigo),
          comentarios,
        }),
      },
      onLogout
    );

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(
        result.detail || result.message || "No se pudo enviar la solicitud del reporte."
      );
    }
  } catch (error) {
    if (error.status !== 401) {
      setErrorSolicitud(error.message || "Error al enviar la solicitud del reporte.");
    }
  }
}

function actualizarComentario(clave, texto) {
  setComentarios((prev) => ({
    ...prev,
    [clave]: texto
  }));
}

  // =========================
  // Datos
  // =========================

  const listaDepartamentos =
    (departamentos?.features ?? []).map(
      (feature) => feature.properties
    );

  const listaMunicipios =
    (datosMunicipios?.features ?? []).map(
      (feature) => feature.properties
    );

  // =========================
  // Filtros
  // =========================

  const departamentosFiltrados = listaDepartamentos.filter((item) =>
    item.nombre
      ?.toLowerCase()
      .includes(busquedaDepartamento.toLowerCase())
  );

  const municipiosFiltrados = listaMunicipios.filter((item) =>
    item.nombre
      ?.toLowerCase()
      .includes(busquedaMunicipio.toLowerCase())
  );

  // =========================
  // Render
  // =========================
  return (
    <>
      {/* Se arregló para implementar react-router: sin setScreen={setScreen} (la cabecera navega con useNavigate). */}
      <CabezaDeNavegacion
        onLogout={onLogout}
      />

      <div className="perfil-container">
        <div className="perfil-card">

          {/* =========================
              PANEL IZQUIERDO
          ========================= */}

          <div className="perfil-left">
            <h3>Configuración</h3>

            <p>
              Selecciona los datos que deseas incluir en el reporte.
            </p>

            <hr />

            {/* Gráficas */}
            <label>
              <input
                type="checkbox"
                checked={incluirGraficas}
                onChange={(e) =>
                  setIncluirGraficas(e.target.checked)
                }
              />
              Incluir gráficas
            </label>

            <hr />

            {/* Periodo */}
            <h4>Periodo</h4>

            <label>Año inicio</label>

            <input
              type="number"
              value={anioInicio}
              onChange={(e) =>
                setAnioInicio(Number(e.target.value))
              }
            />

            <label>Año fin</label>

            <input
              type="number"
              value={anioFin}
              onChange={(e) =>
                setAnioFin(Number(e.target.value))
              }
            />

            <hr />

              <h4>Título del informe</h4>

              <input
              className="input-titulo-informe"
                type="text"
                value={tituloInforme}
                onChange={(e) =>
                  setTituloInforme(e.target.value)
                }
              />

              <h4>Introducción</h4>

              <textarea
                className="comentario-informe"
                placeholder="Escribe la introducción..."
                value={introduccion}
                onChange={(e) =>
                  setIntroduccion(e.target.value)
                }
              />

              <h4>Conclusiones</h4>

              <textarea
                className="comentario-informe"
                placeholder="Escribe las conclusiones..."
                value={conclusiones}
                onChange={(e) =>
                  setConclusiones(e.target.value)
                }
              />

            {/* Variables */}
            <h4>Variables</h4>

            <p>
              Selecciona una o varias variables para incluir en el
              informe.
            </p>

            {VARIABLES.map((variable) => (
              <label
                key={variable.id}
                className="opcion-zona"
              >
                <input
                  type="checkbox"
                  checked={variablesSeleccionadas.includes(variable)}
                  onChange={() => {
                    setVariablesSeleccionadas((actuales) =>
                      actuales.includes(variable)
                        ? actuales.filter(
                            (v) => v !== variable
                          )
                        : [...actuales, variable]
                    );
                  }}
                />

                <span className="texto-opcion-zona">
                {variable.nombre}
                </span>
              </label>
            ))}

            <hr />

            {/* Departamentos */}
            <h4>Departamentos</h4>

            <p>
              Escoge los departamentos que aparecerán en el reporte.
            </p>

            <input
              className="buscador-reportes"
              type="text"
              placeholder="Buscar departamento..."
              value={busquedaDepartamento}
              onChange={(e) =>
                setBusquedaDepartamento(e.target.value)
              }
            />

            <p>
              Seleccionados: {departamentosSeleccionados.length}
            </p>

            <div className="lista-zonas">
              {departamentosFiltrados.map((item) => (
                <label
                  key={item.codigo}
                  className="opcion-zona"
                >
                  <input
                    type="checkbox"
                    checked={departamentosSeleccionados.some(
                      (x) => x.codigo === item.codigo
                    )}
                    onChange={() => {
                      const existe =
                        departamentosSeleccionados.some(
                          (x) => x.codigo === item.codigo
                        );

                      if (existe) {
                        setDepartamentosSeleccionados(
                          departamentosSeleccionados.filter(
                            (x) => x.codigo !== item.codigo
                          )
                        );
                      } else {
                        setDepartamentosSeleccionados([
                          ...departamentosSeleccionados,
                          item,
                        ]);
                      }
                    }}
                  />

                  {item.nombre}
                </label>
              ))}
            </div>

            <hr />

            {/* Municipios */}
            <h4>Municipios</h4>

            <p>
              Escoge los municipios que aparecerán en el reporte.
            </p>

            <input
              className="buscador-reportes"
              type="text"
              placeholder="Buscar municipio..."
              value={busquedaMunicipio}
              onChange={(e) =>
                setBusquedaMunicipio(e.target.value)
              }
            />

            <p>
              Seleccionados: {municipiosSeleccionados.length}
            </p>

            <div className="lista-zonas">
              {municipiosFiltrados.map((item) => (
                <label
                  key={item.codigo}
                  className="opcion-zona"
                >
                  <input
                    type="checkbox"
                    checked={municipiosSeleccionados.some(
                      (x) => x.codigo === item.codigo
                    )}
                    onChange={() => {
                      const existe =
                        municipiosSeleccionados.some(
                          (x) => x.codigo === item.codigo
                        );

                      if (existe) {
                        setMunicipiosSeleccionados(
                          municipiosSeleccionados.filter(
                            (x) => x.codigo !== item.codigo
                          )
                        );
                      } else {
                        setMunicipiosSeleccionados([
                          ...municipiosSeleccionados,
                          item,
                        ]);
                      }
                    }}
                  />

                  {item.nombre}
                </label>
              ))}
            </div>

            <br />

            {/* Formato del reporte */}
            <h4>Formato del reporte</h4>

            <label>
              <input
                type="checkbox"
                checked={formatoReporte === "pdf"}
                onChange={() => setFormatoReporte("pdf")}
              />
              PDF
            </label>

            <label>
              <input
                type="checkbox"
                checked={formatoReporte === "excel"}
                onChange={() => setFormatoReporte("excel")}
              />
              Excel
            </label>

            {/* Botón generar */}
            <button
              className="btn-generar-proyeccion"
              onClick={generarReporte}
              disabled={
                departamentosSeleccionados.length +
                  municipiosSeleccionados.length ===
                  0 ||
                variablesSeleccionadas.length === 0
              }
            >
              Generar reporte
            </button>

            {errorSolicitud && (
              <p role="alert">{errorSolicitud}</p>
            )}

            <p>
              Debes seleccionar al menos una zona y una variable.
            </p>
          </div>

          {/* =========================
              PANEL DERECHO
          ========================= */}

          <div className="perfil-right">
            <h4>Resumen del informe</h4>

            <div className="bloque-vista-previa">

              <p>
                Periodo:{" "}
                {anioInicio} - {anioFin}
              </p>

              <p>
                Gráficas:{" "}
                {incluirGraficas ? "Sí" : "No"}
              </p>

              <p>
                Departamentos:{" "}
                {departamentosSeleccionados.length}
              </p>

              <p>
                Municipios:{" "}
                {municipiosSeleccionados.length}
              </p>

              <p>
                Variables:{" "}
                {variablesSeleccionadas.length}
              </p>

              {/* Variables seleccionadas */}
              {variablesSeleccionadas.length > 0 && (
                <>
                  <hr />

                  <strong>
                    Variables seleccionadas
                  </strong>

                  <ul>
                    {variablesSeleccionadas.map((variable) => (
                      <li key={variable.id}>
                        {variable.nombre}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <hr />

            {/* Departamentos incluidos */}
            <h4>Departamentos incluidos</h4>

            {departamentosSeleccionados.length === 0 ? (
              <p>
                No hay departamentos seleccionados.
              </p>
            ) : (
              <div className="bloque-vista-previa">
                {departamentosSeleccionados.map((item) => (
                  <div
                    key={item.codigo}
                    className="item-vista-previa"
                  >
                    <strong>{item.nombre}</strong>

                    <p>
                      Código: {item.codigo}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <hr />

            {/* Municipios incluidos */}
            <h4>Municipios incluidos</h4>

            {municipiosSeleccionados.length === 0 ? (
              <p>
                No hay municipios seleccionados.
              </p>
            ) : (
              <div className="bloque-vista-previa">
                {municipiosSeleccionados.map((item) => (
                  <div
                    key={item.codigo}
                    className="item-vista-previa"
                  >
                    <strong>{item.nombre}</strong>

                    <p>
                      Código: {item.codigo}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =========================
            VISTA DEL DOCUMENTO
        ========================= */}

        <div className="vista-documento">
          <div className="pagina-reporte">
            <h1 className="titulo-documento">
              {tituloInforme}
            </h1>

              <p>
                Fecha:
                {" "}
                {new Date().toLocaleDateString()}
              </p>

              <hr />

              <h2>Introducción</h2>
              
                <div className="texto-informe">
                {introduccion || "Sin introducción."}
                </div>

                <hr />

              <h2>Resumen Ejecutivo</h2>

              <p>
                Periodo analizado:
                {" "}
                {anioInicio}
                {" - "}
                {anioFin}
              </p>


              <p>
                Incluye gráficas:
                {" "}
                {incluirGraficas ? "Sí" : "No"}
              </p>

              <h2>Resultados</h2>

                <h3>Departamentos</h3>

                {departamentosSeleccionados.length === 0 ? (
                  <p>No hay departamentos seleccionados.</p>
                ) : (
                  departamentosSeleccionados.map((departamento) => (
                    <div
                      key={departamento.codigo}
                      className="bloque-resultado"
                    >
                      <h4>{departamento.nombre}</h4>

                      

                      {variablesSeleccionadas.map((variable) => {
                        let valor = "Sin dato";

                        if (variable.id === "score_privacion") {
                          valor =
                            departamento.score_privacion?.toFixed(4) ??
                            "Sin dato";
                        } else {
                          valor =
                            departamento.indicadores?.[variable.id]?.valor ??
                            "Sin dato";
                        }
                        

                        return (
                          <div
                            key={variable.id}
                            className="fila-indicador"
                          >
                            <span>{variable.nombre}</span>
                            <span>
                            {valor}
                            {UNIDADES[variable.id] ?? ""}
                          </span>
                          </div>
                        );
                      })}

                      <label className="titulo-comentario">
                      Comentario
                      </label>

                      <textarea
                        className="comentario-informe"
                        placeholder="Escribe una observación sobre este departamento..."
                        value={comentarios[departamento.codigo] || ""}
                        onChange={(e) =>
                          actualizarComentario(
                            departamento.codigo,
                            e.target.value
                          )
                        }
                      />
                    </div>
                  ))
                )}

                <hr />

                <h3>Municipios</h3>

                {municipiosSeleccionados.length === 0 ? (
                  <p>No hay municipios seleccionados.</p>
                ) : (
                  municipiosSeleccionados.map((municipio) => (
                    <div
                      key={municipio.codigo}
                      className="bloque-resultado"
                    >
                      <h4>{municipio.nombre}</h4>

                      {variablesSeleccionadas.map((variable) => {
                        let valor = "Sin dato";

                        if (variable.id === "score_privacion") {
                          valor =
                            municipio.score_privacion?.toFixed(4) ??
                            "Sin dato";
                        } else {
                          valor =
                            municipio.indicadores?.[variable.id]?.valor ??
                            "Sin dato";
                        }

                        return (
                          <div
                            key={variable.id}
                            className="fila-indicador"
                          >
                            <span>{variable.nombre}</span>
                            <span>
                            {valor}
                            {UNIDADES[variable.id] ?? ""}
                          </span>
                          </div>
                        );
                      })}

                      <label className="titulo-comentario">
                      Comentario
                      </label>

                      <textarea
                        className="comentario-informe"
                        placeholder="Escribe una observación sobre este municipio..."
                        value={comentarios[municipio.codigo] || ""}
                        onChange={(e) =>
                          actualizarComentario(
                            municipio.codigo,
                            e.target.value
                          )
                        }
                      />
                    </div>
                  ))
)}
                  <hr />

                  <h2>Conclusiones</h2>

                  <div className="texto-informe">
                  {conclusiones || "Sin conclusiones."}
                  </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

export default Reportes;