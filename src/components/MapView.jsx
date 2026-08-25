import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Coordenadas aproximadas del centro geografico de Colombia
const COLOMBIA_CENTER = [4.5709, -74.2973]

function MapView() {
  return (
    <MapContainer
      center={COLOMBIA_CENTER}
      zoom={5}
      className="map-view"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* TODO: agregar aqui las capas de datos reales una vez el backend
          exponga los endpoints de las 6 variables (pendiente del spike
          de fuentes de datos del Sprint 1) */}
    </MapContainer>
  )
}

export default MapView
