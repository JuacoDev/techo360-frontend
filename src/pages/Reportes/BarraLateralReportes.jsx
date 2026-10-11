import { useId, useState } from "react";

import { Icono } from "./iconos.jsx";
import PanelHistorial from "./PanelHistorial.jsx";
import SeccionGraficas from "./SeccionGraficas.jsx";
import SelectorZonas from "./SelectorZonas.jsx";
import { FORMATOS, nombreDePlantilla, PERIODOS_RAPIDOS, PLANTILLAS, plural, VARIABLES } from "./catalogo.js";

function Seccion({ id, icono, titulo, resumen, insignia, abierta, onAlternar, children }) {
  const idPanel = useId();
  return (
    <section className={`rp-seccion${abierta ? " is-abierta" : ""}`} data-seccion={id}>
      <h2 className="rp-seccion-titulo">
        <button type="button" className="rp-seccion-boton" aria-expanded={abierta} aria-controls={idPanel} onClick={onAlternar}>
          <span className="rp-seccion-icono"><Icono nombre={icono} /></span>
          <span className="rp-seccion-texto">
            <span className="rp-seccion-nombre">{titulo}</span>
            <span className="rp-seccion-resumen">{resumen}</span>
          </span>
          {insignia != null && <span className="rp-insignia">{insignia}</span>}
          <Icono nombre="chevron" tamano={16} className="rp-seccion-flecha" />
        </button>
      </h2>
      <div id={idPanel} className="rp-seccion-cuerpo" inert={!abierta}>
        <div className="rp-seccion-contenido">{children}</div>
      </div>
    </section>
  );
}

// El mismo icono de "Configuración" es el interruptor: relleno naranja con la barra visible, contorno con la barra oculta.
export function BotonConfiguracion({ abierta, onAlternar, controla, flotante = false }) {
  return (
    <button
      type="button"
      className={`rp-config-boton${abierta ? " is-abierta" : ""}${flotante ? " rp-config-boton--flotante" : ""}`}
      onClick={onAlternar}
      aria-expanded={abierta}
      aria-controls={controla}
      aria-label={abierta ? "Ocultar configuración" : "Mostrar configuración"}
      title={abierta ? "Ocultar configuración" : "Mostrar configuración"}
    >
      <Icono nombre="sliders" />
    </button>
  );
}

function Contador({ valor, maximo }) {
  return <span className={`rp-contador${valor > maximo * 0.9 ? " is-alto" : ""}`}>{valor}/{maximo}</span>;
}

// Menu lateral de configuracion: una seccion abierta a la vez (acordeon) y un
// pie fijo con el boton de generar y el estado de la solicitud.
function BarraLateralReportes({ id, abierta, onAlternar, config, onConfig, listas, historial, pie }) {
  const [seccion, setSeccion] = useState("zonas");
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const idHistorial = useId();
  const alternar = (nombre) => setSeccion((actual) => (actual === nombre ? "" : nombre));
  const idTitulo = useId();
  const idIntro = useId();
  const idConclusiones = useId();
  const idInicio = useId();
  const idFin = useId();

  const totalZonas = config.departamentos.length + config.municipios.length;
  const todasVariables = config.variables.length === VARIABLES.length;

  return (
    <aside id={id} className={`rp-barra${abierta ? "" : " is-oculta"}`} aria-label="Configuración del reporte" inert={!abierta}>
      <div className="rp-barra-interior">
        <div className="rp-barra-cabecera">
          <BotonConfiguracion abierta={abierta} onAlternar={onAlternar} controla={id} />
          <h2 className="rp-barra-titulo">Configuración</h2>
          <button
            type="button"
            className={`rp-historial-boton${historialAbierto ? " is-abierto" : ""}`}
            onClick={() => setHistorialAbierto((abierto) => !abierto)}
            aria-expanded={historialAbierto}
            aria-controls={idHistorial}
          >
            <Icono nombre="historial" tamano={16} />
            Historial
            {historial.items.length > 0 && <span className="rp-insignia">{historial.items.length}</span>}
          </button>
        </div>
        <div className="rp-barra-lista">
          {historialAbierto && (
            <PanelHistorial
              id={idHistorial}
              estado={historial.estado}
              items={historial.items}
              mensaje={historial.mensaje}
              idActual={historial.idActual}
              onAbrir={(item) => { historial.onAbrir(item); setHistorialAbierto(false); }}
              onEliminar={historial.onEliminar}
              onNuevo={() => { historial.onNuevo(); setHistorialAbierto(false); }}
              onReintentar={historial.onReintentar}
            />
          )}
          <Seccion
            id="general"
            icono="texto"
            titulo="Contenido"
            resumen={config.titulo.trim() || "Sin título"}
            abierta={seccion === "general"}
            onAlternar={() => alternar("general")}
          >
            <label className="rp-campo" htmlFor={idTitulo}>
              <span className="rp-campo-etiqueta">Título del informe <Contador valor={config.titulo.length} maximo={250} /></span>
              <input id={idTitulo} type="text" maxLength={250} value={config.titulo} onChange={(e) => onConfig.titulo(e.target.value)} />
            </label>
            <label className="rp-campo" htmlFor={idIntro}>
              <span className="rp-campo-etiqueta">Introducción <Contador valor={config.introduccion.length} maximo={10000} /></span>
              <textarea id={idIntro} rows={4} maxLength={10000} placeholder="Escribe la introducción…" value={config.introduccion} onChange={(e) => onConfig.introduccion(e.target.value)} />
            </label>
            <label className="rp-campo" htmlFor={idConclusiones}>
              <span className="rp-campo-etiqueta">Conclusiones <Contador valor={config.conclusiones.length} maximo={10000} /></span>
              <textarea id={idConclusiones} rows={4} maxLength={10000} placeholder="Escribe las conclusiones…" value={config.conclusiones} onChange={(e) => onConfig.conclusiones(e.target.value)} />
            </label>
          </Seccion>

          <Seccion
            id="periodo"
            icono="calendario"
            titulo="Periodo y formato"
            resumen={`${config.anioInicio} – ${config.anioFin} · ${config.formato === "excel" ? "Excel" : "PDF"} · ${nombreDePlantilla(config.formato, config.plantilla)}`}
            abierta={seccion === "periodo"}
            onAlternar={() => alternar("periodo")}
          >
            <div className="rp-par">
              <label className="rp-campo" htmlFor={idInicio}>
                <span className="rp-campo-etiqueta">Año inicio</span>
                <input id={idInicio} type="number" min={2000} max={2042} value={config.anioInicio} onChange={(e) => onConfig.anioInicio(Number(e.target.value))} />
              </label>
              <label className="rp-campo" htmlFor={idFin}>
                <span className="rp-campo-etiqueta">Año fin</span>
                <input id={idFin} type="number" min={2000} max={2042} value={config.anioFin} onChange={(e) => onConfig.anioFin(Number(e.target.value))} />
              </label>
            </div>
            <div className="rp-atajos" aria-label="Periodos rápidos">
              {PERIODOS_RAPIDOS.map((atajo) => (
                <button
                  key={atajo.etiqueta}
                  type="button"
                  className={`rp-atajo${config.anioInicio === atajo.inicio && config.anioFin === atajo.fin ? " is-activo" : ""}`}
                  onClick={() => { onConfig.anioInicio(atajo.inicio); onConfig.anioFin(atajo.fin); }}
                >
                  {atajo.etiqueta}
                </button>
              ))}
            </div>
            {config.errorPeriodo && <p className="rp-error-campo" role="alert">{config.errorPeriodo}</p>}

            <p className="rp-campo-etiqueta rp-espaciado">Formato</p>
            <div className="rp-formatos" role="radiogroup" aria-label="Formato del reporte">
              {FORMATOS.map((formato) => (
                <label key={formato.id} className={`rp-formato${config.formato === formato.id ? " is-activo" : ""}`}>
                  <input type="radio" name="formato-reporte" checked={config.formato === formato.id} onChange={() => onConfig.formato(formato.id)} />
                  <Icono nombre={formato.icono} tamano={22} />
                  <strong>{formato.nombre}</strong>
                  <span>{formato.descripcion}</span>
                </label>
              ))}
            </div>

            <p className="rp-campo-etiqueta rp-espaciado">
              Plantilla {config.formato === "pdf" ? "del documento" : "del libro"}
            </p>
            <div className="rp-formatos" role="radiogroup" aria-label="Plantilla del reporte">
              {PLANTILLAS[config.formato].map((opcion) => (
                <label key={opcion.id} className={`rp-formato rp-formato--plantilla${config.plantilla === opcion.id ? " is-activo" : ""}`}>
                  <input type="radio" name={`plantilla-${config.formato}`} checked={config.plantilla === opcion.id} onChange={() => onConfig.plantilla(opcion.id)} />
                  <strong>{opcion.nombre}</strong>
                  <em>{opcion.detalle}</em>
                  <span>{opcion.descripcion}</span>
                </label>
              ))}
            </div>
          </Seccion>

          <Seccion
            id="variables"
            icono="indicador"
            titulo="Variables"
            resumen={config.variables.length === 0 ? "Elige al menos una" : `${config.variables.length} de ${VARIABLES.length} ${plural(config.variables.length, "seleccionada", "seleccionadas")}`}
            insignia={config.variables.length}
            abierta={seccion === "variables"}
            onAlternar={() => alternar("variables")}
          >
            <div className="rp-zonas-herramientas">
              <span>Indicadores que aparecerán en el reporte</span>
              <span className="rp-zonas-botones">
                <button type="button" onClick={() => onConfig.variables(todasVariables ? [] : [...VARIABLES])}>
                  {todasVariables ? "Ninguna" : "Todas"}
                </button>
              </span>
            </div>
            <div className="rp-tarjetas">
              {VARIABLES.map((variable) => {
                const marcada = config.variables.some((v) => v.id === variable.id);
                return (
                  <label key={variable.id} className={`rp-tarjeta${marcada ? " is-marcada" : ""}`}>
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => onConfig.variables(marcada ? config.variables.filter((v) => v.id !== variable.id) : [...config.variables, variable])}
                    />
                    <span className="rp-opcion-marca"><Icono nombre="check" tamano={12} /></span>
                    <strong>{variable.nombre}</strong>
                    <span>{variable.descripcion}{variable.unidad ? ` · ${variable.unidad}` : ""}</span>
                  </label>
                );
              })}
            </div>
          </Seccion>

          <Seccion
            id="zonas"
            icono="mapa"
            titulo="Zonas"
            resumen={totalZonas === 0 ? "Elige al menos una" : `${config.departamentos.length} ${plural(config.departamentos.length, "dpto.", "dptos.")} · ${config.municipios.length} ${plural(config.municipios.length, "municipio", "municipios")}`}
            insignia={totalZonas}
            abierta={seccion === "zonas"}
            onAlternar={() => alternar("zonas")}
          >
            <SelectorZonas
              departamentos={listas.departamentos}
              municipios={listas.municipios}
              selDepartamentos={config.departamentos}
              selMunicipios={config.municipios}
              onDepartamentos={onConfig.departamentos}
              onMunicipios={onConfig.municipios}
              etiquetaMunicipio={listas.etiquetaMunicipio}
            />
          </Seccion>

          <Seccion
            id="graficas"
            icono="grafica"
            titulo="Gráficas"
            resumen={config.graficas.length === 0 ? "Sin gráficas" : `${config.graficas.length} ${plural(config.graficas.length, "gráfica", "gráficas")} · en el orden elegido`}
            insignia={config.graficas.length}
            abierta={seccion === "graficas"}
            onAlternar={() => alternar("graficas")}
          >
            <SeccionGraficas
              graficas={config.graficas}
              onGraficas={onConfig.graficas}
              zonas={listas.zonasSeleccionadas}
              etiquetaZona={listas.etiquetaZona}
            />
          </Seccion>
        </div>

        <div className="rp-barra-pie">{pie}</div>
      </div>
    </aside>
  );
}

export default BarraLateralReportes;
