import { useState } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import OjoAbiertoContrasena from "../../assets/OjoAbiertoContrasena.png";
import OjoCerradoContrasena from "../../assets/OjoCerradoContrasena.png";

function RecuperacionDeContrasenaP2({ onChangePassword, onBack }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="form-container recuperacion-container">
      <h2>Nueva contraseña</h2>

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

      <p className="form-note">
        8 caracteres y al menos 1 letra minúscula, mayúscula, número y símbolo.
      </p>

      <button onClick={onChangePassword}>Cambiar contraseña</button>
      <button onClick={onBack} className="btn-back"style={{marginTop:"10px", background:"#ccc", color:"#333"}}>
        Regresar
      </button>
    </div>
  );
}

export default RecuperacionDeContrasenaP2;
