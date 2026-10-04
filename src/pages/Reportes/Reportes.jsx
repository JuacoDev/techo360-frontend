import { useState } from "react";
import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import "../../Css/StyleReportes.css";

const VARIABLES = [
  {
    id: "score_privacion",
    nombre: "Score de Privación"
  },
  {
    id: "cobertura_acueducto",
    nombre: "Cobertura de Acueducto"
  },
  {
    id: "cobertura_alcantarillado",
    nombre: "Cobertura de Alcantarillado"
  },
  {
    id: "deficit_habitacional_cuantitativo",
    nombre: "Déficit Habitacional Cuantitativo"
  },
  {
    id: "deficit_habitacional_cualitativo",
    nombre: "Déficit Habitacional Cualitativo"
  },
  {
    id: "densidad_poblacional",
    nombre: "Densidad Poblacional"
  }
];

function Reportes({
  setScreen,
  onLogout,
  departamentos,
  datosMunicipios
}) {

  const [modoVista, setModoVista] = useState("comparativo");
  const [incluirGraficas, setIncluirGraficas] = useState(true);

  const [anioInicio, setAnioInicio] = useState(2020);
  const [anioFin, setAnioFin] = useState(2025);


  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState([]);
  const [municipiosSeleccionados, setMunicipiosSeleccionados] = useState([]);
  const [busquedaDepartamento, setBusquedaDepartamento] = useState("");
  const [busquedaMunicipio, setBusquedaMunicipio] = useState("");

  const [variablesSeleccionadas, setVariablesSeleccionadas] = useState([]);

    const listaDepartamentos =
  (departamentos?.features ?? []).map(
    (feature) => feature.properties
  );

const listaMunicipios =
  (datosMunicipios?.features ?? []).map(
    (feature) => feature.properties
  );

  const departamentosFiltrados = listaDepartamentos.filter(
  (item) =>
    item.nombre
      ?.toLowerCase()
      .includes(busquedaDepartamento.toLowerCase())
);

const municipiosFiltrados = listaMunicipios.filter(
  (item) =>
    item.nombre
      ?.toLowerCase()
      .includes(busquedaMunicipio.toLowerCase())
);

  return (
    <>
      <CabezaDeNavegacion
        setScreen={setScreen}
        onLogout={onLogout}
      />

      <div className="perfil-container">

        <div className="perfil-card">

          <div className="perfil-left">

            <h3>Configuración</h3>
            <p>
            Selecciona los datos que deseas incluir en el reporte.
            </p>

            

            <hr />

            <label>
              <input
                type="radio"
                checked={modoVista === "comparativo"}
                onChange={() => setModoVista("comparativo")}
              />
              Comparativo
            </label>

            <label>
              <input
                type="radio"
                checked={modoVista === "lista"}
                onChange={() => setModoVista("lista")}
              />
              Lista
            </label>

            <hr />

            <label>
              <input
                type="checkbox"
                checked={incluirGraficas}
                onChange={(e) =>
                  setIncluirGraficas(e.target.checked)
                }
              />
              Incluir gráficas
            </label>

            <hr />

            <h4>Periodo</h4>

            <label>Año inicio</label>

            <input
              type="number"
              value={anioInicio}
              onChange={(e) =>
                setAnioInicio(Number(e.target.value))
              }
            />

            <label>Año fin</label>

            <input
              type="number"
              value={anioFin}
              onChange={(e) =>
                setAnioFin(Number(e.target.value))
              }
            />

            <hr />

            <h4>Variables</h4>
            <p>
            Selecciona una o varias variables para incluir en el informe.
            </p>

            {VARIABLES.map((variable) => (
            <label
                key={variable.id}
                className="opcion-zona"
            >
                <input
                type="checkbox"
                checked={variablesSeleccionadas.includes(variable)}
                onChange={() => {
                    setVariablesSeleccionadas((actuales) =>
                    actuales.includes(variable)
                        ? actuales.filter((v) => v !== variable)
                        : [...actuales, variable]
                    );
                }}
                />
                {variable.nombre}
            </label>
            ))}
            <hr />

            <h4>Departamentos</h4>

<p>
  Escoge los departamentos que aparecerán en el reporte.
</p>
<input
className="buscador-reportes"
  type="text"
  placeholder="Buscar departamento..."
  value={busquedaDepartamento}
  onChange={(e) =>
    setBusquedaDepartamento(e.target.value)
  }
/>
<p>
  Seleccionados: {departamentosSeleccionados.length}
</p>

<div
  className="lista-zonas"
>
  {departamentosFiltrados.map((item) => (
    <label
      key={item.codigo}
      className="opcion-zona"
    >
      <input
        type="checkbox"
        checked={departamentosSeleccionados.some(
          (x) => x.codigo === item.codigo
        )}
        onChange={() => {
          const existe =
            departamentosSeleccionados.some(
              (x) => x.codigo === item.codigo
            );

          if (existe) {
            setDepartamentosSeleccionados(
              departamentosSeleccionados.filter(
                (x) => x.codigo !== item.codigo
              )
            );
          } else {
            setDepartamentosSeleccionados([
              ...departamentosSeleccionados,
              item
            ]);
          }
        }}
      />

      {item.nombre}
    </label>
  ))}
</div>

    <hr />

    <h4>Municipios</h4>

    <p>
    Escoge los municipios que aparecerán en el reporte.
    </p>
<input
className="buscador-reportes"
  type="text"
  placeholder="Buscar municipio..."
  value={busquedaMunicipio}
  onChange={(e) =>
    setBusquedaMunicipio(e.target.value)
  }
/>

    <p>
    Seleccionados: {municipiosSeleccionados.length}
    </p>

    <div
    className="lista-zonas"
    >
    {municipiosFiltrados.map((item) => (
        <label
        key={item.codigo}
        className="opcion-zona"
        >
        <input
            type="checkbox"
            checked={municipiosSeleccionados.some(
            (x) => x.codigo === item.codigo
            )}
            onChange={() => {
            const existe =
                municipiosSeleccionados.some(
                (x) => x.codigo === item.codigo
                );

            if (existe) {
                setMunicipiosSeleccionados(
                municipiosSeleccionados.filter(
                    (x) => x.codigo !== item.codigo
                )
                );
            } else {
                setMunicipiosSeleccionados([
                ...municipiosSeleccionados,
                item
                ]);
            }
            }}
        />

        {item.nombre}
        </label>
    ))}
    </div>
            
              <br />
            <button
            className="btn-generar-proyeccion"
            disabled={
            (
                departamentosSeleccionados.length +
                municipiosSeleccionados.length
            ) === 0 ||
            variablesSeleccionadas.length === 0
            }
            >
            Generar reporte
            </button>

            <p>
            Debes seleccionar al menos una zona y una variable.
            </p>

          </div>

          <div className="perfil-right">

            <h3>Vista previa</h3>
            <p>
            Esta es una simulación del reporte que se generará.
            </p>

            <p>
            Tipo: Municipios y Departamentos
            </p>

            <p>
            Vista: {
                modoVista === "comparativo"
                ? "Comparativo"
                : "Lista"
            }
            </p>

            <p>
              Gráficas:
              {" "}
              {incluirGraficas ? "Sí" : "No"}
            </p>

            <p>
              Periodo:
              {" "}
              {anioInicio} - {anioFin}
              
            </p>

            <p>
            Años analizados: {Math.max(0, anioFin - anioInicio + 1)}
            </p>

            <p>
              Variables seleccionadas:
              {" "}
              {variablesSeleccionadas.length}
            </p>

            <p>
              Departamentos seleccionados:
              {" "}
              {departamentosSeleccionados.length}
            </p>

            <p>
              Municipios seleccionados:
              {" "}
              {municipiosSeleccionados.length}
            </p>
            <p>
            Total zonas seleccionadas: {
            departamentosSeleccionados.length +
            municipiosSeleccionados.length
            }
            </p>

            <hr />

            <h4>Reporte de indicadores</h4>

            <p>
              El reporte incluirá las zonas, variables y rango de años seleccionados.
            </p>

            <p>
            Modo de visualización: {
                modoVista === "comparativo"
                    ? "Comparativo (comparar varias zonas)"
                    : "Lista (mostrar información individual)"
                }
            </p>

            <p>
            Tipo de zona: Municipios y Departamentos
            </p>


            <h4>Variables incluidas</h4>
            <p>
            {variablesSeleccionadas.length} variables seleccionadas
            </p>
            
            <ul>
            {variablesSeleccionadas.map((variable) => (
            <li key={variable.id}>
                {variable.nombre}
            </li>
            ))}
            </ul>

            <hr />

            <h4>Departamentos incluidos</h4>

            {departamentosSeleccionados.length === 0 ? (
            <p>No hay departamentos seleccionados.</p>
            ) : (
            <ul>
                {departamentosSeleccionados.map((item) => (
                <li key={item.codigo}>
                    {item.nombre}
                </li>
                ))}
            </ul>
            )}

                <hr />

                <h4>Municipios incluidos</h4>

                {municipiosSeleccionados.length === 0 ? (
                <p>No hay municipios seleccionados.</p>
                ) : (
                <ul>
                    {municipiosSeleccionados.slice(0, 10).map((item) => (
                    <li key={item.codigo}>
                        {item.nombre}
                    </li>
                    ))}
                </ul>
                )}

          </div>

        </div>

      </div>
    </>
  );
}

export default Reportes;