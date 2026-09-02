// src/services/api.js

// URL base del backend (se toma de tu .env.front)
export const API_URL = import.meta.env.VITE_API_URL;

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
// Registro de usuario (ejemplo)
// -------------------
export async function registerUser(data) {
  const response = await fetch(`${API_URL}/usuarios/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Error al registrar usuario");
  }

  return await response.json();
}
