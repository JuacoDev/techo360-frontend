import { useId } from "react";

// Barra de año del mapa de proyección: siempre visible, sin boton para
// abrirla ni checkbox para activarla (a diferencia de la version vieja
// de este componente). Antes de generar una proyeccion -- o mientras se
// esta generando -- se ve pero deshabilitada, con `aviso` en vez del
// valor.
//
// aniosDisponibles es la lista de años que SI se generaron (puede tener
// huecos: si un año del rango pedido fallo, no esta en esta lista -- ver
// combinarResultadosProyeccion en Proyectadas.jsx). El slider nativo no
// sabe saltarse valores sueltos dentro de un min/max, asi que opera
// sobre el INDICE de esta lista (min=0, max=length-1, step=1) en vez de
// sobre el año directamente -- moverlo un paso siempre cae en un año
// valido, nunca en el hueco.
function SelectorAnioMapa({
  anio,
  aniosDisponibles = [],
  activo = false,
  cargando = false,
  aviso,
  onCambioAnio,
}) {
  const sliderId = useId();

  const anioMinimo = aniosDisponibles[0];
  const anioMaximo = aniosDisponibles[aniosDisponibles.length - 1];
  const indiceActual = Math.max(0, aniosDisponibles.indexOf(anio));

  return (
    <div className="map-year-bar" aria-label="Año de la proyección">
      <span className="map-year-bar-limite">{anioMinimo ?? ""}</span>
      <input
        id={sliderId}
        className="map-year-bar-slider"
        type="range"
        min={0}
        max={Math.max(0, aniosDisponibles.length - 1)}
        step="1"
        value={indiceActual}
        disabled={!activo}
        aria-label="Año mostrado en el mapa de proyección"
        onChange={(evento) => {
          const nuevoAnio = aniosDisponibles[Number(evento.target.value)];
          if (nuevoAnio != null) onCambioAnio?.(nuevoAnio);
        }}
      />
      <span className="map-year-bar-limite">{anioMaximo ?? ""}</span>
      <span className="map-year-bar-actual">
        {activo ? `Año: ${anio}` : cargando ? "Generando..." : aviso}
      </span>
    </div>
  );
}

export default SelectorAnioMapa;
