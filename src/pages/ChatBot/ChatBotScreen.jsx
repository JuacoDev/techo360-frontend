import { useEffect, useState } from "react";
import "../../Css/StyleHome.css";
import "../../Css/StyleComponents.css";
import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import ChatbotLogo from "../../assets/chatbot_grueso.png";
import {
  crearConversacion,
  enviarFeedbackMensaje,
  enviarMensaje,
  getCurrentUser,
  listarConversaciones,
  listarMensajes,
} from "../../services/api";

function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function previewDe(mensajes) {
  const primero = mensajes?.[0];
  if (!primero) return "Conversación sin mensajes todavía";
  return primero.contenido.length > 70 ? `${primero.contenido.slice(0, 70)}…` : primero.contenido;
}

// Requiere sesion iniciada -- mismo mecanismo que PerfilUsuario.jsx
// (getCurrentUser()), en vez de confiar solo en el gate previo de
// Home.jsx (entrarAModulo): la sesion pudo expirar entre que se entro
// al modulo y que se monta esta pantalla.
function ChatBotScreen({ setScreen, onLogout }) {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messagesCache, setMessagesCache] = useState({});
  const [historyError, setHistoryError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);
  const [view, setView] = useState("history");

  useEffect(() => {
    getCurrentUser(onLogout)
      .then(setUser)
      .catch((err) => {
        if (err.status === 401) {
          alert("Sesión expirada, vuelve a iniciar sesión");
        } else {
          alert("Error al cargar usuario");
        }
        onLogout?.();
      });
  }, [onLogout]);

  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    setLoadingHistory(true);
    listarConversaciones(onLogout)
      .then(async (lista) => {
        const conMensajes = await Promise.all(
          lista.map(async (conversacion) => {
            try {
              return [conversacion.id, await listarMensajes(conversacion.id, onLogout)];
            } catch {
              return [conversacion.id, []];
            }
          })
        );
        if (cancelado) return;
        setConversations(lista);
        setMessagesCache(Object.fromEntries(conMensajes));
        setHistoryError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        if (err.status !== 401) setHistoryError(err.message || "No se pudo cargar el historial");
      })
      .finally(() => {
        if (!cancelado) setLoadingHistory(false);
      });
    return () => {
      cancelado = true;
    };
  }, [user, onLogout]);

  const abrirConversacion = (conversacionId) => {
    setActiveConversation(conversacionId);
    setView("conversation");
  };

  const abrirNuevaConversacion = () => {
    setActiveConversation(null);
    setView("conversation");
  };

  const onConversacionCreada = (nuevaConversacion) => {
    setConversations((actuales) => [nuevaConversacion, ...actuales]);
    setActiveConversation(nuevaConversacion.id);
  };

  const onMensajesActualizados = (conversacionId, mensajes) => {
    setMessagesCache((actual) => ({ ...actual, [conversacionId]: mensajes }));
  };

  if (!user) return <p>Cargando...</p>;

  return (
    <div className="home-screen">
      <CabezaDeNavegacion setScreen={setScreen} onLogout={onLogout} />

      <main className={`chatbot-history-screen${view === "conversation" ? " chatbot-history-screen--conversation" : ""}`}>
        {view === "history" ? (
          <section className="chatbot-history-panel chatbot-history-panel--centrada">
            <div className="chatbot-history-intro">
              <div className="chatbot-history-intro-top">
                <div className="chatbot-history-intro-info">
                  <div className="chatbot-history-identity">
                    <h1>TechoBot</h1>
                    <span className="chatbot-history-kicker">ASISTENTE DE VIVIENDA Y TERRITORIO</span>
                    <span className="chatbot-history-description">Continúa una conversación o empieza una nueva.</span>
                  </div>
                  <p className="chatbot-history-welcome-note">Consulta indicadores, interpreta datos y comprende mejor las condiciones de vivienda en Colombia.</p>
                </div>
                <img src={ChatbotLogo} alt="Logo de TechoBot" className="chatbot-history-logo" />
              </div>
              <button type="button" className="chatbot-new-conversation" onClick={abrirNuevaConversacion}>
                <span className="chatbot-new-conversation-icon" aria-hidden="true">+</span>
                <span>
                  <strong>Nueva conversación</strong>
                  <small>Comienza una consulta sobre Colombia</small>
                </span>
                <span className="chatbot-new-conversation-arrow" aria-hidden="true">→</span>
              </button>
            </div>

            <div className="chatbot-history-content">
              <div className="chatbot-history-heading">
                <div>
                  <span className="chatbot-history-section-kicker">ARCHIVO PERSONAL</span>
                  <h2>Tus conversaciones</h2>
                </div>
              </div>

              {loadingHistory && <p>Cargando conversaciones...</p>}
              {!loadingHistory && historyError && <p className="chatbot-history-error">{historyError}</p>}
              {!loadingHistory && !historyError && conversations.length === 0 && (
                <p>Todavía no tienes conversaciones. Empieza una nueva.</p>
              )}

              {!loadingHistory && !historyError && conversations.length > 0 && (
                <div className="chatbot-history-list">
                  {conversations.map((conversacion) => (
                    <button
                      type="button"
                      className={`chatbot-history-item${activeConversation === conversacion.id ? " is-active" : ""}`}
                      key={conversacion.id}
                      onClick={() => abrirConversacion(conversacion.id)}
                    >
                      <span className="chatbot-history-item-mark" aria-hidden="true" />
                      <span className="chatbot-history-item-content">
                        <strong>{previewDe(messagesCache[conversacion.id])}</strong>
                      </span>
                      <span className="chatbot-history-item-date">{formatearFecha(conversacion.fecha)}</span>
                      <span className="chatbot-history-item-arrow" aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <ChatConversationView
            conversacionId={activeConversation}
            mensajesIniciales={activeConversation ? messagesCache[activeConversation] || [] : []}
            onBack={() => setView("history")}
            onConversacionCreada={onConversacionCreada}
            onMensajesActualizados={onMensajesActualizados}
            onLogout={onLogout}
          />
        )}
      </main>
    </div>
  );
}

function ChatConversationView({
  conversacionId,
  mensajesIniciales,
  onBack,
  onConversacionCreada,
  onMensajesActualizados,
  onLogout,
}) {
  const [messages, setMessages] = useState(mensajesIniciales);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [feedbackEnviando, setFeedbackEnviando] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);

  const handleSend = async () => {
    const contenido = input.trim();
    if (!contenido || sending) return;

    setSending(true);
    setSendError(null);
    setInput("");

    try {
      let convId = conversacionId;
      if (convId == null) {
        const nueva = await crearConversacion(onLogout);
        convId = nueva.id;
        onConversacionCreada(nueva);
      }

      const resultado = await enviarMensaje(convId, contenido, onLogout);
      setMessages((actuales) => {
        const actualizados = [...actuales, resultado.mensaje_usuario, resultado.mensaje_asistente];
        onMensajesActualizados(convId, actualizados);
        return actualizados;
      });
    } catch (err) {
      if (err.status !== 401) {
        setSendError(err.message || "No se pudo enviar el mensaje");
        setInput(contenido);
      }
    } finally {
      setSending(false);
    }
  };

  const handleFeedback = async (mensaje, util) => {
    setFeedbackEnviando(mensaje.id);
    setFeedbackError(null);
    try {
      const actualizado = await enviarFeedbackMensaje(mensaje.id, util, onLogout);
      setMessages((actuales) => {
        const actualizados = actuales.map((item) => (item.id === actualizado.id ? actualizado : item));
        onMensajesActualizados(conversacionId, actualizados);
        return actualizados;
      });
    } catch (err) {
      if (err.status !== 401) setFeedbackError("No se pudo registrar tu opinión");
    } finally {
      setFeedbackEnviando(null);
    }
  };

  return (
    <section className="chatbot-conversation-panel chatbot-conversation-panel--amplia">
      <header className="chatbot-conversation-header chatbot-conversation-header--barra">
        <button type="button" className="chatbot-conversation-back" onClick={onBack} aria-label="Volver al historial">←</button>
        <img src={ChatbotLogo} alt="" className="chatbot-conversation-logo" />
        <div>
          <strong>TechoBot</strong>
          <span>Asistente de vivienda y territorio</span>
        </div>
      </header>
      <div className="chatbot-conversation-messages chatbot-conversation-messages--editoriales">
        {messages.length === 0 && !sending && (
          <div className="chatbot-assistant-response">
            <div className="chatbot-conversation-message chatbot-conversation-message--bot">Hola, soy TechoBot. Puedo ayudarte a interpretar indicadores de vivienda y territorio en Colombia.</div>
          </div>
        )}

        {messages.map((mensaje) => (
          <div
            key={mensaje.id}
            className={mensaje.rol === "usuario" ? "chatbot-user-response" : "chatbot-assistant-response"}
          >
            <div className={`chatbot-conversation-message chatbot-conversation-message--${mensaje.rol === "usuario" ? "user" : "bot"}`}>
              {mensaje.contenido}
            </div>
            <span className="chatbot-message-timestamp">{formatearFecha(mensaje.fecha)}</span>
            {mensaje.rol === "asistente" && (
              <div className="chatbot-message-feedback" aria-label="Valorar respuesta">
                {mensaje.feedback_util !== null ? (
                  <span className="chatbot-feedback-thanks">Gracias por tu opinión</span>
                ) : (
                  <>
                    <span>¿Te fue útil?</span>
                    <button
                      type="button"
                      disabled={feedbackEnviando === mensaje.id}
                      onClick={() => handleFeedback(mensaje, true)}
                      aria-label="Respuesta útil"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      disabled={feedbackEnviando === mensaje.id}
                      onClick={() => handleFeedback(mensaje, false)}
                      aria-label="Respuesta no útil"
                    >
                      👎
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="chatbot-thinking chatbot-thinking--barras">
            <span className="chatbot-thinking-animation" aria-label="TechoBot está generando una respuesta"><i /><i /><i /></span>
            <span className="chatbot-thinking-text">TechoBot está analizando tu consulta...</span>
          </div>
        )}
      </div>

      {sendError && <p className="chatbot-history-error">{sendError}</p>}
      {feedbackError && <p className="chatbot-history-error">{feedbackError}</p>}

      {messages.length === 0 && (
        <div className="chatbot-conversation-suggestions" aria-label="Sugerencias de consulta">
          <span>Prueba una consulta</span>
          <button type="button" onClick={() => setInput("¿Qué es el déficit habitacional?")}>¿Qué es el déficit habitacional?</button>
          <button type="button" onClick={() => setInput("Muéstrame indicadores de Bucaramanga")}>Indicadores de Bucaramanga</button>
          <button type="button" onClick={() => setInput("Compara dos municipios")}>Comparar municipios</button>
        </div>
      )}

      <div className="chatbot-conversation-composer chatbot-conversation-composer--elevada">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escribe tu pregunta..."
          aria-label="Mensaje"
          disabled={sending}
        />
        <button type="button" aria-label="Enviar mensaje" onClick={handleSend} disabled={sending || !input.trim()}>→</button>
      </div>
    </section>
  );
}

export default ChatBotScreen;
