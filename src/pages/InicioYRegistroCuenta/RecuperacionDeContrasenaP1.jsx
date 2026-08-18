import "../../Css/StyleInicioYRegistroCuenta.css";

function RecuperacionDeContrasenaP1({ onSendCode, onBack }) {
  return (
    <div className="form-container recuperacion-container">
      <h2>¿Olvidaste tu contraseña?</h2>
      <p>Ingresa el correo con el que estás registrado para recibir un código de recuperación.</p>

      <input type="email" placeholder="E-mail" />

      <button onClick={onSendCode}>Enviar código</button>
      <button onClick={onBack} className="btn-back" style={{marginTop:"10px", background:"#ccc", color:"#333"}}>
        Regresar
      </button>
    </div>
  );
}

export default RecuperacionDeContrasenaP1;
