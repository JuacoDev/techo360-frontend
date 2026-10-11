import { useDeferredValue, useId, useMemo, useState } from "react";

import { Icono } from "./iconos.jsx";
import { LIMITE_LISTA_ZONAS, normalizarTexto } from "./catalogo.js";

// `etiqueta(item)` da el texto de cada fila ("Bucaramanga, Santander"; Bogotá va sin departamento).
// Con `departamentosFiltro` (solo en municipios) aparece un selector para filtrar por departamento.
function ListaZonas({ etiqueta, items, seleccionados, onCambiar, textoDe, departamentosFiltro }) {
  const idBuscador = useId();
  const idFiltro = useId();
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("");
  // La lista de municipios tiene ~1.100 filas: el buscador responde al instante
  // y el filtrado pesado se aplaza (no bloquea el teclado).
  const busquedaDiferida = useDeferredValue(busqueda);

  const codigos = useMemo(() => new Set(seleccionados.map((zona) => zona.codigo)), [seleccionados]);
  const filtrados = useMemo(() => {
    const consulta = normalizarTexto(busquedaDiferida.trim());
    return items.filter((item) => {
      if (departamentosFiltro && departamento && item.codigo_departamento !== departamento) return false;
      return !consulta || normalizarTexto(textoDe(item)).includes(consulta);
    });
  }, [items, busquedaDiferida, departamento, departamentosFiltro, textoDe]);
  const visibles = filtrados.slice(0, LIMITE_LISTA_ZONAS);

  function alternar(item) {
    onCambiar(
      codigos.has(item.codigo)
        ? seleccionados.filter((zona) => zona.codigo !== item.codigo)
        : [...seleccionados, item]
    );
  }

  function seleccionarVisibles() {
    const nuevos = visibles.filter((item) => !codigos.has(item.codigo));
    if (nuevos.length > 0) onCambiar([...seleccionados, ...nuevos]);
  }

  return (
    <div className="rp-zonas">
      <label className="rp-buscador" htmlFor={idBuscador}>
        <Icono nombre="buscar" tamano={16} />
        <input
          id={idBuscador}
          type="search"
          placeholder={`Buscar ${etiqueta}…`}
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
      </label>

      {departamentosFiltro && (
        <label className="rp-filtro" htmlFor={idFiltro}>
          <span className="rp-campo-etiqueta">Filtrar por departamento</span>
          <select id={idFiltro} value={departamento} onChange={(evento) => setDepartamento(evento.target.value)}>
            <option value="">Todos los departamentos</option>
            {departamentosFiltro.map((opcion) => (
              <option key={opcion.codigo} value={opcion.codigo}>{opcion.nombre}</option>
            ))}
          </select>
        </label>
      )}

      <div className="rp-zonas-herramientas">
        <span>
          {filtrados.length.toLocaleString("es-CO")} {filtrados.length === 1 ? "resultado" : "resultados"}
        </span>
        <span className="rp-zonas-botones">
          <button type="button" onClick={seleccionarVisibles} disabled={visibles.length === 0}>
            Seleccionar visibles
          </button>
          <button type="button" onClick={() => onCambiar([])} disabled={seleccionados.length === 0}>
            Limpiar
          </button>
        </span>
      </div>

      {seleccionados.length > 0 && (
        <ul className="rp-chips" aria-label={`Seleccionados: ${etiqueta}`}>
          {seleccionados.map((zona) => (
            <li key={zona.codigo} className="rp-chip">
              {textoDe(zona)}
              <button type="button" onClick={() => alternar(zona)} aria-label={`Quitar ${textoDe(zona)}`}>
                <Icono nombre="x" tamano={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rp-lista" role="group" aria-label={`Lista de ${etiqueta}`}>
        {visibles.length === 0 ? (
          <p className="rp-vacio">Sin coincidencias.</p>
        ) : (
          visibles.map((item) => (
            <label key={item.codigo} className={`rp-opcion${codigos.has(item.codigo) ? " is-marcada" : ""}`}>
              <input type="checkbox" checked={codigos.has(item.codigo)} onChange={() => alternar(item)} />
              <span className="rp-opcion-marca"><Icono nombre="check" tamano={12} /></span>
              <span className="rp-opcion-texto">{textoDe(item)}</span>
              <span className="rp-opcion-codigo">{item.codigo}</span>
            </label>
          ))
        )}
        {filtrados.length > visibles.length && (
          <p className="rp-limite">
            Mostrando {visibles.length} de {filtrados.length.toLocaleString("es-CO")}. Escribe o filtra para afinar la búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}

// Departamentos y municipios en pestañas dentro de una misma seccion.
function SelectorZonas({
  departamentos,
  municipios,
  selDepartamentos,
  selMunicipios,
  onDepartamentos,
  onMunicipios,
  etiquetaMunicipio,
}) {
  const [nivel, setNivel] = useState("departamentos");
  const idDepartamentos = useId();
  const idMunicipios = useId();
  const nombreDepartamento = useMemo(() => (item) => item.nombre, []);
  // Solo los departamentos que tienen municipios en la lista, por orden alfabetico.
  const departamentosConMunicipios = useMemo(() => {
    const presentes = new Set(municipios.map((municipio) => municipio.codigo_departamento));
    return departamentos
      .filter((departamento) => presentes.has(departamento.codigo))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [departamentos, municipios]);

  return (
    <div>
      <div className="rp-subtabs" role="tablist" aria-label="Nivel de zona">
        {[
          { id: "departamentos", texto: "Departamentos", cantidad: selDepartamentos.length, idPanel: idDepartamentos },
          { id: "municipios", texto: "Municipios", cantidad: selMunicipios.length, idPanel: idMunicipios },
        ].map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            role="tab"
            aria-selected={nivel === pestana.id}
            aria-controls={pestana.idPanel}
            className={`rp-subtab${nivel === pestana.id ? " is-activa" : ""}`}
            onClick={() => setNivel(pestana.id)}
          >
            {pestana.texto}
            {pestana.cantidad > 0 && <span className="rp-insignia">{pestana.cantidad}</span>}
          </button>
        ))}
      </div>

      {/* Las dos listas siguen montadas (la inactiva, oculta) para que cada una conserve su búsqueda y su filtro. */}
      <div id={idDepartamentos} role="tabpanel" hidden={nivel !== "departamentos"}>
        <ListaZonas
          key="departamentos"
          etiqueta="departamentos"
          items={departamentos}
          seleccionados={selDepartamentos}
          onCambiar={onDepartamentos}
          textoDe={nombreDepartamento}
        />
      </div>
      <div id={idMunicipios} role="tabpanel" hidden={nivel !== "municipios"}>
        <ListaZonas
          key="municipios"
          etiqueta="municipios"
          items={municipios}
          seleccionados={selMunicipios}
          onCambiar={onMunicipios}
          textoDe={etiquetaMunicipio}
          departamentosFiltro={departamentosConMunicipios}
        />
      </div>
    </div>
  );
}

export default SelectorZonas;
