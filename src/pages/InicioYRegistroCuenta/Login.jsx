import { useState } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import LogoGoogle from "../../assets/LogoGoogle.png";
import OjoAbiertoContrasena from "../../assets/OjoAbiertoContrasena.png";
import OjoCerradoContrasena from "../../assets/OjoCerradoContrasena.png";

function Login({ onContinue, goToRegister, goToRecovery }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-container login-container">
      <h2>Inicio de Sesión</h2> 

      {/* Botón con logo de Google */}
      <button className="google-btn">
        <img src={LogoGoogle} alt="Google" className="google-logo" />
        Continuar con Google
      </button>

      <p style={{textAlign:"center", margin:"10px 0"}}>O ingresa tu Email</p>

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

      <p className="form-footer">
        <span onClick={goToRecovery}>¿Olvidaste tu contraseña?</span>
        </p>



      <div className="form-options">
        <input type="checkbox" id="rememberLogin" />
        <label htmlFor="rememberLogin">Recordarme</label>
      </div>

      <button onClick={onContinue}>Iniciar Sesión</button>

      <p className="form-footer">
        ¿No tienes una cuenta? <span onClick={goToRegister}>Regístrate</span>
      </p>
    </div>
  );
}

export default Login;
