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
    const error = new Error(result.detail || "Error al obtener proyección");
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
    const error = new Error(
      result.detail || "Error al obtener proyección de zonas"
    );

    error.status = response.status;

    throw error;
  }

  return result;
}