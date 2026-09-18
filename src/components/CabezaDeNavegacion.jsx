import { useState, useRef, useEffect } from "react";
import { getCurrentUser } from "../services/api";

// "MJ" a partir de "María José Rojas" -- primeras dos palabras del nombre
// completo que devuelve /auth/me (namevar), no hay campo separado de
// nombre/apellido en el backend.
function obtenerIniciales(nombreCompleto) {
  if (!nombreCompleto) return "";
  return nombreCompleto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase())
    .join("");
}

// Header oscuro unico para todas las vistas (Home publico, Mapa, Perfil,
// ChatBot). Se resuelve el usuario aqui mismo via getCurrentUser() en vez
// de recibirlo por props, para que cualquier pantalla pueda montarlo sin
// tener que cargar el usuario ella misma primero. Home es publico (no
// exige sesion), asi que el header debe poder mostrarse tambien SIN
// usuario -- `revisado` distingue "todavia no se sabe" (no renderiza nada
// a la derecha, evita el parpadeo "Iniciar sesion" -> avatar) de
// "ya se confirmo que no hay sesion" (muestra "Iniciar sesion").
function CabezaDeNavegacion({ setScreen, onLogout }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [revisado, setRevisado] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {})
      .finally(() => setRevisado(true));
  }, []);

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
      <button
        type="button"
        className="CabezaDeNavegacion-logo"
        onClick={() => setScreen("home")}
      >
        <span className="CabezaDeNavegacion-logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M3 11.5 12 4l9 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5h3.5a1 1 0 0 0 1-1v-9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2>Techo 360</h2>
      </button>

      <div className="CabezaDeNavegacion-links">
        {revisado && !user && (
          <button type="button" className="CabezaDeNavegacion-login" onClick={() => setScreen("login")}>
            Iniciar sesión
          </button>
        )}

        {user && (
          <>
            <div className="CabezaDeNavegacion-profile" ref={menuRef}>
              <button
                type="button"
                className="CabezaDeNavegacion-profile-btn"
                onClick={() => setOpen((v) => !v)}
              >
                <span className="CabezaDeNavegacion-avatar">{obtenerIniciales(user.namevar) || "…"}</span>
                <span className="CabezaDeNavegacion-nombre">{user.namevar}</span>
              </button>

              {open && (
                <nav className="opciones-sesion">
                  <ul>
                    <li>
                      <a href="#" onClick={() => { setOpen(false); setScreen("perfil"); }}>Ver perfil</a>
                    </li>
                  </ul>
                </nav>
              )}
            </div>

            <button type="button" className="CabezaDeNavegacion-logout" onClick={() => onLogout?.()}>
              Cerrar sesión
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default CabezaDeNavegacion;
