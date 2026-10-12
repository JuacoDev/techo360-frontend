import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useLocation } from "react-router";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import {
  armarSolicitudReporte,
  consultarReporte,
  descargarReporte,
  eliminarDelHistorial,
  enCurso,
  escenasDeGraficas,
  listarHistorial,
  obtenerSolicitudGuardada,
  solicitarReporte,
  solicitudAEstado,
  validarPeriodo,
} from "../../services/reportes";
import BarraLateralReportes, { BotonConfiguracion } from "./BarraLateralReportes.jsx";
import CabeceraReportes from "./CabeceraReportes.jsx";
import { crearEtiquetaMunicipio, nombreDePlantilla, PLANTILLA_POR_DEFECTO, VARIABLES } from "./catalogo.js";
import { estadoDeGrafica } from "./graficasCatalogo.js";
import { Icono } from "./iconos.jsx";
import { ResumenDocumento, VistaPreviaDocumento } from "./VistasDocumento.jsx";
import "../../Css/StyleReportes.css";

const TITULO_POR_DEFECTO = "Informe de Indicadores";
const PREVIA_VACIA = { estado: "inactiva", escenas: [], mensaje: "" };

// Se arregló para implementar react-router: se quitó la prop setScreen (CabezaDeNavegacion navega con useNavigate).
function Reportes({ onLogout, departamentos, datosMunicipios }) {
  const { state } = useLocation();
  const informeInicial = state?.informe;
  const idConfig = useId();
  const idVista = useId();

  // =========================
  // Estado de la configuracion
  // =========================
  const [formatoReporte, setFormatoReporte] = useState(() => informeInicial?.formato ?? "pdf");
  // Una plantilla por formato: al cambiar de PDF a Excel y volver se conserva la elegida en cada uno.
  const [plantillas, setPlantillas] = useState(() => ({
    ...PLANTILLA_POR_DEFECTO,
    ...(informeInicial?.formato && informeInicial?.plantilla ? { [informeInicial.formato]: informeInicial.plantilla } : {}),
  }));
  const plantilla = plantillas[formatoReporte];
  const [anioInicio, setAnioInicio] = useState(() => informeInicial?.anioInicio ?? 2020);
  const [anioFin, setAnioFin] = useState(() => informeInicial?.anioFin ?? 2025);
  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState(() => informeInicial?.departamentos ?? []);
  const [municipiosSeleccionados, setMunicipiosSeleccionados] = useState(() => informeInicial?.municipios ?? []);
  const [variablesSeleccionadas, setVariablesSeleccionadas] = useState(() =>
    (informeInicial?.variables ?? [])
      .map((id) => VARIABLES.find((variable) => variable.id === id))
      .filter(Boolean)
  );
  const [comentarios, setComentarios] = useState(() => ({ ...(informeInicial?.comentarios ?? {}) }));
  const [tituloInforme, setTituloInforme] = useState(() => informeInicial?.titulo ?? TITULO_POR_DEFECTO);
  const [introduccion, setIntroduccion] = useState(() => informeInicial?.introduccion ?? "");
  const [conclusiones, setConclusiones] = useState(() => informeInicial?.conclusiones ?? "");
  // Gráficas elegidas, en el orden en que saldrán en el documento.
  const [graficas, setGraficas] = useState(() => informeInicial?.graficas ?? []);

  // =========================
  // Estado de la pantalla
  // =========================
  const [configAbierta, setConfigAbierta] = useState(true);
  const [vista, setVista] = useState("previa"); // "previa" | "resumen"

  // =========================
  // Estado de la solicitud
  // =========================
  const [errorSolicitud, setErrorSolicitud] = useState("");
  const [avisoCarga, setAvisoCarga] = useState("");
  const [solicitandoReporte, setSolicitandoReporte] = useState(false);
  // Reporte solicitado (respuesta del backend): se consulta hasta que quede
  // "listo" (con descarga_url) o "error".
  const [reporte, setReporte] = useState(null);
  const [descargando, setDescargando] = useState(false);
  // Reporte del historial que se está editando: al generar de nuevo lo reemplaza (no se duplica).
  const [reporteId, setReporteId] = useState(null);
  const [historial, setHistorial] = useState({ estado: "cargando", items: [], mensaje: "" });
  // Escenas vectoriales de las gráficas (las calcula el backend y dibuja también el PDF).
  const [previaGraficas, setPreviaGraficas] = useState(PREVIA_VACIA);

  // =========================
  // Datos derivados
  // =========================
  const listaDepartamentos = useMemo(
    () => (departamentos?.features ?? []).map((feature) => feature.properties),
    [departamentos]
  );
  const listaMunicipios = useMemo(
    () => (datosMunicipios?.features ?? []).map((feature) => feature.properties),
    [datosMunicipios]
  );
  const etiquetaMunicipio = useMemo(() => crearEtiquetaMunicipio(listaDepartamentos), [listaDepartamentos]);
  const etiquetaZona = useCallback((zona) => (zona.nivel === "municipio" ? etiquetaMunicipio(zona) : zona.nombre), [etiquetaMunicipio]);
  const zonasSeleccionadas = useMemo(
    () => [
      ...departamentosSeleccionados.map((zona) => ({ ...zona, nivel: "departamento" })),
      ...municipiosSeleccionados.map((zona) => ({ ...zona, nivel: "municipio" })),
    ],
    [departamentosSeleccionados, municipiosSeleccionados]
  );
  const codigosSeleccionados = useMemo(() => zonasSeleccionadas.map((zona) => String(zona.codigo)), [zonasSeleccionadas]);
  // Una gráfica cuyas zonas ya no están seleccionadas (o que dejó de cumplir las reglas) no viaja al backend.
  const graficasValidas = useMemo(
    () => graficas.filter((grafica) => estadoDeGrafica(grafica, codigosSeleccionados).ok),
    [graficas, codigosSeleccionados]
  );

  const totalZonas = zonasSeleccionadas.length;
  const errorPeriodo = validarPeriodo(anioInicio, anioFin);
  const pasos = [
    { id: "zonas", etiqueta: "Zonas", ok: totalZonas > 0, ayuda: "elige al menos un departamento o municipio" },
    { id: "variables", etiqueta: "Variables", ok: variablesSeleccionadas.length > 0, ayuda: "elige al menos una variable" },
    { id: "periodo", etiqueta: "Periodo", ok: !errorPeriodo, ayuda: errorPeriodo },
  ];
  const generando = solicitandoReporte || enCurso(reporte);
  const puedeGenerar = pasos.every((paso) => paso.ok) && !generando;
  const anios = Math.max(0, anioFin - anioInicio + 1);

  const solicitudActual = (extra = {}) =>
    armarSolicitudReporte({
      formato: formatoReporte,
      plantilla,
      anioInicio,
      anioFin,
      titulo: tituloInforme,
      introduccion,
      conclusiones,
      graficas: graficasValidas,
      comentarios,
      variables: variablesSeleccionadas,
      departamentos: departamentosSeleccionados,
      municipios: municipiosSeleccionados,
      ...extra,
    });

  // =========================
  // Historial
  // =========================
  const cargarHistorial = useCallback(async () => {
    setHistorial((actual) => ({ ...actual, estado: actual.items.length ? "listo" : "cargando", mensaje: "" }));
    try {
      const items = await listarHistorial(onLogout);
      setHistorial({ estado: "listo", items, mensaje: "" });
    } catch (error) {
      if (error.status === 401) return;
      setHistorial((actual) => ({ ...actual, estado: "error", mensaje: error.message || "No se pudo cargar el historial." }));
    }
  }, [onLogout]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  function restablecer() {
    setFormatoReporte("pdf");
    setPlantillas(PLANTILLA_POR_DEFECTO);
    setAnioInicio(2020);
    setAnioFin(2025);
    setDepartamentosSeleccionados([]);
    setMunicipiosSeleccionados([]);
    setVariablesSeleccionadas([]);
    setComentarios({});
    setTituloInforme(TITULO_POR_DEFECTO);
    setIntroduccion("");
    setConclusiones("");
    setGraficas([]);
    setReporte(null);
    setReporteId(null);
    setErrorSolicitud("");
    setAvisoCarga("");
  }

  // Vuelve a cargar en el editor la configuración guardada de un reporte del historial.
  async function abrirDelHistorial(item) {
    setErrorSolicitud("");
    setAvisoCarga("");
    try {
      const guardado = await obtenerSolicitudGuardada(item.id, onLogout);
      const estado = solicitudAEstado(guardado.solicitud);
      const deps = estado.departamentos.map((codigo) => listaDepartamentos.find((zona) => String(zona.codigo) === codigo)).filter(Boolean);
      const muns = estado.municipios.map((codigo) => listaMunicipios.find((zona) => String(zona.codigo) === codigo)).filter(Boolean);
      const perdidas = estado.departamentos.length + estado.municipios.length - deps.length - muns.length;
      setFormatoReporte(estado.formato);
      setPlantillas((actuales) => ({ ...actuales, [estado.formato]: estado.plantilla ?? PLANTILLA_POR_DEFECTO[estado.formato] }));
      setAnioInicio(estado.anioInicio);
      setAnioFin(estado.anioFin);
      setTituloInforme(estado.titulo);
      setIntroduccion(estado.introduccion);
      setConclusiones(estado.conclusiones);
      setComentarios(estado.comentarios);
      setVariablesSeleccionadas(estado.variables.map((id) => VARIABLES.find((variable) => variable.id === id)).filter(Boolean));
      setDepartamentosSeleccionados(deps);
      setMunicipiosSeleccionados(muns);
      setGraficas(estado.graficas);
      setReporte(null);
      setReporteId(item.id);
      if (perdidas > 0) setAvisoCarga(`${perdidas} ${perdidas === 1 ? "zona del reporte guardado no está disponible" : "zonas del reporte guardado no están disponibles"} y se omitieron.`);
    } catch (error) {
      if (error.status !== 401) setErrorSolicitud(error.message || "No se pudo abrir ese reporte.");
    }
  }

  async function quitarDelHistorial(item) {
    if (!window.confirm(`¿Quitar «${item.titulo}» del historial? Solo se borra su configuración guardada.`)) return;
    try {
      await eliminarDelHistorial(item.id, onLogout);
      if (item.id === reporteId) setReporteId(null);
      await cargarHistorial();
    } catch (error) {
      if (error.status !== 401) setErrorSolicitud(error.message || "No se pudo quitar el reporte del historial.");
    }
  }

  // =========================
  // Generacion y descarga
  // =========================
  useEffect(() => {
    if (!enCurso(reporte)) return undefined;
    let activo = true;
    const id = reporte.id;
    const temporizador = setInterval(async () => {
      try {
        const actualizado = await consultarReporte(id, onLogout);
        if (activo) setReporte(actualizado);
        if (activo && !enCurso(actualizado)) cargarHistorial();
      } catch (error) {
        if (!activo) return;
        if (error.status === 401) return;
        setReporte(null);
        setErrorSolicitud(error.message || "No se pudo consultar el estado del reporte.");
      }
    }, 2000);
    return () => {
      activo = false;
      clearInterval(temporizador);
    };
  }, [reporte?.id, reporte?.estado]);

  async function generarReporte() {
    setErrorSolicitud("");
    setAvisoCarga("");
    setReporte(null);

    const errorDelPeriodo = validarPeriodo(anioInicio, anioFin);
    if (errorDelPeriodo) {
      setErrorSolicitud(errorDelPeriodo);
      return;
    }

    setSolicitandoReporte(true);
    try {
      const creado = await solicitarReporte(solicitudActual({ reemplaza: reporteId }), onLogout);
      setReporte(creado);
      setReporteId(creado.id);
      cargarHistorial();
    } catch (error) {
      if (error.status !== 401) {
        setErrorSolicitud(error.message || "Error al enviar la solicitud del reporte.");
      }
    } finally {
      setSolicitandoReporte(false);
    }
  }

  async function descargar() {
    setErrorSolicitud("");
    setDescargando(true);
    try {
      await descargarReporte(reporte, onLogout);
    } catch (error) {
      if (error.status !== 401) setErrorSolicitud(error.message || "No se pudo descargar el reporte.");
    } finally {
      setDescargando(false);
    }
  }

  function actualizarComentario(clave, texto) {
    setComentarios((prev) => ({ ...prev, [clave]: texto }));
  }

  // =========================
  // Vista previa de las gráficas
  // =========================
  // Las escenas se piden al backend (son las mismas del archivo) cuando cambian las gráficas, las zonas o el
  // periodo, con una pausa para no consultar en cada clic. IEEE usa un lienzo más angosto (una columna).
  const anchoEscena = formatoReporte === "pdf" && plantilla === "ieee" ? 360 : 560;
  const claveGraficas = JSON.stringify([formatoReporte, plantilla, anioInicio, anioFin, graficasValidas, codigosSeleccionados]);
  useEffect(() => {
    if (graficasValidas.length === 0 || totalZonas === 0 || errorPeriodo) {
      setPreviaGraficas(PREVIA_VACIA);
      return undefined;
    }
    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      setPreviaGraficas((previa) => ({ ...previa, estado: "cargando", mensaje: "" }));
      try {
        // el backend exige al menos una variable en el reporte; para la vista previa basta la de la primera gráfica
        const variablesPrevia = variablesSeleccionadas.length > 0 ? variablesSeleccionadas : [graficasValidas[0].variables[0]];
        const respuesta = await escenasDeGraficas(solicitudActual({ variables: variablesPrevia, reemplaza: null }), anchoEscena, onLogout, control.signal);
        setPreviaGraficas({ estado: "lista", escenas: respuesta.graficas, mensaje: "" });
      } catch (error) {
        if (error.name === "AbortError" || error.status === 401) return;
        setPreviaGraficas({ estado: "error", escenas: [], mensaje: error.message || "No se pudo cargar la vista previa de las gráficas." });
      }
    }, 500);
    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [claveGraficas]);

  const config = {
    titulo: tituloInforme,
    introduccion,
    conclusiones,
    anioInicio,
    anioFin,
    formato: formatoReporte,
    plantilla,
    graficas,
    variables: variablesSeleccionadas,
    departamentos: departamentosSeleccionados,
    municipios: municipiosSeleccionados,
    errorPeriodo,
    etiquetaMunicipio,
  };
  const onConfig = {
    titulo: setTituloInforme,
    introduccion: setIntroduccion,
    conclusiones: setConclusiones,
    anioInicio: setAnioInicio,
    anioFin: setAnioFin,
    formato: setFormatoReporte,
    plantilla: (id) => setPlantillas((actuales) => ({ ...actuales, [formatoReporte]: id })),
    variables: setVariablesSeleccionadas,
    departamentos: setDepartamentosSeleccionados,
    municipios: setMunicipiosSeleccionados,
    graficas: setGraficas,
  };

  const pie = (
    <>
      <button type="button" className="rp-boton rp-boton--primario rp-boton--ancho" onClick={generarReporte} disabled={!puedeGenerar}>
        <Icono nombre="descarga" />
        {solicitandoReporte ? "Enviando solicitud…" : enCurso(reporte) ? "Generando…" : reporteId ? "Generar de nuevo" : "Generar reporte"}
      </button>

      {reporteId && !generando && !reporte && (
        <p className="rp-ayuda">Editando un reporte de tu historial: al generar se actualiza ese mismo reporte.</p>
      )}

      {!puedeGenerar && !generando && (
        <p className="rp-ayuda">
          Falta: {pasos.filter((paso) => !paso.ok).map((paso) => paso.etiqueta.toLowerCase()).join(", ")}.
        </p>
      )}

      {reporte && enCurso(reporte) && (
        <p className="rp-aviso rp-aviso--proceso" role="status">
          <span className="rp-giro" aria-hidden="true" />
          {reporte.estado === "pendiente" ? "Solicitud recibida. El reporte está en cola…" : "Generando el reporte…"}
        </p>
      )}

      {reporte?.estado === "listo" && (
        <div className="rp-aviso rp-aviso--exito" role="status">
          <p>{reporte.contenido?.includes("caché") ? "El reporte ya estaba listo (generado hace menos de 24 h)." : "El reporte está listo."}</p>
          <button type="button" className="rp-boton rp-boton--claro rp-boton--ancho" onClick={descargar} disabled={descargando || !reporte.descarga_url}>
            <Icono nombre="descarga" />
            {descargando ? "Descargando…" : `Descargar ${reporte.formato === "excel" ? "Excel" : "PDF"}`}
          </button>
        </div>
      )}

      {reporte?.estado === "error" && (
        <p className="rp-aviso rp-aviso--error" role="alert">{reporte.error || "No se pudo generar el reporte."}</p>
      )}

      {avisoCarga && <p className="rp-aviso rp-aviso--proceso" role="status">{avisoCarga}</p>}
      {errorSolicitud && <p className="rp-aviso rp-aviso--error" role="alert">{errorSolicitud}</p>}
    </>
  );

  return (
    <div className="rp-pagina">
      {/* Se arregló para implementar react-router: sin setScreen={setScreen} (la cabecera navega con useNavigate). */}
      <CabezaDeNavegacion onLogout={onLogout} />

      <main className="rp-contenedor">
        <CabeceraReportes
          datos={{
            zonas: totalZonas,
            departamentos: departamentosSeleccionados.length,
            municipios: municipiosSeleccionados.length,
            variables: variablesSeleccionadas.length,
            periodo: `${anioInicio} – ${anioFin}`,
            anios: `${anios} ${anios === 1 ? "año" : "años"}`,
            formato: formatoReporte,
            plantilla: nombreDePlantilla(formatoReporte, plantilla),
            graficas: graficasValidas.length,
          }}
          pasos={pasos}
          reporte={reporte}
        />

        <div className={`rp-editor${configAbierta ? "" : " is-sin-barra"}`}>
          {/* Con la barra oculta, el mismo botón queda en el mismo sitio donde estaba su icono. */}
          {!configAbierta && (
            <BotonConfiguracion abierta={false} onAlternar={() => setConfigAbierta(true)} controla={idConfig} flotante />
          )}
          <BarraLateralReportes
            id={idConfig}
            abierta={configAbierta}
            onAlternar={() => setConfigAbierta((abierta) => !abierta)}
            config={config}
            onConfig={onConfig}
            listas={{ departamentos: listaDepartamentos, municipios: listaMunicipios, etiquetaMunicipio, etiquetaZona, zonasSeleccionadas }}
            historial={{
              estado: historial.estado,
              items: historial.items,
              mensaje: historial.mensaje,
              idActual: reporteId,
              onAbrir: abrirDelHistorial,
              onEliminar: quitarDelHistorial,
              onNuevo: restablecer,
              onReintentar: cargarHistorial,
            }}
            pie={pie}
          />

          <section className="rp-principal" aria-label="Documento">
            <div className="rp-tabs-fila">
              <div className="rp-tabs" role="tablist" aria-label="Vista del documento">
                <button
                  type="button"
                  role="tab"
                  id={`${idVista}-resumen`}
                  aria-selected={vista === "resumen"}
                  aria-controls={`${idVista}-panel`}
                  className={`rp-tab${vista === "resumen" ? " is-activa" : ""}`}
                  onClick={() => setVista("resumen")}
                >
                  <Icono nombre="lista" />
                  Resumen del documento
                </button>
                <button
                  type="button"
                  role="tab"
                  id={`${idVista}-previa`}
                  aria-selected={vista === "previa"}
                  aria-controls={`${idVista}-panel`}
                  className={`rp-tab${vista === "previa" ? " is-activa" : ""}`}
                  onClick={() => setVista("previa")}
                >
                  <Icono nombre="ojo" />
                  Vista previa del documento
                </button>
              </div>
            </div>

            <div id={`${idVista}-panel`} role="tabpanel" aria-labelledby={`${idVista}-${vista}`} className="rp-panel">
              {vista === "previa" ? (
                <VistaPreviaDocumento config={{ ...config, graficas: graficasValidas }} comentarios={comentarios} onComentario={actualizarComentario} previaGraficas={previaGraficas} />
              ) : (
                <ResumenDocumento config={{ ...config, graficas: graficasValidas }} comentarios={comentarios} pasos={pasos} />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Reportes;
