import { useState } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import LogoGoogle from "../../assets/LogoGoogle.png";
import OjoAbiertoContrasena from "../../assets/OjoAbiertoContrasena.png";
import OjoCerradoContrasena from "../../assets/OjoCerradoContrasena.png";
import FondoLogin from "../../assets/FondoLogin.jpg";
import { requestOtp } from "../../services/api";

function Registro({ onCodigoEnviado, goToLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);

  const handleRegister = async () => {
    setError("");

    if (username.length < 3 || username.length > 20) {
      setError("El usuario debe tener entre 3 y 20 caracteres");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setEnviandoCodigo(true);
      await requestOtp(email, username);
      onCodigoEnviado({ username, email, password });
    } catch (err) {
      // 🔹 Manejo de errores con status
      if (err.status === 429) {
        setError(err.message || "Espera antes de solicitar otro código.");
      } else if (err.status === 400) {
        setError(err.message || "Datos inválidos, revisa tu correo o usuario.");
      } else {
        setError(err.message || "No se pudo enviar el código de verificación");
      }
    } finally {
      setEnviandoCodigo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleRegister();
  };

  return (
    <div className="auth-screen">
      <div className="auth-image-panel">
        <img src={FondoLogin} alt="Cartagena, Colombia" />
      </div>

      <div className="auth-form-panel">
        <form className="form-container" onSubmit={handleSubmit}>
          <h2>Registro de Cuenta</h2>

          <button className="google-btn" hidden>
            <img src={LogoGoogle} alt="Google" className="google-logo" />
            Registrarse con Google
          </button>

          <p style={{textAlign:"center", margin:"10px 0"}}>Regístrate con tu E-mail</p>

          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={20}
          />

          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <img
              src={showPassword ? OjoAbiertoContrasena : OjoCerradoContrasena}
              alt="Mostrar contraseña"
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <div className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            <img
              src={showConfirmPassword ? OjoAbiertoContrasena : OjoCerradoContrasena}
              alt="Mostrar contraseña"
              className="eye-icon"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>

          <div className="form-options">
            <input type="checkbox" id="remember" />
            <label htmlFor="remember">Recordarme</label>
          </div>

          <p className="form-note">
            Al dar clic en “Registrarse”, aceptas nuestros Términos de servicio, Política de privacidad y Uso de cookies.
          </p>

          <button type="submit" disabled={enviandoCodigo}>
            {enviandoCodigo ? "Enviando código..." : "Registrarse"}
          </button>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <p className="form-footer">
            ¿Ya tienes una cuenta? <span className="register-link" onClick={goToLogin}>
              Inicia sesión
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Registro;
