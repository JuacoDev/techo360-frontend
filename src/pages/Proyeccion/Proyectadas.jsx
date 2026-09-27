import { useState } from "react";

import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import BarraBuscadora from "../../components/BarraBuscadora";
import MapView from "../../components/MapView";
import PanelIndicadores from "../../components/PanelIndicadores";
import { getProyeccionZonas } from "../../services/api";

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
  const [proyeccionesPorAnio, setProyeccionesPorAnio] = useState({});
  const [datosProyectados, setDatosProyectados] = useState(null);
  


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
        await getProyeccionZonas(anio);

      resultados[anio] = resultado.zonas;
    }
    console.log(
      "PROYECCIONES POR ANIO",
      resultados
      );
    setProyeccionesPorAnio(resultados);

    setDatosProyectados(
      resultados[anioInicio]
    );

  } catch (error) {
    console.error(error);
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
              onChange={(e) =>
                setAnioInicio(Number(e.target.value))
              }
            >
              {Array.from(
                { length: 24 },
                (_, i) => 2027 + i
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
                { length: 24 },
                (_, i) => 2027 + i
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
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
            datosProyectados={datosProyectados}
            codigoSeleccionado={zonaSeleccionada?.codigo ?? null}
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