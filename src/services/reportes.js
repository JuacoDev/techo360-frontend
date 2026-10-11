import { API_URL, fetchConSesion } from "./api.js";

import { armarSolicitudReporte, enCurso, ESTADOS_EN_CURSO, mensajeDeError, solicitudAEstado, tiempoRelativo, validarPeriodo } from "./reportesDatos.js";

export { armarSolicitudReporte, enCurso, ESTADOS_EN_CURSO, mensajeDeError, solicitudAEstado, tiempoRelativo, validarPeriodo };

async function jsonOError(response, porDefecto) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(mensajeDeError(result, porDefecto));
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function solicitarReporte(solicitud, logout) {
  const response = await fetchConSesion(
    `${API_URL}/api/reportes/generar`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(solicitud) },
    logout
  );
  return jsonOError(response, "No se pudo enviar la solicitud del reporte.");
}

// Escenas vectoriales de las gráficas elegidas, en su orden (las mismas que dibuja el PDF); `ancho` es el
// del lienzo (IEEE usa 360: una columna). Mismos datos y reglas que el archivo.
export async function escenasDeGraficas(solicitud, ancho, logout, signal) {
  const response = await fetchConSesion(
    `${API_URL}/api/reportes/graficas?ancho=${ancho}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(solicitud), signal },
    logout
  );
  return jsonOError(response, "No se pudo cargar la vista previa de las gráficas.");
}

// Historial: solo configuraciones (nunca el archivo), el más reciente primero.
export async function listarHistorial(logout, limite = 30) {
  const response = await fetchConSesion(`${API_URL}/api/reportes/historial?limite=${limite}`, {}, logout);
  return jsonOError(response, "No se pudo cargar el historial.");
}

export async function obtenerSolicitudGuardada(id, logout) {
  const response = await fetchConSesion(`${API_URL}/api/reportes/${id}/solicitud`, {}, logout);
  return jsonOError(response, "No se pudo abrir la configuración de ese reporte.");
}

export async function eliminarDelHistorial(id, logout) {
  const response = await fetchConSesion(`${API_URL}/api/reportes/${id}`, { method: "DELETE" }, logout);
  if (!response.ok) await jsonOError(response, "No se pudo quitar el reporte del historial.");
}

export async function consultarReporte(id, logout) {
  const response = await fetchConSesion(`${API_URL}/api/reportes/${id}`, {}, logout);
  return jsonOError(response, "No se pudo consultar el estado del reporte.");
}

export async function listarReportes(logout, page = 1, pageSize = 10) {
  const response = await fetchConSesion(
    `${API_URL}/api/reportes?page=${page}&page_size=${pageSize}`,
    {},
    logout
  );
  return jsonOError(response, "No se pudo obtener el historial de reportes.");
}

// La descarga exige el token (Authorization), asi que no sirve un <a href>:
// se baja como blob y se guarda con un enlace temporal.
export async function descargarReporte(reporte, logout) {
  const response = await fetchConSesion(`${API_URL}${reporte.descarga_url}`, {}, logout);
  if (!response.ok) await jsonOError(response, "No se pudo descargar el reporte.");
  const blob = await response.blob();
  const extension = reporte.formato === "excel" ? "xlsx" : "pdf";
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `reporte_${reporte.id}.${extension}`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
