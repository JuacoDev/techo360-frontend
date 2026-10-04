import { useMemo, useState, useEffect } from "react";

// departamentos y datosMunicipios ya fueron descargados una vez por App
// (misma respuesta que ya usa MapView) -- este componente NO vuelve a
// pedirlos ni hace ningun fetch al seleccionar una zona: solo filtra
// dentro de los datos que ya llegaron por props.
function BarraBuscadora({
  onSeleccionarZona,
  departamentos,
  datosMunicipios,
  zonaActiva,
  onBuscadorReady,
}) {
  const [codigoDepartamento, setCodigoDepartamento] = useState("");
  const [codigoMunicipio, setCodigoMunicipio] = useState("");

  useEffect(() => {
    if (departamentos && datosMunicipios) {
      onBuscadorReady?.();
    }
  }, [departamentos, datosMunicipios, onBuscadorReady]);

  useEffect(() => {
    if (!zonaActiva?.codigo) {
      setCodigoDepartamento("");
      setCodigoMunicipio("");
      return;
    }

    const codigo = String(zonaActiva.codigo);
    if (codigo.length > 2) {
      setCodigoDepartamento(codigo.substring(0, 2));
      setCodigoMunicipio(codigo);
    } else {
      setCodigoDepartamento(codigo);
      setCodigoMunicipio("");
    }
  }, [zonaActiva]);

  const listaDepartamentos = useMemo(
    () => (departamentos?.features ?? [])
      .map((feature) => feature.properties)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [departamentos]
  );
  const municipiosDelDepartamento = useMemo(() => {
  const municipios = (datosMunicipios?.features ?? [])
    .map((feature) => feature.properties);

  if (!codigoDepartamento) {
    return municipios.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );
  }

  return municipios
    .filter((municipio) =>
      String(municipio.codigo).startsWith(
        String(codigoDepartamento)
      )
    )
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );
}, [datosMunicipios, codigoDepartamento]);

  function manejarSeleccionDepartamento(evento) {
    const codigo = evento.target.value;
    setCodigoDepartamento(codigo);
    setCodigoMunicipio("");

    const departamento = listaDepartamentos.find(
      (zona) => String(zona.codigo) === codigo
    );
    if (departamento) {
      onSeleccionarZona({ ...departamento, nivel: "departamento" });
    }
  }

  function manejarSeleccionMunicipio(evento) {
    const municipio = municipiosDelDepartamento.find(
      (zona) => String(zona.codigo) === evento.target.value
    );
    setCodigoMunicipio(evento.target.value);
    if (municipio) {
      onSeleccionarZona({ ...municipio, nivel: "municipio" });
    }
  }

  return (
    <div className="BarraBuscadora">
      <h3>Seleccionar zona</h3>
      <div className="BarraSelectores">
        <select
          className="BarraSelect"
          value={codigoDepartamento}
          onChange={manejarSeleccionDepartamento}
          disabled={!departamentos}
        >
          <option value="" disabled>Seleccione un departamento...</option>
          {listaDepartamentos.map((departamento) => (
            <option key={departamento.codigo} value={departamento.codigo}>
              {departamento.nombre}
            </option>
          ))}
        </select>

        <select
          className="BarraSelect"
          value={codigoMunicipio}
          onChange={manejarSeleccionMunicipio}
          disabled={!datosMunicipios}
        >
          <option value="" disabled>Seleccione un municipio...</option>
          {municipiosDelDepartamento.map((municipio) => (
            <option key={municipio.codigo} value={municipio.codigo}>
              {municipio.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default BarraBuscadora;
