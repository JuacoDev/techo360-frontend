import { useMemo, useRef, useState } from "react";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import BarraBuscadora from "../../components/BarraBuscadora";
import { useModoCapas } from "../../components/SelectorCapasMapa";
import MapView from "../../components/MapView";
import PanelIndicadores from "../../components/PanelIndicadores";
import { getProyeccionZonas } from "../../services/api";
import { avisoAniosFallidos, mensajeErrorProyeccion } from "./combinarProyeccion.js";
import {
  VARIABLE_POR_DEFECTO,
  buscarVariable,
  claveCache,
  crearNormalizador,
  estadoDeAnios,
  etiquetasLeyenda,
} from "./variablesProyeccion.js";

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

  // Cache en memoria por (variable, año): un array de zonas por cada par que SI
  // se pudo cargar. Volver a una variable ya cargada, o mover la barra de año,
  // solo lee de aqui -- cero llamadas nuevas a la API (solo se piden los pares
  // que faltan o que fallaron antes). Los años fallidos NO se guardan en el
  // cache: se reintentan al pulsar "Generar proyección" o al cambiar de variable.
  // Las refs guardan el cache; versionCache fuerza el re-render al cambiar.
  const cacheRef = useRef({});
  const fallosRef = useRef({});
  const [versionCache, setVersionCache] = useState(0);
  // Rango de años de la ultima generacion: cambiar de variable carga ESTE rango
  // (no el de los selects, que el usuario puede seguir moviendo sin efecto).
  const [rangoGenerado, setRangoGenerado] = useState(null);
  const [anioSeleccionadoMapa, setAnioSeleccionadoMapa] = useState(null);

  const variableMostrada = buscarVariable(VARIABLE_POR_DEFECTO);
  const { aniosGenerados, aniosFallidos, datosPorAnio } = useMemo(() => {
    if (!rangoGenerado) return { aniosGenerados: [], aniosFallidos: [], datosPorAnio: {} };
    const { cargados, fallidos } = estadoDeAnios(
      cacheRef.current,
      fallosRef.current,
      VARIABLE_POR_DEFECTO,
      rangoGenerado.inicio,
      rangoGenerado.fin
    );
    return {
      aniosGenerados: cargados,
      aniosFallidos: fallidos,
      datosPorAnio: Object.fromEntries(cargados.map((a) => [a, cacheRef.current[claveCache(VARIABLE_POR_DEFECTO, a)]])),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionCache, rangoGenerado]);

  const datosProyectados =
    anioSeleccionadoMapa != null
      ? datosPorAnio[anioSeleccionadoMapa] ?? []
      : null;

  // Color (valor -> [0, 1]) y etiquetas de la leyenda de la variable mostrada, segun las zonas del año visible.
  const normalizadorProyeccion = useMemo(
    () => (datosProyectados ? crearNormalizador(variableMostrada, datosProyectados) : null),
    [datosProyectados, variableMostrada]
  );
  const etiquetasProyeccion = useMemo(
    () => (datosProyectados ? etiquetasLeyenda(variableMostrada, datosProyectados) : null),
    [datosProyectados, variableMostrada]
  );

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

  // Carga (variable, año) para cada año del rango que NO este ya en el cache:
  // una peticion por año a /api/proyecciones/zonas?anio=&indicador=. Cada año
  // en su propio try/catch -- si uno falla (p.ej. un 504 con cache frio en el
  // backend) se registra y se sigue con el siguiente, en vez de descartar los
  // que ya salieron bien. Si ni un año sale bien, error bloqueante y el mapa
  // conserva lo que mostraba.
  const cargarAnios = async (idVariable, inicio, fin, { colapsar = false, reiniciarAnio = false } = {}) => {
    setCargandoProyeccion(true);
    setErrorProyeccion(null);
    if (reiniciarAnio) setAnioSeleccionadoMapa(null);

    for (let anio = inicio; anio <= fin; anio++) {
      const clave = claveCache(idVariable, anio);
      if (cacheRef.current[clave] !== undefined) continue; // ya cargado: no se repite la peticion
      try {
        const resultado = await getProyeccionZonas(anio, idVariable, onLogout);
        cacheRef.current[clave] = resultado.zonas ?? [];
        delete fallosRef.current[clave];
      } catch (error) {
        console.error(`Error generando ${idVariable} del año ${anio}:`, error);
        fallosRef.current[clave] = mensajeErrorProyeccion(error);
      }
    }

    const { cargados, fallidos } = estadoDeAnios(cacheRef.current, fallosRef.current, idVariable, inicio, fin);
    setVersionCache((v) => v + 1);

    if (cargados.length === 0) {
      // Fallo total: error bloqueante. El selector vuelve a la variable que el
      // mapa sigue mostrando, para que ambos coincidan.
      setErrorProyeccion(fallidos[0]?.mensaje ?? "No se pudo generar la proyección. Intenta de nuevo.");
    } else {
      setRangoGenerado({ inicio, fin });
      setAnioSeleccionadoMapa((actual) => (actual != null && cargados.includes(actual) ? actual : cargados[0]));
      if (colapsar) setMostrarControlesProyeccion(false);
    }

    setCargandoProyeccion(false);
  };

  const generarProyeccion = () =>
    cargarAnios(VARIABLE_POR_DEFECTO, anioInicio, anioFin, { colapsar: true, reiniciarAnio: true });

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
            variableMapa={datosProyectados ? variableMostrada : null}
            normalizadorProyeccion={normalizadorProyeccion}
            etiquetasLeyenda={etiquetasProyeccion}
            />
          </div>

        </section>

        <PanelIndicadores
          onLogout={onLogout}
          departamentos={departamentos}
          datosMunicipios={datosMunicipios}
          zonaSeleccionada={zonaSeleccionada}
          modo="proyeccion"
          anioInicio={anioInicio}
          anioFin={anioFin}
          proyeccionMapa={
            datosProyectados
              ? {
                variable: variableMostrada,
                anio: anioSeleccionadoMapa,
                datosPorAnio,
                desde: rangoGenerado.inicio,
                hasta: rangoGenerado.fin,
              }
              : null
          }
        />

      </div>
    </main>
  );
}

export default Proyectadas;