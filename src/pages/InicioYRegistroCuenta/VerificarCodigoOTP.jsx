import { useState, useEffect } from "react";
import "../../Css/StyleInicioYRegistroCuenta.css";
import FondoLogin from "../../assets/FondoLogin.jpg";
import { requestOtp, verifyOtp, registerUser } from "../../services/api";

// Debe coincidir con RESEND_COOLDOWN_SECONDS en services/otp_service.py
// (backend) -- Registro.jsx ya disparo un /otp/request para llegar
// hasta aqui, asi que el cooldown real del backend ya esta corriendo
// desde ese momento; arrancar el contador local en el mismo valor es
// una aproximacion suficiente (no hay forma de leer el TTL exacto de
// Redis desde el frontend).
const COOLDOWN_SEGUNDOS = 60;

function VerificarCodigoOTP({ datosRegistro, onContinue, onBack }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN_SEGUNDOS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Se puede llegar aqui sin datosRegistro si el usuario recarga la
  // pagina en esta pantalla (el estado vive en memoria de
  // AutenticarScreens, no sobrevive un refresh) -- no hay nada que
  // registrar en ese caso, hay que volver a empezar el formulario.
  if (!datosRegistro) {
    return (
      <div className="auth-screen">
        <div className="auth-image-panel">
          <img src={FondoLogin} alt="Cartagena, Colombia" />
        </div>
        <div className="auth-form-panel">
          <div className="form-container recuperacion-container">
            <h2>Sesión de registro no encontrada</h2>
            <p>Vuelve a intentar el registro desde el inicio.</p>
            <button onClick={onBack}>Volver al registro</button>
          </div>
        </div>
      </div>
    );
  }

  const handleVerificar = async () => {
    setError("");
    setVerificando(true);
    try {
      await verifyOtp(datosRegistro.email, codigo);

      // Codigo correcto -- recien ahora se crea la cuenta. Antes de
      // este punto no existe ningun usuario en la DB con este correo.
      const data = await registerUser({
        correo: datosRegistro.email,
        namevar: datosRegistro.username,
        password: datosRegistro.password,
      });
      localStorage.setItem("token", data.access_token);
      onContinue();
    } catch (err) {
      if (err.status === 429) {
        setError(err.message || "Demasiados intentos fallidos. Solicita un código nuevo.");
      } else if (err.status === 400) {
        setError(err.message || "Código incorrecto o expirado.");
      } else {
        setError(err.message || "No se pudo completar el registro.");
      }
    } finally {
      setVerificando(false);
    }
  };

  const handleReenviar = async () => {
    if (cooldown > 0 || reenviando) return;
    setError("");
    setReenviando(true);
    try {
      await requestOtp(datosRegistro.email, datosRegistro.username);
      setCooldown(COOLDOWN_SEGUNDOS);
    } catch (err) {
      if (err.status === 429) {
        setError(err.message || "Espera antes de solicitar otro código.");
      } else {
        setError(err.message || "No se pudo reenviar el código.");
      }
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-image-panel">
        <img src={FondoLogin} alt="Cartagena, Colombia" />
      </div>

      <div className="auth-form-panel">
        <div className="form-container recuperacion-container">
          <h2>Verifica tu correo</h2>
          <p>
            Enviamos un código de 6 dígitos a <strong>{datosRegistro.email}</strong>.
            Ingrésalo para completar tu registro.
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Código de 6 dígitos"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />

          <button onClick={handleVerificar} disabled={verificando || codigo.length !== 6}>
            {verificando ? "Verificando..." : "Verificar"}
          </button>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <p className="form-footer">
            {cooldown > 0 ? (
              <span>Reenviar código en {cooldown}s</span>
            ) : (
              <span className="register-link" onClick={handleReenviar}>
                {reenviando ? "Reenviando..." : "Reenviar código"}
              </span>
            )}
          </p>

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

export default VerificarCodigoOTP;
