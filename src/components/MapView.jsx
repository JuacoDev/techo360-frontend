import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

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

// Estilo neutro para el mapa base -- solo limites visibles sobre el
// TileLayer de calles, sin bloquear la vista (esto NO es el choropleth
// por indicador, eso es una tarea posterior).
const ESTILO_MUNICIPIOS = {
  color: '#333333',
  weight: 1,
  fillOpacity: 0.05,
}

function MapView() {
  const [municipios, setMunicipios] = useState(null)

  useEffect(() => {
    fetch('/municipios_colombia.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo cargar el GeoJSON de municipios (${res.status})`)
        return res.json()
      })
      .then(setMunicipios)
      .catch((err) => console.error('Error cargando limites de municipios:', err))
  }, [])

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
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Limites municipales del IGAC (1,105 municipios, EPSG:4326,
          simplificados a maxAllowableOffset=0.0005 -- misma tolerancia
          que zonas_igac_adapter.py en el backend). Servido como archivo
          estatico desde public/ (7 MB) -- ver justificacion de tamaño en
          el reporte de esta tarea. Estilo neutro por ahora: el
          choropleth por indicador, conectado a /api/zonas, es una tarea
          separada y posterior. */}
      {municipios && (
        <GeoJSON data={municipios} style={ESTILO_MUNICIPIOS} />
      )}
    </MapContainer>
  )
}

export default MapView
