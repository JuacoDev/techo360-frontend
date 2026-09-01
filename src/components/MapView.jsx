import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { API_URL } from '../services/api'

// Coordenadas aproximadas del centro geografico de Colombia
const COLOMBIA_CENTER = [4.5709, -74.2973]

// Mismo bounding box ya usado en techo360-backend/ingestion/run.py
// (BBOX_COLOMBIA, respaldo geografico para INVIAS/OSM) -- se reutiliza
// aqui para no inventar un segundo bbox de Colombia en el proyecto.
// Formato original (sur, oeste, norte, este) = (-4.23, -79.0, 13.5, -66.8).
const COLOMBIA_BOUNDS = [
  [-4.23, -79.0], // suroeste
  [13.5, -66.8],  // noreste
]

// Umbral de zoom para cambiar de capa: por debajo se ve departamentos,
// en este nivel o mas cerca se ve municipios. Con minZoom=5/maxZoom=12
// ya establecidos, deja un rango parejo a cada lado (5-8 departamentos,
// 9-12 municipios) -- verificado en vivo que la transicion se siente
// natural, sin salto brusco perceptible.
const ZOOM_UMBRAL_MUNICIPIOS = 9

// Estilo neutro/uniforme para ambas capas -- SIN color por indicador a
// proposito (esa parte es tarea aparte, no de este cambio). Es un objeto
// estatico (mismo color de relleno para todos los poligonos, solo el
// borde los distingue); el gancho para el choropleth por indicador es
// reemplazar este valor por una funcion `(feature) => ({...})` en la
// prop `style` de <GeoJSON> -- react-leaflet acepta ambas formas sin
// ningun otro cambio de estructura en este componente.
const ESTILO_NEUTRO = {
  color: '#333333',
  weight: 1,
  fillOpacity: 0.05,
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

function MapView() {
  const [municipios, setMunicipios] = useState(null)
  const [departamentos, setDepartamentos] = useState(null)
  const [zoom, setZoom] = useState(5)

  useEffect(() => {
    fetch('/municipios_colombia.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo cargar el GeoJSON de municipios (${res.status})`)
        return res.json()
      })
      .then(setMunicipios)
      .catch((err) => console.error('Error cargando limites de municipios:', err))
  }, [])

  useEffect(() => {
    // Geometria de departamentos (34: los 32 reales + Area en Litigio
    // Cauca-Huila + Bogota D.C. derivado de sus municipios) sale directo
    // del backend -- 0.11 MB en total, no hace falta un GeoJSON estatico
    // aparte como el de municipios (confirmado en el diagnostico previo).
    fetch(`${API_URL}/api/zonas?nivel=departamento`)
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo cargar el GeoJSON de departamentos (${res.status})`)
        return res.json()
      })
      .then(setDepartamentos)
      .catch((err) => console.error('Error cargando limites de departamentos:', err))
  }, [])

  const mostrarMunicipios = zoom >= ZOOM_UMBRAL_MUNICIPIOS

  return (
    <MapContainer
      center={COLOMBIA_CENTER}
      zoom={5}
      minZoom={5}
      maxZoom={12}
      maxBounds={COLOMBIA_BOUNDS}
      maxBoundsViscosity={1.0}
      className="map-view"
    >
      <ListenerDeZoom onZoomChange={setZoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Solo una capa montada a la vez, segun el zoom actual -- nunca
          ambas juntas, para no duplicar hit-testing/renderizado. La
          `key` distinta obliga a remontar el <GeoJSON> al cambiar de
          capa: react-leaflet no actualiza la geometria si solo cambia
          la prop `data` de una instancia ya montada. */}
      {mostrarMunicipios
        ? municipios && (
            <GeoJSON key="municipios" data={municipios} style={ESTILO_NEUTRO} />
          )
        : departamentos && (
            <GeoJSON key="departamentos" data={departamentos} style={ESTILO_NEUTRO} />
          )}
    </MapContainer>
  )
}

export default MapView
