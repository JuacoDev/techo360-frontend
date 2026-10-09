// src/services/api.js

// URL base del backend (se toma de tu .env.front)
export const API_URL = import.meta.env.VITE_API_URL;

// Año de los indicadores mostrados en toda la app -- sin selector de año
// en la UI todavia, asi que este es el UNICO punto donde se fija. Cambiar
// este valor (pendiente de decision -- depende de si se logra ingerir
// 2024 completo o si se usa un año con mejor cobertura ya existente) es
// lo unico que hace falta tocar; nada mas en el codigo debe tener el año
// escrito literal.
export const ANIO_INDICADORES = 2024;

// Indicador que pide el mapa de proyección a GET /api/proyecciones/zonas
// (ver Proyectadas.jsx::generarProyeccion). Si el backend con soporte
// para "score_privacion" se despliega DESPUES que este frontend,
// cambiar esto a "densidad_poblacional" (lo único que el backend viejo
// acepta) hasta que el despliegue del backend esté al día.
export const INDICADOR_PROYECCION_MAPA = "score_privacion";

// -------------------
// Token guardado tras el login (localStorage si "Recordarme" estaba
// marcado, sessionStorage si no -- ver Login.jsx) -- centralizado aqui
// para no repetir la misma búsqueda en cada lugar que llama al backend
// con sesión.
// -------------------
export function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export function limpiarToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

export { extraerMensajeDetalle } from "./mensajesError.js";
import { extraerMensajeDetalle } from "./mensajesError.js";
import { normalizarIntercambio, normalizarMensaje, normalizarMensajes } from "./estadosMensaje.js";

export async function fetchConSesion(url, options = {}, logout) {
  const token = getToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  // Manejo uniforme de 401
  if (response.status === 401) {
    logout?.();
    const error = new Error("Sesión expirada");
    error.status = 401;
    throw error;
  }

  return response;
}

export async function getZonasMunicipios(anio, logout) {
  const parametros = new URLSearchParams({ nivel: "municipio" });
  if (anio != null) parametros.set("anio", String(anio));
  const response = await fetchConSesion(
    `${API_URL}/api/zonas?${parametros}`,
    {},
    logout
  );
  const result = await response.json().catch(() => ({}));
  

  if (!response.ok) {
    const error = new Error(result.detail || "Error al obtener los datos del mapa");
    error.status = response.status;
    throw error;
  }

  return result;
}

export async function getZonasDepartamentos(anio, logout) {
  const parametros = new URLSearchParams({ nivel: "departamento" });
  if (anio != null) parametros.set("anio", String(anio));
  const response = await fetchConSesion(
    `${API_URL}/api/zonas?${parametros}`,
    {},
    logout
  );
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.detail || "Error al obtener los departamentos del mapa");
    error.status = response.status;
    throw error;
  }

  return result;
}

// -------------------
// Login
// -------------------
export async function login(identifier, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.detail || "Credenciales inválidas");
    error.status = response.status;
    throw error;
  }

  return result; 
}

// -------------------
// Obtener usuario autenticado
// -------------------
export async function getCurrentUser(logout) {
  const response = await fetchConSesion(`${API_URL}/auth/me`, {}, logout);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.detail || "Token inválido o expirado");
    error.status = response.status;
    throw error;
  }

  return result;
}

// -------------------
// Registro de usuario
// -------------------
export async function registerUser(data) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.detail || "Error al registrar usuario");
    error.status = response.status;
    throw error;
  }

  return result;
}

// -------------------------------------
// OTP (verificacion de correo -- registro y recuperacion de contraseña)
// -------------------------------------
export async function requestOtp(email, name = "") {
  const response = await fetch(`${API_URL}/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    // .status se usa en la UI para distinguir 400 (codigo/cooldown
    // invalido) de 429 (rate limit) y mostrar un mensaje distinto en
    // cada caso -- ver VerificarCodigoOTP.jsx.
    const error = new Error(result.detail || "No se pudo enviar el código de verificación");
    error.status = response.status;
    throw error;
  }

  return result; // { status, email }
}

export async function verifyOtp(email, code) {
  const response = await fetch(`${API_URL}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.detail || "Código inválido");
    error.status = response.status;
    throw error;
  }

  return result; // { status, email }
}


// -------------------
// Resetear contraseña (recuperación con OTP)
// -------------------
export async function resetPassword(email, code, newPassword) {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      code,
      new_password: newPassword,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.detail || "Error al cambiar la contraseña");
    error.status = response.status;
    throw error;
  }

  return result;
}


// -------------------
// Proyecciones de indicadores
// -------------------
export async function getProyeccion(zonaCodigo, indicador, desde, hasta, logout) {
  const response = await fetchConSesion(
    `${API_URL}/api/proyecciones/serie?codigo_municipio=${zonaCodigo}&indicador=${indicador}&desde=${desde}&hasta=${hasta}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
    logout
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(extraerMensajeDetalle(result.detail) || "Error al obtener proyección");
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function getProyeccionZonas(
  anio,
  indicador = "densidad_poblacional",
  logout
) {
  const response = await fetchConSesion(
    `${API_URL}/api/proyecciones/zonas?anio=${anio}&indicador=${indicador}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    logout
  );

  const result = await response.json().catch(() => ({}));
  

  if (!response.ok) {
    const mensaje = extraerMensajeDetalle(result.detail);
    if (result.detail != null && mensaje === null) {
      console.error(
        "getProyeccionZonas: detail no interpretable, se muestra mensaje genérico:",
        result.detail
      );
    }

    const error = new Error(mensaje || "Error al obtener proyección de zonas");
    error.status = response.status;
    error.detail = result.detail;

    throw error;
  }

  return result;
}

export async function getRangoProyeccionZonas(logout) {
  const response = await fetchConSesion(
    `${API_URL}/api/proyecciones/rango`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    logout
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.detail || "Error al obtener el rango de años");
    error.status = response.status;
    throw error;
  }

  return result;
}

// -------------------
// ChatBot
// -------------------
// consentimiento_entrenamiento siempre true: es obligatorio como
// condicion del registro de cuenta (decision de producto), no hay
// control de consentimiento por conversacion en la UI.
export async function crearConversacion(logout) {
  const response = await fetchConSesion(
    `${API_URL}/chatbot/conversaciones`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentimiento_entrenamiento: true }),
    },
    logout
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.detail || "No se pudo crear la conversación");
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function listarConversaciones(logout) {
  const response = await fetchConSesion(`${API_URL}/chatbot/conversaciones`, { method: "GET" }, logout);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.detail || "No se pudo cargar el historial de conversaciones");
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function listarMensajes(conversacionId, logout) {
  const response = await fetchConSesion(
    `${API_URL}/chatbot/conversaciones/${conversacionId}/mensajes`,
    { method: "GET" },
    logout
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.detail || "No se pudo cargar la conversación");
    error.status = response.status;
    throw error;
  }
  return normalizarMensajes(result);
}

// Errores de enviar/reintentar/cancelar/eliminar (fase C): el backend con
// estados activos devuelve, ademas de `detail` (texto), el mensaje ya guardado
// con su estado (`mensaje_usuario`, o `mensaje_pendiente` en el 409 por bloqueo).
// Se adjuntan al error para que la pantalla los muestre con sus botones. Un
// backend sin estados no manda esos campos: quedan en undefined.
function errorDeChatbot(response, result, mensajePorDefecto) {
  const error = new Error(extraerMensajeDetalle(result.detail) || mensajePorDefecto);
  error.status = response.status;
  error.mensajeUsuario = normalizarMensaje(result.mensaje_usuario);
  error.mensajePendiente = normalizarMensaje(result.mensaje_pendiente);
  return error;
}

// La respuesta real del asistente corre sobre Ollama sin GPU en el VPS
// -- puede tardar varios segundos; no hay timeout del lado del cliente,
// el backend ya controla el suyo (services/chatbot_rpc_client.py) y
// responde 503/504 si el asistente no esta disponible o no contesta a
// tiempo.
export async function enviarMensaje(conversacionId, contenido, logout) {
  const response = await fetchConSesion(
    `${API_URL}/chatbot/conversaciones/${conversacionId}/mensajes/enviar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    },
    logout
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    let mensaje = result.detail || "El asistente no pudo responder";
    if (response.status === 503) mensaje = result.detail || "El asistente no está disponible en este momento";
    if (response.status === 504) mensaje = "El asistente tardó demasiado en responder, intenta de nuevo";
    const error = errorDeChatbot(response, result, mensaje);
    error.message = mensaje;
    throw error;
  }
  return normalizarIntercambio(result);
}

// Fase C: reintentar (error|cancelado -> procesando) con el MISMO mensaje.
// Devuelve el intercambio completo, igual que enviarMensaje.
export async function reintentarMensaje(mensajeId, logout) {
  const response = await fetchConSesion(
    `${API_URL}/chatbot/mensajes/${mensajeId}/reintentar`,
    { method: "POST" },
    logout
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw errorDeChatbot(response, result, "No se pudo reintentar el mensaje");
  return normalizarIntercambio(result);
}

// Fase C: cancelar la espera de un mensaje (devuelve el mensaje, ya 'cancelado').
export async function cancelarMensaje(mensajeId, logout) {
  const response = await fetchConSesion(
    `${API_URL}/chatbot/mensajes/${mensajeId}/cancelar`,
    { method: "POST" },
    logout
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw errorDeChatbot(response, result, "No se pudo cancelar el mensaje");
  return normalizarMensaje(result);
}

// Fase C: eliminar un mensaje sin resolver (204 sin cuerpo).
export async function eliminarMensaje(mensajeId, logout) {
  const response = await fetchConSesion(
    `${API_URL}/chatbot/mensajes/${mensajeId}`,
    { method: "DELETE" },
    logout
  );
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw errorDeChatbot(response, result, "No se pudo eliminar el mensaje");
  }
}

export async function enviarFeedbackMensaje(mensajeId, feedbackUtil, logout) {
  const response = await fetchConSesion(
    `${API_URL}/chatbot/mensajes/${mensajeId}/feedback`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback_util: feedbackUtil }),
    },
    logout
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.detail || "No se pudo registrar tu opinión");
    error.status = response.status;
    throw error;
  }
  return normalizarMensaje(result);
}