import { useState } from "react";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import BarraBuscadora from "../../components/BarraBuscadora";
import MapView from "../../components/MapView";
import PanelIndicadores from "../../components/PanelIndicadores";
import { getProyeccionZonas } from "../../services/api";

// Traduce el status HTTP que ya trae el Error (ver error.status en
// getProyeccionZonas, api.js) a un mensaje que el usuario pueda entender
// -- antes esto solo se mandaba a console.error y el usuario se quedaba
// con un spinner que desaparecia sin ninguna pista de que paso.
function mensajeErrorProyeccion(error) {
  if (error?.status === 422) {
    return (
      error.message ||
      "El año pedido está fuera del rango de datos disponibles para la proyección."
    );
  }
  if (error?.status === 503) {
    return "El servicio de proyección no está disponible en este momento. Intenta de nuevo más tarde.";
  }
  if (error?.status === 504) {
    return "El servicio de proyección no respondió a tiempo. Intenta de nuevo en unos segundos.";
  }
  return "No se pudo generar la proyección. Intenta de nuevo.";
}

function Proyectadas({
  setScreen,
  onLogout,
  departamentos,
  datosMunicipios,
  rangoProyeccion,
  errorRangoProyeccion,
}) {
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  const [anioInicio, setAnioInicio] = useState(2027);
  const [anioFin, setAnioFin] = useState(2030);
  const [cargandoProyeccion, setCargandoProyeccion] = useState(false);
  const [errorProyeccion, setErrorProyeccion] = useState(null);

  // Cache de la ultima proyeccion generada: un array de zonas por cada
  // año del rango ya consultado, para que mover la barra de año solo
  // lea de aqui -- cero llamadas nuevas a la API. rangoGenerado es el
  // anioInicio/anioFin usados en esa generacion (no los valores actuales
  // de los selects, que el usuario puede seguir cambiando sin que eso
  // mueva la barra hasta que vuelva a pulsar "Generar proyección").
  const [datosPorAnio, setDatosPorAnio] = useState({});
  const [rangoGenerado, setRangoGenerado] = useState(null);
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
  // barra no debe seguir mostrando el rango/año de una generacion
  // anterior.
  setDatosPorAnio({});
  setRangoGenerado(null);
  setAnioSeleccionadoMapa(null);

  try {
    const resultadosPorAnio = {};

    for (
      let anio = anioInicio;
      anio <= anioFin;
      anio++
    ) {
      const resultado =
        await getProyeccionZonas(anio, "densidad_poblacional", onLogout);

      resultadosPorAnio[anio] = resultado.zonas ?? [];
    }

    // Solo se confirma en estado si el loop completo tuvo exito -- si
    // un año a mitad de camino falla, el catch de abajo se encarga y
    // resultadosPorAnio (local) simplemente se descarta, sin dejar un
    // cache a medias.
    setDatosPorAnio(resultadosPorAnio);
    setRangoGenerado({ anioInicio, anioFin });
    setAnioSeleccionadoMapa(anioInicio);

  } catch (error) {
    console.error(error);
    setErrorProyeccion(mensajeErrorProyeccion(error));
  } finally {
    setCargandoProyeccion(false);
  }
};

  return (
    <main className="app-shell">
      <CabezaDeNavegacion
        setScreen={setScreen}
        onLogout={onLogout}
      />

      <div className="dashboard-layout">

        <section className="dashboard-main-column">

          <BarraBuscadora
            onSeleccionarZona={seleccionarZona}
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
          />

          <div className="panel-proyeccion">

            <label>Año inicio</label>

            <select
              value={anioInicio}
              disabled={!rangoProyeccion}
              onChange={(e) =>
                setAnioInicio(Number(e.target.value))
              }
            >
              {aniosDisponibles.map((anio) => (
                <option
                  key={anio}
                  value={anio}
                >
                  {anio}
                </option>
              ))}
            </select>

            <label>Año fin</label>

            <select
              value={anioFin}
              disabled={!rangoProyeccion}
              onChange={(e) =>
                setAnioFin(Number(e.target.value))
              }
            >
              {aniosDisponibles.map((anio) => (
                <option
                  key={anio}
                  value={anio}
                >
                  {anio}
                </option>
              ))}
            </select>

            <button
              className="btn-generar-proyeccion"
              onClick={generarProyeccion}
              disabled={!rangoProyeccion || cargandoProyeccion}
            >
              {cargandoProyeccion ? "Generando..." : "Generar proyección"}
            </button>

            {(errorProyeccion || errorRangoProyeccion) && (
              <span className="panel-proyeccion-error" role="alert">
                {errorProyeccion || errorRangoProyeccion}
              </span>
            )}

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
            anioMinimoSelector={rangoGenerado?.anioInicio}
            anioMaximoSelector={rangoGenerado?.anioFin}
            cargandoAnio={cargandoProyeccion}
            avisoSelectorAnio="Genera una proyección para activar el año"
            onAnioSeleccionado={setAnioSeleccionadoMapa}
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