// Pagina de ejemplo para ver el renderizador (7.6) en el navegador con datos SIMULADOS.
// Solo para desarrollo: `npm run dev` y abrir /ejemplo-grafica-chat.html. No forma parte del build (vite build solo
// empaqueta index.html) ni de las rutas de la app.
import { createRoot } from "react-dom/client";
import "@fontsource/poppins/400.css";
import "../../Css/StyleHome.css";
import RespuestaBot from "./RespuestaBot.jsx";

const ZONAS = { "68001": "Bucaramanga", "05001": "Medellín", "11001": "Bogotá D.C.", "76001": "Cali", "08001": "Barranquilla" };
const pt = (variable, zona, anio, valor, extra = {}) => ({ variable, zona, anio, valor, es_real: true, origen: "DANE-CNPV2018", fiabilidad: null, ...extra });
const proy = (variable, zona, anio, valor, fiabilidad) => pt(variable, zona, anio, valor, { es_real: false, origen: "proyeccion-ultimo-valor", fiabilidad });
const spec = (tipo, modo, variables, zonas, anios) => ({ v: 1, tipo, modo, variables, zonas, anios });
const A = "cobertura_acueducto";

const anios = [2019, 2020, 2021, 2022, 2023, 2024];
const serie = (zona, base, paso) => anios.map((a, i) => pt(A, zona, a, +(base + paso * i).toFixed(1)));

const EJEMPLOS = [
  {
    titulo: "Líneas, datos reales",
    texto: "En Bucaramanga, la cobertura de acueducto pasó de 90,1 % en 2019 a 95,1 % en 2024. La gráfica se muestra debajo.",
    grafica: { especificacion: spec("lineas", "individual", [A], ["68001"], anios), datos: { zonas: ZONAS, puntos: serie("68001", 90.1, 1) } },
  },
  {
    titulo: "Líneas, comparar con proyección",
    texto: "Comparo la cobertura de acueducto de Bucaramanga y Medellín; desde 2025 los valores son proyección.",
    grafica: {
      especificacion: spec("lineas", "comparar", [A], ["68001", "05001"], [...anios, 2025, 2026, 2027]),
      datos: {
        zonas: ZONAS,
        puntos: [
          ...serie("68001", 90.1, 1), proy(A, "68001", 2025, 95.1, 82), proy(A, "68001", 2026, 95.1, 71), proy(A, "68001", 2027, 95.1, 60),
          ...serie("05001", 93.0, 0.6), proy(A, "05001", 2025, 96.0, 82), proy(A, "05001", 2026, 96.0, 71), proy(A, "05001", 2027, 96.0, 60),
        ],
      },
    },
  },
  {
    titulo: "Ranking con universo",
    texto: "Déficit habitacional cuantitativo en cinco ciudades, de mayor a menor (2024).",
    grafica: {
      especificacion: spec("barras_ranking", "comparar", ["deficit_habitacional_cuantitativo"], Object.keys(ZONAS), [2024]),
      datos: {
        zonas: ZONAS,
        puntos: [["68001", 6.5], ["05001", 9.1], ["11001", 4.2], ["76001", 7.7], ["08001", 12.4]].map(([z, v]) => pt("deficit_habitacional_cuantitativo", z, 2024, v)),
        universo: { deficit_habitacional_cuantitativo: { promedio: 8.0, minimo: 0.4, maximo: 41.2 } },
      },
    },
  },
  {
    titulo: "Barras agrupadas",
    texto: "Acueducto y alcantarillado en Bucaramanga y Medellín (2024).",
    grafica: {
      especificacion: spec("barras_agrupadas", "comparar", [A, "cobertura_alcantarillado"], ["68001", "05001"], [2024]),
      datos: {
        zonas: ZONAS,
        puntos: [pt(A, "68001", 2024, 95.1), pt("cobertura_alcantarillado", "68001", 2024, 92.4), pt(A, "05001", 2024, 96.0), pt("cobertura_alcantarillado", "05001", 2024, 94.8)],
      },
    },
  },
  {
    titulo: "Gauge con universo",
    texto: "La cobertura de acueducto de Bucaramanga en 2024 es 95,1 %.",
    grafica: {
      especificacion: spec("gauge", "individual", [A], ["68001"], [2024]),
      datos: { zonas: ZONAS, puntos: [pt(A, "68001", 2024, 95.1)], universo: { [A]: { promedio: 86.4, minimo: 12, maximo: 100 } } },
    },
  },
  {
    titulo: "Gauge proyectado (score)",
    texto: "El score de privación proyectado de Bucaramanga para 2030 es 0,38.",
    grafica: {
      especificacion: spec("gauge", "individual", ["score_privacion"], ["68001"], [2030]),
      datos: { zonas: ZONAS, puntos: [proy("score_privacion", "68001", 2030, 0.38, 55)], universo: { score_privacion: { promedio: 0.45 } } },
    },
  },
  {
    titulo: "Sin gráfica (un solo año): solo texto",
    texto: "Solo tengo un año disponible para esa variable, así que no puedo mostrar su evolución. El dato de 2024 es 95,1 %.",
    grafica: { especificacion: spec("lineas", "individual", [A], ["68001"], [2024]), datos: { zonas: ZONAS, puntos: [pt(A, "68001", 2024, 95.1)] } },
  },
];

function Ejemplos() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16, fontFamily: "Poppins, sans-serif" }}>
      <h1 style={{ fontSize: "1.1rem" }}>Gráficas del chat (7.6): datos simulados</h1>
      {EJEMPLOS.map((e) => (
        <section key={e.titulo} style={{ margin: "1.5rem 0" }}>
          <h2 style={{ fontSize: "0.85rem", opacity: 0.7 }}>{e.titulo}</h2>
          <div className="chatbot-conversation-message chatbot-conversation-message--bot">
            <RespuestaBot texto={e.texto} grafica={e.grafica} />
          </div>
        </section>
      ))}
    </main>
  );
}

createRoot(document.getElementById("app")).render(<Ejemplos />);
