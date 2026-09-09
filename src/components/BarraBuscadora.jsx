import { useState, useEffect } from "react";
import { getDepartamentos, getMunicipios, getZonaInfo, ANIO_INDICADORES } from "../services/api";

function BarraBuscadora({ onSeleccionarZona }) {
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarDeptos, setMostrarDeptos] = useState(true);
  const [mostrarMunicipios, setMostrarMunicipios] = useState(true);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const deptos = await getDepartamentos();
        const munis = await getMunicipios();
        setDepartamentos(deptos);
        setMunicipios(munis);
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    }
    cargarDatos();
  }, []);

  const resultadosDeptos = departamentos.filter(dep =>
    dep.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const resultadosMunicipios = municipios.filter(mun =>
    mun.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function manejarClick(codigo, nivel, nombre) {
    try {
      const zona = await getZonaInfo(codigo, nivel, ANIO_INDICADORES);
      if (zona) {
        onSeleccionarZona(zona);
        setBusqueda(nombre);
      }
    } catch (error) {
      console.error("Error obteniendo datos de la zona:", error);
    }
  }

  return (
    <div className="BarraBuscadora">
      <h3>Buscar departamento o municipio</h3>
      <input
        type="text"
        placeholder="Escribe aquí..."
        className="BarraInput"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {busqueda && (
        <>
          <div>
            <h4 onClick={() => setMostrarDeptos(!mostrarDeptos)} style={{cursor: "pointer"}}>
              Departamentos {mostrarDeptos ? "▼" : "▶"}
            </h4>
            {mostrarDeptos && (
              <ul className="BarraSugerencias">
                {resultadosDeptos.map((dep) => (
                  <li key={dep.codigo} onClick={() => manejarClick(dep.codigo, "departamento", dep.nombre)}>
                    {dep.nombre}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 onClick={() => setMostrarMunicipios(!mostrarMunicipios)} style={{cursor: "pointer"}}>
              Municipios {mostrarMunicipios ? "▼" : "▶"}
            </h4>
            {mostrarMunicipios && (
              <ul className="BarraSugerencias">
                {resultadosMunicipios.map((mun) => (
                  <li key={mun.codigo} onClick={() => manejarClick(mun.codigo, "municipio", mun.nombre)}>
                    {mun.nombre}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BarraBuscadora;
