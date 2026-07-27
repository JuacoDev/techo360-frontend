import { useEffect, useState } from 'react'
import { fetchHealth } from '../services/api'
import MapView from '../components/MapView'

function Home() {
  const [status, setStatus] = useState('Verificando conexion con el backend...')

  useEffect(() => {
    fetchHealth()
      .then((data) => setStatus(`Backend: ${data.status}`))
      .catch(() => setStatus('No se pudo conectar con el backend'))
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '2rem' }}>
      <h1>Techo 360</h1>
      <p>{status}</p>
      <MapView />
    </div>
  )
}

export default Home
