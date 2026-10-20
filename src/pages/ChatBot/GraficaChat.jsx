import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatearNumero, formatearValor } from "../Proyeccion/variablesProyeccion.js";
import { etiquetaPeriodo, notaProyeccion, prepararGrafica } from "./graficaChat.js";

// Grafica dentro de la respuesta del bot (paso 7.6). Recibe la especificacion ya validada por el backend mas los
// datos ya resueltos (ver graficaChat.js) y la dibuja con Recharts. No consulta ni calcula cifras. Si no hay nada que
// dibujar (tipo no admitido, datos vacios, menos de dos puntos), no pinta grafica: RespuestaBot muestra el texto igual.
// Todo texto va como hijo de React (escapado); nunca HTML.
const COLORES = ["#1f6feb", "#d1495b", "#2a9d8f", "#e9a23b", "#7b5ea7", "#4d6b86"];
const ALTO = 240;
// Dimension inicial: permite medir antes del primer layout (y renderizar en servidor, donde no hay DOM).
const INICIAL = { width: 520, height: ALTO };

const formatoEje = (cfg) => (v) => formatearNumero(v, cfg.decimales);

function Lineas({ m }) {
  const cfg = { decimales: m.decimales, unidad: m.unidad };
  return (
    <ResponsiveContainer width="100%" height={ALTO} initialDimension={INICIAL}>
      <LineChart data={m.filas} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={48} domain={["auto", "auto"]} tickFormatter={formatoEje(cfg)} />
        <Tooltip formatter={(v) => formatearValor(m.variable, v)} />
        {m.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {m.series.map((s, i) => {
          const base = m.series.findIndex((x) => x.clave === (s.zona ?? s.clave));
          return (
            <Line
              key={s.clave}
              type="monotone"
              dataKey={s.clave}
              name={s.nombre}
              stroke={COLORES[(base < 0 ? i : base) % COLORES.length]}
              strokeWidth={2}
              strokeDasharray={s.proyeccion ? "5 4" : undefined}
              dot={{ r: 2.5 }}
              connectNulls
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

function Ranking({ m }) {
  const alto = Math.max(ALTO, m.filas.length * 30 + 40);
  const etiqueta = (f) => (f.proyeccion ? `${f.nombre} (proy. ${f.anio})` : f.nombre);
  const datos = m.filas.map((f) => ({ ...f, etiqueta: etiqueta(f) }));
  return (
    <ResponsiveContainer width="100%" height={alto} initialDimension={{ width: INICIAL.width, height: alto }}>
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatoEje(m)} />
        <YAxis type="category" dataKey="etiqueta" tick={{ fontSize: 11 }} width={170} />
        <Tooltip formatter={(v) => formatearValor(m.variable, v)} />
        {m.universo && <ReferenceLine x={m.universo.media} stroke="#888" strokeDasharray="3 3" />}
        <Bar dataKey="valor" name={m.titulo} isAnimationActive={false}>
          {datos.map((f) => (
            <Cell key={f.clave} fill={COLORES[0]} fillOpacity={f.proyeccion ? 0.45 : 1} stroke={f.proyeccion ? COLORES[0] : undefined} strokeDasharray={f.proyeccion ? "4 3" : undefined} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Agrupadas({ m }) {
  return (
    <ResponsiveContainer width="100%" height={ALTO} initialDimension={INICIAL}>
      <BarChart data={m.filas} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={48} tickFormatter={formatoEje(m)} />
        <Tooltip formatter={(v) => formatearValor(m.variable, v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {m.series.map((s, i) => (
          <Bar key={s.clave} dataKey={s.clave} name={s.nombre} fill={COLORES[i % COLORES.length]} isAnimationActive={false}>
            {m.filas.map((f) => (
              <Cell key={f.clave} fill={COLORES[i % COLORES.length]} fillOpacity={f.proyeccion?.[s.clave] ? 0.45 : 1} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Medidor({ m }) {
  const g = m.medidor;
  const datos = [
    { nombre: "Valor", v: g.fraccion },
    { nombre: "Resto", v: 1 - g.fraccion },
  ];
  return (
    <div className="chat-grafica-gauge">
      <ResponsiveContainer width="100%" height={170} initialDimension={{ width: INICIAL.width, height: 170 }}>
        <PieChart>
          <Pie data={datos} dataKey="v" startAngle={180} endAngle={0} cx="50%" cy="92%" innerRadius="125%" outerRadius="175%" stroke="none" isAnimationActive={false}>
            <Cell fill={COLORES[0]} fillOpacity={g.proyeccion ? 0.5 : 1} />
            <Cell fill="rgba(128,128,128,0.25)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <p className="chat-grafica-gauge-valor">
        <strong>{formatearValor(m.variable, g.valor)}</strong> · {g.zona}, {g.anio}
        {g.universo && <> · promedio nacional{etiquetaPeriodo(g.universo.periodo)} {formatearValor(m.variable, g.universo.media)}</>}
      </p>
    </div>
  );
}

const DIBUJO = { lineas: Lineas, barras_ranking: Ranking, barras_agrupadas: Agrupadas, gauge: Medidor };

function GraficaChat({ grafica }) {
  const modelo = useMemo(() => prepararGrafica(grafica), [grafica]);
  if (!modelo.ok) return null;
  const Dibujo = DIBUJO[modelo.tipo];
  const nota = notaProyeccion(modelo.proyeccion);
  return (
    <figure className="chat-grafica" data-tipo={modelo.tipo} aria-label={`Gráfica: ${modelo.titulo}`}>
      <figcaption className="chat-grafica-titulo">
        {modelo.titulo}
        {modelo.proyeccion.hay && <span className="chat-grafica-badge">Proyección</span>}
      </figcaption>
      <Dibujo m={modelo} />
      {modelo.tipo === "barras_ranking" && modelo.universo && (
        <p className="chat-grafica-nota">
          Línea punteada: promedio nacional{etiquetaPeriodo(modelo.universo.periodo)} {formatearValor(modelo.variable, modelo.universo.media)}
        </p>
      )}
      {nota && <p className="chat-grafica-nota">{nota}</p>}
    </figure>
  );
}

export default GraficaChat;
