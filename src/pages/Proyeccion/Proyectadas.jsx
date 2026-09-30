import { useEffect, useRef, useState } from "react";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import BarraBuscadora from "../../components/BarraBuscadora";
import MapView from "../../components/MapView";
import PanelIndicadores from "../../components/PanelIndicadores";
import {
  getProyeccionZonas,
  getZonasDepartamentos,
  getZonasMunicipios,
} from "../../services/api";

function Proyectadas({
  setScreen,
  onLogout,
  departamentos,
  datosMunicipios,
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
  const datosMapaPorAnio = useRef(new Map());


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
    console.log(
      "PROYECCIONES POR ANIO",
      resultados
      );
    setDatosProyectados(resultados[anioInicio]?.zonas ?? []);
    setAnioMapa(anioInicio);

  } catch (error) {
    console.error(error);
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
        if (!cancelado) console.error("Error cargando el año del mapa:", error);
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
              onChange={(e) =>
                setAnioInicio(Number(e.target.value))
              }
            >
              {Array.from(
                { length: 26 },
                (_, i) => 2025 + i
              ).map((anio) => (
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
              onChange={(e) =>
                setAnioFin(Number(e.target.value))
              }
            >
              {Array.from(
                { length: 26 },
                (_, i) => 2025 + i
              ).map((anio) => (
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
            >
              Generar proyección
            </button>

          </div>

          <div className="dashboard-map-container">
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