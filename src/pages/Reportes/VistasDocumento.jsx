import { Icono } from "./iconos.jsx";
import { formatearValor, letra, nombreDePlantilla, plural, romano } from "./catalogo.js";
import EscenaSVG from "./EscenaSVG.jsx";

function valorDeZona(zona, variable) {
  if (variable.id === "score_privacion") return zona.score_privacion;
  return zona.indicadores?.[variable.id]?.valor;
}

function BloqueZona({ zona, variables, comentario, onComentario, nivel, titulo, estilo, numero, indice, periodo }) {
  const nombre = titulo ?? zona.nombre;
  return (
    <div className="rp-bloque-zona">
      {estilo === "ieee" ? (
        <h4 className="rp-zona-ieee">{letra(indice)}. {nombre}</h4>
      ) : (
        <h4>
          {nombre}
          <span className="rp-bloque-codigo">{nivel} · {zona.codigo}</span>
        </h4>
      )}
      {estilo === "apa" && (
        <p className="rp-rotulo-apa">
          <strong>Tabla {numero}</strong>
          <br />
          <em>Indicadores de {nombre}, {periodo}</em>
        </p>
      )}
      {estilo === "ieee" && (
        <p className="rp-rotulo-ieee">
          TABLA {romano(numero)}
          <br />
          INDICADORES DE {nombre.toUpperCase()}, {periodo}
        </p>
      )}
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
          placeholder={`Escribe una observación sobre ${nombre}…`}
          value={comentario}
          onChange={(evento) => onComentario(zona.codigo, evento.target.value)}
        />
      </label>
    </div>
  );
}

// Las gráficas que eligió el usuario, en su orden, dibujadas con las MISMAS escenas que usa el PDF.
function SeccionGraficas({ previa, estilo }) {
  if (previa.estado === "inactiva") {
    return <p className="rp-hoja-vacio">Añade gráficas en la sección «Gráficas» (y elige al menos una zona) para verlas aquí.</p>;
  }
  if (previa.estado === "error") {
    return <p className="rp-aviso rp-aviso--error" role="alert">{previa.mensaje}</p>;
  }
  if (previa.estado === "cargando" && previa.escenas.length === 0) {
    return (
      <p className="rp-aviso rp-aviso--proceso" role="status">
        <span className="rp-giro" aria-hidden="true" />
        Cargando gráficas…
      </p>
    );
  }
  return (
    <div className={`rp-graficas${previa.estado === "cargando" ? " is-actualizando" : ""}`} aria-busy={previa.estado === "cargando"}>
      {previa.escenas.map((grafica, indice) => (
        <figure key={grafica.id} className={`rp-figura rp-figura--${estilo}`}>
          {estilo === "apa" && (
            <figcaption className="rp-rotulo-apa">
              <strong>Figura {indice + 1}</strong>
              <br />
              <em>{grafica.titulo}</em>
            </figcaption>
          )}
          {estilo === "excel" && <figcaption className="rp-figura-titulo">{grafica.titulo}</figcaption>}
          <EscenaSVG escena={grafica.escena} etiqueta={grafica.titulo} serif={estilo === "apa" || estilo === "ieee"} />
          {estilo === "ieee" && <figcaption className="rp-rotulo-ieee rp-rotulo-ieee--pie">Fig. {indice + 1}. {grafica.titulo}.{grafica.nota ? ` ${grafica.nota}` : ""}</figcaption>}
          {estilo === "apa" && grafica.nota && <p className="rp-nota-apa"><em>Nota.</em> {grafica.nota}</p>}
          {estilo === "excel" && grafica.nota && <p className="rp-grafica-nota">{grafica.nota}</p>}
        </figure>
      ))}
    </div>
  );
}

const TITULOS = {
  apa: { introduccion: null, metodo: "Método", resultados: "Resultados", graficas: "Gráficas", conclusiones: "Conclusiones" },
  ieee: { introduccion: "Introducción", metodo: "Método y fuentes de datos", resultados: "Resultados", graficas: "Gráficas", conclusiones: "Conclusiones" },
  excel: { introduccion: "Introducción", metodo: "Resumen ejecutivo", resultados: "Resultados", graficas: "Gráficas", conclusiones: "Conclusiones" },
};

export function VistaPreviaDocumento({ config, comentarios, onComentario, previaGraficas }) {
  const { titulo, introduccion, conclusiones, anioInicio, anioFin, graficas, variables, departamentos, municipios, formato } = config;
  // "apa" | "ieee" para PDF; "excel" conserva la hoja neutra (el libro no tiene plantilla de página).
  const estilo = formato === "pdf" ? config.plantilla : "excel";
  const nombres = TITULOS[estilo];
  const periodo = anioInicio === anioFin ? `${anioInicio}` : `${anioInicio}–${anioFin}`;
  let secciones = 0;
  const encabezado = (texto) => (estilo === "ieee" ? `${romano((secciones += 1))}. ${texto}` : texto);

  const totalZonas = departamentos.length + municipios.length;
  const textoMetodo =
    estilo === "excel"
      ? `Periodo analizado: ${anioInicio} – ${anioFin}. Gráficas: ${graficas.length}. Variables: ${variables.length > 0 ? variables.map((v) => v.nombre).join(", ") : "ninguna seleccionada"}.`
      : `Se analizaron ${variables.length} ${plural(variables.length, "indicador", "indicadores")}${variables.length > 0 ? ` (${variables.map((v) => v.nombre.toLowerCase()).join(", ")})` : ""} para ${totalZonas} ${plural(totalZonas, "zona", "zonas")} de Colombia entre ${anioInicio} y ${anioFin}. Los valores departamentales son el promedio simple de los municipios con dato disponible.`;

  const cuerpo = (
    <>
      {nombres.introduccion && <h2>{encabezado(nombres.introduccion)}</h2>}
      <div className="rp-hoja-texto">{introduccion || <em>Sin introducción.</em>}</div>

      <h2>{encabezado(nombres.metodo)}</h2>
      <p className="rp-hoja-parrafo">{textoMetodo}</p>

      <h2>{encabezado(nombres.resultados)}</h2>
      {estilo !== "ieee" && <h3>Departamentos</h3>}
      {departamentos.length === 0 ? (
        <p className="rp-hoja-vacio">No hay departamentos seleccionados.</p>
      ) : (
        departamentos.map((zona, i) => (
          <BloqueZona key={zona.codigo} zona={zona} nivel="Departamento" estilo={estilo} numero={i + 1} indice={i} periodo={periodo} variables={variables} comentario={comentarios[zona.codigo] || ""} onComentario={onComentario} />
        ))
      )}

      {estilo !== "ieee" && <h3>Municipios</h3>}
      {municipios.length === 0 ? (
        <p className="rp-hoja-vacio">No hay municipios seleccionados.</p>
      ) : (
        municipios.map((zona, i) => (
          <BloqueZona key={zona.codigo} zona={zona} nivel="Municipio" titulo={config.etiquetaMunicipio?.(zona)} estilo={estilo} numero={departamentos.length + i + 1} indice={departamentos.length + i} periodo={periodo} variables={variables} comentario={comentarios[zona.codigo] || ""} onComentario={onComentario} />
        ))
      )}

      {graficas.length > 0 && (
        <>
          <h2>{encabezado(nombres.graficas)}</h2>
          <SeccionGraficas previa={previaGraficas} estilo={estilo} />
        </>
      )}

      <h2>{encabezado(nombres.conclusiones)}</h2>
      <div className="rp-hoja-texto">{conclusiones || <em>Sin conclusiones.</em>}</div>
    </>
  );

  return (
    <article className={`rp-hoja rp-hoja--${estilo}`} aria-label={`Vista previa del documento${formato === "pdf" ? ` (${nombreDePlantilla("pdf", config.plantilla)})` : ""}`}>
      <h1 className="rp-hoja-titulo">{titulo || "Informe de Indicadores"}</h1>
      <p className="rp-hoja-meta">
        {estilo === "excel" ? `Fecha: ${new Date().toLocaleDateString("es-CO")} · Periodo ${anioInicio} – ${anioFin}` : `Techo 360 · ${new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`}
      </p>
      {estilo === "ieee" ? <div className="rp-ieee-columnas">{cuerpo}</div> : cuerpo}
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
  const { anioInicio, anioFin, graficas, variables, departamentos, municipios, formato, titulo, introduccion, conclusiones } = config;
  const anios = Math.max(0, anioFin - anioInicio + 1);
  const comentados = Object.values(comentarios).filter((texto) => texto && texto.trim()).length;
  const secciones = [
    { etiqueta: "Portada con título y periodo", ok: Boolean(titulo.trim()) },
    { etiqueta: "Introducción", ok: Boolean(introduccion.trim()) },
    { etiqueta: "Resultados por zona", ok: departamentos.length + municipios.length > 0 },
    { etiqueta: `Gráficas (${graficas.length})`, ok: graficas.length > 0 },
    { etiqueta: "Conclusiones", ok: Boolean(conclusiones.trim()) },
  ];

  return (
    <div className="rp-resumen" aria-label="Resumen del documento">
      <div className="rp-resumen-tarjetas">
        <Tarjeta icono="calendario" titulo="Periodo" valor={`${anioInicio} – ${anioFin}`} detalle={`${anios} ${anios === 1 ? "año" : "años"}`} />
        <Tarjeta icono="mapa" titulo="Zonas" valor={departamentos.length + municipios.length} detalle={`${departamentos.length} ${plural(departamentos.length, "dpto.", "dptos.")} · ${municipios.length} ${plural(municipios.length, "municipio", "municipios")}`} />
        <Tarjeta icono="indicador" titulo="Variables" valor={variables.length} detalle={graficas.length > 0 ? `${graficas.length} ${plural(graficas.length, "gráfica", "gráficas")}` : "sin gráficas"} />
        <Tarjeta icono={formato === "excel" ? "tabla" : "doc"} titulo="Formato" valor={formato === "excel" ? "Excel" : "PDF"} detalle={`${nombreDePlantilla(formato, config.plantilla)} · ${comentados} comentario${comentados === 1 ? "" : "s"}`} />
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
