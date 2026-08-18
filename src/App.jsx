import { useState } from "react";
import "./Css/StyleComponents.css";
import "./Css/StyleInicioYRegistroCuenta.css";
import CabezaDeNavegacion from "./Components/CabezaDeNavegacion";
import BarraBuscadora from "./Components/BarraBuscadora";
import ChatBot from "./components/Chatbot";
import Registro from "./pages/InicioYRegistroCuenta/Registro.jsx";
import Login from "./pages/InicioYRegistroCuenta/Login.jsx";
import RecuperacionDeContrasenaP1 from "./pages/InicioYRegistroCuenta/RecuperacionDeContrasenaP1.jsx";
import RecuperacionDeContrasenaP2 from "./pages/InicioYRegistroCuenta/RecuperacionDeContrasenaP2.jsx";

function App() {
  const [screen, setScreen] = useState("login"); 
  // valores posibles: "registro", "login", "app", "recuperacion1", "recuperacion2"

  return (
    <>
      {screen === "registro" && <Registro onContinue={() => setScreen("login")} />}
      {screen === "login" && (
        <Login 
          onContinue={() => setScreen("app")} 
          goToRegister={() => setScreen("registro")} 
          goToRecovery={() => setScreen("recuperacion1")} 
        />
      )}
      {screen === "recuperacion1" && (
        <RecuperacionDeContrasenaP1 
          onSendCode={() => setScreen("recuperacion2")} 
          onBack={() => setScreen("login")} 
        />
      )}
      {screen === "recuperacion2" && (
        <RecuperacionDeContrasenaP2 
          onChangePassword={() => setScreen("login")} 
          onBack={() => setScreen("login")} 
        />
      )}
      {screen === "app" && (
        <>
          <CabezaDeNavegacion />
          <BarraBuscadora />
          <ChatBot />
        </>
      )}
    </>
  );
}

export default App;
