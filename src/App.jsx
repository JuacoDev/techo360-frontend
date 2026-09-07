import { useState } from "react";
import "./Css/StyleComponents.css";
import "./Css/StyleInicioYRegistroCuenta.css";
import "./Css/StylePerfilUsuario.css";
import CabezaDeNavegacion from "./components/CabezaDeNavegacion";
import BarraBuscadora from "./components/BarraBuscadora";
import ChatBot from "./components/Chatbot";
import MapView from "./components/MapView";
import PanelIndicadores from "./components/PanelIndicadores";
import PantallaCarga from "./components/PantallaCarga";
import AutenticarScreens from "./pages/InicioYRegistroCuenta/AutenticarScreens";
import PerfilUsuario from "./pages/PerfilUsuario/PerfilUsuario.jsx";

function App() {
  const [screen, setScreen] = useState("login");
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);

  const handleMapLoaded = () => {
    setScreen("app");
  };

  return (
    <>
      {screen === "loading" && (
        <>
          <PantallaCarga />
          <MapView
            setScreen={setScreen}
            onMapLoaded={handleMapLoaded}
            onZonaSeleccionada={setZonaSeleccionada}
          />
        </>
      )}

      {screen === "perfil" && <PerfilUsuario setScreen={setScreen} />}

      {screen === "app" && (
        <main className="app-shell">
          <MapView
            setScreen={setScreen}
            onMapLoaded={handleMapLoaded}
            onZonaSeleccionada={setZonaSeleccionada}
          />
          <CabezaDeNavegacion setScreen={setScreen} />
          <BarraBuscadora />
          <PanelIndicadores zonaSeleccionada={zonaSeleccionada} />
          <ChatBot />
        </main>
      )}

      {screen !== "app" && screen !== "loading" && (
        <AutenticarScreens screen={screen} setScreen={setScreen} />
      )}
    </>
  );
}

export default App;
