import { Icono } from "./iconos.jsx";
import { formatearValor, plural } from "./catalogo.js";
import GraficaLineas from "./GraficaLineas.jsx";

function valorDeZona(zona, variable) {
  if (variable.id === "score_privacion") return zona.score_privacion;
  return zona.indicadores?.[variable.id]?.valor;
}

function BloqueZona({ zona, variables, comentario, onComentario, nivel }) {
  return (
    <div className="rp-bloque-zona">
      <h4>
        {zona.nombre}
        <span className="rp-bloque-codigo">{nivel} · {zona.codigo}</span>
      </h4>
      {variables.map((variable) => {
        const valor = valorDeZona(zona, variable);
        return (
          <div key={variable.id} className="rp-fila-indicador">
            <span>{variable.nombre}</span>
            <strong className={valor == null ? "is-vacio" : ""}>
              {formatearValor(valor)}
              {valor != null && variable.unidad ? ` ${variable.unidad}` : ""}
            </strong>
          </div>
        );
      })}
      <label className="rp-campo rp-comentario">
        <span className="rp-campo-etiqueta">Comentario para el reporte</span>
        <textarea
          rows={2}
          maxLength={2000}
          placeholder={`Escribe una observación sobre ${zona.nombre}…`}
          value={comentario}
          onChange={(evento) => onComentario(zona.codigo, evento.target.value)}
        />
      </label>
    </div>
  );
}

// Hoja del documento tal como se leera, con los valores del mapa y un cuadro de
// comentario por zona (los comentarios viajan en el reporte).
function SeccionGraficas({ previa }) {
  if (previa.estado === "inactiva") {
    return <p className="rp-hoja-vacio">Elige al menos una zona y una variable para ver las gráficas.</p>;
  }
  if (previa.estado === "error") {
    return <p className="rp-aviso rp-aviso--error" role="alert">{previa.mensaje}</p>;
  }
  if (!previa.datos) {
    return (
      <p className="rp-aviso rp-aviso--proceso" role="status">
        <span className="rp-giro" aria-hidden="true" />
        Cargando gráficas…
      </p>
    );
  }
  return (
    <div className={`rp-graficas${previa.estado === "cargando" ? " is-actualizando" : ""}`} aria-busy={previa.estado === "cargando"}>
      {previa.datos.graficas.map((grafica) => (
        <GraficaLineas
          key={grafica.variable}
          titulo={grafica.nombre}
          unidad={grafica.unidad}
          anios={previa.datos.anios}
          series={grafica.series}
          totalSeries={grafica.total_series}
        />
      ))}
    </div>
  );
}

export function VistaPreviaDocumento({ config, comentarios, onComentario, previaGraficas }) {
  const { titulo, introduccion, conclusiones, anioInicio, anioFin, incluirGraficas, variables, departamentos, municipios } = config;
  return (
    <article className="rp-hoja" aria-label="Vista previa del documento">
      <h1 className="rp-hoja-titulo">{titulo || "Informe de Indicadores"}</h1>
      <p className="rp-hoja-meta">
        Fecha: {new Date().toLocaleDateString("es-CO")} · Periodo {anioInicio} – {anioFin}
      </p>

      <h2>Introducción</h2>
      <div className="rp-hoja-texto">{introduccion || <em>Sin introducción.</em>}</div>

      <h2>Resumen ejecutivo</h2>
      <p>
        Periodo analizado: {anioInicio} – {anioFin}. Incluye gráficas: {incluirGraficas ? "sí" : "no"}.
        Variables: {variables.length > 0 ? variables.map((v) => v.nombre).join(", ") : "ninguna seleccionada"}.
      </p>

      <h2>Resultados</h2>
      <h3>Departamentos</h3>
      {departamentos.length === 0 ? (
        <p className="rp-hoja-vacio">No hay departamentos seleccionados.</p>
      ) : (
        departamentos.map((zona) => (
          <BloqueZona key={zona.codigo} zona={zona} nivel="Departamento" variables={variables} comentario={comentarios[zona.codigo] || ""} onComentario={onComentario} />
        ))
      )}

      <h3>Municipios</h3>
      {municipios.length === 0 ? (
        <p className="rp-hoja-vacio">No hay municipios seleccionados.</p>
      ) : (
        municipios.map((zona) => (
          <BloqueZona key={zona.codigo} zona={zona} nivel="Municipio" variables={variables} comentario={comentarios[zona.codigo] || ""} onComentario={onComentario} />
        ))
      )}

      {incluirGraficas && (
        <>
          <h2>Gráficas</h2>
          <SeccionGraficas previa={previaGraficas} />
        </>
      )}

      <h2>Conclusiones</h2>
      <div className="rp-hoja-texto">{conclusiones || <em>Sin conclusiones.</em>}</div>
    </article>
  );
}

function Tarjeta({ icono, titulo, valor, detalle }) {
  return (
    <div className="rp-resumen-tarjeta">
      <span className="rp-dato-icono"><Icono nombre={icono} /></span>
      <span className="rp-resumen-tarjeta-texto">
        <span className="rp-dato-etiqueta">{titulo}</span>
        <strong>{valor}</strong>
        {detalle && <span className="rp-dato-detalle">{detalle}</span>}
      </span>
    </div>
  );
}

function ListaZonasResumen({ titulo, zonas }) {
  return (
    <section className="rp-resumen-bloque">
      <h3>{titulo} <span className="rp-insignia">{zonas.length}</span></h3>
      {zonas.length === 0 ? (
        <p className="rp-hoja-vacio">No hay zonas seleccionadas.</p>
      ) : (
        <ul className="rp-resumen-zonas">
          {zonas.map((zona) => (
            <li key={zona.codigo}>
              <strong>{zona.nombre}</strong>
              <span>{zona.codigo}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Resumen compacto de lo que contendra el documento y de lo que falta.
export function ResumenDocumento({ config, comentarios, pasos }) {
  const { anioInicio, anioFin, incluirGraficas, variables, departamentos, municipios, formato, titulo, introduccion, conclusiones } = config;
  const anios = Math.max(0, anioFin - anioInicio + 1);
  const comentados = Object.values(comentarios).filter((texto) => texto && texto.trim()).length;
  const secciones = [
    { etiqueta: "Portada con título y periodo", ok: Boolean(titulo.trim()) },
    { etiqueta: "Introducción", ok: Boolean(introduccion.trim()) },
    { etiqueta: "Resultados por zona", ok: departamentos.length + municipios.length > 0 },
    { etiqueta: "Gráficas por variable", ok: incluirGraficas },
    { etiqueta: "Conclusiones", ok: Boolean(conclusiones.trim()) },
  ];

  return (
    <div className="rp-resumen" aria-label="Resumen del documento">
      <div className="rp-resumen-tarjetas">
        <Tarjeta icono="calendario" titulo="Periodo" valor={`${anioInicio} – ${anioFin}`} detalle={`${anios} ${anios === 1 ? "año" : "años"}`} />
        <Tarjeta icono="mapa" titulo="Zonas" valor={departamentos.length + municipios.length} detalle={`${departamentos.length} ${plural(departamentos.length, "dpto.", "dptos.")} · ${municipios.length} ${plural(municipios.length, "municipio", "municipios")}`} />
        <Tarjeta icono="indicador" titulo="Variables" valor={variables.length} detalle={incluirGraficas ? "con gráficas" : "sin gráficas"} />
        <Tarjeta icono={formato === "excel" ? "tabla" : "doc"} titulo="Formato" valor={formato === "excel" ? "Excel" : "PDF"} detalle={`${comentados} comentario${comentados === 1 ? "" : "s"}`} />
      </div>

      <div className="rp-resumen-dos">
        <section className="rp-resumen-bloque">
          <h3>Estructura del documento</h3>
          <ul className="rp-estructura">
            {secciones.map((seccion) => (
              <li key={seccion.etiqueta} className={seccion.ok ? "is-ok" : ""}>
                <span className="rp-paso-marca">{seccion.ok ? <Icono nombre="check" tamano={12} /> : null}</span>
                {seccion.etiqueta}
                {!seccion.ok && <em>opcional o vacío</em>}
              </li>
            ))}
          </ul>
        </section>

        <section className="rp-resumen-bloque">
          <h3>Antes de generar</h3>
          <ul className="rp-estructura">
            {pasos.map((paso) => (
              <li key={paso.id} className={paso.ok ? "is-ok" : "is-falta"}>
                <span className="rp-paso-marca">{paso.ok ? <Icono nombre="check" tamano={12} /> : null}</span>
                {paso.etiqueta}
                {!paso.ok && <em>{paso.ayuda}</em>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rp-resumen-bloque">
        <h3>Variables <span className="rp-insignia">{variables.length}</span></h3>
        {variables.length === 0 ? (
          <p className="rp-hoja-vacio">No hay variables seleccionadas.</p>
        ) : (
          <ul className="rp-chips">
            {variables.map((variable) => (
              <li key={variable.id} className="rp-chip rp-chip--fijo">{variable.nombre}{variable.unidad ? ` (${variable.unidad})` : ""}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="rp-resumen-dos">
        <ListaZonasResumen titulo="Departamentos incluidos" zonas={departamentos} />
        <ListaZonasResumen titulo="Municipios incluidos" zonas={municipios} />
      </div>
    </div>
  );
}
