import "../../Css/StyleInicioYRegistroCuenta.css";
import FondoLogin from "../../assets/FondoLogin.jpg";

function RecuperacionDeContrasenaP1({ onSendCode, onBack }) {
  return (
    <div className="auth-screen">
      <div className="auth-image-panel">
        <img src={FondoLogin} alt="Cartagena, Colombia" />
      </div>

      <div className="auth-form-panel">
        <div className="form-container recuperacion-container">
          <h2>¿Olvidaste tu contraseña?</h2>
          <p>Ingresa el correo con el que estás registrado para recibir un código de recuperación.</p>

          <input type="email" placeholder="E-mail" />

          <button onClick={onSendCode}>Enviar código</button>
          <button onClick={onBack} className="btn-back" style={{marginTop:"10px", background:"#ccc", color:"#333"}}>
            Regresar
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecuperacionDeContrasenaP1;
