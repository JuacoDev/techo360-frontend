import { useState, useRef, useEffect } from "react";
import IconoPerfil from "../assets/IconoPerfil.png";
import IconoLogo from "../assets/LogoMapa.png";

function CabezaDeNavegacion({ setScreen }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="CabezaDeNavegacion">
      <div className="CabezaDeNavegacion-logo">
        <img src={IconoLogo} alt="Logo Techo 360" className="logo-img" />
        <h2>Techo 360</h2>
      </div>

      <div className="CabezaDeNavegacion-links">
        <a href="#" onClick={() => setScreen("app")}>Inicio</a>
        <a href="#" onClick={() => setScreen("perfil")}>Perfil de Usuario</a>
        <a href="#">Configuración</a>

        <div className="CabezaDeNavegacion-profile" ref={menuRef}>
          <img 
            src={IconoPerfil} 
            alt="Perfil" 
            className="perfil-img"
            onClick={() => setOpen(!open)} 
          />
          {open && (
            <nav className="opciones-sesion">
              <ul>
                <li>
                  <a href="#" onClick={() => setScreen("perfil")}>Ver Perfil</a>
                </li>
                <li>
                  <a href="#" onClick={() => setScreen("login")}>Cerrar Sesión</a>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>
    </nav>
  );
}

export default CabezaDeNavegacion;
