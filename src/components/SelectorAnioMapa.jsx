import React from "react";

function SelectorAnioMapa({
  anio = 2024,
  activo = false,
  anioMinimo = 2024,
  anioMaximo = 2050,
  cargando = false,
  fiabilidad,
  onCambioAnio,
  onCambioActivo,
}) {
  const esProyectado = anio >= 2025;

  return (
    <section className="map-year-control" aria-label="Selector de año del mapa">
      <label className="map-year-toggle">
        <input
          type="checkbox"
          checked={activo}
          onChange={(evento) => onCambioActivo?.(evento.target.checked)}
        />
        <span>Seleccionar año</span>
      </label>

      <label className="map-year-slider-label" htmlFor="map-year-slider">
        Año seleccionado: <strong>{anio}</strong>
      </label>
      <input
        id="map-year-slider"
        className="map-year-slider"
        type="range"
        min={anioMinimo}
        max={anioMaximo}
        step="1"
        value={anio}
        disabled={!activo}
        aria-label="Año mostrado en todo el mapa"
        onChange={(evento) => onCambioAnio?.(Number(evento.target.value))}
      />
      <div className="map-year-slider-labels" aria-hidden="true">
        <span>{anioMinimo}</span>
        <span>{anioMaximo}</span>
      </div>

      {cargando && <span className="map-year-status">Cargando año...</span>}
      {!cargando && activo && esProyectado && (
        <span className="map-year-reliability" role="status">
          Fiabilidad: {fiabilidad ?? "No disponible"}
          {fiabilidad != null && typeof fiabilidad === "number" ? "%" : ""}
        </span>
      )}
    </section>
  );
}

export default SelectorAnioMapa;