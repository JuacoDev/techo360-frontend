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
    `${API_URL}/api/proyecciones?codigo_municipio=${zonaCodigo}&indicador=${indicador}&desde=${desde}&hasta=${hasta}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
    logout
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.detail || "Error al obtener proyección");
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
  return result;
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
    const error = new Error(mensaje);
    error.status = response.status;
    throw error;
  }
  return result;
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
  return result;
}