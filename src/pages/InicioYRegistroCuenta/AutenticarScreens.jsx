import Registro from "./Registro.jsx";
import Login from "./Login.jsx";
import RecuperacionDeContrasenaP1 from "./RecuperacionDeContrasenaP1.jsx";
import RecuperacionDeContrasenaP2 from "./RecuperacionDeContrasenaP2.jsx";

function AuthScreens({ screen, setScreen }) {
  switch (screen) {
    case "registro":
      return <Registro onContinue={() => setScreen("loading")} />;

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
