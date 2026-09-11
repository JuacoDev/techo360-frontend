import { useState } from "react";
import Registro from "./Registro.jsx";
import Login from "./Login.jsx";
import VerificarCodigoOTP from "./VerificarCodigoOTP.jsx";
import RecuperacionDeContrasenaP1 from "./RecuperacionDeContrasenaP1.jsx";
import RecuperacionDeContrasenaP2 from "./RecuperacionDeContrasenaP2.jsx";

function AuthScreens({ screen, setScreen }) {
  // Datos del formulario de registro, en memoria -- nunca en
  // localStorage, porque todavia no hay cuenta creada (recien se crea
  // tras verificar el codigo OTP). Vive aqui, no en Registro.jsx, para
  // que sobreviva el cambio de pantalla a "verificar-otp".
  const [datosRegistroPendiente, setDatosRegistroPendiente] = useState(null);

  switch (screen) {
    case "registro":
      return (
        <Registro
          onCodigoEnviado={(datos) => {
            setDatosRegistroPendiente(datos);
            setScreen("verificar-otp");
          }}
          goToLogin={() => setScreen("login")}
        />
      );

    case "verificar-otp":
      return (
        <VerificarCodigoOTP
          datosRegistro={datosRegistroPendiente}
          onContinue={() => setScreen("loading")}
          onBack={() => setScreen("registro")}
        />
      );

    case "login":
      return (
        <Login
          onContinue={() => setScreen("loading")}
          goToRegister={() => setScreen("registro")}
          goToRecovery={() => setScreen("recuperacion1")}
        />
      );

    case "recuperacion1":
      return (
        <RecuperacionDeContrasenaP1
          onSendCode={() => setScreen("recuperacion2")}
          onBack={() => setScreen("login")}
        />
      );

    case "recuperacion2":
      return (
        <RecuperacionDeContrasenaP2
          onChangePassword={() => setScreen("login")}
          onBack={() => setScreen("login")}
        />
      );

    default:
      return null;
  }
}

export default AuthScreens;
