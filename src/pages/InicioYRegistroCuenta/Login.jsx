import { useState } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import LogoGoogle from "../../assets/LogoGoogle.png";
import OjoAbiertoContrasena from "../../assets/OjoAbiertoContrasena.png";
import OjoCerradoContrasena from "../../assets/OjoCerradoContrasena.png";
import { API_URL } from "../../services/api"

function Login({ onContinue, goToRegister, goToRecovery, skipLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState(""); // puede ser correo o usuario
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }) // cambiamos "correo" por "identifier"
      });

      if (response.status === 200) {
        const data = await response.json();
        console.log("Login exitoso:", data);

        //localStorage: guarda incluso si cierras el navegador,  sessionStorage: guarda solo mientras la pestaña esté abierta
        localStorage.setItem("token", data.access_token);

        onContinue(); // avanza al flujo normal
      } else if (response.status === 401) {
        setError("Credenciales inválidas");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <>
      <div className="form-container login-container">
        <h2>Inicio de Sesión</h2> 

        <button className="google-btn">
          <img src={LogoGoogle} alt="Google" className="google-logo" />
          Continuar con Google
        </button>

        <p style={{textAlign:"center", margin:"10px 0"}}>O ingresa tu Correo o Usuario</p>

        <input 
          type="text" 
          placeholder="Correo o Usuario" 
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
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
    </>
  );
}

export default Login;
