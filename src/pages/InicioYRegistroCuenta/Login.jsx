import { useState } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import LogoGoogle from "../../assets/LogoGoogle.png";
import OjoAbiertoContrasena from "../../assets/OjoAbiertoContrasena.png";
import OjoCerradoContrasena from "../../assets/OjoCerradoContrasena.png";
import FondoLogin from "../../assets/FondoLogin.jpg";
import { login } from "../../services/api";

function Login({ onContinue, goToRegister, goToRecovery }) {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const data = await login(identifier, password);

      // Guardar token según "Recordarme"
      if (document.getElementById("rememberLogin").checked) {
        localStorage.setItem("token", data.access_token);
      } else {
        sessionStorage.setItem("token", data.access_token);
      }

      onContinue("loading");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-image-panel">
        <img src={FondoLogin} alt="Cartagena, Colombia" />
      </div>

      <div className="auth-form-panel">
        <div className="form-container login-container">
          <h2>Inicio de Sesión</h2>

          {/* Oculto para la entrega -- login con Google no esta en alcance.
              No se elimina para poder reactivarlo despues sin rehacer el
              componente. */}
          <button className="google-btn" hidden>
            <img src={LogoGoogle} alt="Google" className="google-logo" />
            Continuar con Google
          </button>

          <p style={{ textAlign: "center", margin: "10px 0" }}>
            Ingresa tu Correo o Usuario
          </p>

          <input
            type="text"
            placeholder="Correo o Usuario"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <img
              src={showPassword ? OjoAbiertoContrasena : OjoCerradoContrasena}
              alt="Mostrar contraseña"
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <p className="form-footer">
            <span onClick={goToRecovery}>¿Olvidaste tu contraseña?</span>
          </p>

          <div className="form-options">
            <input type="checkbox" id="rememberLogin" />
            <label htmlFor="rememberLogin">Recordarme</label>
          </div>

          <button onClick={handleLogin}>Iniciar Sesión</button>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <p className="form-footer">
            ¿No tienes una cuenta? <span onClick={goToRegister}>Regístrate</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
