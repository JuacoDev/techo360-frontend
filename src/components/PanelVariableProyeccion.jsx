import { useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getProyeccion } from "../services/api";
import {
  ANIO_SERIE_FIN,
  ANIO_SERIE_INICIO,
  aniosSinCargar,
  esProyeccionZona,
  formatearValor,
  resumirAnios,
  serieDesdeMapa,
  serieDesdeServicio,
  textoFiabilidad,
} from "../pages/Proyeccion/variablesProyeccion.js";

const COLOR_REAL = "#1e3a8a";
const COLOR_PROYECCION = "#d97706";

// Punto de la serie: relleno azul = dato real; aro ambar con centro blanco = proyeccion. Un año sin valor
// (sin cargar) no dibuja punto: nunca se pinta como cero.
function PuntoSerie({ cx, cy, payload }) {
  if (!payload || payload.valor == null || cx == null || cy == null) return null;
  return payload.es_real ? (
    <circle cx={cx} cy={cy} r={4} fill={COLOR_REAL} stroke={COLOR_REAL} strokeWidth={1} />
  ) : (
    <circle cx={cx} cy={cy} r={4} fill="#ffffff" stroke={COLOR_PROYECCION} strokeWidth={2} />
  );
}

function TooltipSerie({ active, payload, variable }) {
  if (!active || !payload || payload.length === 0) return null;
  const punto = payload[0].payload;
  const fiabilidad = textoFiabilidad(punto);
  return (
    <div className="panel-variable-tooltip">
      <strong>{punto.anio}</strong>
      <div>{punto.valor == null ? "Sin cargar" : formatearValor(variable, punto.valor)}</div>
      {punto.valor != null && (
        <>
          <div>{punto.es_real ? "Dato real" : `Proyección${fiabilidad ? ` · ${fiabilidad}` : ""}`}</div>
          {punto.origen && <div className="panel-variable-tooltip-origen">{punto.origen}</div>}
        </>
      )}
    </div>
  );
}

// Seccion del panel del municipio en el Mapa de Proyeccion: valor del año de la variable activa (con origen y
// fiabilidad), insumos del score y la serie 2024-2042 de la variable.
//  * densidad y score: la serie se arma con los años ya cargados en el mapa (no se llama a /serie);
//  * las otras 6 variables: GET /api/proyecciones/serie?desde=2024&hasta=2042.
function PanelVariableProyeccion({ zona, variable, anio, datosPorAnio }) {
  const codigo = zona?.nivel === "municipio" ? String(zona.codigo ?? "").padStart(5, "0") : null;
  const desdeServicio = variable.serie === "servicio";
  const cacheSeries = useRef({});
  const [estadoSerie, setEstadoSerie] = useState({ clave: null, estado: "idle", serie: null });
  const clave = codigo ? `${codigo}|${variable.id}` : null;

  useEffect(() => {
    if (!desdeServicio || !clave) return undefined;
    const guardada = cacheSeries.current[clave];
    if (guardada) {
      setEstadoSerie({ clave, estado: "ok", serie: guardada });
      return undefined;
    }
    let cancelado = false;
    setEstadoSerie({ clave, estado: "cargando", serie: null });
    getProyeccion(codigo, variable.id, ANIO_SERIE_INICIO, ANIO_SERIE_FIN)
      .then((respuesta) => {
        if (cancelado) return;
        cacheSeries.current[clave] = respuesta.serie ?? [];
        setEstadoSerie({ clave, estado: "ok", serie: cacheSeries.current[clave] });
      })
      .catch((error) => {
        if (cancelado) return;
        console.error(`Error cargando la serie de ${variable.id} para ${codigo}:`, error);
        setEstadoSerie({ clave, estado: "error", serie: null });
      });
    return () => {
      cancelado = true;
    };
  }, [desdeServicio, clave, codigo, variable.id]);

  const zonaAnio = useMemo(
    () => (codigo ? (datosPorAnio?.[anio] ?? []).find((z) => z.codigo_municipio === codigo) : undefined),
    [codigo, datosPorAnio, anio]
  );

  const puntos = useMemo(() => {
    if (!codigo) return [];
    if (!desdeServicio) return serieDesdeMapa(codigo, datosPorAnio);
    if (estadoSerie.clave === clave && estadoSerie.estado === "ok") return serieDesdeServicio(estadoSerie.serie);
    return [];
  }, [codigo, desdeServicio, datosPorAnio, estadoSerie, clave]);

  if (!codigo || anio == null) return null;

  const esProyeccion = zonaAnio ? esProyeccionZona(zonaAnio) : false;
  const fiabilidad = zonaAnio ? textoFiabilidad(zonaAnio) : null;
  const faltantes = aniosSinCargar(puntos);
  const serieEnCurso = desdeServicio && estadoSerie.clave === clave && estadoSerie.estado === "cargando";
  const serieFallida = desdeServicio && estadoSerie.clave === clave && estadoSerie.estado === "error";
  const hayGrafica = puntos.some((p) => p.valor != null);

  return (
    <section className="indicador-card panel-variable-proy" aria-label={`${variable.nombre} del municipio seleccionado`}>
      <strong className="indicador-nombre">
        {variable.nombre} · {anio}
      </strong>
      <p className="indicador-valor">{zonaAnio ? formatearValor(variable, zonaAnio.valor) : "Sin dato"}</p>

      {zonaAnio && (
        <div className="panel-variable-detalle">
          {esProyeccion ? (
            <span className="indicador-proyeccion-badge panel-variable-badge">
              Proyección{fiabilidad ? ` · ${fiabilidad}` : ""}
            </span>
          ) : (
            <span className="panel-variable-real">Dato real</span>
          )}
          {zonaAnio.origen && <p className="indicador-fuente">Origen: {zonaAnio.origen}</p>}
        </div>
      )}

      {zonaAnio?.componentes?.length > 0 && (
        <ul className="panel-variable-componentes" aria-label="Insumos del score">
          {zonaAnio.componentes.map((c) => {
            const proyectado = esProyeccionZona(c);
            const fiab = textoFiabilidad(c);
            return (
              <li key={c.variable}>
                <span className="panel-variable-componente-nombre">{c.variable.replace(/_/g, " ")}</span>
                <span>{c.valor == null ? "Sin dato" : formatearNumeroCorto(c.valor)}</span>
                <span className={proyectado ? "indicador-proyeccion-badge" : "panel-variable-real"}>
                  {proyectado ? `Proyección${fiab ? ` · ${fiab}` : ""}` : "Real"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="indicador-serie panel-variable-serie">
        <strong className="panel-variable-serie-titulo">
          Serie {ANIO_SERIE_INICIO}-{ANIO_SERIE_FIN}
        </strong>
        {serieEnCurso && <p className="panel-variable-aviso">Cargando la serie…</p>}
        {serieFallida && (
          <p className="panel-variable-aviso" role="status">
            No se pudo cargar la serie {ANIO_SERIE_INICIO}-{ANIO_SERIE_FIN}; se muestra solo el valor del año.
          </p>
        )}
        {hayGrafica && (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={puntos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="anio" tick={{ fontSize: 10 }} interval={2} padding={{ right: 14 }} />
                <YAxis tick={{ fontSize: 10 }} width={44} domain={["auto", "auto"]} />
                <Tooltip content={<TooltipSerie variable={variable} />} />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={<PuntoSerie />}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="panel-variable-leyenda">
              <span className="panel-variable-punto-real" aria-hidden="true" /> Dato real
              <span className="panel-variable-punto-proy" aria-hidden="true" /> Proyección
            </p>
          </>
        )}
        {faltantes.length > 0 && !serieEnCurso && (
          <p className="panel-variable-aviso">
            {desdeServicio ? "Sin dato" : "Sin cargar"}: {resumirAnios(faltantes)}
            {desdeServicio ? "" : " (genera esos años para completar la serie)"}
          </p>
        )}
      </div>
    </section>
  );
}

function formatearNumeroCorto(valor) {
  return Number(valor).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

export default PanelVariableProyeccion;
