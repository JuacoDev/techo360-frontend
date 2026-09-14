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

// -------------------
// Login
// -------------------
export async function login(identifier, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) {
    throw new Error("Credenciales inválidas");
  }

  return await response.json(); // { access_token, token_type }
}

// -------------------
// Obtener usuario autenticado
// -------------------
export async function getCurrentUser() {
  const token = getToken();

  if (!token) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Token inválido o expirado");
  }

  return await response.json();
}

// -------------------
// Registro de usuario
// -------------------
export async function registerUser(data) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Error al registrar usuario");
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

