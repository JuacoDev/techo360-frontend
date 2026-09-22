import { useState } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import OjoAbiertoContrasena from "../../assets/OjoAbiertoContrasena.png";
import OjoCerradoContrasena from "../../assets/OjoCerradoContrasena.png";
import FondoLogin from "../../assets/FondoLogin.jpg";
import { resetPassword } from "../../services/api";

function RecuperacionDeContrasenaP2({ email, code, onChangePassword, onBack }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleChangePassword = async () => {
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setError("");
      await resetPassword(email, code, password);
      onChangePassword(password); 
    } catch (err) {
      if (err.status === 400) {
        setError("Código inválido o datos incorrectos.");
      } else if (err.status === 401) {
        setError("Sesión expirada, solicita un nuevo código.");
      } else {
        setError(err.message || "Error al cambiar la contraseña.");
      }
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-image-panel">
        <img src={FondoLogin} alt="Cartagena, Colombia" />
      </div>

      <div className="auth-form-panel">
        <div className="form-container recuperacion-container">
          <h2>Nueva contraseña</h2>

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

          <div className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <img
              src={showConfirmPassword ? OjoAbiertoContrasena : OjoCerradoContrasena}
              alt="Mostrar contraseña"
              className="eye-icon"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <p className="form-note">
            Mínimo 6 caracteres y ambas contraseñas deben coincidir.
          </p>

          <button onClick={handleChangePassword}>Cambiar contraseña</button>
          <button
            onClick={onBack}
            className="btn-back"
            style={{ marginTop: "10px", background: "#ccc", color: "#333" }}
          >
            Regresar
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecuperacionDeContrasenaP2;
