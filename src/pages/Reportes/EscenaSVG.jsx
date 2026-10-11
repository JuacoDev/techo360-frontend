// Dibuja en SVG una escena vectorial calculada por el backend (services/reportes_escenas.py). El PDF dibuja la
// MISMA escena con ReportLab, así que la vista previa y el documento no pueden diferir.
// Los textos se midieron con Helvetica: se usa Helvetica/Arial (Poppins es más ancha y desbordaría).
const SANS = "Helvetica, Arial, sans-serif";
const SERIF = '"Times New Roman", Times, serif';

function Elemento({ e }) {
  const trazo = e.stroke ? { stroke: e.stroke, strokeWidth: e.sw ?? 1 } : {};
  const relleno = { fill: e.fill ?? "none" };
  const guiones = e.dash ? { strokeDasharray: e.dash.join(" ") } : {};
  const titulo = e.title ? <title>{e.title}</title> : null;
  switch (e.t) {
    case "rect":
      return <rect x={e.x} y={e.y} width={e.w} height={e.h} {...relleno} {...trazo}>{titulo}</rect>;
    case "line":
      return <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.stroke} strokeWidth={e.sw ?? 1} {...guiones} />;
    case "circle":
      return <circle cx={e.cx} cy={e.cy} r={e.r} {...relleno} {...trazo}>{titulo}</circle>;
    case "poly": {
      const puntos = e.p.map(([x, y]) => `${x},${y}`).join(" ");
      const propiedades = { points: puntos, ...relleno, ...trazo, ...guiones, strokeLinejoin: "round", strokeLinecap: "round" };
      return e.cerrado ? <polygon {...propiedades}>{titulo}</polygon> : <polyline {...propiedades}>{titulo}</polyline>;
    }
    case "text":
      return (
        <text
          x={e.x}
          y={e.y}
          fontSize={e.size}
          textAnchor={e.anchor ?? "start"}
          fontWeight={e.bold ? 700 : 400}
          fill={e.fill}
          transform={e.rot ? `rotate(${e.rot} ${e.x} ${e.y})` : undefined}
        >
          {e.s}
        </text>
      );
    default:
      return null;
  }
}

function EscenaSVG({ escena, etiqueta, serif = false }) {
  return (
    <svg
      className="rp-escena"
      viewBox={`0 0 ${escena.ancho} ${escena.alto}`}
      role="img"
      aria-label={etiqueta}
      style={{ fontFamily: serif ? SERIF : SANS }}
    >
      {escena.elementos.map((e, i) => (
        <Elemento key={i} e={e} />
      ))}
    </svg>
  );
}

export default EscenaSVG;
