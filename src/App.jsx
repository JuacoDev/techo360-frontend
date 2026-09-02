import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (screen === "loading") {
      const timer = setTimeout(() => {
        setScreen("app");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  return (
    <>
      {screen === "loading" && <PantallaCarga />}
      {screen === "perfil" && <PerfilUsuario setScreen={setScreen} />}
      {screen === "app" && (
        <main className="app-shell">
          <MapView setScreen={setScreen} />
          <CabezaDeNavegacion setScreen={setScreen} />
          <BarraBuscadora />
          <PanelIndicadores />
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
