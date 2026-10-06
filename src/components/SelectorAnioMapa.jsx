import React, { useId, useState } from "react";

function SelectorAnioMapa({
  anio = 2025,
  activo = false,
  anioMinimo = 2025,
  // Sin tope real confirmado todavia (ver GET /api/proyecciones/rango en
  // techo360-backend) colapsa a un solo año en vez de inventar un
  // maximo -- antes esto hardcodeaba 2050, un numero que se desincroniza
  // en cuanto cambie el rango de datos DANE cargado (hoy 2025-2042).
  anioMaximo = anioMinimo,
  cargando = false,
  fiabilidad,
  onCambioAnio,
  onCambioActivo,
}) {
  const [abierto, setAbierto] = useState(false);
  const sliderId = useId();
  const esProyectado = anio >= 2025;

  return (
    <div className="map-year-control">
      {abierto ? (
        <section className="map-legend-panel" aria-label="Selector de año del mapa">
          <div className="map-legend-header">
            <h2>Año del mapa</h2>
            <button
              type="button"
              className="map-legend-close"
              aria-label="Cerrar selector de año"
              onClick={() => setAbierto(false)}
            >
              X
            </button>
          </div>

          <label className="map-year-toggle">
            <input
              type="checkbox"
              checked={activo}
              onChange={(evento) => onCambioActivo?.(evento.target.checked)}
            />
            <span>Seleccionar año</span>
          </label>

          <label className="map-year-slider-label" htmlFor={sliderId}>
            Año seleccionado: <strong>{anio}</strong>
          </label>
          <input
            id={sliderId}
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
      ) : (
        <button
          type="button"
          className="map-legend-toggle"
          aria-expanded="false"
          onClick={() => setAbierto(true)}
        >
          Seleccionar año
        </button>
      )}
    </div>
  );
}

export default SelectorAnioMapa;