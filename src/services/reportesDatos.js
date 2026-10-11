// Estados del reporte asincrono (backend: routers/reportes.py).
export const ESTADOS_EN_CURSO = ["pendiente", "procesando"];
export const enCurso = (reporte) => ESTADOS_EN_CURSO.includes(reporte?.estado);

// Cuerpo de POST /api/reportes/generar. El backend (schemas/reporte.py) exige
// periodo / opciones / zonas ANIDADOS; los campos sueltos dan 422.
export function armarSolicitudReporte({
  formato,
  anioInicio,
  anioFin,
  titulo,
  introduccion,
  conclusiones,
  incluirGraficas,
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
      incluir_graficas: Boolean(incluirGraficas),
      comentarios: conTexto,
    },
    variables: variables.map((variable) => variable.id ?? variable),
    zonas: { departamentos: codigos(departamentos), municipios: codigos(municipios) },
  };
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
