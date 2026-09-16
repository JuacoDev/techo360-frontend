import { useMemo, useState, useEffect } from "react"; 

// departamentos y datosMunicipios ya fueron descargados una vez por App
// (misma respuesta que ya usa MapView) -- este componente NO vuelve a
// pedirlos ni hace ningun fetch al seleccionar un resultado: solo busca
// dentro de los datos que ya llegaron por props.
function BarraBuscadora({ onSeleccionarZona, departamentos, datosMunicipios, onBuscadorReady }) {
  const [busqueda, setBusqueda] = useState("");
  const [mostrarDeptos, setMostrarDeptos] = useState(true);
  const [mostrarMunicipios, setMostrarMunicipios] = useState(true);

  useEffect(() => {
    if (departamentos && datosMunicipios) {
      onBuscadorReady?.();
    }
  }, [departamentos, datosMunicipios, onBuscadorReady]);

  const listaDepartamentos = useMemo(
    () => departamentos?.features.map((f) => f.properties) ?? [],
    [departamentos]
  );
  const listaMunicipios = useMemo(
    () => datosMunicipios?.features.map((f) => f.properties) ?? [],
    [datosMunicipios]
  );

  const resultadosDeptos = listaDepartamentos.filter((dep) =>
    dep.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const resultadosMunicipios = listaMunicipios.filter((mun) =>
    mun.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  function manejarClick(zona) {
    onSeleccionarZona(zona);
    setBusqueda(zona.nombre);
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
                  <li key={dep.codigo} onClick={() => manejarClick(dep)}>
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
                  <li key={mun.codigo} onClick={() => manejarClick(mun)}>
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
