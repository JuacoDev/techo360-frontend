import { useId } from "react";

// Barra de año del mapa de proyección: siempre visible, sin boton para
// abrirla ni checkbox para activarla (a diferencia de la version vieja
// de este componente). Antes de generar una proyeccion -- o mientras se
// esta generando -- se ve pero deshabilitada, con `aviso` en vez del
// valor. anioMinimo/anioMaximo son el rango YA GENERADO (rangoGenerado
// en Proyectadas.jsx), no los valores actuales de los selects.
function SelectorAnioMapa({
  anio,
  anioMinimo,
  anioMaximo,
  activo = false,
  cargando = false,
  aviso,
  onCambioAnio,
}) {
  const sliderId = useId();

  return (
    <div className="map-year-bar" aria-label="Año de la proyección">
      <span className="map-year-bar-limite">{anioMinimo ?? ""}</span>
      <input
        id={sliderId}
        className="map-year-bar-slider"
        type="range"
        min={anioMinimo ?? 0}
        max={anioMaximo ?? 0}
        step="1"
        value={anio ?? anioMinimo ?? 0}
        disabled={!activo}
        aria-label="Año mostrado en el mapa de proyección"
        onChange={(evento) => onCambioAnio?.(Number(evento.target.value))}
      />
      <span className="map-year-bar-limite">{anioMaximo ?? ""}</span>
      <span className="map-year-bar-actual">
        {activo ? `Año: ${anio}` : cargando ? "Generando..." : aviso}
      </span>
    </div>
  );
}

export default SelectorAnioMapa;
