// Estados del reporte asincrono (backend: routers/reportes.py).
export const ESTADOS_EN_CURSO = ["pendiente", "procesando"];
export const enCurso = (reporte) => ESTADOS_EN_CURSO.includes(reporte?.estado);

// Cuerpo de POST /api/reportes/generar. El backend (schemas/reporte.py) exige
// periodo / opciones / zonas ANIDADOS; los campos sueltos dan 422.
export function armarSolicitudReporte({
  formato,
  plantilla,
  anioInicio,
  anioFin,
  titulo,
  introduccion,
  conclusiones,
  graficas = [],
  reemplaza = null,
  comentarios,
  variables,
  departamentos,
  municipios,
}) {
  const codigos = (zonas) => zonas.map((zona) => String(zona.codigo));
  const conTexto = Object.fromEntries(
    Object.entries(comentarios ?? {}).filter(([, texto]) => texto && texto.trim())
  );
  return {
    formato,
    periodo: { anio_inicio: Number(anioInicio), anio_fin: Number(anioFin) },
    opciones: {
      titulo: titulo?.trim() || "Informe de Indicadores",
      introduccion: introduccion ?? "",
      conclusiones: conclusiones ?? "",
      incluir_graficas: graficas.length > 0,
      plantilla: plantilla ?? null,
      comentarios: conTexto,
    },
    variables: variables.map((variable) => variable.id ?? variable),
    zonas: { departamentos: codigos(departamentos), municipios: codigos(municipios) },
    // Gráficas elegidas, en el orden en que se muestran; el modo general usa todas las zonas seleccionadas.
    graficas: graficas.map((grafica) => ({
      id: grafica.id,
      tipo: grafica.tipo,
      modo: grafica.modo,
      variables: [...grafica.variables],
      zonas: grafica.modo === "general" ? [] : [...grafica.zonas],
      titulo: grafica.titulo?.trim() ?? "",
    })),
    // Id de un reporte del historial al que reemplaza esta versión ("seguir editándolo").
    ...(reemplaza ? { reemplaza } : {}),
  };
}

// Inversa de armarSolicitudReporte: la configuración guardada (public.reportes.solicitud) vuelve al
// formulario. Devuelve códigos de zona; la pantalla los cruza con sus listas para obtener los objetos.
export function solicitudAEstado(solicitud) {
  const opciones = solicitud?.opciones ?? {};
  const graficas = (solicitud?.graficas ?? []).map((grafica) => ({
    id: grafica.id,
    tipo: grafica.tipo,
    modo: grafica.modo,
    variables: [...(grafica.variables ?? [])],
    zonas: [...(grafica.zonas ?? [])],
    titulo: grafica.titulo ?? "",
  }));
  return {
    formato: solicitud?.formato ?? "pdf",
    plantilla: opciones.plantilla ?? null,
    anioInicio: solicitud?.periodo?.anio_inicio ?? 2020,
    anioFin: solicitud?.periodo?.anio_fin ?? 2025,
    titulo: opciones.titulo ?? "Informe de Indicadores",
    introduccion: opciones.introduccion ?? "",
    conclusiones: opciones.conclusiones ?? "",
    comentarios: { ...(opciones.comentarios ?? {}) },
    variables: [...(solicitud?.variables ?? [])],
    departamentos: [...(solicitud?.zonas?.departamentos ?? [])],
    municipios: [...(solicitud?.zonas?.municipios ?? [])],
    graficas,
  };
}

// «hace 5 min», «hace 3 h», «ayer», «hace 4 días», «hace 3 semanas», «hace 2 meses».
export function tiempoRelativo(fecha, ahora = Date.now()) {
  const instante = typeof fecha === "number" ? fecha : Date.parse(fecha);
  if (!Number.isFinite(instante)) return "";
  const segundos = Math.max(0, Math.round((ahora - instante) / 1000));
  if (segundos < 45) return "hace un momento";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  const semanas = Math.round(dias / 7);
  if (dias < 30) return `hace ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
  const meses = Math.round(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
  const anios = Math.round(dias / 365);
  return `hace ${anios} ${anios === 1 ? "año" : "años"}`;
}

// Validacion previa (mismos limites que el backend) para avisar antes de enviar.
export function validarPeriodo(anioInicio, anioFin) {
  const ini = Number(anioInicio);
  const fin = Number(anioFin);
  if (![ini, fin].every((anio) => Number.isInteger(anio) && anio >= 2000 && anio <= 2042)) {
    return "Los años deben estar entre 2000 y 2042.";
  }
  if (ini > fin) return "El año de inicio no puede ser mayor que el año fin.";
  return "";
}

// FastAPI devuelve `detail` como texto (errores propios) o como lista de
// {loc, msg} (422 de validacion); nunca se debe mostrar el objeto crudo.
export function mensajeDeError(result, porDefecto) {
  const detalle = result?.detail ?? result?.message;
  if (typeof detalle === "string" && detalle) return detalle;
  if (Array.isArray(detalle) && detalle.length > 0) {
    return detalle
      .map((item) => {
        const campo = Array.isArray(item?.loc) ? item.loc.filter((parte) => parte !== "body").join(".") : "";
        const texto = item?.msg ?? "valor no válido";
        return campo ? `${campo}: ${texto}` : texto;
      })
      .join(" · ");
  }
  return porDefecto;
}
