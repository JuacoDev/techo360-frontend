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
// Obtener información de una zona
// -------------------------------------
export async function getZonaInfo(codigo, nivel = "municipio", anio = 2024) {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/zonas?nivel=${nivel}&anio=${anio}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Error al obtener información de la zona");
  }

  const data = await response.json();
  // Buscar la zona por código dentro del FeatureCollection
  const feature = data.features.find(f => f.properties.codigo === codigo);
  return feature ? feature.properties : null;
}

export async function getZonaDetalle(id) {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/zonas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Error al obtener detalle de la zona");
  }

  return await response.json(); 
}

// -------------------
// obtener lista de departamentos y municipios
// -------------------
export async function getDepartamentos() {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/zonas?nivel=departamento`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Error al obtener departamentos");
  const data = await response.json();

  return data.features.map(f => ({
    codigo: f.properties.codigo,
    nombre: f.properties.nombre
  }));
}

export async function getMunicipios(anio = 2024) {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/zonas?nivel=municipio&anio=${anio}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Error al obtener municipios");
  const data = await response.json();
  return data.features.map(f => ({
    codigo: f.properties.codigo,
    nombre: f.properties.nombre
  }));
}

