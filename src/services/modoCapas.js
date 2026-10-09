// Modo de capas del mapa (Municipios | Hibrido | Departamentos) como reducer
// puro: se usa con useReducer en MapView/SelectorCapasMapa (eventos seguidos en
// el mismo tick se aplican en orden, sin perder ninguno) y se prueba con
// node --test (modoCapas.test.js).
//
// Estado: { modo, autoDesde }. autoDesde = 'municipios' marca que el Hibrido
// actual lo puso el sistema al elegir un departamento estando en Municipios
// (para volver a Municipios al elegir un municipio o limpiar); null en otro caso.
//
// Solo cuentan los eventos con origen 'desplegable' (el usuario cambio un
// <select> del buscador). Los clics en el mapa ('mapa') y las sincronizaciones
// programaticas de los selects se ignoran: asi no hay bucles
// Municipios -> Hibrido -> Municipios al re-sincronizar el departamento.

export const MODOS_CAPAS = ["municipios", "hibrido", "departamentos"];
export const ZOOM_UMBRAL_MUNICIPIOS = 9;
export const ESTADO_INICIAL_CAPAS = Object.freeze({ modo: "hibrido", autoDesde: null });

const vacio = (codigo) => codigo === undefined || codigo === null || String(codigo) === "";

export function reducirModoCapas(estado, evento) {
  if (!evento || typeof evento !== "object") return estado;

  if (evento.tipo === "ELEGIR_MODO") {
    // El usuario toco el control (aunque sea el modo ya activo): manda el, sin retorno automatico.
    if (!MODOS_CAPAS.includes(evento.modo)) return estado;
    return { modo: evento.modo, autoDesde: null };
  }

  if (evento.origen !== "desplegable") return estado;

  switch (evento.tipo) {
    case "ELEGIR_DEPARTAMENTO":
      if (vacio(evento.codigo)) return estado;
      return estado.modo === "municipios" ? { modo: "hibrido", autoDesde: "municipios" } : estado;

    case "ELEGIR_MUNICIPIO":
      if (vacio(evento.codigo)) return estado; // el select de municipio se reinicia a "" al cambiar de departamento
      if (estado.modo === "hibrido" && estado.autoDesde === "municipios") return { modo: "municipios", autoDesde: null };
      if (estado.modo === "departamentos") return { modo: "hibrido", autoDesde: null };
      return estado;

    case "LIMPIAR_SELECCION":
      return estado.autoDesde === "municipios" ? { modo: "municipios", autoDesde: null } : estado;

    default:
      return estado;
  }
}

// Que capa se ve con un modo y un zoom: el zoom solo decide dentro de Hibrido.
export function capaVisible(modo, zoom) {
  if (modo === "municipios") return "municipios";
  if (modo === "departamentos") return "departamentos";
  return zoom >= ZOOM_UMBRAL_MUNICIPIOS ? "municipios" : "departamentos";
}
