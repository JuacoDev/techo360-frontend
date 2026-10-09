import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import "../../Css/StyleHome.css";
import "../../Css/StyleComponents.css";
import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import ChatbotLogo from "../../assets/chatbot_grueso.png";
import {
  cancelarMensaje,
  crearConversacion,
  eliminarMensaje,
  enviarFeedbackMensaje,
  enviarMensaje,
  getCurrentUser,
  listarConversaciones,
  listarMensajes,
  reintentarMensaje,
} from "../../services/api";
import {
  INTERVALO_SONDEO_MS,
  aplicarIntercambio,
  aplicarMensaje,
  conversacionBloqueada,
  estadoDe,
  hayEnProceso,
  quitarMensaje,
} from "../../services/estadosMensaje.js";
import { avisoConversacionNoDisponible } from "../../services/mensajesError.js";
import { AvisoError, IndicadorEspera, MensajeEstado, Presencia } from "./EstadosChat.jsx";
import { ID_CONVERSACION_NUEVA, RUTAS, esIdConversacionValido, rutaDeConversacion } from "../../routing/rutas.js";

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
// (getCurrentUser()), ademas del guard de rutas (RequiereSesion): la sesion
// pudo expirar entre que se entro al modulo y que se monta esta pantalla.
//
// Rutas: /techobot es la lista; /techobot/:conversacionId el chat abierto
// (id numerico, o "nueva" para una conversacion que se crea con el primer
// mensaje y entonces la URL se reemplaza por /techobot/<id>).
function ChatBotScreen({ onLogout }) {
  const { conversacionId: idRuta } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messagesCache, setMessagesCache] = useState({});
  const [historyError, setHistoryError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [ultimaConversacion, setUltimaConversacion] = useState(null);
  const [avisoRuta, setAvisoRuta] = useState(null); // conversacion de la URL que no se pudo abrir
  // Cada "Nueva conversacion" es una vista distinta (key), y la conversacion que
  // nace de ella conserva esa key al pasar de /techobot/nueva a /techobot/<id>:
  // asi no se remonta (ni se pierde el envio en curso) al reemplazar la URL.
  const [secuenciaNueva, setSecuenciaNueva] = useState(0);
  const creadaDesdeNueva = useRef(null); // { id, clave }

  const idValido = idRuta === undefined || esIdConversacionValido(idRuta);
  const esNueva = idRuta === ID_CONVERSACION_NUEVA;
  const idConversacion = idRuta !== undefined && idValido && !esNueva ? Number(idRuta) : null;

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
        setMessagesCache((actual) => ({ ...Object.fromEntries(conMensajes), ...actual }));
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

  useEffect(() => {
    if (idConversacion !== null) setUltimaConversacion(idConversacion);
  }, [idConversacion]);

  // Un /techobot/<id> que no esta en el historial cargado (recarga directa,
  // enlace, conversacion ajena) se pide aparte: si falla, se vuelve a la lista
  // con un aviso. La lista no redirige nunca, asi que no hay bucle posible.
  useEffect(() => {
    if (!user || loadingHistory || idConversacion === null || messagesCache[idConversacion]) return undefined;
    let cancelado = false;
    listarMensajes(idConversacion, onLogout)
      .then((lista) => {
        if (!cancelado) setMessagesCache((actual) => ({ ...actual, [idConversacion]: lista }));
      })
      .catch((err) => {
        if (!cancelado && err.status !== 401) setAvisoRuta({ id: idConversacion, texto: avisoConversacionNoDisponible(err.status) });
      });
    return () => {
      cancelado = true;
    };
  }, [user, loadingHistory, idConversacion, messagesCache, onLogout]);

  const abrirConversacion = (conversacionId) => {
    navigate(rutaDeConversacion(conversacionId), { state: { desdeLista: true } });
  };

  const abrirNuevaConversacion = () => {
    setSecuenciaNueva((n) => n + 1);
    navigate(rutaDeConversacion(ID_CONVERSACION_NUEVA), { state: { desdeLista: true } });
  };

  const onConversacionCreada = (nuevaConversacion) => {
    creadaDesdeNueva.current = { id: nuevaConversacion.id, clave: `nueva-${secuenciaNueva}` };
    setConversations((actuales) => [nuevaConversacion, ...actuales]);
    setMessagesCache((actual) => ({ ...actual, [nuevaConversacion.id]: actual[nuevaConversacion.id] ?? [] }));
    navigate(rutaDeConversacion(nuevaConversacion.id), { replace: true, state: location.state });
  };

  const onMensajesActualizados = (conversacionId, mensajes) => {
    setMessagesCache((actual) => ({ ...actual, [conversacionId]: mensajes }));
  };

  // Volver a la lista: si se llego desde ella, Atras (asi el historial no crece);
  // si se entro directo por la URL, se empuja /techobot.
  const volverALista = () => {
    if (location.state?.desdeLista) navigate(-1);
    else navigate(RUTAS.techobot);
  };

  if (!idValido) {
    return <Navigate to={RUTAS.techobot} replace state={{ aviso: avisoConversacionNoDisponible() }} />;
  }
  if (avisoRuta && avisoRuta.id === idConversacion) {
    return <Navigate to={RUTAS.techobot} replace state={{ aviso: avisoRuta.texto }} />;
  }

  if (!user) return <p>Cargando...</p>;

  const enConversacion = idRuta !== undefined;
  const claveVista = esNueva
    ? `nueva-${secuenciaNueva}`
    : creadaDesdeNueva.current?.id === idConversacion
      ? creadaDesdeNueva.current.clave
      : `conversacion-${idConversacion}`;
  const mensajesListos = esNueva || Boolean(messagesCache[idConversacion]);
  const aviso = !enConversacion ? location.state?.aviso : null;

  return (
    <div className="home-screen">
      <CabezaDeNavegacion onLogout={onLogout} />

      <main className={`chatbot-history-screen${enConversacion ? " chatbot-history-screen--conversation" : ""}`}>
        {!enConversacion ? (
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

              {aviso && <p className="chatbot-history-aviso" role="status">{aviso}</p>}
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
                      className={`chatbot-history-item${ultimaConversacion === conversacion.id ? " is-active" : ""}`}
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
        ) : !mensajesListos ? (
          <p>Cargando conversación...</p>
        ) : (
          <ChatConversationView
            key={claveVista}
            conversacionId={esNueva ? null : idConversacion}
            mensajesIniciales={esNueva ? [] : messagesCache[idConversacion]}
            onBack={volverALista}
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
  const [textoEnviando, setTextoEnviando] = useState(null);
  const [inicioEnvio, setInicioEnvio] = useState(null); // Date.now() del envio en curso (contador de espera)
  const [accionEnCurso, setAccionEnCurso] = useState(null); // { id, accion } mientras se reintenta/cancela/elimina
  const mensajesRef = useRef(mensajesIniciales);
  mensajesRef.current = messages;
  // Cada envio/accion tiene un numero: si el usuario cancela mientras el servidor sigue
  // esperando al asistente (que no se puede abortar), la respuesta que llegue despues
  // pertenece a un envio ya abandonado y se IGNORA, sin tocar la pantalla.
  const contadorEnvios = useRef(0);
  const contadorAcciones = useRef(0);
  const conversacionEnVuelo = useRef(null);
  const [cancelandoEnvio, setCancelandoEnvio] = useState(false);

  const entradaRef = useRef(null);

  // Fase C: una conversacion con un mensaje sin resolver (pendiente, procesando,
  // error o cancelado) no admite otra pregunta: hay que reintentarlo o eliminarlo.
  const bloqueada = conversacionBloqueada(messages);

  // Al desbloquearse la conversacion (reintento que responde, mensaje eliminado) el foco vuelve
  // al cuadro de texto: sin esto, el boton pulsado desaparece y el foco se pierde.
  const estabaBloqueada = useRef(bloqueada);
  useEffect(() => {
    if (estabaBloqueada.current && !bloqueada && !sending) entradaRef.current?.focus();
    estabaBloqueada.current = bloqueada;
  }, [bloqueada, sending]);

  const actualizarMensajes = (convId, calcular) => {
    const actualizados = calcular(mensajesRef.current);
    mensajesRef.current = actualizados;
    setMessages(actualizados);
    onMensajesActualizados(convId, actualizados);
  };

  // Si se recarga la pagina (o se abre en otra pestana) mientras un mensaje esta
  // 'procesando', esta pantalla no es quien espera la respuesta: se consulta cada
  // pocos segundos hasta que cambie de estado (el servidor lo pasa a error a los
  // 4 min si nadie responde).
  const hayAlgoEnProceso = hayEnProceso(messages);
  useEffect(() => {
    if (conversacionId == null || sending || accionEnCurso || !hayAlgoEnProceso) return undefined;
    let activo = true;
    const sondeo = setInterval(async () => {
      try {
        const lista = await listarMensajes(conversacionId, onLogout);
        if (activo) actualizarMensajes(conversacionId, () => lista);
      } catch {
        /* se reintenta en el siguiente intervalo */
      }
    }, INTERVALO_SONDEO_MS);
    return () => {
      activo = false;
      clearInterval(sondeo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionId, sending, accionEnCurso, hayAlgoEnProceso]);

  const handleSend = async () => {
    const contenido = input.trim();
    if (!contenido || sending || bloqueada) return;

    const miEnvio = ++contadorEnvios.current;
    setSending(true);
    setSendError(null);
    setInput("");
    setTextoEnviando(contenido);
    setInicioEnvio(Date.now());

    try {
      let convId = conversacionId;
      if (convId == null) {
        const nueva = await crearConversacion(onLogout);
        convId = nueva.id;
        onConversacionCreada(nueva);
      }

      conversacionEnVuelo.current = convId;
      const resultado = await enviarMensaje(convId, contenido, onLogout);
      if (miEnvio !== contadorEnvios.current) return; // el usuario lo cancelo mientras esperaba
      actualizarMensajes(convId, (actuales) => aplicarIntercambio(actuales, resultado));
    } catch (err) {
      if (miEnvio !== contadorEnvios.current) return;
      if (err.status !== 401) {
        if (err.mensajeUsuario) {
          // El servidor ya guardo el mensaje (con su estado, p. ej. 'error'): vive en
          // el historial con sus botones; no se restaura el texto en el cuadro.
          actualizarMensajes(conversacionId ?? err.mensajeUsuario.conversacion_id, (actuales) => aplicarMensaje(actuales, err.mensajeUsuario));
          if (err.mensajeUsuario.estado === "respondido") refrescarConversacion(conversacionId ?? err.mensajeUsuario.conversacion_id);
        } else if (err.mensajePendiente) {
          // 409: ya habia un mensaje sin resolver (p. ej. enviado desde otra pestana).
          actualizarMensajes(conversacionId ?? err.mensajePendiente.conversacion_id, (actuales) => aplicarMensaje(actuales, err.mensajePendiente));
          setSendError(err.message);
          setInput(contenido);
        } else {
          setSendError(err.message || "No se pudo enviar el mensaje");
          setInput(contenido);
        }
      }
    } finally {
      if (miEnvio === contadorEnvios.current) {
        setSending(false);
        setTextoEnviando(null);
      }
    }
  };

  // Cancelar el mensaje que se esta enviando AHORA (el servidor aun no ha devuelto su id):
  // se busca en el historial el mensaje en proceso y se cancela. Como el servidor no puede
  // abortar al asistente, la pantalla no espera su respuesta: muestra el mensaje cancelado
  // al instante y descarta lo que llegue despues.
  const cancelarEnVuelo = async () => {
    const convId = conversacionEnVuelo.current;
    if (cancelandoEnvio) return;
    if (convId == null) {
      setSendError("Todavía no se pudo registrar el mensaje; inténtalo de nuevo en un momento.");
      return;
    }
    setCancelandoEnvio(true);
    try {
      const lista = await listarMensajes(convId, onLogout);
      const enProceso = lista.find((m) => m.rol === "usuario" && (m.estado === "procesando" || m.estado === "pendiente"));
      if (!enProceso) {
        setSendError("No hay un mensaje en proceso para cancelar (puede que ya haya terminado).");
        return;
      }
      const cancelado = await cancelarMensaje(enProceso.id, onLogout);
      contadorEnvios.current += 1; // invalida el envio en curso
      actualizarMensajes(convId, () => aplicarMensaje(lista, cancelado));
      setSending(false);
      setTextoEnviando(null);
    } catch (err) {
      if (err.status !== 401) setSendError(err.message || "No se pudo cancelar el mensaje");
    } finally {
      setCancelandoEnvio(false);
    }
  };

  // Un 409 que informa que el mensaje YA esta 'respondido' (lo cerro otro intento) no trae la
  // respuesta del asistente: se vuelve a leer la conversacion para mostrarla.
  const refrescarConversacion = async (convId) => {
    try {
      const lista = await listarMensajes(convId, onLogout);
      actualizarMensajes(convId, () => lista);
    } catch {
      /* el sondeo o la siguiente accion lo corrigen */
    }
  };

  // Fase C: botones Reintentar / Cancelar / Eliminar de un mensaje sin resolver.
  const ejecutarAccion = async (mensaje, accion) => {
    if (accionEnCurso && accion !== "cancelar") return; // cancelar SI se permite mientras se reintenta
    const miAccion = ++contadorAcciones.current;
    setAccionEnCurso({ id: mensaje.id, accion, desde: Date.now() });
    setSendError(null);
    const convId = mensaje.conversacion_id;
    try {
      if (accion === "reintentar") {
        actualizarMensajes(convId, (lista) => aplicarMensaje(lista, { ...mensaje, estado: "procesando", error_detalle: null }));
        const resultado = await reintentarMensaje(mensaje.id, onLogout);
        if (miAccion !== contadorAcciones.current) return; // cancelado mientras esperaba
        actualizarMensajes(convId, (lista) => aplicarIntercambio(lista, resultado));
      } else if (accion === "cancelar") {
        const cancelado = await cancelarMensaje(mensaje.id, onLogout);
        contadorAcciones.current += 1; // invalida un reintento en curso: su respuesta se ignora
        actualizarMensajes(convId, (lista) => aplicarMensaje(lista, cancelado));
        setAccionEnCurso(null);
        return;
      } else {
        await eliminarMensaje(mensaje.id, onLogout);
        actualizarMensajes(convId, (lista) => quitarMensaje(lista, mensaje.id));
      }
    } catch (err) {
      if (err.status === 401 || miAccion !== contadorAcciones.current) return;
      if (err.mensajeUsuario) {
        actualizarMensajes(convId, (lista) => aplicarMensaje(lista, err.mensajeUsuario));
        if (err.mensajeUsuario.estado === "respondido") refrescarConversacion(convId);
      } else if (accion === "reintentar") {
        actualizarMensajes(convId, (lista) => aplicarMensaje(lista, mensaje)); // deshace el "procesando" optimista
      }
      const loCanceloElUsuario = err.mensajeUsuario?.estado === "cancelado"; // el 409 de un reintento que el propio usuario cancelo no es un error
      if (!err.mensajeUsuario || (err.status === 409 && !loCanceloElUsuario)) setSendError(err.message || "No se pudo completar la acción");
    } finally {
      if (miAccion === contadorAcciones.current) setAccionEnCurso(null);
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
            <Presencia visible={mensaje.rol === "usuario" && estadoDe(mensaje) !== "respondido"}>
              <MensajeEstado
                mensaje={mensaje}
                accionEnCurso={accionEnCurso}
                onAccion={(accion) => ejecutarAccion(mensaje, accion)}
              />
            </Presencia>
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

        {sending && textoEnviando && (
          <div className="chatbot-user-response">
            <div className="chatbot-conversation-message chatbot-conversation-message--user">{textoEnviando}</div>
          </div>
        )}

        <Presencia visible={sending} className="chat-presencia--espera">
          <IndicadorEspera
            desde={inicioEnvio}
            onCancelar={cancelarEnVuelo}
            cancelando={cancelandoEnvio}
            etiquetaCancelar="Cancelar el mensaje que se está enviando"
          />
        </Presencia>
      </div>

      {sendError && <AvisoError key={sendError} texto={sendError} onCerrar={() => setSendError(null)} />}
      {feedbackError && <AvisoError key={feedbackError} texto={feedbackError} onCerrar={() => setFeedbackError(null)} />}
      {bloqueada && !sending && (
        <p id="chatbot-aviso-bloqueo" className="chatbot-composer-bloqueado" role="status">
          Tienes un mensaje sin respuesta. Reintenta o elimínalo para poder enviar otra pregunta.
        </p>
      )}

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
          placeholder={bloqueada ? "Resuelve el mensaje pendiente (reintentar o eliminar)..." : "Escribe tu pregunta..."}
          aria-label="Mensaje"
          aria-describedby={bloqueada && !sending ? "chatbot-aviso-bloqueo" : undefined}
          ref={entradaRef}
          disabled={sending || bloqueada}
        />
        <button type="button" aria-label="Enviar mensaje" onClick={handleSend} disabled={sending || bloqueada || !input.trim()}>→</button>
      </div>
    </section>
  );
}

export default ChatBotScreen;
