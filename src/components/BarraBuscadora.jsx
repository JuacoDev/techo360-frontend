import { useMemo, useState, useEffect } from "react";

// Misma regla de etiqueta que crearEtiquetaMunicipio en pages/Reportes/catalogo.js
// ("Nombre, Departamento"; Bogotá va sin departamento). Duplicada a propósito para
// no importar desde un módulo de página: si cambia una, cambiar también la otra.
function crearEtiquetaMunicipio(departamentos) {
  const nombres = new Map(departamentos.map((departamento) => [departamento.codigo, departamento.nombre]));
  return (municipio) => {
    const departamento = nombres.get(municipio.codigo_departamento);
    if (!departamento || municipio.codigo === "11001" || municipio.codigo_departamento === "11") return municipio.nombre;
    return `${municipio.nombre}, ${departamento}`;
  };
}

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
  accionDerecha,
  // Eventos del selector de capas (services/modoCapas.js). Solo se emiten desde
  // los onChange de usuario: los cambios programaticos de los selects (re-sincronizar
  // con zonaActiva, reiniciar el municipio a "") no pasan por aqui.
  onEventoCapas,
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
  const etiquetaMunicipio = useMemo(() => crearEtiquetaMunicipio(listaDepartamentos), [listaDepartamentos]);
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
      onEventoCapas?.({ tipo: "ELEGIR_DEPARTAMENTO", origen: "desplegable", codigo });
    }
  }

  function manejarSeleccionMunicipio(evento) {
    const municipio = municipiosDelDepartamento.find(
      (zona) => String(zona.codigo) === evento.target.value
    );
    setCodigoMunicipio(evento.target.value);
    if (municipio) {
      onSeleccionarZona({ ...municipio, nivel: "municipio" });
      onEventoCapas?.({ tipo: "ELEGIR_MUNICIPIO", origen: "desplegable", codigo: evento.target.value });
    }
  }

  function limpiarSeleccion() {
    setCodigoDepartamento("");
    setCodigoMunicipio("");
    onSeleccionarZona(null);
    onEventoCapas?.({ tipo: "LIMPIAR_SELECCION", origen: "desplegable" });
  }

  return (
    <div className={`BarraBuscadora${accionDerecha ? " BarraBuscadora--proyeccion" : ""}`}>
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

        {accionDerecha && (
          <span className="BarraSelectores-separador" aria-hidden="true" />
        )}

        <select
          className="BarraSelect"
          value={codigoMunicipio}
          onChange={manejarSeleccionMunicipio}
          disabled={!datosMunicipios}
        >
          <option value="" disabled>Seleccione un municipio...</option>
          {municipiosDelDepartamento.map((municipio) => (
            <option key={municipio.codigo} value={municipio.codigo}>
              {etiquetaMunicipio(municipio)}
            </option>
          ))}
        </select>

        {(codigoDepartamento || codigoMunicipio) && (
          <button type="button" className="barra-limpiar" onClick={limpiarSeleccion}>
            Limpiar
          </button>
        )}

        {accionDerecha && (
          <div className="BarraBuscadora-accion">
            {accionDerecha}
          </div>
        )}
      </div>
    </div>
  );
}

export default BarraBuscadora;
