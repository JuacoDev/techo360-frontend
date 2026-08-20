import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './Css/style.css'
import App from './App.jsx'

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
