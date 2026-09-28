import { useCallback, useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SelectorAnioMapa from './SelectorAnioMapa'

// Coordenadas aproximadas del centro geografico de Colombia
const COLOMBIA_CENTER = [4.5709, -74.2973]

// Ajustado a partir del bounding box real de los 34 departamentos que
// ya devuelve el backend (GET /api/zonas?nivel=departamento). La
// Colombia continental por si sola (Amazonas al sur, La Guajira/Punta
// Gallinas al norte, ~12.46 N) cabria en un cuadro mas angosto -- pero
// el pais tambien incluye San Andres/Providencia (departamento 88),
// cuyo extremo real es 13.394 N y -81.732 W (verificado contra la
// geometria real, no aproximado). Decision confirmada: el territorio
// insular debe quedar dentro del mapa y ser alcanzable por pan, aunque
// eso reintroduzca margen de mar de mas alrededor del continente --
// se prefiere eso a dejar fuera una parte real del pais. Por eso el
// norte vuelve a 13.5 (como el valor original, con margen sobre el
// extremo real 13.394) y el oeste se amplia de -79.0 a -81.9 (con
// margen sobre el extremo real -81.732) -- SOLO ampliar el norte sin
// tocar el oeste no habria bastado: con maxBoundsViscosity=1.0 el pan
// queda encerrado dentro de COLOMBIA_BOUNDS, y Providencia esta tan al
// oeste como al norte, asi que igual habria quedado inalcanzable.
// Verificado con Playwright que Colombia continental + insular caben
// completas en viewport de escritorio (1280x800) y movil (375x667).
const COLOMBIA_BOUNDS = [
  [-4.23, -81.9], // suroeste (cubre Amazonas y el oeste de Providencia)
  [13.5, -66.8],  // noreste (cubre San Andres/Providencia y el este real)
]

// Umbral de zoom para cambiar de capa: por debajo se ve departamentos,
// en este nivel o mas cerca se ve municipios. Con minZoom=5/maxZoom=12
// ya establecidos, deja un rango parejo a cada lado (5-8 departamentos,
// 9-12 municipios) -- verificado en vivo que la transicion se siente
// natural, sin salto brusco perceptible.
const ZOOM_UMBRAL_MUNICIPIOS = 9

// Color de borde compartido por ambas capas.
const COLOR_BORDE = '#1E3A8A'

const ESTILO_DEPARTAMENTOS = {
  color: COLOR_BORDE,
  weight: 1.5,
  fillOpacity: 0.05,
}

// Opacidad de relleno normal de un municipio con el choropleth activo,
// y opacidad reducida para el resto de municipios mientras hay uno
// seleccionado (foco visual) -- valor bajo pero no nulo, para que el
// color siga siendo visible de fondo sin competir con el seleccionado.
const FILL_OPACITY_NORMAL = 0.75
const FILL_OPACITY_ATENUADA = 0.18

// Funciones para el choropleth de municipios
function getColor(valor) {
  if (valor == null) return "#808080";

  if (valor >= 500) return "#b30000";
  if (valor >= 250) return "#e31a1c";
  if (valor >= 100) return "#fc4e2a";
  if (valor >= 50) return "#fd8d3c";

  return "#ffeda0";
}

// Componente sin render propio -- solo escucha el evento de zoom del
// mapa (useMapEvents debe usarse DENTRO de un MapContainer) y avisa al
// padre via el callback.
function ListenerDeZoom({ onZoomChange }) {
  useMapEvents({
    zoomend: (evento) => onZoomChange(evento.target.getZoom()),
  })
  return null
}

// Un clic sobre un poligono hace stopPropagation (ver manejarEventos de
// cada capa), asi que el evento "click" del mapa solo llega aqui cuando
// el clic fue sobre un area vacia -- exactamente el caso en el que hay
// que soltar la seleccion actual.
function ManejadorDeClicVacio({ onClicVacio }) {
  useMapEvents({
    click: () => onClicVacio?.(),
  })
  return null
}

// Centra/hace zoom hacia el municipio seleccionado, sin importar si la
// seleccion vino de un clic en el mapa o del buscador -- mismo efecto en
// ambos casos. No hace nada al deseleccionar (no se aleja el mapa solo).
function ControladorDeFoco({ codigoSeleccionado, nivelSeleccionado, datosMunicipios }) {
  const map = useMap()

  useEffect(() => {
    if (nivelSeleccionado !== 'municipio' || !codigoSeleccionado || !datosMunicipios) return

    const feature = datosMunicipios.features.find(
      (f) => f.properties.codigo === codigoSeleccionado
    )
    if (!feature) return

    const bounds = L.geoJSON(feature).getBounds()
    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        maxZoom: Math.max(map.getZoom(), ZOOM_UMBRAL_MUNICIPIOS + 1),
        duration: 0.75,
      })
    }
  }, [codigoSeleccionado, datosMunicipios, nivelSeleccionado, map])

  return null
}

function AjustarTamanoMapa() {
  const map = useMap()

  useEffect(() => {
    const ajustar = () => map.invalidateSize()
    const contenedor = map.getContainer()
    const observer = new ResizeObserver(ajustar)

    observer.observe(contenedor)
    ajustar()

    return () => observer.disconnect()
  }, [map])

  return null
}

function MapView({
  onMapLoaded,
  onZonaSeleccionada,
  departamentos,
  datosMunicipios,
  datosProyectados,
  claveDatosMapa = "base",
  codigoSeleccionado,
  scoreSeleccionado,
  nivelSeleccionado,
  anioSeleccionado = 2025,
  selectorAnioActivo = false,
  cargandoAnio = false,
  fiabilidadProyeccion,
  mostrarSelectorAnio = true,
  anioMinimoSelector,
  anioMaximoSelector,
  onAnioSeleccionado,
  onSelectorAnioActivo,
}) {
  const [zoom, setZoom] = useState(6)
  const [isLegendOpen, setIsLegendOpen] = useState(false)

  const proyeccionesPorCodigo = useMemo(
  () =>
    datosProyectados
      ? Object.fromEntries(
          datosProyectados.map((z) => [
            z.codigo_municipio,
            z.valor,
          ])
        )
      : {},
  [datosProyectados]
);

  const proyeccionesPorDepartamento = useMemo(() => {
    const acumulados = {};

    datosProyectados?.forEach((zona) => {
      const codigoDepartamento = String(zona.codigo_municipio ?? "")
        .padStart(5, "0")
        .slice(0, 2);
      const valor = Number(zona.valor);
      if (!codigoDepartamento || !Number.isFinite(valor)) return;

      acumulados[codigoDepartamento] ??= { total: 0, cantidad: 0 };
      acumulados[codigoDepartamento].total += valor;
      acumulados[codigoDepartamento].cantidad += 1;
    });

    return Object.fromEntries(
      Object.entries(acumulados).map(([codigo, datos]) => [
        codigo,
        datos.total / datos.cantidad,
      ])
    );
  }, [datosProyectados]);

  const fiabilidadSeleccionada = useMemo(() => {
    const codigoNormalizado = String(codigoSeleccionado ?? "").padStart(5, "0");
    const proyeccionSeleccionada = datosProyectados?.find(
      (zona) => String(zona.codigo_municipio ?? "").padStart(5, "0") === codigoNormalizado
    );

    return proyeccionSeleccionada?.intervalo_confianza
      ?? proyeccionSeleccionada?.fiabilidad
      ?? fiabilidadProyeccion;
  }, [codigoSeleccionado, datosProyectados, fiabilidadProyeccion]);



  const estiloMunicipios = useCallback(
  (feature) => {
    const codigo = feature.properties?.codigo;

    const codigoNormalizado = String(codigo)
      .padStart(5, "0");
     
    const valorProyectado =
      proyeccionesPorCodigo[codigoNormalizado]; 

    const valorColor =
      datosProyectados
        ? valorProyectado
        : feature.properties?.score_privacion;


    const atenuado =
      nivelSeleccionado === "municipio" &&
      Boolean(codigoSeleccionado) &&
      codigo !== codigoSeleccionado;

    return {
      fillColor: getColor(valorColor),
      weight: 1,
      opacity: 1,
      color: "#ffffff",
      fillOpacity: atenuado
        ? FILL_OPACITY_ATENUADA
        : FILL_OPACITY_NORMAL,
    };
  },
  [
    codigoSeleccionado,
    nivelSeleccionado,
    datosProyectados,
    proyeccionesPorCodigo,
  ]
);

  // Mismo criterio que estiloMunicipios (mismo getColor, mismo atenuado
  // por seleccion) -- el pedido fue agregar choropleth a departamento,
  // no un estilo nuevo. Se mantiene el color/weight de borde de
  // ESTILO_DEPARTAMENTOS (mas fino que el de municipios), solo el
  // relleno pasa de fijo a dinamico por score_privacion.
  const estiloDepartamentos = useCallback(
    (feature) => {
      const codigo = feature.properties?.codigo
      const codigoNormalizado = String(codigo ?? "").padStart(2, "0")
      const valorProyectado = proyeccionesPorDepartamento[codigoNormalizado]
      const valor = datosProyectados
        ? valorProyectado
        : feature.properties?.score_privacion
      // Mismo criterio que estiloMunicipios (linea de arriba): solo se
      // atenua el resto de departamentos cuando la seleccion activa ES
      // un departamento -- si el usuario selecciono un municipio (otro
      // nivel/capa), los departamentos no aplican, no tiene sentido
      // atenuarlos.
      const atenuado = nivelSeleccionado === 'departamento'
        && Boolean(codigoSeleccionado)
        && codigo !== codigoSeleccionado
      return {
        ...ESTILO_DEPARTAMENTOS,
        fillColor: getColor(valor),
        fillOpacity: atenuado ? FILL_OPACITY_ATENUADA : FILL_OPACITY_NORMAL,
      }
    },
    [codigoSeleccionado, nivelSeleccionado, datosProyectados, proyeccionesPorDepartamento]
  )

  // Tooltip liviano con solo el nombre (nada de score ni otras
  // variables): se dispara en cada movimiento del mouse, asi que usamos
  // el tooltip nativo de Leaflet (bindTooltip) en vez de estado de React,
  // para no forzar un re-render en cada hover.
  const manejarEventosMunicipio = useCallback(
    (feature, layer) => {
      layer.bindTooltip(feature.properties?.nombre ?? '', {
        sticky: true,
        direction: 'top',
      })
      layer.on({
        click: (evento) => {
          L.DomEvent.stopPropagation(evento)
          const featureConIndicadores = datosMunicipios?.features.find(
            (f) => f.properties.codigo === feature.properties.codigo
          )
          onZonaSeleccionada?.(
            featureConIndicadores
              ? { ...featureConIndicadores.properties, nivel: 'municipio' }
              : null
          )
        },
      })
    },
    [datosMunicipios, onZonaSeleccionada]
  )

  const manejarEventosDepartamento = useCallback(
    (feature, layer) => {
      layer.on({
        click: (evento) => {
          L.DomEvent.stopPropagation(evento)
          onZonaSeleccionada?.({ ...feature.properties, nivel: 'departamento' })
        },
      })
    },
    [onZonaSeleccionada]
  )

  const mostrarMunicipios = zoom >= ZOOM_UMBRAL_MUNICIPIOS

  // Estado de la leyenda respecto a la zona seleccionada (municipio o
  // departamento, da igual -- ambos exponen score_privacion con el
  // mismo contrato). Tres estados distintos, no dos: sin seleccion
  // (neutro), seleccion CON score (marcador en la barra), seleccion SIN
  // score (badge "Sin dato" resaltado -- ej. Nuevo Belen de Bajira,
  // 27493, o cualquier departamento sin ningun municipio con score
  // valido). null/undefined tratados igual (el backend manda null;
  // undefined cubre el caso en que no llegue la propiedad).
  const hayZonaSeleccionada = Boolean(codigoSeleccionado)
  const tieneScoreValido =
    hayZonaSeleccionada && scoreSeleccionado !== null && scoreSeleccionado !== undefined

  return (
    <div className="map-view-wrapper">
      <MapContainer
        center={COLOMBIA_CENTER}
        zoom={6}
        minZoom={5}
        maxZoom={12}
        maxBounds={COLOMBIA_BOUNDS}
        maxBoundsViscosity={1.0}
        className="map-view"
        whenReady={() => {
          if (onMapLoaded) onMapLoaded();
        }}
      >

        <AjustarTamanoMapa />
        <ListenerDeZoom onZoomChange={setZoom} />
        <ManejadorDeClicVacio onClicVacio={() => onZonaSeleccionada?.(null)} />
        <ControladorDeFoco
          codigoSeleccionado={codigoSeleccionado}
          nivelSeleccionado={nivelSeleccionado}
          datosMunicipios={datosMunicipios}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Solo una capa montada a la vez, segun el zoom actual -- nunca
            ambas juntas, para no duplicar hit-testing/renderizado. La
            `key` distinta obliga a remontar el <GeoJSON> al cambiar de
            capa: react-leaflet no actualiza la geometria si solo cambia
            la prop `data` de una instancia ya montada. Cambiar solo
            `style` (ej. al seleccionar un municipio) SI actualiza sin
            remontar, via layer.setStyle -- por eso codigoSeleccionado no
            esta en la `key`. */}
        {mostrarMunicipios
          ? datosMunicipios && (
              <GeoJSON key={`municipios-${claveDatosMapa}`} data={datosMunicipios} style={estiloMunicipios} onEachFeature={manejarEventosMunicipio} />
            )
            : departamentos && (
              <GeoJSON key={`departamentos-${claveDatosMapa}`} data={departamentos} style={estiloDepartamentos} onEachFeature={manejarEventosDepartamento} />
            )}
      </MapContainer>

      {mostrarSelectorAnio && (
        <SelectorAnioMapa
          anio={anioSeleccionado}
          activo={selectorAnioActivo}
          anioMinimo={anioMinimoSelector}
          anioMaximo={anioMaximoSelector}
          cargando={cargandoAnio}
          fiabilidad={fiabilidadSeleccionada}
          onCambioAnio={onAnioSeleccionado}
          onCambioActivo={onSelectorAnioActivo}
        />
      )}

      <div className="map-legend">
        {!isLegendOpen ? (
          <button
            type="button"
            className="map-legend-toggle"
            onClick={() => setIsLegendOpen(true)}
          >
            Ver Leyenda
          </button>
        ) : (
          <section className="map-legend-panel" aria-label="Leyenda del score de privación">
            <div className="map-legend-header">
              <h2>Escala de Privación</h2>
              <button
                type="button"
                className="map-legend-close"
                aria-label="Cerrar leyenda"
                onClick={() => setIsLegendOpen(false)}
              >
                X
              </button>
            </div>
            <div className="map-legend-gradient" aria-hidden="true">
              {tieneScoreValido && (
                <span
                  className="map-legend-marker"
                  style={{ left: `${scoreSeleccionado * 100}%` }}
                />
              )}
            </div>
            <div className="map-legend-labels">
              <span>0 (Menor)</span>
              <span>1 (Mayor)</span>
            </div>
            {hayZonaSeleccionada && !tieneScoreValido && (
              <div className="map-legend-no-data">
                <span className="map-legend-gray" aria-hidden="true" />
                <span>Sin dato</span>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default MapView
