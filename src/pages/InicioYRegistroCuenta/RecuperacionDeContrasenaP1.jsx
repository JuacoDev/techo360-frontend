import { useState } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import FondoLogin from "../../assets/FondoLogin.jpg";
import { requestOtp } from "../../services/api";

function RecuperacionDeContrasenaP1({ onSendCode, onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    try {
      setError("");
      await requestOtp(email);
      onSendCode(email);       
    } catch (err) {
      if (err.status === 400) {
        setError("Correo inválido o no registrado.");
      } else if (err.status === 429) {
        setError("Demasiados intentos, espera un momento.");
      } else {
        setError(err.message || "Error al enviar el código.");
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
          <h2>¿Olvidaste tu contraseña?</h2>
          <p>Ingresa el correo con el que estás registrado para recibir un código de recuperación.</p>

          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button onClick={handleSendCode}>Enviar código</button>
          <button onClick={onBack} className="btn-back" style={{marginTop:"10px", background:"#ccc", color:"#333"}}>
            Regresar
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecuperacionDeContrasenaP1;
