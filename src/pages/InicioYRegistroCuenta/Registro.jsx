import { useState } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import LogoGoogle from "../../assets/LogoGoogle.png";
import OjoAbiertoContrasena from "../../assets/OjoAbiertoContrasena.png";
import OjoCerradoContrasena from "../../assets/OjoCerradoContrasena.png";

function Registro({ onContinue }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="form-container">
      <h2>Registro de Cuenta</h2>

      {/* Botón con logo de Google */}
      <button className="google-btn">
        <img src={LogoGoogle} alt="Google" className="google-logo" />
        Registrarse con Google
      </button>

      <p style={{textAlign:"center", margin:"10px 0"}}>O registrarte con tu E-mail</p>

      <input type="email" placeholder="E-mail" />

      {/* Contraseña */}
      <div className="password-field">
        <input 
          type={showPassword ? "text" : "password"} 
          placeholder="Contraseña" 
        />
        <img 
          src={showPassword ? OjoAbiertoContrasena : OjoCerradoContrasena} 
          alt="Mostrar contraseña" 
          className="eye-icon"
          onClick={() => setShowPassword(!showPassword)}
        />
      </div>

      {/* Confirmar contraseña */}
      <div className="password-field">
        <input 
          type={showConfirmPassword ? "text" : "password"} 
          placeholder="Confirmar contraseña" 
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

      <button onClick={onContinue}>Registrarse</button>

      <p className="form-footer">
        ¿Ya tienes una cuenta? <span onClick={onContinue}>Inicia sesión</span>
      </p>
    </div>
  );
}

export default Registro;
