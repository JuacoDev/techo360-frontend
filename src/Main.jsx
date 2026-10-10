import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import App from './App.jsx'

createRoot(document.getElementById('app')).render(
  <StrictMode>
    {/* useTransitions={false}: el cambio de ruta se aplica en el mismo lote que el resto
        del estado (p. ej. logout borra el token y navega a / sin que el guard de rutas
        protegidas alcance a redirigir antes a /login). */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
