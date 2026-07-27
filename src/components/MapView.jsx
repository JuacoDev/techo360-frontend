import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Coordenadas aproximadas del centro de Bucaramanga
const BUCARAMANGA_CENTER = [7.1193, -73.1227]

function MapView() {
  return (
    <MapContainer
      center={BUCARAMANGA_CENTER}
      zoom={13}
      style={{ height: '500px', width: '100%' }}
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
