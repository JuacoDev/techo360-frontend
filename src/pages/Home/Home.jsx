import { useEffect, useState } from "react";
import "../../Css/StyleHome.css";
import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import { getCurrentUser } from "../../services/api";
import FondoHome from "../../assets/pexels-cesar-gaviria-232160-16637471.jpg";

function IconoMapaCalor() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#fff" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#fff" opacity="0.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#fff" opacity="0.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#fff" />
    </svg>
  );
}

function IconoProyeccion() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M3 17 9 11l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoChatBot() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M4 5h16v11H8l-4 4V5Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoReportes() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M5 20V10M12 20V4M19 20v-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Las 4 tarjetas del boceto aprobado en la revision de diseño (HU-38/T-90).
// Mapa de Proyeccion y Generar Reportes todavia no tienen pantalla propia
// -- se muestran deshabilitadas ("Proximamente") en vez de omitirse, para
// no romper la promesa visual del boceto ya revisado con el usuario.
const MODULOS = [
  {
    id: "mapa-calor",
    titulo: "Mapa de Calor",
    descripcion: "Explora el Score de Privación por municipio en un mapa coroplético interactivo de Colombia.",
    icono: IconoMapaCalor,
    color: "naranja",
    destino: "loading",
  },
  {
    id: "mapa-proyeccion",
    titulo: "Mapa de Proyección",
    descripcion: "Visualiza cómo evolucionarán los indicadores a futuro con el modelo predictivo LightGBM.",
    icono: IconoProyeccion,
    color: "sienna",
    destino: "proyeccion",
  },
  {
    id: "chatbot",
    titulo: "ChatBot",
    descripcion: "Resuelve tus dudas sobre el proyecto y sobre pobreza y déficit de vivienda en Colombia.",
    icono: IconoChatBot,
    color: "marron",
    destino: null,
  },
  {
    id: "reportes",
    titulo: "Visualizar y Generar Reportes",
    descripcion: "Compara indicadores por municipio y exporta reportes con gráficas en PDF.",
    icono: IconoReportes,
    color: "negro",
    destino: null,
  },
];

// Pantalla inicial de toda la app (publica, no exige sesion -- ver
// App.jsx). Los modulos con `destino` exigen sesion iniciada: se valida
// con getCurrentUser() -- el mismo mecanismo que ya usan PerfilUsuario y
// CabezaDeNavegacion, en vez de inventar un chequeo nuevo -- y si no hay
// sesion valida se redirige a Login en vez de navegar al modulo.
function Home({ setScreen, onLogout }) {
  const [user, setUser] = useState(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {});
  }, []);

  const entrarAModulo = async (destino) => {
    if (!destino || verificando) return;
    setVerificando(true);
    try {
      await getCurrentUser();
      setScreen(destino);
    } catch {
      setScreen("login");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="home-screen">
      <CabezaDeNavegacion setScreen={setScreen} onLogout={onLogout} />

      <section className="home-hero">
        <img src={FondoHome} alt="Medellín, Colombia" className="home-hero-img" />
        <div className="home-hero-overlay">
          <span className="home-hero-eyebrow">PANEL DE CONTROL</span>
          <h1>{user ? `Hola, ${user.namevar}` : "Bienvenido a Techo 360"}</h1>
          <p>
            {user
              ? "Elige un módulo para explorar los indicadores de pobreza y déficit de vivienda en Colombia."
              : "Inicia sesión para explorar los indicadores de pobreza y déficit de vivienda en Colombia."}
          </p>
        </div>
      </section>

      <section className="home-modulos">
        <div className="home-modulos-grid">
          {MODULOS.map(({ id, titulo, descripcion, icono: Icono, color, destino }) => {
            const habilitado = Boolean(destino);
            return (
              <div
                key={id}
                className={`home-card${habilitado ? "" : " home-card--deshabilitada"}`}
                role={habilitado ? "button" : undefined}
                tabIndex={habilitado ? 0 : undefined}
                onClick={habilitado ? () => entrarAModulo(destino) : undefined}
                onKeyDown={habilitado ? (e) => (e.key === "Enter" || e.key === " ") && entrarAModulo(destino) : undefined}
              >
                <span className={`home-card-icon home-card-icon--${color}`}>
                  <Icono />
                </span>
                <h3>{titulo}</h3>
                <p>{descripcion}</p>
                {habilitado ? (
                  <span className="home-card-link">Entrar →</span>
                ) : (
                  <span className="home-card-badge">Próximamente</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Home;
