import { useState } from "react";

function BarraBuscadora() {
  const departamentos = ["Antioquia", "Bogotá", "Nariño", "Santander", "Cundinamarca"];
  const municipios = ["Medellín", "Cali", "Barranquilla", "Bucaramanga", "Pasto"];

  const [busqueda, setBusqueda] = useState("");
  const [mostrarDeptos, setMostrarDeptos] = useState(true);
  const [mostrarMunicipios, setMostrarMunicipios] = useState(true);

  const resultadosDeptos = departamentos.filter(dep =>
    dep.toLowerCase().includes(busqueda.toLowerCase())
  );
  const resultadosMunicipios = municipios.filter(mun =>
    mun.toLowerCase().includes(busqueda.toLowerCase())
  );

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
            <h4 
              onClick={() => setMostrarDeptos(!mostrarDeptos)} 
              style={{cursor: "pointer"}}
            >
              Departamentos {mostrarDeptos ? "▼" : "▶"}
            </h4>
            {mostrarDeptos && (
              <ul className="BarraSugerencias">
                {resultadosDeptos.map((dep, index) => (
                  <li 
                    key={index} 
                    onClick={() => setBusqueda(dep)} 
                  >
                    {dep}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 
              onClick={() => setMostrarMunicipios(!mostrarMunicipios)} 
              style={{cursor: "pointer"}}
            >
              Municipios {mostrarMunicipios ? "▼" : "▶"}
            </h4>
            {mostrarMunicipios && (
              <ul className="BarraSugerencias">
                {resultadosMunicipios.map((mun, index) => (
                  <li 
                    key={index} 
                    onClick={() => setBusqueda(mun)} 
                  >
                    {mun}
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
