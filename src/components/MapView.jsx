import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { API_URL, getToken, limpiarToken } from '../services/api'

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

// Color de borde compartido por ambas capas -- SIN color de relleno por
// indicador a proposito (esa parte es tarea aparte, no de este cambio).
const COLOR_BORDE = '#1E3A8A'

// Grosor de borde distinto por capa: en departamentos (34 poligonos
// grandes) un borde un poco mas grueso los deja bien definidos; en
// municipios (1,105 poligonos pequeños y adyacentes) el mismo grosor
// saturaria visualmente el mapa, por eso es mas delgado.
//
// Objetos estaticos (mismo relleno neutro para todos los poligonos de
// una capa, solo el borde los distingue); el gancho para el choropleth
// por indicador (T-49) es reemplazar cada uno de estos valores por una
// funcion `(feature) => ({...})` en la prop `style` del <GeoJSON>
// correspondiente -- react-leaflet acepta ambas formas sin ningun otro
// cambio de estructura en este componente.
const ESTILO_DEPARTAMENTOS = {
  color: COLOR_BORDE,
  weight: 1.5,
  fillOpacity: 0.05,
}
const ESTILO_MUNICIPIOS = {
  color: COLOR_BORDE,
  weight: 0.5,
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

function MapView({ setScreen }) {
  const [zonas, setZonas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [departamentos, setDepartamentos] = useState(null)
  const [zoom, setZoom] = useState(6)

  useEffect(() => {
    const fetchZonas = async () => {
      try {
        setLoading(true)
        // Obtenemos el token con la funcion centralizada getToken()
        // que soporta tanto localStorage como sessionStorage
        const token = getToken() 

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/zonas?nivel=municipio&anio=2024`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.status === 401) {
          limpiarToken()
          setScreen?.('login')
          throw new Error('Sesión expirada')
        }

        if (!response.ok) {
          throw new Error(`Error al cargar las zonas (${response.status})`)
        }

        const data = await response.json()
        setZonas(data)
      } catch (err) {
        setError(err.message)
        console.error('Error cargando límites de municipios:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchZonas()
  }, [setScreen])

  useEffect(() => {
    // Geometria de departamentos (34: los 32 reales + Area en Litigio
    // Cauca-Huila + Bogota D.C. derivado de sus municipios) sale directo
    // del backend -- 0.11 MB en total, no hace falta un GeoJSON estatico
    // aparte como el de municipios (confirmado en el diagnostico previo).
    fetch(`${API_URL}/api/zonas?nivel=departamento`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => {
        if (res.status === 401) {
          // Token invalido o expirado -- limpiar sesion y volver al login,
          // mismo mecanismo de navegacion que CabezaDeNavegacion.jsx usa
          // para "Cerrar Sesion" (setScreen("login")), no uno paralelo.
          limpiarToken()
          setScreen?.('login')
          throw new Error('Sesion expirada')
        }
        if (!res.ok) throw new Error(`No se pudo cargar el GeoJSON de departamentos (${res.status})`)
        return res.json()
      })
      .then(setDepartamentos)
      .catch((err) => console.error('Error cargando limites de departamentos:', err))
  }, [setScreen])

  const mostrarMunicipios = zoom >= ZOOM_UMBRAL_MUNICIPIOS

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <div style={{ position: 'absolute', zIndex: 1000, top: 10, left: 10, background: 'white', padding: '5px 10px', borderRadius: '4px' }}>
          Cargando zonas...
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', zIndex: 1000, top: 10, left: 10, background: '#ffebee', color: '#c62828', padding: '5px 10px', borderRadius: '4px' }}>
          Error: {error}
        </div>
      )}
      <MapContainer
        center={COLOMBIA_CENTER}
        zoom={6}
        minZoom={5}
        maxZoom={12}
        maxBounds={COLOMBIA_BOUNDS}
        maxBoundsViscosity={1.0}
        className="map-view"
        style={{ height: '100%', width: '100%' }}
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
          ? zonas && (
              <GeoJSON key="municipios" data={zonas} style={ESTILO_MUNICIPIOS} />
            )
          : departamentos && (
              <GeoJSON key="departamentos" data={departamentos} style={ESTILO_DEPARTAMENTOS} />
            )}
      </MapContainer>
    </div>
  )
}

export default MapView
