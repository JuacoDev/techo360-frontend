// Pagina de ejemplo para ver el renderizador (7.6) en el navegador con datos SIMULADOS con la forma REAL del payload
// de W1 (claude/fase7-6-payload.md). Solo para desarrollo: `npm run dev` y abrir /ejemplo-grafica-chat.html. No forma
// parte del build (vite build solo empaqueta index.html) ni de las rutas de la app.
import { createRoot } from "react-dom/client";
import "@fontsource/poppins/400.css";
import "../../Css/StyleHome.css";
import RespuestaBot from "./RespuestaBot.jsx";
import payloadsBackend from "./fixtures/payloads_backend.json";

const NOMBRES = {
  "68001": "Bucaramanga (Santander)",
  "05001": "Medellín (Antioquia)",
  "11001": "Bogotá, D.C. (Bogotá, D.C.)",
  "76001": "Cali (Valle del Cauca)",
  "08001": "Barranquilla (Atlántico)",
};
const dato = (variable, zona, anio, valor, origen = "real", fiabilidad = null) => ({ variable, zona, nombre: NOMBRES[zona], anio, valor, origen, fiabilidad });
const proy = (variable, zona, anio, valor, fiabilidad) => dato(variable, zona, anio, valor, "proyeccion", fiabilidad);
const universo = (variable, media, periodo = [2024, 2024]) => ({ periodo, estadisticos: { [variable]: { media, min: 0.4, q1: 5, mediana: 8, q3: 14, max: 41.2, n: 1100 } } });
const grafica = (tipo, modo, variables, zonas, anios, datos, uni = null) => ({ v: 1, tipo, modo, variables, zonas, anios, datos, universo: uni });
const A = "cobertura_acueducto";

const anios = [2019, 2020, 2021, 2022, 2023, 2024];
const serie = (zona, base, paso) => anios.map((a, i) => dato(A, zona, a, +(base + paso * i).toFixed(1)));

const EJEMPLOS = [
  ...Object.entries(payloadsBackend).map(([tipo, grafica]) => ({
    titulo: `Payload generado por el backend real: ${tipo}`,
    texto: "Respuesta de ejemplo con el payload que produce construir_payload del backend.",
    grafica,
  })),
  {
    titulo: "Líneas, datos reales",
    texto: "En Bucaramanga, la cobertura de acueducto pasó de 90,1 % en 2019 a 95,1 % en 2024. La gráfica se muestra debajo.",
    grafica: grafica("lineas", "individual", [A], ["68001"], anios, serie("68001", 90.1, 1)),
  },
  {
    titulo: "Líneas, comparar con proyección",
    texto: "Comparo la cobertura de acueducto de Bucaramanga y Medellín; desde 2025 los valores son proyección.",
    grafica: grafica("lineas", "comparar", [A], ["68001", "05001"], [...anios, 2025, 2026, 2027], [
      ...serie("68001", 90.1, 1), proy(A, "68001", 2025, 95.1, 82), proy(A, "68001", 2026, 95.1, 71), proy(A, "68001", 2027, 95.1, 60),
      ...serie("05001", 93.0, 0.6), proy(A, "05001", 2025, 96.0, 82), proy(A, "05001", 2026, 96.0, 71), proy(A, "05001", 2027, 96.0, 60),
    ]),
  },
  {
    titulo: "Ranking con universo",
    texto: "Déficit habitacional cuantitativo en cinco ciudades, de mayor a menor (2024).",
    grafica: grafica(
      "barras_ranking", "comparar", ["deficit_habitacional_cuantitativo"], Object.keys(NOMBRES), [2024],
      [["68001", 6.5], ["05001", 9.1], ["11001", 4.2], ["76001", 7.7], ["08001", 12.4]].map(([z, v]) => dato("deficit_habitacional_cuantitativo", z, 2024, v)),
      universo("deficit_habitacional_cuantitativo", 8.0),
    ),
  },
  {
    titulo: "Barras agrupadas",
    texto: "Acueducto y alcantarillado en Bucaramanga y Medellín (2024).",
    grafica: grafica("barras_agrupadas", "comparar", [A, "cobertura_alcantarillado"], ["68001", "05001"], [2024], [
      dato(A, "68001", 2024, 95.1), dato("cobertura_alcantarillado", "68001", 2024, 92.4),
      dato(A, "05001", 2024, 96.0), dato("cobertura_alcantarillado", "05001", 2024, 94.8),
    ]),
  },
  {
    titulo: "Gauge con universo",
    texto: "La cobertura de acueducto de Bucaramanga en 2024 es 95,1 %.",
    grafica: grafica("gauge", "individual", [A], ["68001"], [2024], [dato(A, "68001", 2024, 95.1)], universo(A, 86.4)),
  },
  {
    titulo: "Gauge proyectado (score)",
    texto: "El score de privación proyectado de Bucaramanga para 2030 es 0,38.",
    grafica: grafica("gauge", "individual", ["score_privacion"], ["68001"], [2030], [proy("score_privacion", "68001", 2030, 0.38, 55)], universo("score_privacion", 0.45, [2030, 2030])),
  },
  {
    titulo: "Sin gráfica (grafica = null): solo texto",
    texto: "Solo tengo un año disponible para esa variable, así que no puedo mostrar su evolución. El dato de 2024 es 95,1 %.",
    grafica: null,
  },
  {
    titulo: "Bloque inválido (v desconocida): se ignora y queda el texto",
    texto: "Respuesta con un payload que este cliente no conoce; el texto se muestra igual.",
    grafica: { ...grafica("lineas", "individual", [A], ["68001"], anios, serie("68001", 90.1, 1)), v: 2 },
  },
  {
    titulo: "Tipo que el chat no dibuja (radar): solo texto",
    texto: "El backend puede validar cualquier tipo del catálogo; este cliente muestra solo el texto.",
    grafica: { ...grafica("radar", "individual", [A], ["68001"], [2024], [dato(A, "68001", 2024, 95.1)]), tipo: "radar" },
  },
];

function Ejemplos() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16, fontFamily: "Poppins, sans-serif" }}>
      <h1 style={{ fontSize: "1.1rem" }}>Gráficas del chat (7.6): datos simulados con el payload de W1</h1>
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
