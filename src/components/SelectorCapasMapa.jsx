import { useId, useReducer } from "react";
import { ESTADO_INICIAL_CAPAS, reducirModoCapas } from "../services/modoCapas.js";

// Estado del modo de capas de UN mapa ([estado, despachar]). Cada pagina con
// mapa llama a este hook (o MapView usa el suyo propio), asi cada mapa tiene su
// estado independiente. useReducer: eventos seguidos se aplican en orden.
export function useModoCapas() {
  return useReducer(reducirModoCapas, ESTADO_INICIAL_CAPAS);
}

const OPCIONES = [
  { modo: "municipios", etiqueta: "Municipios" },
  { modo: "hibrido", etiqueta: "Híbrido", titulo: "Departamentos de lejos y municipios al acercarse (zoom 9 o más)" },
  { modo: "departamentos", etiqueta: "Departamentos" },
];

// Control segmentado (radios nativos: flechas del teclado incluidas) a la
// derecha de los botones de zoom. Refleja siempre el modo activo, tambien
// cuando lo cambia el sistema (p. ej. al elegir un departamento estando en
// Municipios). Va fuera del MapContainer: sus clics no llegan al mapa.
function SelectorCapasMapa({ modo, onElegir }) {
  const nombre = useId();
  return (
    <fieldset className="selector-capas">
      <legend className="selector-capas-leyenda">Capa del mapa</legend>
      {OPCIONES.map((opcion) => (
        <label key={opcion.modo} className={`selector-capas-opcion${modo === opcion.modo ? " is-activa" : ""}`} title={opcion.titulo}>
          <input
            type="radio"
            name={nombre}
            value={opcion.modo}
            checked={modo === opcion.modo}
            onChange={() => onElegir(opcion.modo)}
            // Tocar el modo ya activo tambien cuenta (lo vuelve manual): onChange no
            // se dispara en ese caso, onClick si.
            onClick={() => modo === opcion.modo && onElegir(opcion.modo)}
          />
          <span>{opcion.etiqueta}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default SelectorCapasMapa;
