import { useId, useMemo, useState } from "react";

import { Icono } from "./iconos.jsx";
import { VARIABLES } from "./catalogo.js";
import {
  estadoDeGrafica,
  MAX_GRAFICAS,
  MAX_ZONAS_COMPARAR,
  modoPorId,
  modosDelTipo,
  nuevoIdGrafica,
  reordenar,
  tipoPorId,
  TIPOS_GRAFICA,
  validarCombinacion,
  variablesDisponibles,
  variablesIniciales,
  zonasDelModo,
} from "./graficasCatalogo.js";

const CORTO = {
  score_privacion: "Score",
  cobertura_acueducto: "Acueducto",
  cobertura_alcantarillado: "Alcantarillado",
  deficit_habitacional_cuantitativo: "Déf. cuant.",
  deficit_habitacional_cualitativo: "Déf. cual.",
  densidad_poblacional: "Densidad",
};

const FORMULARIO_VACIO = { tipo: "", modo: "", variables: [], zonas: [], titulo: "" };

// ---------------------------------------------------------------- constructor
function ConstructorGrafica({ inicial, zonas, etiquetaZona, onGuardar, onCancelar }) {
  const idTitulo = useId();
  const [formulario, setFormulario] = useState(() => inicial ?? FORMULARIO_VACIO);
  const editando = Boolean(inicial);
  const tipo = tipoPorId(formulario.tipo);
  const modos = formulario.tipo ? modosDelTipo(formulario.tipo) : [];
  const codigosSeleccionados = useMemo(() => zonas.map((zona) => zona.codigo), [zonas]);

  function elegirTipo(id) {
    const compatibles = modosDelTipo(id);
    setFormulario((actual) => ({
      ...actual,
      tipo: id,
      modo: compatibles.some((modo) => modo.id === actual.modo) ? actual.modo : compatibles[0]?.id ?? "",
      variables: variablesIniciales(id),
      zonas: actual.zonas,
    }));
  }

  function elegirModo(id) {
    setFormulario((actual) => ({ ...actual, modo: id, zonas: id === "individual" ? actual.zonas.slice(0, 1) : id === "general" ? [] : actual.zonas }));
  }

  function alternarVariable(id) {
    setFormulario((actual) => ({
      ...actual,
      variables: actual.variables.includes(id) ? actual.variables.filter((v) => v !== id) : [...actual.variables, id],
    }));
  }

  function alternarZona(codigo) {
    setFormulario((actual) => {
      if (actual.modo === "individual") return { ...actual, zonas: [codigo] };
      const marcada = actual.zonas.includes(codigo);
      if (!marcada && actual.zonas.length >= MAX_ZONAS_COMPARAR) return actual;
      return { ...actual, zonas: marcada ? actual.zonas.filter((c) => c !== codigo) : [...actual.zonas, codigo] };
    });
  }

  const disponibles = formulario.tipo ? variablesDisponibles(formulario.tipo, formulario.variables) : [];
  const error =
    formulario.tipo && formulario.modo
      ? validarCombinacion(formulario.tipo, formulario.modo, formulario.variables, zonasDelModo(formulario, codigosSeleccionados))
      : "Elige un tipo de gráfica.";
  const pistaVariables = tipo
    ? tipo.minVariables === tipo.maxVariables
      ? `Elige ${tipo.minVariables} variable${tipo.minVariables === 1 ? "" : "s"}.`
      : `Elige de ${tipo.minVariables} a ${tipo.maxVariables} variables.`
    : "";

  return (
    <form
      className="rp-constructor"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!error) onGuardar({ id: formulario.id ?? nuevoIdGrafica(), tipo: formulario.tipo, modo: formulario.modo, variables: formulario.variables, zonas: formulario.modo === "general" ? [] : formulario.zonas, titulo: formulario.titulo.trim() });
      }}
    >
      <h3 className="rp-constructor-titulo">{editando ? "Editar gráfica" : "Nueva gráfica"}</h3>

      <fieldset className="rp-paso-form">
        <legend>1 · Tipo de gráfica</legend>
        <div className="rp-tipos" role="radiogroup" aria-label="Tipo de gráfica">
          {TIPOS_GRAFICA.map((opcion) => (
            <label key={opcion.id} className={`rp-tipo${formulario.tipo === opcion.id ? " is-activo" : ""}`}>
              <input type="radio" name="tipo-grafica" checked={formulario.tipo === opcion.id} onChange={() => elegirTipo(opcion.id)} />
              <Icono nombre={opcion.icono} tamano={20} />
              <span>{opcion.nombre}</span>
            </label>
          ))}
        </div>
        {tipo && <p className="rp-pista">{tipo.descripcion}</p>}
      </fieldset>

      {tipo && (
        <>
          <fieldset className="rp-paso-form">
            <legend>2 · Qué territorios</legend>
            <div className="rp-modos" role="radiogroup" aria-label="Modo de selección">
              {modos.map((modo) => (
                <label key={modo.id} className={`rp-modo${formulario.modo === modo.id ? " is-activo" : ""}`}>
                  <input type="radio" name="modo-grafica" checked={formulario.modo === modo.id} onChange={() => elegirModo(modo.id)} />
                  <strong>{modo.nombre}</strong>
                  <span>{modo.descripcion}</span>
                </label>
              ))}
            </div>
            {modos.length < 3 && <p className="rp-pista">Este tipo solo admite {modos.length === 1 ? "este modo" : "estos modos"}.</p>}
          </fieldset>

          <fieldset className="rp-paso-form">
            <legend>3 · Variables <span>{pistaVariables}</span></legend>
            <div className="rp-variables-grafica">
              {VARIABLES.map((variable) => {
                const marcada = formulario.variables.includes(variable.id);
                const permitida = marcada || disponibles.includes(variable.id);
                return (
                  <label key={variable.id} className={`rp-variable-grafica${marcada ? " is-marcada" : ""}${permitida ? "" : " is-bloqueada"}`}>
                    <input type="checkbox" checked={marcada} disabled={!permitida} onChange={() => alternarVariable(variable.id)} />
                    <span className="rp-opcion-marca"><Icono nombre="check" tamano={12} /></span>
                    <span>{variable.nombre}</span>
                    <small>{variable.unidad || "índice 0–1"}</small>
                  </label>
                );
              })}
            </div>
            {tipo.id === "donut" && <p className="rp-pista">El donut siempre usa los dos déficits.</p>}
          </fieldset>

          {formulario.modo && (
            <fieldset className="rp-paso-form">
              <legend>4 · Zonas</legend>
              {formulario.modo === "general" ? (
                <p className="rp-pista">Usa las {zonas.length} zonas seleccionadas en el reporte.</p>
              ) : zonas.length === 0 ? (
                <p className="rp-pista">Primero selecciona zonas en la sección «Zonas».</p>
              ) : (
                <div className="rp-zonas-grafica" role="group" aria-label="Zonas de la gráfica">
                  {zonas.map((zona) => {
                    const marcada = formulario.zonas.includes(zona.codigo);
                    return (
                      <label key={zona.codigo} className={`rp-zona-grafica${marcada ? " is-marcada" : ""}`}>
                        <input
                          type={formulario.modo === "individual" ? "radio" : "checkbox"}
                          name="zona-grafica"
                          checked={marcada}
                          disabled={!marcada && formulario.modo === "comparar" && formulario.zonas.length >= MAX_ZONAS_COMPARAR}
                          onChange={() => alternarZona(zona.codigo)}
                        />
                        <span className="rp-opcion-marca"><Icono nombre="check" tamano={12} /></span>
                        <span className="rp-opcion-texto">{etiquetaZona(zona)}</span>
                        <span className="rp-opcion-codigo">{zona.nivel === "departamento" ? "dpto." : "mun."}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {formulario.modo === "comparar" && <p className="rp-pista">{formulario.zonas.length} de {MAX_ZONAS_COMPARAR} como máximo.</p>}
            </fieldset>
          )}

          <label className="rp-campo" htmlFor={idTitulo}>
            <span className="rp-campo-etiqueta">Título (opcional)</span>
            <input id={idTitulo} type="text" maxLength={120} placeholder="Se genera uno automático si lo dejas vacío" value={formulario.titulo} onChange={(e) => setFormulario((actual) => ({ ...actual, titulo: e.target.value }))} />
          </label>
        </>
      )}

      {error && formulario.tipo && <p className="rp-error-campo" role="status">{error}</p>}
      <div className="rp-constructor-acciones">
        <button type="submit" className="rp-boton rp-boton--primario" disabled={Boolean(error)}>
          <Icono nombre={editando ? "check" : "mas"} />
          {editando ? "Guardar cambios" : "Añadir al reporte"}
        </button>
        <button type="button" className="rp-boton rp-boton--secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- lista ordenable
function ListaGraficas({ graficas, codigos, onCambiar, onEditar, onQuitar }) {
  const [arrastrando, setArrastrando] = useState(null);
  const [sobre, setSobre] = useState(null);

  function soltar(destino) {
    if (arrastrando !== null && arrastrando !== destino) onCambiar(reordenar(graficas, arrastrando, destino));
    setArrastrando(null);
    setSobre(null);
  }

  return (
    <ol className="rp-lista-graficas" aria-label="Gráficas del reporte, en el orden en que aparecerán">
      {graficas.map((grafica, indice) => {
        const tipo = tipoPorId(grafica.tipo);
        const estado = estadoDeGrafica(grafica, codigos);
        const resumen = [modoPorId(grafica.modo)?.nombre, grafica.variables.map((v) => CORTO[v]).join(" · "), grafica.modo !== "general" ? `${grafica.zonas.length} zona${grafica.zonas.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
        return (
          <li
            key={grafica.id}
            className={`rp-item-grafica${arrastrando === indice ? " is-arrastrando" : ""}${sobre === indice && arrastrando !== indice ? " is-destino" : ""}${estado.ok ? "" : " is-incompleta"}`}
            draggable
            onDragStart={(evento) => {
              setArrastrando(indice);
              evento.dataTransfer.effectAllowed = "move";
              evento.dataTransfer.setData("text/plain", grafica.id);
            }}
            onDragOver={(evento) => {
              evento.preventDefault();
              evento.dataTransfer.dropEffect = "move";
              if (sobre !== indice) setSobre(indice);
            }}
            onDrop={(evento) => {
              evento.preventDefault();
              soltar(indice);
            }}
            onDragEnd={() => {
              setArrastrando(null);
              setSobre(null);
            }}
          >
            <span className="rp-agarre" aria-hidden="true" title="Arrastra para cambiar el orden"><Icono nombre="arrastrar" tamano={16} /></span>
            <span className="rp-numero-grafica">{indice + 1}</span>
            <span className="rp-item-icono"><Icono nombre={tipo?.icono ?? "grafica"} tamano={18} /></span>
            <span className="rp-item-texto">
              <strong>{grafica.titulo || tipo?.nombre}</strong>
              <small>{tipo?.nombre} · {resumen}</small>
              {!estado.ok && <em>{estado.mensaje}</em>}
            </span>
            <span className="rp-item-acciones">
              <button type="button" onClick={() => onCambiar(reordenar(graficas, indice, indice - 1))} disabled={indice === 0} aria-label={`Subir la gráfica ${indice + 1}`} title="Subir"><Icono nombre="arriba" tamano={15} /></button>
              <button type="button" onClick={() => onCambiar(reordenar(graficas, indice, indice + 1))} disabled={indice === graficas.length - 1} aria-label={`Bajar la gráfica ${indice + 1}`} title="Bajar"><Icono nombre="abajo" tamano={15} /></button>
              <button type="button" onClick={() => onEditar(grafica)} aria-label={`Editar la gráfica ${indice + 1}`} title="Editar"><Icono nombre="editar" tamano={15} /></button>
              <button type="button" onClick={() => onQuitar(grafica)} aria-label={`Quitar la gráfica ${indice + 1}`} title="Quitar"><Icono nombre="papelera" tamano={15} /></button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- sección
function SeccionGraficas({ graficas, onGraficas, zonas, etiquetaZona }) {
  const [constructor, setConstructor] = useState(null); // null | { inicial?: grafica }
  const codigos = useMemo(() => zonas.map((zona) => zona.codigo), [zonas]);

  function guardar(grafica) {
    const existe = graficas.some((g) => g.id === grafica.id);
    onGraficas(existe ? graficas.map((g) => (g.id === grafica.id ? grafica : g)) : [...graficas, grafica]);
    setConstructor(null);
  }

  return (
    <div className="rp-seccion-graficas">
      {graficas.length === 0 && !constructor && (
        <p className="rp-pista rp-vacio-graficas">Todavía no hay gráficas. Elige entre 16 tipos: mapa coroplético, barras, radar, dispersión y más.</p>
      )}

      <ListaGraficas
        graficas={graficas}
        codigos={codigos}
        onCambiar={onGraficas}
        onEditar={(grafica) => setConstructor({ inicial: grafica })}
        onQuitar={(grafica) => onGraficas(graficas.filter((g) => g.id !== grafica.id))}
      />

      {graficas.length > 1 && !constructor && <p className="rp-pista">Arrastra o usa las flechas para cambiar el orden: así saldrán en el documento.</p>}

      {constructor ? (
        <ConstructorGrafica
          key={constructor.inicial?.id ?? "nueva"}
          inicial={constructor.inicial}
          zonas={zonas}
          etiquetaZona={etiquetaZona}
          onGuardar={guardar}
          onCancelar={() => setConstructor(null)}
        />
      ) : (
        <button
          type="button"
          className="rp-boton rp-boton--secundario rp-boton--ancho"
          onClick={() => setConstructor({})}
          disabled={graficas.length >= MAX_GRAFICAS}
        >
          <Icono nombre="mas" />
          Añadir gráfica
        </button>
      )}
      {graficas.length >= MAX_GRAFICAS && <p className="rp-pista">Máximo {MAX_GRAFICAS} gráficas por reporte.</p>}
    </div>
  );
}

export default SeccionGraficas;
