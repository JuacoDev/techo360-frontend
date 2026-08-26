const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export { API_URL }   

export async function fetchHealth() {
  const response = await fetch(`${API_URL}/health`)
  if (!response.ok) {
    throw new Error('Error al conectar con el backend')
  }
  return response.json()
}
