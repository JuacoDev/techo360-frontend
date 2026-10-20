import { Component, lazy, Suspense, useMemo } from "react";
import Markdown from "react-markdown";
import { formatearRespuestaBot } from "../../services/formatoRespuesta.js";

// Respuesta del asistente como Markdown (react-markdown, SIN rehype-raw): el
// HTML crudo que escriba el modelo se descarta (skipHtml), las imagenes no se
// muestran y los enlaces abren en otra pestana sin acceso a window.opener.
// Los mensajes del usuario NO pasan por aqui: van como texto plano.
const COMPONENTES = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />, // eslint-disable-line no-unused-vars
};

const SIN_IMAGENES = ["img"];

// La grafica (7.6) se carga aparte: Recharts solo se descarga si algun mensaje trae grafica.
const GraficaChat = lazy(() => import("./GraficaChat.jsx"));

// Una grafica rota (payload inesperado, fallo de Recharts) nunca debe tumbar el chat: se descarta y queda el texto.
class SinFalloDeGrafica extends Component {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

function RespuestaBot({ texto, grafica = null }) {
  const markdown = useMemo(() => formatearRespuestaBot(texto), [texto]);
  return (
    <div className="chat-md">
      <Markdown skipHtml disallowedElements={SIN_IMAGENES} components={COMPONENTES}>
        {markdown}
      </Markdown>
      {grafica && typeof grafica === "object" && (
        <SinFalloDeGrafica key={texto}>
          <Suspense fallback={null}>
            <GraficaChat grafica={grafica} />
          </Suspense>
        </SinFalloDeGrafica>
      )}
    </div>
  );
}

export default RespuestaBot;
