import { useEffect, useRef, useState } from "react";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import BarraBuscadora from "../../components/BarraBuscadora";
import MapView from "../../components/MapView";
import PanelIndicadores from "../../components/PanelIndicadores";
import PantallaCarga from "../../components/PantallaCarga";
import {
  getProyeccionZonas,
  getZonasDepartamentos,
  getZonasMunicipios,
} from "../../services/api";

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
  const [datosProyectados, setDatosProyectados] = useState(null);
  const [anioMapa, setAnioMapa] = useState(2027);
  const [selectorAnioActivo, setSelectorAnioActivo] = useState(false);
  const [datosRealesMapa, setDatosRealesMapa] = useState(null);
  const [departamentosRealesMapa, setDepartamentosRealesMapa] = useState(null);
  const [datosProyectadosMapa, setDatosProyectadosMapa] = useState(null);
  const [fiabilidadMapa, setFiabilidadMapa] = useState(null);
  const [cargandoAnioMapa, setCargandoAnioMapa] = useState(false);
  const [errorProyeccion, setErrorProyeccion] = useState(null);
  const datosMapaPorAnio = useRef(new Map());

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
  try {
    setCargandoProyeccion(true);
    setErrorProyeccion(null);

    const resultados = {};

    for (
      let anio = anioInicio;
      anio <= anioFin;
      anio++
    ) {
      const resultado =
        await getProyeccionZonas(anio, "densidad_poblacional", onLogout);

      resultados[anio] = resultado;
      datosMapaPorAnio.current.set(`proyeccion-${anio}`, resultado);
    }
    setDatosProyectados(resultados[anioInicio]?.zonas ?? []);
    setAnioMapa(anioInicio);

  } catch (error) {
    console.error(error);
    setErrorProyeccion(mensajeErrorProyeccion(error));
  } finally {
    setCargandoProyeccion(false);
  }
};

  useEffect(() => {
    if (!selectorAnioActivo) {
      setCargandoAnioMapa(false);
      return undefined;
    }

    let cancelado = false;
    setCargandoAnioMapa(true);
    setErrorProyeccion(null);
    setDatosRealesMapa(null);
    setDepartamentosRealesMapa(null);
    setDatosProyectadosMapa(null);
    setFiabilidadMapa(null);
    const temporizador = setTimeout(async () => {
      try {
        if (anioMapa < 2025) {
          const [datos, departamentosDatos] = await Promise.all([
            datosMapaPorAnio.current.get(`municipios-${anioMapa}`)
              ?? getZonasMunicipios(anioMapa, onLogout),
            datosMapaPorAnio.current.get(`departamentos-${anioMapa}`)
              ?? getZonasDepartamentos(anioMapa, onLogout),
          ]);
          if (cancelado) return;
          datosMapaPorAnio.current.set(`municipios-${anioMapa}`, datos);
          datosMapaPorAnio.current.set(`departamentos-${anioMapa}`, departamentosDatos);
          setDatosRealesMapa(datos);
          setDepartamentosRealesMapa(departamentosDatos);
          setDatosProyectadosMapa(null);
          setFiabilidadMapa(null);
        } else {
          let respuesta = datosMapaPorAnio.current.get(`proyeccion-${anioMapa}`);
          if (!respuesta) {
            respuesta = await getProyeccionZonas(anioMapa, "densidad_poblacional", onLogout);
            datosMapaPorAnio.current.set(`proyeccion-${anioMapa}`, respuesta);
          }
          if (cancelado) return;
          setDatosRealesMapa(null);
          setDepartamentosRealesMapa(null);
          setDatosProyectadosMapa(respuesta.zonas ?? []);
          setFiabilidadMapa(respuesta.intervalo_confianza ?? respuesta.fiabilidad ?? null);
        }
      } catch (error) {
        if (!cancelado) {
          console.error("Error cargando el año del mapa:", error);
          setErrorProyeccion(mensajeErrorProyeccion(error));
        }
      } finally {
        if (!cancelado) setCargandoAnioMapa(false);
      }
    }, 200);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [anioMapa, onLogout, selectorAnioActivo]);


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
            departamentos={selectorAnioActivo && anioMapa < 2025 ? departamentosRealesMapa : departamentos}
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
            {(cargandoProyeccion || cargandoAnioMapa) && (
              <PantallaCarga
                transparente={true}
                mensaje={
                  cargandoProyeccion
                    ? "Generando proyección..."
                    : "Cargando año seleccionado..."
                }
              />
            )}

            <MapView
            onZonaSeleccionada={seleccionarZona}
            departamentos={selectorAnioActivo && anioMapa < 2025 ? departamentosRealesMapa : departamentos}
            datosMunicipios={selectorAnioActivo && anioMapa < 2025 ? datosRealesMapa : datosMunicipios}
            datosProyectados={selectorAnioActivo && anioMapa >= 2025 ? datosProyectadosMapa : datosProyectados}
            claveDatosMapa={selectorAnioActivo ? `anio-${anioMapa}` : "base"}
            codigoSeleccionado={zonaSeleccionada?.codigo ?? null}
            anioSeleccionado={anioMapa}
            selectorAnioActivo={selectorAnioActivo}
            cargandoAnio={cargandoAnioMapa}
            fiabilidadProyeccion={fiabilidadMapa}
            anioMinimoSelector={rangoProyeccion?.anioMinimo}
            anioMaximoSelector={rangoProyeccion?.anioMaximo}
            onAnioSeleccionado={setAnioMapa}
            onSelectorAnioActivo={setSelectorAnioActivo}
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
