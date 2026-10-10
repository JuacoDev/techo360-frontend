import { useMemo } from "react";
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

function RespuestaBot({ texto }) {
  const markdown = useMemo(() => formatearRespuestaBot(texto), [texto]);
  return (
    <div className="chat-md">
      <Markdown skipHtml disallowedElements={SIN_IMAGENES} components={COMPONENTES}>
        {markdown}
      </Markdown>
    </div>
  );
}

export default RespuestaBot;
