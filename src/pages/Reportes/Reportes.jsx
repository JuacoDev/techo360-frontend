import { useEffect, useId, useMemo, useState } from "react";
import { useLocation } from "react-router";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import {
  armarSolicitudReporte,
  consultarReporte,
  descargarReporte,
  enCurso,
  previsualizarGraficas,
  solicitarReporte,
  validarPeriodo,
} from "../../services/reportes";
import BarraLateralReportes from "./BarraLateralReportes.jsx";
import CabeceraReportes from "./CabeceraReportes.jsx";
import { VARIABLES } from "./catalogo.js";
import { Icono } from "./iconos.jsx";
import { ResumenDocumento, VistaPreviaDocumento } from "./VistasDocumento.jsx";
import "../../Css/StyleReportes.css";

// Se arregló para implementar react-router: se quitó la prop setScreen (CabezaDeNavegacion navega con useNavigate).
function Reportes({ onLogout, departamentos, datosMunicipios }) {
  const { state } = useLocation();
  const informeInicial = state?.informe;
  const idConfig = useId();
  const idVista = useId();

  // =========================
  // Estado de la configuracion
  // =========================
  const [incluirGraficas, setIncluirGraficas] = useState(() => informeInicial?.incluirGraficas ?? true);
  const [formatoReporte, setFormatoReporte] = useState("pdf");
  const [anioInicio, setAnioInicio] = useState(() => informeInicial?.anioInicio ?? 2020);
  const [anioFin, setAnioFin] = useState(() => informeInicial?.anioFin ?? 2025);
  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState(() => informeInicial?.departamentos ?? []);
  const [municipiosSeleccionados, setMunicipiosSeleccionados] = useState(() => informeInicial?.municipios ?? []);
  const [variablesSeleccionadas, setVariablesSeleccionadas] = useState(() =>
    (informeInicial?.variables ?? [])
      .map((id) => VARIABLES.find((variable) => variable.id === id))
      .filter(Boolean)
  );
  const [comentarios, setComentarios] = useState({});
  const [tituloInforme, setTituloInforme] = useState("Informe de Indicadores");
  const [introduccion, setIntroduccion] = useState("");
  const [conclusiones, setConclusiones] = useState("");

  // =========================
  // Estado de la pantalla
  // =========================
  const [configAbierta, setConfigAbierta] = useState(true);
  const [vista, setVista] = useState("previa"); // "previa" | "resumen"

  // =========================
  // Estado de la solicitud
  // =========================
  const [errorSolicitud, setErrorSolicitud] = useState("");
  const [solicitandoReporte, setSolicitandoReporte] = useState(false);
  // Series por año de las gráficas que devuelve el backend para la vista previa.
  const [previaGraficas, setPreviaGraficas] = useState({ estado: "inactiva", datos: null, mensaje: "" });
  // Reporte solicitado (respuesta del backend): se consulta hasta que quede
  // "listo" (con descarga_url) o "error".
  const [reporte, setReporte] = useState(null);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (!enCurso(reporte)) return undefined;
    let activo = true;
    const id = reporte.id;
    const temporizador = setInterval(async () => {
      try {
        const actualizado = await consultarReporte(id, onLogout);
        if (activo) setReporte(actualizado);
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

  // Vista previa de las graficas: las series por año se piden al backend (son las mismas
  // del archivo) cuando cambian zonas, variables o periodo, con una pausa para no consultar
  // en cada clic.
  const claveGraficas = JSON.stringify([
    incluirGraficas,
    anioInicio,
    anioFin,
    variablesSeleccionadas.map((variable) => variable.id),
    departamentosSeleccionados.map((zona) => zona.codigo),
    municipiosSeleccionados.map((zona) => zona.codigo),
  ]);
  useEffect(() => {
    const listo =
      incluirGraficas &&
      variablesSeleccionadas.length > 0 &&
      departamentosSeleccionados.length + municipiosSeleccionados.length > 0 &&
      !validarPeriodo(anioInicio, anioFin);
    if (!listo) {
      setPreviaGraficas({ estado: "inactiva", datos: null, mensaje: "" });
      return undefined;
    }
    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      setPreviaGraficas((previa) => ({ ...previa, estado: "cargando" }));
      try {
        const datos = await previsualizarGraficas(
          armarSolicitudReporte({
            formato: formatoReporte,
            anioInicio,
            anioFin,
            titulo: tituloInforme,
            introduccion: "",
            conclusiones: "",
            incluirGraficas: true,
            comentarios: {},
            variables: variablesSeleccionadas,
            departamentos: departamentosSeleccionados,
            municipios: municipiosSeleccionados,
          }),
          onLogout,
          control.signal
        );
        setPreviaGraficas({ estado: "lista", datos, mensaje: "" });
      } catch (error) {
        if (error.name === "AbortError" || error.status === 401) return;
        setPreviaGraficas({
          estado: "error",
          datos: null,
          mensaje: error.message || "No se pudo cargar la vista previa de las gráficas.",
        });
      }
    }, 500);
    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [claveGraficas]);

  async function generarReporte() {
    setErrorSolicitud("");
    setReporte(null);

    const errorDelPeriodo = validarPeriodo(anioInicio, anioFin);
    if (errorDelPeriodo) {
      setErrorSolicitud(errorDelPeriodo);
      return;
    }

    setSolicitandoReporte(true);
    try {
      const creado = await solicitarReporte(
        armarSolicitudReporte({
          formato: formatoReporte,
          anioInicio,
          anioFin,
          titulo: tituloInforme,
          introduccion,
          conclusiones,
          incluirGraficas,
          comentarios,
          variables: variablesSeleccionadas,
          departamentos: departamentosSeleccionados,
          municipios: municipiosSeleccionados,
        }),
        onLogout
      );
      setReporte(creado);
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

  const totalZonas = departamentosSeleccionados.length + municipiosSeleccionados.length;
  const errorPeriodo = validarPeriodo(anioInicio, anioFin);
  const pasos = [
    { id: "zonas", etiqueta: "Zonas", ok: totalZonas > 0, ayuda: "elige al menos un departamento o municipio" },
    { id: "variables", etiqueta: "Variables", ok: variablesSeleccionadas.length > 0, ayuda: "elige al menos una variable" },
    { id: "periodo", etiqueta: "Periodo", ok: !errorPeriodo, ayuda: errorPeriodo },
  ];
  const generando = solicitandoReporte || enCurso(reporte);
  const puedeGenerar = pasos.every((paso) => paso.ok) && !generando;
  const anios = Math.max(0, anioFin - anioInicio + 1);

  const config = {
    titulo: tituloInforme,
    introduccion,
    conclusiones,
    anioInicio,
    anioFin,
    formato: formatoReporte,
    incluirGraficas,
    variables: variablesSeleccionadas,
    departamentos: departamentosSeleccionados,
    municipios: municipiosSeleccionados,
    errorPeriodo,
  };
  const onConfig = {
    titulo: setTituloInforme,
    introduccion: setIntroduccion,
    conclusiones: setConclusiones,
    anioInicio: setAnioInicio,
    anioFin: setAnioFin,
    formato: setFormatoReporte,
    incluirGraficas: setIncluirGraficas,
    variables: setVariablesSeleccionadas,
    departamentos: setDepartamentosSeleccionados,
    municipios: setMunicipiosSeleccionados,
  };

  const pie = (
    <>
      <button type="button" className="rp-boton rp-boton--primario rp-boton--ancho" onClick={generarReporte} disabled={!puedeGenerar}>
        <Icono nombre="descarga" />
        {solicitandoReporte ? "Enviando solicitud…" : enCurso(reporte) ? "Generando…" : "Generar reporte"}
      </button>

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
          <p>El reporte está listo.</p>
          <button type="button" className="rp-boton rp-boton--claro rp-boton--ancho" onClick={descargar} disabled={descargando || !reporte.descarga_url}>
            <Icono nombre="descarga" />
            {descargando ? "Descargando…" : `Descargar ${reporte.formato === "excel" ? "Excel" : "PDF"}`}
          </button>
        </div>
      )}

      {reporte?.estado === "error" && (
        <p className="rp-aviso rp-aviso--error" role="alert">{reporte.error || "No se pudo generar el reporte."}</p>
      )}

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
            graficas: incluirGraficas,
          }}
          pasos={pasos}
          reporte={reporte}
        />

        <div className={`rp-editor${configAbierta ? "" : " is-sin-barra"}`}>
          <BarraLateralReportes
            id={idConfig}
            abierta={configAbierta}
            onOcultar={() => setConfigAbierta(false)}
            config={config}
            onConfig={onConfig}
            listas={{ departamentos: listaDepartamentos, municipios: listaMunicipios }}
            pie={pie}
          />

          <section className="rp-principal" aria-label="Documento">
            <div className="rp-tabs-fila">
              {!configAbierta && (
                <button
                  type="button"
                  className="rp-icono-boton rp-icono-boton--desplegar"
                  onClick={() => setConfigAbierta(true)}
                  aria-label="Mostrar configuración"
                  title="Mostrar configuración"
                  aria-expanded={false}
                  aria-controls={idConfig}
                >
                  <Icono nombre="panel" />
                </button>
              )}
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
                <VistaPreviaDocumento config={config} comentarios={comentarios} onComentario={actualizarComentario} previaGraficas={previaGraficas} />
              ) : (
                <ResumenDocumento config={config} comentarios={comentarios} pasos={pasos} />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Reportes;
