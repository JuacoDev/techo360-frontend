import { useState } from 'react'
import './Css/StyleComponents.css'
import CabezaDeNavegacion from "./Components/CabezaDeNavegacion";
import BarraBuscadora from "./Components/BarraBuscadora";

function App() {
  return (
    <>
      <CabezaDeNavegacion />
      <BarraBuscadora />
    </>
  );
}

export default App

