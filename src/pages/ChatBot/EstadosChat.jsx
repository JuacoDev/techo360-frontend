import { useEffect, useRef, useState } from "react";
import { accionesDe, estadoDe, etiquetaEstado } from "../../services/estadosMensaje.js";
import { faseEspera, formatearTranscurrido, segundosDesde } from "../../services/esperaChat.js";
import { mensajeAmigableErrorChat } from "../../services/mensajesError.js";

// Piezas visuales de los estados del chat: espera larga, error, cancelado y sus
// botones. Solo presentacion: la semantica (estadosMensaje.js) y las llamadas
// (reintentar/cancelar/eliminar) siguen en ChatBotScreen.jsx.

const propsIcono = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" };

export function IconoReintentar() {
  return (
    <svg {...propsIcono}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

export function IconoCancelar() {
  return (
    <svg {...propsIcono}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconoEliminar() {
  return (
    <svg {...propsIcono}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

export function IconoAlerta() {
  return (
    <svg {...propsIcono} width={18} height={18}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  );
}

// Segundos desde `desdeMs`, actualizados cada segundo mientras el componente vive.
function useSegundosDesde(desdeMs) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return segundosDesde(desdeMs, ahora);
}

// Monta/desmonta con transicion de entrada y salida: al pasar a visible=false
// conserva el ultimo contenido unos ms con la clase de salida (inerte, sin foco).
export function Presencia({ visible, children, className = "", duracion = 200 }) {
  const [montado, setMontado] = useState(visible);
  const ultimo = useRef(children);
  if (visible) ultimo.current = children;

  useEffect(() => {
    if (visible) {
      setMontado(true);
      return undefined;
    }
    const t = setTimeout(() => setMontado(false), duracion);
    return () => clearTimeout(t);
  }, [visible, duracion]);

  if (!visible && !montado) return null;
  return (
    <div className={`chat-presencia ${visible ? "chat-presencia--entra" : "chat-presencia--sale"} ${className}`.trim()} inert={!visible}>
      {visible ? children : ultimo.current}
    </div>
  );
}

// Espera de la respuesta: puntos animados, fase (lee/redacta/cola/larga) y el
// tiempo transcurrido. El contador no esta en la region viva (no se anuncia cada
// segundo); solo el cambio de fase.
export function IndicadorEspera({ desde, onCancelar, cancelando = false, etiquetaCancelar, compacto = false }) {
  const segundos = useSegundosDesde(desde);
  const { fase, titulo, pista } = faseEspera(segundos);
  return (
    <div className={`chat-espera chat-espera--${fase}${compacto ? " chat-espera--compacta" : ""}`}>
      <div className="chat-espera-fila">
        <span className="chat-espera-puntos" aria-hidden="true"><i /><i /><i /></span>
        <span className="chat-espera-titulo" role="status" aria-live="polite">{titulo}</span>
        <span className="chat-espera-tiempo" aria-hidden="true">{formatearTranscurrido(segundos)}</span>
      </div>
      {!compacto && <p className="chat-espera-pista">{pista}</p>}
      {onCancelar && (
        <button type="button" className="chat-boton chat-boton--sutil" onClick={onCancelar} disabled={cancelando} aria-label={etiquetaCancelar}>
          <IconoCancelar />
          <span>{cancelando ? "Cancelando…" : "Cancelar"}</span>
        </button>
      )}
    </div>
  );
}

// Aviso de error general (fallo al enviar, 409, accion fallida) con texto amigable.
// `key` en el padre = texto, para que vuelva a sacudirse cuando cambia el error.
export function AvisoError({ texto, onCerrar }) {
  return (
    <div className="chat-aviso-error" role="alert">
      <IconoAlerta />
      <span>{mensajeAmigableErrorChat({ detalle: texto })}</span>
      {onCerrar && (
        <button type="button" className="chat-aviso-cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
          <IconoCancelar />
        </button>
      )}
    </div>
  );
}

// Estado de un mensaje de usuario que NO esta respondido, con sus botones.
// El contador de un reintento en curso arranca en accionEnCurso.desde; si no, en la
// fecha del mensaje (p. ej. al recargar con un mensaje 'procesando').
export function MensajeEstado({ mensaje, accionEnCurso, onAccion }) {
  const estado = estadoDe(mensaje);
  const acciones = accionesDe(mensaje);
  const ocupado = accionEnCurso?.id === mensaje.id;
  const enProceso = estado === "procesando" || estado === "pendiente";
  const resumen = mensaje.contenido.length > 40 ? `${mensaje.contenido.slice(0, 40)}…` : mensaje.contenido;

  if (enProceso) {
    const desde = ocupado && accionEnCurso.desde ? accionEnCurso.desde : Date.parse(mensaje.fecha);
    return (
      <div className="chat-estado chat-estado--proceso">
        <IndicadorEspera
          compacto
          desde={desde}
          onCancelar={acciones.cancelar ? () => onAccion("cancelar") : undefined}
          etiquetaCancelar={`Cancelar el mensaje: ${resumen}`}
        />
      </div>
    );
  }

  const esError = estado === "error";
  const texto = esError ? mensajeAmigableErrorChat({ detalle: mensaje.error_detalle }) : etiquetaEstado(mensaje);
  return (
    <div className={`chat-estado chat-estado--${estado}`} role={esError ? "alert" : "status"}>
      <span className="chat-estado-texto">
        {esError && <IconoAlerta />}
        <span>{texto}</span>
      </span>
      <span className="chat-estado-acciones">
        {acciones.reintentar && (
          <button type="button" className="chat-boton chat-boton--primario" aria-label={`Reintentar el mensaje: ${resumen}`} disabled={Boolean(accionEnCurso)} onClick={() => onAccion("reintentar")}>
            <IconoReintentar />
            <span>{ocupado && accionEnCurso.accion === "reintentar" ? "Reintentando…" : "Reintentar"}</span>
          </button>
        )}
        {acciones.cancelar && (
          <button type="button" className="chat-boton chat-boton--sutil" aria-label={`Cancelar el mensaje: ${resumen}`} disabled={Boolean(accionEnCurso)} onClick={() => onAccion("cancelar")}>
            <IconoCancelar />
            <span>Cancelar</span>
          </button>
        )}
        {acciones.eliminar && (
          <button type="button" className="chat-boton chat-boton--sutil" aria-label={`Eliminar el mensaje: ${resumen}`} disabled={Boolean(accionEnCurso)} onClick={() => onAccion("eliminar")}>
            <IconoEliminar />
            <span>Eliminar</span>
          </button>
        )}
      </span>
    </div>
  );
}
