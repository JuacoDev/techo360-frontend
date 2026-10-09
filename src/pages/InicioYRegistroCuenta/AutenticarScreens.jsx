import { useState } from "react";
import { useLocation } from "react-router";
import Registro from "./Registro.jsx";
import Login from "./Login.jsx";
import VerificarCodigoOTP from "./VerificarCodigoOTP.jsx";
import RecuperacionDeContrasenaP1 from "./RecuperacionDeContrasenaP1.jsx";
import RecuperacionDeContrasenaP2 from "./RecuperacionDeContrasenaP2.jsx";
import { useIrA } from "../../routing/useIrA.js";
import { RUTAS, destinoTrasLogin } from "../../routing/rutas.js";

// Un flujo por ruta: /login, /registro (registro -> verificar-otp) y
// /recuperar (paso 1 -> paso 2). El segundo paso de cada flujo depende de
// estado en memoria (datos del registro, email de recuperacion), asi que vive
// en la ruta del primer paso: un F5 en el paso 2 vuelve al paso 1.
function AuthScreens({ flujo }) {
  const irA = useIrA();
  const { search, state } = useLocation();
  // Se arregló para implementar react-router: la pantalla ya no llega por `screen`;
  // el paso dentro del flujo es estado local (la ruta es la del primer paso).
  const [paso, setPaso] = useState(1);
  // Datos del formulario de registro, en memoria -- nunca en
  // localStorage, porque todavia no hay cuenta creada (recien se crea
  // tras verificar el codigo OTP). Vive aqui, no en Registro.jsx, para
  // que sobreviva el cambio al paso "verificar-otp".
  const [datosRegistroPendiente, setDatosRegistroPendiente] = useState(null);
  const [emailRecuperacion, setEmailRecuperacion] = useState("");

  // Se arregló para implementar react-router: setScreen("...") -> irA("/ruta")
  // (salir del acceso reemplaza la entrada del historial; ver rutas.js).
  if (flujo === "registro") {
    if (paso === 2) {
      return (
        <VerificarCodigoOTP
          datosRegistro={datosRegistroPendiente}
          onContinue={() => irA(RUTAS.mapaCalor)}
          onBack={() => setPaso(1)}
        />
      );
    }
    return (
      <Registro
        onCodigoEnviado={(datos) => {
          setDatosRegistroPendiente(datos);
          setPaso(2);
        }}
        goToLogin={() => irA(RUTAS.login)}
      />
    );
  }

  if (flujo === "recuperar") {
    if (paso === 2) {
      return (
        <RecuperacionDeContrasenaP2
          email={emailRecuperacion}
          onChangePassword={() => irA(RUTAS.login)}
          onBack={() => irA(RUTAS.login)}
        />
      );
    }
    return (
      <RecuperacionDeContrasenaP1
        onSendCode={(email) => {
          setEmailRecuperacion(email);
          setPaso(2);
        }}
        onBack={() => irA(RUTAS.login)}
      />
    );
  }

  return (
    <Login
      onContinue={() => irA(destinoTrasLogin({ busqueda: search, sugerido: state?.volver }), { state: state?.estadoDestino })}
      goToRegister={() => irA(RUTAS.registro)}
      goToRecovery={() => irA(RUTAS.recuperar)}
    />
  );
}

export default AuthScreens;
