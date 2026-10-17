import React, { useEffect, useMemo, useState } from "react"
import "../Css/StyleComponents.css";
import "../Css/StyleReportes.css";
import { getProyeccion } from "../services/api";
import { armarSolicitudReporte, consultarReporte, descargarReporte, enCurso, solicitarReporte, validarPeriodo } from "../services/reportes.js";
import PanelVariableProyeccion from "./PanelVariableProyeccion.jsx";
import { useIrA } from "../routing/useIrA.js";
import { RUTAS } from "../routing/rutas.js";
import { VARIABLES_PROYECCION, esProyeccionZona } from "../pages/Proyeccion/variablesProyeccion.js";
import { fiabilidadTarjeta } from "./fiabilidadTarjeta.js";
import BarraLateralReportes from "../pages/Reportes/BarraLateralReportes.jsx";
import { ResumenDocumento } from "../pages/Reportes/VistasDocumento.jsx";
import { crearEtiquetaMunicipio, PLANTILLA_POR_DEFECTO, VARIABLES } from "../pages/Reportes/catalogo.js";
import { Icono } from "../pages/Reportes/iconos.jsx";
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

// Real vs proyeccion: regla unica en pages/Proyeccion/variablesProyeccion.js (esProyeccionZona; INC-001). Replica el
// criterio del backend (prefijo "proyeccion-", sufijo "-proyeccion" o prefijo legado "DANE-proyeccion-poblacion-"),
// sin depender de una lista exacta de nombres. Se le pasa el indicador completo ({ origen, es_real? }): si trae
// es_real manda; si no (payload de indicadores), decide el originvar.
const esProyeccion = (datos) => esProyeccionZona(datos);

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
  // La fiabilidad sale de los datos de la tarjeta (esProyeccion + intervalo_confianza), no de un prop que nadie pasa.
  const fiabilidad = fiabilidadTarjeta(datos, proyectado);
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
            ⚠️ Proyección estimada por Techo 360; el método depende del indicador. No es un dato observado.
          </p>
        </div>
      )}

      {fiabilidad != null && (
        <p className="indicador-proyeccion-badge">
          Fiabilidad: {fiabilidad}%
        </p>
      )}

      {datos.origen && (
        <p className="indicador-fuente">
          Fuente: {datos.origen}
          {datos.anio_real && `, Año: ${datos.anio_real}`}
        </p>
      )}
    </div>
  );
}

function PanelIndicadores({ onLogout, departamentos, datosMunicipios, zonaSeleccionada, modo = "calor", anioInicio, anioFin, proyeccionMapa = null }) {
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

  const hayProyeccionMapa = proyeccionMapa != null;
  const variablesGraficas = VARIABLES_PROYECCION.filter(
    (variable) => variable.id === "score_privacion" || variable.serie === "servicio"
  );

  const [vista, setVista] = useState("indicadores");
  const [formatoReporte, setFormatoReporte] = useState("pdf");
  const [plantillaReporte, setPlantillaReporte] = useState(PLANTILLA_POR_DEFECTO.pdf);
  const [tituloInforme, setTituloInforme] = useState("Informe de Indicadores");
  const [introduccion, setIntroduccion] = useState("");
  const [conclusiones, setConclusiones] = useState("");
  const [comentarios, setComentarios] = useState({});
  const [variablesInforme, setVariablesInforme] = useState(() => VARIABLES.slice(0, 2));
  const [departamentosInforme, setDepartamentosInforme] = useState([]);
  const [municipiosInforme, setMunicipiosInforme] = useState([]);
  const [graficasInforme, setGraficasInforme] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [solicitandoReporte, setSolicitandoReporte] = useState(false);
  const [descargandoReporte, setDescargandoReporte] = useState(false);
  const [errorReporte, setErrorReporte] = useState("");
  const [anioInicioInforme, setAnioInicioInforme] = useState(() => anioInicio ?? 2020);
  const [anioFinInforme, setAnioFinInforme] = useState(() => anioFin ?? 2025);
  const listaDepartamentos = useMemo(() => (departamentos?.features ?? []).map((feature) => feature.properties), [departamentos]);
  const listaMunicipios = useMemo(() => (datosMunicipios?.features ?? []).map((feature) => feature.properties), [datosMunicipios]);
  const etiquetaMunicipio = useMemo(() => crearEtiquetaMunicipio(listaDepartamentos), [listaDepartamentos]);
  const zonasSeleccionadas = useMemo(
    () => [
      ...departamentosInforme.map((zona) => ({ ...zona, nivel: "departamento" })),
      ...municipiosInforme.map((zona) => ({ ...zona, nivel: "municipio" })),
    ],
    [departamentosInforme, municipiosInforme]
  );
  const errorPeriodoInforme = validarPeriodo(anioInicioInforme, anioFinInforme);
  const pasosInforme = [
    { id: "zonas", etiqueta: "Zonas", ok: zonasSeleccionadas.length > 0, ayuda: "elige al menos un departamento o municipio" },
    { id: "variables", etiqueta: "Variables", ok: variablesInforme.length > 0, ayuda: "elige al menos una variable" },
    { id: "periodo", etiqueta: "Periodo", ok: !errorPeriodoInforme, ayuda: errorPeriodoInforme },
  ];
  const configuracionInforme = {
    titulo: tituloInforme,
    introduccion,
    conclusiones,
    anioInicio: anioInicioInforme,
    anioFin: anioFinInforme,
    formato: formatoReporte,
    plantilla: plantillaReporte,
    graficas: graficasInforme,
    variables: variablesInforme,
    departamentos: departamentosInforme,
    municipios: municipiosInforme,
    etiquetaMunicipio,
    errorPeriodo: errorPeriodoInforme,
  };

  useEffect(() => {
    if (!zonaSeleccionada || zonasSeleccionadas.some((zona) => zona.codigo === zonaSeleccionada.codigo)) return;
    if (zonaSeleccionada.nivel === "departamento") setDepartamentosInforme((actuales) => [...actuales, zonaSeleccionada]);
    if (zonaSeleccionada.nivel === "municipio") setMunicipiosInforme((actuales) => [...actuales, zonaSeleccionada]);
  }, [zonaSeleccionada, zonasSeleccionadas]);

  useEffect(() => {
    if (!enCurso(reporte)) return undefined;
    let activo = true;
    const temporizador = setInterval(async () => {
      try {
        const actualizado = await consultarReporte(reporte.id, onLogout);
        if (activo) setReporte(actualizado);
      } catch (error) {
        if (activo && error.status !== 401) {
          setReporte(null);
          setErrorReporte(error.message || "No se pudo consultar el estado del reporte.");
        }
      }
    }, 2000);
    return () => {
      activo = false;
      clearInterval(temporizador);
    };
  }, [reporte?.id, reporte?.estado, onLogout]);

  function solicitudActual() {
    return armarSolicitudReporte({
      formato: formatoReporte,
      plantilla: plantillaReporte,
      anioInicio: anioInicioInforme,
      anioFin: anioFinInforme,
      titulo: tituloInforme,
      introduccion,
      conclusiones,
      graficas: graficasInforme,
      comentarios,
      variables: variablesInforme,
      departamentos: departamentosInforme,
      municipios: municipiosInforme,
    });
  }

  async function generarInforme() {
    setErrorReporte("");
    setReporte(null);
    if (errorPeriodoInforme || pasosInforme.some((paso) => !paso.ok)) {
      setErrorReporte(errorPeriodoInforme || "Selecciona al menos una zona y una variable.");
      return;
    }
    setSolicitandoReporte(true);
    try {
      setReporte(await solicitarReporte(solicitudActual(), onLogout));
    } catch (error) {
      if (error.status !== 401) setErrorReporte(error.message || "No se pudo generar el reporte.");
    } finally {
      setSolicitandoReporte(false);
    }
  }

  async function descargarInforme() {
    setDescargandoReporte(true);
    try {
      await descargarReporte(reporte, onLogout);
    } catch (error) {
      if (error.status !== 401) setErrorReporte(error.message || "No se pudo descargar el reporte.");
    } finally {
      setDescargandoReporte(false);
    }
  }

  function continuarEnReportes() {
    irA(RUTAS.reportes, {
      state: {
        informe: {
          formato: formatoReporte,
          plantilla: plantillaReporte,
          titulo: tituloInforme,
          introduccion,
          conclusiones,
          comentarios,
          variables: variablesInforme.map((variable) => variable.id),
          departamentos: departamentosInforme,
          municipios: municipiosInforme,
          graficas: graficasInforme,
          anioInicio: anioInicioInforme,
          anioFin: anioFinInforme,
        },
      },
    });
  }

  function actualizarComentario(codigo, texto) {
    setComentarios((actuales) => ({ ...actuales, [codigo]: texto }));
  }

  const onConfigInforme = {
    titulo: setTituloInforme,
    introduccion: setIntroduccion,
    conclusiones: setConclusiones,
    anioInicio: setAnioInicioInforme,
    anioFin: setAnioFinInforme,
    formato: (formato) => {
      setFormatoReporte(formato);
      setPlantillaReporte(PLANTILLA_POR_DEFECTO[formato]);
    },
    plantilla: setPlantillaReporte,
    variables: setVariablesInforme,
    departamentos: setDepartamentosInforme,
    municipios: setMunicipiosInforme,
    graficas: setGraficasInforme,
  };

  useEffect(() => {
  if (!puedeProyectar) {
    setErrorSerie(null);
    return;
  }

  if (zonaSeleccionada.nivel !== "municipio") return;

  // Con una variable proyectada cargada en el mapa, la serie de densidad (y la del score) se arma con los datos
  // del mapa en PanelVariableProyeccion: no se llama a /serie.
  if (hayProyeccionMapa) return;

  manejarClickIndicador("densidad_poblacional");
}, [zonaSeleccionada, anioInicio, anioFin, modo, hayProyeccionMapa]);

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

  const pieInforme = (
    <>
      <button className="rp-boton rp-boton--primario rp-boton--ancho" type="button" onClick={generarInforme} disabled={solicitandoReporte || enCurso(reporte) || pasosInforme.some((paso) => !paso.ok)}>
        <Icono nombre="descarga" />
        {solicitandoReporte ? "Enviando solicitud…" : enCurso(reporte) ? "Generando…" : "Generar reporte"}
      </button>
      <button className="rp-boton rp-boton--ancho" type="button" onClick={continuarEnReportes}>
        <Icono nombre="editar" />
        Seguir modificando en Reportes
      </button>
      {reporte?.estado === "pendiente" || reporte?.estado === "procesando" ? (
        <p className="rp-aviso rp-aviso--proceso" role="status"><span className="rp-giro" aria-hidden="true" /> Generando el reporte…</p>
      ) : null}
      {reporte?.estado === "listo" ? (
        <div className="rp-aviso rp-aviso--exito" role="status">
          <p>El reporte está listo.</p>
          <button className="rp-boton rp-boton--claro rp-boton--ancho" type="button" onClick={descargarInforme} disabled={descargandoReporte}>
            <Icono nombre="descarga" />
            {descargandoReporte ? "Descargando…" : "Descargar reporte"}
          </button>
        </div>
      ) : null}
      {errorReporte && <p className="rp-aviso rp-aviso--error" role="alert">{errorReporte}</p>}
    </>
  );

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
      {modo === "proyeccion" && zonaSeleccionada?.nivel === "municipio" && (
        <div className="panel-indicadores-proyecciones">
          {variablesGraficas.map((variable) => (
              <PanelVariableProyeccion
                key={variable.id}
                zona={zonaSeleccionada}
                variable={variable}
                anio={proyeccionMapa?.anio ?? anioInicio}
                datosPorAnio={variable.id === "score_privacion" ? proyeccionMapa?.datosPorAnio ?? {} : {}}
                desde={proyeccionMapa?.desde ?? anioInicio}
                hasta={proyeccionMapa?.hasta ?? anioFin}
              />
          ))}
        </div>
      )}
      {modo !== "proyeccion" && zonaSeleccionada && "score_privacion" in zonaSeleccionada && (
        <div className="panel-indicadores-score">
          <strong className="indicador-nombre">Score de Privación</strong>
          <p className="indicador-valor">
            {zonaSeleccionada.score_privacion != null
              ? zonaSeleccionada.score_privacion.toFixed(4)
              : "Sin dato"}
          </p>
        </div>
      )}

      {modo === "proyeccion" ? null : zonaSeleccionada && zonaSeleccionada.indicadores ? (
        (() => {
          const entradas = Object.entries(zonaSeleccionada.indicadores);
          const confirmadas = entradas.filter(([, datos]) => !esSinDato(datos.origen) && !esProyeccion(datos));
          const tarjetasProyeccion = entradas.filter(([, datos]) => !esSinDato(datos.origen) && esProyeccion(datos));
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
        <div className="rp-pagina panel-informe panel-informe--editor">
          <div className="rp-cabecera">
            <p className="rp-acceso-kicker">Visualizar y generar reportes</p>
            <h3 className="rp-acceso-titulo">Organiza tu informe</h3>
            <p className="rp-acceso-ayuda">Aquí puedes configurar y generar el reporte viendo solo su resumen.</p>
          </div>
          <div className="rp-editor">
            <BarraLateralReportes
              id="panel-configuracion-reporte"
              abierta
              onAlternar={() => {}}
              config={configuracionInforme}
              onConfig={onConfigInforme}
              listas={{
                departamentos: listaDepartamentos,
                municipios: listaMunicipios,
                etiquetaMunicipio,
                etiquetaZona: (zona) => zona.nivel === "municipio" ? etiquetaMunicipio(zona) : zona.nombre,
                zonasSeleccionadas,
              }}
              historial={{ estado: "listo", items: [], mensaje: "", idActual: null, onAbrir: () => {}, onEliminar: () => {}, onNuevo: () => {}, onReintentar: () => {} }}
              pie={pieInforme}
            />
            <section className="rp-principal panel-informe-resumen" aria-label="Resumen del informe">
              <div className="rp-tabs-fila">
                <h3 className="rp-panel-titulo">Resumen del documento</h3>
                <span className="rp-panel-ayuda">La vista previa está disponible al continuar en Reportes.</span>
              </div>
              <ResumenDocumento config={configuracionInforme} comentarios={comentarios} pasos={pasosInforme} />
              <div className="rp-resumen-acciones">
                <button className="rp-boton rp-boton--ancho" type="button" onClick={continuarEnReportes}>
                  <Icono nombre="editar" />
                  Seguir modificando en Reportes
                </button>
              </div>
            </section>
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
