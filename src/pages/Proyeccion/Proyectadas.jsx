import { useState } from "react";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import BarraBuscadora from "../../components/BarraBuscadora";
import { useModoCapas } from "../../components/SelectorCapasMapa";
import MapView from "../../components/MapView";
import PanelIndicadores from "../../components/PanelIndicadores";
import { INDICADOR_PROYECCION_MAPA, getProyeccionZonas } from "../../services/api";
import {
  avisoAniosFallidos,
  combinarResultadosProyeccion,
  mensajeErrorProyeccion,
} from "./combinarProyeccion.js";

// Se arregló para implementar react-router: se quitó la prop setScreen (CabezaDeNavegacion navega con useNavigate).
function Proyectadas({
  onLogout,
  departamentos,
  datosMunicipios,
  rangoProyeccion,
  errorRangoProyeccion,
}) {
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  // Modo de capas de ESTE mapa (independiente del mapa de calor): lo cambian el
  // selector del mapa y los desplegables del buscador.
  const modoCapas = useModoCapas();
  const [anioInicio, setAnioInicio] = useState(2027);
  const [anioFin, setAnioFin] = useState(2030);
  const [cargandoProyeccion, setCargandoProyeccion] = useState(false);
  const [errorProyeccion, setErrorProyeccion] = useState(null);
  const [mostrarControlesProyeccion, setMostrarControlesProyeccion] = useState(true);

  // Cache de la ultima proyeccion generada: un array de zonas por cada
  // año que SI se pudo generar (aniosGenerados puede tener huecos si
  // algun año del rango fallo -- ver generarProyeccion). Mover la barra
  // de año solo lee de aqui -- cero llamadas nuevas a la API. No
  // depende de los valores actuales de los selects, que el usuario
  // puede seguir cambiando sin que eso mueva la barra hasta que vuelva
  // a pulsar "Generar proyección".
  const [datosPorAnio, setDatosPorAnio] = useState({});
  const [aniosGenerados, setAniosGenerados] = useState([]);
  const [aniosFallidos, setAniosFallidos] = useState([]);
  const [anioSeleccionadoMapa, setAnioSeleccionadoMapa] = useState(null);

  const datosProyectados =
    anioSeleccionadoMapa != null
      ? datosPorAnio[anioSeleccionadoMapa] ?? []
      : null;

  // Rango real de años, tal como lo confirmó el backend (GET
  // /api/proyecciones/rango) -- nunca un número hardcodeado aquí. Mientras
  // no haya llegado, se colapsa a un solo año para no ofrecer opciones que
  // el backend todavía no confirmó como válidas.
  const anioMinimo = rangoProyeccion?.anioMinimo ?? 2025;
  const anioMaximo = rangoProyeccion?.anioMaximo ?? anioMinimo;
  const aniosDisponibles = Array.from(
    { length: anioMaximo - anioMinimo + 1 },
    (_, i) => anioMinimo + i
  );

  const seleccionarZona = (zona) => {
    setZonaSeleccionada((actual) =>
      zona && actual && actual.codigo === zona.codigo
        ? null
        : zona
    );
  };

  const generarProyeccion = async () => {
  setCargandoProyeccion(true);
  setErrorProyeccion(null);
  // Se vacia el cache de inmediato: mientras se genera (o si falla) la
  // barra no debe seguir mostrando los años de una generacion anterior.
  setDatosPorAnio({});
  setAniosGenerados([]);
  setAniosFallidos([]);
  setAnioSeleccionadoMapa(null);

  // Cada año en su propio try/catch -- si uno falla (p.ej. un 504 con
  // cache frio en el backend) se registra y se sigue con el siguiente,
  // en vez de descartar los que ya salieron bien.
  const resultadosPorAnio = {};
  const fallosPorAnio = {};

  for (
    let anio = anioInicio;
    anio <= anioFin;
    anio++
  ) {
    try {
      const resultado = await getProyeccionZonas(anio, INDICADOR_PROYECCION_MAPA, onLogout);
      resultadosPorAnio[anio] = resultado.zonas ?? [];
    } catch (error) {
      console.error(`Error generando el año ${anio}:`, error);
      fallosPorAnio[anio] = mensajeErrorProyeccion(error);
    }
  }

  const combinado = combinarResultadosProyeccion(resultadosPorAnio, fallosPorAnio);

  if (!combinado.exito) {
    // Fallo total (ni un año salio bien) -- igual que antes: error
    // bloqueante, sin cache, barra deshabilitada.
    setErrorProyeccion(
      combinado.aniosFallidos[0]?.mensaje ?? "No se pudo generar la proyección. Intenta de nuevo."
    );
  } else {
    setDatosPorAnio(combinado.datosPorAnio);
    setAniosGenerados(combinado.aniosDisponibles);
    setAniosFallidos(combinado.aniosFallidos);
    setAnioSeleccionadoMapa(combinado.aniosDisponibles[0]);
    setMostrarControlesProyeccion(false);
  }

  setCargandoProyeccion(false);
};

  return (
    <main className="app-shell">
      {/* Se arregló para implementar react-router: sin setScreen={setScreen} (la cabecera navega con useNavigate). */}
      <CabezaDeNavegacion
        onLogout={onLogout}
      />

      <div className="dashboard-layout">

        <section className="dashboard-main-column">

          <BarraBuscadora
            onSeleccionarZona={seleccionarZona}
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
            onEventoCapas={modoCapas[1]}
            accionDerecha={(
              <button
                className={`panel-proyeccion-toggle${mostrarControlesProyeccion ? "" : " is-collapsed"}`}
                type="button"
                aria-expanded={mostrarControlesProyeccion}
                aria-controls="controles-proyeccion"
                onClick={() => setMostrarControlesProyeccion((visible) => !visible)}
              >
                <span>
                  <strong>{mostrarControlesProyeccion ? "Ocultar configuración" : "Configurar años de proyección"}</strong>
                  {!mostrarControlesProyeccion && (
                    <small>{anioInicio}-{anioFin} · {aniosGenerados.length} años</small>
                  )}
                </span>
                <span className="panel-proyeccion-toggle-flecha" aria-hidden="true">
                  {mostrarControlesProyeccion ? "↑" : "↓"}
                </span>
              </button>
            )}
          />

          <div
            className="panel-proyeccion"
            aria-busy={cargandoProyeccion}
          >
            <div
              id="controles-proyeccion"
              className={`panel-proyeccion-contenido${mostrarControlesProyeccion ? "" : " is-hidden"}`}
              aria-hidden={!mostrarControlesProyeccion}
            >
            <div className="panel-proyeccion-heading">
              <div>
                <p className="panel-proyeccion-kicker">Proyección de indicadores</p>
                <h2>Elige el periodo que quieres consultar</h2>
                <p>Selecciona un año de inicio y uno de fin. Después genera la proyección para actualizar el mapa.</p>
              </div>
              <span className="panel-proyeccion-rango">
                {rangoProyeccion
                  ? `${anioMinimo} - ${anioMaximo}`
                  : "Cargando rango"}
              </span>
            </div>

            <div className="panel-proyeccion-campos">
              <label className="panel-proyeccion-campo">
                <span>Año de inicio</span>
                <select
                  value={anioInicio}
                  disabled={!rangoProyeccion || cargandoProyeccion}
                  onChange={(e) => {
                    const nuevoInicio = Number(e.target.value);
                    setAnioInicio(nuevoInicio);
                    if (anioFin < nuevoInicio) setAnioFin(nuevoInicio);
                  }}
                >
                  {aniosDisponibles.map((anio) => (
                    <option key={anio} value={anio}>{anio}</option>
                  ))}
                </select>
              </label>

              <span className="panel-proyeccion-flecha" aria-hidden="true">→</span>

              <label className="panel-proyeccion-campo">
                <span>Año de fin</span>
                <select
                  value={anioFin}
                  disabled={!rangoProyeccion || cargandoProyeccion}
                  onChange={(e) => setAnioFin(Number(e.target.value))}
                >
                  {aniosDisponibles
                    .filter((anio) => anio >= anioInicio)
                    .map((anio) => (
                      <option key={anio} value={anio}>{anio}</option>
                    ))}
                </select>
              </label>
            </div>

            <button
              className="btn-generar-proyeccion"
              onClick={generarProyeccion}
              disabled={!rangoProyeccion || cargandoProyeccion}
              type="button"
            >
              {cargandoProyeccion && <span className="proyeccion-spinner" aria-hidden="true" />}
              <span>{cargandoProyeccion ? "Generando proyección..." : "Generar proyección"}</span>
            </button>

            <p className="panel-proyeccion-estado" role="status" aria-live="polite">
              {cargandoProyeccion
                ? `Calculando los años ${anioInicio} a ${anioFin}. Esto puede tardar unos segundos.`
                : "Cuando termine, podrás cambiar el año visible desde el control del mapa."}
            </p>

            {(errorProyeccion || errorRangoProyeccion) && (
              <span className="panel-proyeccion-error" role="alert">
                {errorProyeccion || errorRangoProyeccion}
              </span>
            )}

            {!errorProyeccion && aniosFallidos.length > 0 && (
              <span className="panel-proyeccion-aviso" role="status">
                {avisoAniosFallidos(aniosFallidos)}
              </span>
            )}
            </div>
          </div>

          <div className="dashboard-map-container">
            <MapView
            onZonaSeleccionada={seleccionarZona}
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
            datosProyectados={datosProyectados}
            codigoSeleccionado={zonaSeleccionada?.codigo ?? null}
            mostrarSelectorAnio
            anioSeleccionado={anioSeleccionadoMapa}
            aniosDisponiblesSelector={aniosGenerados}
            cargandoAnio={cargandoProyeccion}
            avisoSelectorAnio="Genera la proyección"
            onAnioSeleccionado={setAnioSeleccionadoMapa}
            modoCapas={modoCapas}
            />
          </div>

        </section>

        <PanelIndicadores
          zonaSeleccionada={zonaSeleccionada}
          modo="proyeccion"
          anioInicio={anioInicio}
          anioFin={anioFin}
        />

      </div>
    </main>
  );
}

export default Proyectadas;