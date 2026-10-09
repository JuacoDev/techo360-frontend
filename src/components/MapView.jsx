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

// Semaforo del score de privacion (0=mejor, 1=peor -- ver
// _score_privacion en techo360-backend/routers/zonas.py): interpolacion
// lineal por tramos entre tres puntos, blanco en 0, amarillo en 0.5,
// rojo en 1 (decision de producto, no buckets absolutos como antes).
// Antes estos umbrales (50/100/250/500) estaban calibrados para
// densidad_poblacional (un numero sin acotar), no para score_privacion
// (acotado a [0,1]) -- por eso TODO score no-nulo caia siempre en el
// mismo bucket mas bajo ("#ffeda0"), sin importar la diferencia real
// entre zonas. Clampear a [0,1] es necesario mientras el mapa de
// proyeccion siga mandando densidad_poblacional en vez de score (ver
// Parte 2 del plan de correccion).
const COLOR_SIN_DATO = "#808080"
const PUNTO_BLANCO = [255, 255, 255]
const PUNTO_AMARILLO = [255, 221, 51]
const PUNTO_ROJO = [211, 47, 47]

function interpolarColor(colorA, colorB, t) {
  return colorA.map((canal, i) => Math.round(canal + (colorB[i] - canal) * t))
}

function getColor(valor) {
  if (valor == null) return COLOR_SIN_DATO;

  const v = Math.min(1, Math.max(0, Number(valor)));
  const [r, g, b] =
    v <= 0.5
      ? interpolarColor(PUNTO_BLANCO, PUNTO_AMARILLO, v / 0.5)
      : interpolarColor(PUNTO_AMARILLO, PUNTO_ROJO, (v - 0.5) / 0.5);

  return `rgb(${r}, ${g}, ${b})`;
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
  // Los seis props siguientes solo los usa el mapa de proyección
  // (Proyectadas.jsx) -- el MapView del dashboard de calor nunca los
  // pasa, asi que mostrarSelectorAnio se queda en false y la barra ni
  // se renderiza ahi.
  mostrarSelectorAnio = false,
  anioSeleccionado,
  aniosDisponiblesSelector = [],
  cargandoAnio = false,
  avisoSelectorAnio,
  onAnioSeleccionado,
}) {
  const [zoom, setZoom] = useState(6)

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
      // Antes "#ffffff" -- con el semaforo nuevo el relleno puede ser
      // blanco (score cerca de 0), y un borde blanco sobre un relleno
      // blanco se pierde contra el mapa base. COLOR_BORDE (el mismo azul
      // oscuro que ya usan los departamentos) queda visible en todo el
      // rango blanco-amarillo-rojo.
      color: COLOR_BORDE,
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
          aniosDisponibles={aniosDisponiblesSelector}
          activo={aniosDisponiblesSelector.length > 0 && !cargandoAnio}
          cargando={cargandoAnio}
          aviso={avisoSelectorAnio}
          onCambioAnio={onAnioSeleccionado}
        />
      )}

      <div className="map-legend">
        <section className="map-legend-panel" aria-label="Leyenda del score de privación">
          <div className="map-legend-header">
            <div className="map-legend-title">
              <h2>Escala de Privación</h2>
              <span className="map-legend-info">
                <button
                  type="button"
                  className="map-legend-info-button"
                  aria-label="Más información sobre la escala de privación"
                  aria-describedby="map-legend-description"
                >
                  i
                </button>
                <span
                  id="map-legend-description"
                  className="map-legend-description"
                  role="tooltip"
                >
                  Índice de 0.0 a 1.0 que promedia las carencias en acueducto,
                  alcantarillado y déficit habitacional. Un valor de 1.0 indica
                  la máxima prioridad o necesidad de intervención.
                </span>
              </span>
            </div>
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
            <span>0.0</span>
            <span>0.25</span>
            <span>0.5</span>
            <span>0.75</span>
            <span>1.0</span>
          </div>
          {/* Siempre visible: es una entrada fija de la leyenda, no un
              mensaje contextual de la seleccion actual. */}
          <div className="map-legend-no-data">
            <span className="map-legend-gray" aria-hidden="true" />
            <span>Sin dato / Área en litigio</span>
          </div>
          {mostrarSelectorAnio && (
            <p className="map-legend-nota">
              El déficit habitacional se mantiene constante (Censo 2018).
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default MapView
