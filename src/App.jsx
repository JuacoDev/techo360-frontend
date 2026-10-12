import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import "./Css/StyleComponents.css";
import "./Css/StyleInicioYRegistroCuenta.css";
import "./Css/StylePerfilUsuario.css";
import CabezaDeNavegacion from "./components/CabezaDeNavegacion";
import BarraBuscadora from "./components/BarraBuscadora";
import ChatBot from "./components/Chatbot";
import MapView from "./components/MapView";
import PanelIndicadores from "./components/PanelIndicadores";
import PantallaCarga from "./components/PantallaCarga";
import { useModoCapas } from "./components/SelectorCapasMapa";
import AutenticarScreens from "./pages/InicioYRegistroCuenta/AutenticarScreens";
import PerfilUsuario from "./pages/PerfilUsuario/PerfilUsuario.jsx";
import Home from "./pages/Home/Home.jsx";
import ChatBotScreen from "./pages/ChatBot/ChatBotScreen.jsx";
import Proyectadas from "./pages/Proyeccion/Proyectadas.jsx";
import Reportes from "./pages/Reportes/Reportes.jsx";
import { API_URL, getToken, limpiarToken, ANIO_INDICADORES, fetchConSesion, getRangoProyeccionZonas } from "./services/api";
import { RequiereSesion, SoloSinSesion } from "./routing/Guardias.jsx";
import { RUTAS } from "./routing/rutas.js";
import { avisoConversacionNoDisponible } from "./services/mensajesError.js";

// Las rutas viven en la URL con react-router (modo declarativo, BrowserRouter
// en Main.jsx). App queda POR ENCIMA de <Routes>: los datos del mapa se
// descargan una sola vez por sesion y sobreviven a ir a /perfil y volver.
function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // logout debe ser estable (las pantallas lo ponen en dependencias de efectos)
  // y navigate cambia de identidad con la ruta: se lee desde una ref.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  const [departamentos, setDepartamentos] = useState(null);
  const [datosMunicipios, setDatosMunicipios] = useState(null);
  const [rangoProyeccion, setRangoProyeccion] = useState(null);
  const [errorRangoProyeccion, setErrorRangoProyeccion] = useState(null);

  // Se arregló para implementar react-router: se quitaron los flags mapReady/
  // departamentosReady/municipiosReady/buscadorReady (nadie los ponia en true;
  // el paso carga -> mapa lo decide MapaCalor, mas abajo).

  // "Ya se disparo el fetch de esta sesion" -- ref, no state, porque solo
  // nos importa como guardia sincrona dentro del efecto (si fuera state,
  // el propio cambio del guard forzaria un re-render/re-chequeo extra sin
  // aportar nada). Se resetea unicamente en logout(). Sin esta guardia,
  // el efecto se re-evalua en cada cambio de ruta y volveria a disparar
  // una segunda peticion identica todavia en curso.
  const departamentosSolicitados = useRef(false);
  const municipiosSolicitados = useRef(false);
  const rangoProyeccionSolicitado = useRef(false);

  // Punto unico de cierre de sesion: limpia el token Y los datos ya
  // cargados con ese token (y las guardias de fetch de arriba). Sin esto,
  // si un usuario cierra sesion e inicia con otra cuenta SIN recargar la
  // pagina, la guardia impediria el refetch y la app seguiria mostrando
  // los datos de la sesion anterior. Se usa tanto desde el logout manual
  // (CabezaDeNavegacion) como desde una expiracion de sesion detectada en
  // los fetches -- ambos son, en la practica, el mismo evento: la sesion
  // actual dejo de ser valida.
  const logout = useCallback(() => {
    limpiarToken();
    setDepartamentos(null);
    setDatosMunicipios(null);
    setRangoProyeccion(null);
    setErrorRangoProyeccion(null);
    setZonaSeleccionada(null);
    departamentosSolicitados.current = false;
    municipiosSolicitados.current = false;
    rangoProyeccionSolicitado.current = false;
    // Se arregló para implementar react-router: setScreen("home") + window.location.reload()
    // -> navigate("/", { replace: true }). El estado ya se limpia arriba y las rutas
    // protegidas que queden en el historial redirigen a /login (RequiereSesion).
    navigateRef.current(RUTAS.inicio, { replace: true });
  }, []);

  // Datos geograficos de departamentos y municipios (con sus 7 indicadores
  // y el score_privacion) cargados UNA vez por sesion, aqui en App -- no
  // en MapView, que se monta y desmonta al pasar de la pantalla de carga
  // a la de la app. MapView y BarraBuscadora reciben estos datos por
  // props en vez de pedirlos cada uno por su cuenta, para no repetir la
  // descarga completa (GET /api/zonas?nivel=municipio pesa ~5MB).
  //
  // Dependen de la ruta (no de `[]`): en la primera carga puede no haber
  // token todavia -- si el efecto disparara ahi mandaria "Authorization:
  // Bearer null" y el backend responde 401. El guard `!token` evita ese
  // fetch prematuro; la ruta como dependencia hace que se reintente en
  // cuanto se navega tras el login (cuando el token ya esta guardado).
  useEffect(() => {
    const token = getToken();
    if (!token || departamentosSolicitados.current) return;
    departamentosSolicitados.current = true;

    fetchConSesion(`${API_URL}/api/zonas?nivel=departamento`, {}, logout)
      .then((res) => res.json())
      .then(setDepartamentos)
      .catch((err) => console.error("Error cargando limites de departamentos:", err));
  }, [pathname, logout]);

  useEffect(() => {
    const token = getToken();
    if (!token || municipiosSolicitados.current) return;
    municipiosSolicitados.current = true;

    fetchConSesion(`${API_URL}/api/zonas?nivel=municipio&anio=${ANIO_INDICADORES}`, {}, logout)
      .then((res) => res.json())
      .then(setDatosMunicipios)
      .catch((err) => console.error("Error cargando indicadores de municipios:", err));
  }, [pathname, logout]);

  // Rango de años valido para la proyeccion (real, no hardcodeado): se
  // pide una sola vez, igual que departamentos/municipios arriba, y se
  // comparte por props solo con Proyectadas -- el MapView del dashboard
  // de calor no usa años de proyeccion.
  useEffect(() => {
    const token = getToken();
    if (!token || rangoProyeccionSolicitado.current) return;
    rangoProyeccionSolicitado.current = true;

    getRangoProyeccionZonas(logout)
      .then((datos) => {
        setRangoProyeccion({ anioMinimo: datos.anio_minimo, anioMaximo: datos.anio_maximo });
      })
      .catch((err) => {
        console.error("Error cargando el rango de años de proyeccion:", err);
        setErrorRangoProyeccion(
          "No se pudo cargar el rango de años disponible para la proyección."
        );
      });
  }, [pathname, logout]);

  // Punto unico de seleccion de zona, usado tanto por el clic en el mapa
  // como por el buscador: si la zona clickeada/elegida es la misma que ya
  // esta seleccionada, se deselecciona (vuelve a null) en vez de quedar
  // fija -- asi el comportamiento de "clic de nuevo para soltar" es
  // consistente sin importar por donde se selecciono.
  const seleccionarZona = (zona) => {
    setZonaSeleccionada((actual) =>
      zona && actual && actual.codigo === zona.codigo ? null : zona
    );
  };

  // Se arregló para implementar react-router: los bloques `screen === "..." && <Pantalla/>`
  // pasan a <Route>; las pantallas navegan con useIrA/<Link> en vez de recibir setScreen.
  return (
    <Routes>
      <Route path={RUTAS.inicio} element={<Home onLogout={logout} />} />

      <Route path={RUTAS.login} element={<SoloSinSesion><AutenticarScreens flujo="login" /></SoloSinSesion>} />
      <Route path={RUTAS.registro} element={<AutenticarScreens flujo="registro" />} />
      <Route path={RUTAS.recuperar} element={<AutenticarScreens flujo="recuperar" />} />

      <Route element={<RequiereSesion />}>
        <Route
          path={RUTAS.mapaCalor}
          element={
            <MapaCalor
              onLogout={logout}
              departamentos={departamentos}
              datosMunicipios={datosMunicipios}
              zonaSeleccionada={zonaSeleccionada}
              seleccionarZona={seleccionarZona}
            />
          }
        />
        <Route
          path={RUTAS.proyeccion}
          element={
            <Proyectadas
              onLogout={logout}
              departamentos={departamentos}
              datosMunicipios={datosMunicipios}
              rangoProyeccion={rangoProyeccion}
              errorRangoProyeccion={errorRangoProyeccion}
            />
          }
        />
        <Route
          path={RUTAS.reportes}
          element={<Reportes onLogout={logout} departamentos={departamentos} datosMunicipios={datosMunicipios} />}
        />
        <Route path={RUTAS.perfil} element={<PerfilUsuario onLogout={logout} />} />
        <Route path={RUTAS.techobot} element={<ChatBotScreen onLogout={logout} />} />
        <Route path={RUTAS.chat} element={<ChatBotScreen onLogout={logout} />} />
        <Route path={RUTAS.chatNuevo} element={<ChatBotScreen onLogout={logout} />} />
        {/* Enlaces viejos con el id en la URL (/techobot/12): el id ya no va en la ruta. */}
        <Route
          path={`${RUTAS.techobot}/*`}
          element={<Navigate to={RUTAS.techobot} replace state={{ aviso: avisoConversacionNoDisponible() }} />}
        />
      </Route>

      <Route path="*" element={<Navigate to={RUTAS.inicio} replace />} />
    </Routes>
  );
}

// /mapa-calor: UN solo mapa. La pantalla de carga se superpone al dashboard y se
// quita con una senal real -- las dos capas (departamentos y municipios) ya
// construidas y pintadas (onCapasListas de MapView) --, no con whenReady de
// Leaflet, que llega antes que los datos y dejaba ver un mapa vacio y luego el
// "pop-in" de los poligonos. Si los datos no llegan (error de red), a los
// LIMITE_CARGA_MS se muestra el mapa igual para no dejar al usuario bloqueado.
const LIMITE_CARGA_MS = 20000;

function MapaCalor({ onLogout, departamentos, datosMunicipios, zonaSeleccionada, seleccionarZona }) {
  const [capasListas, setCapasListas] = useState(false);
  const [limiteVencido, setLimiteVencido] = useState(false);
  const alCapasListas = useCallback(() => setCapasListas(true), []);
  // Modo de capas de ESTE mapa: lo cambian el selector del mapa y los desplegables del buscador.
  const modoCapas = useModoCapas();
  const listo = capasListas || limiteVencido;

  useEffect(() => {
    const t = setTimeout(() => setLimiteVencido(true), LIMITE_CARGA_MS);
    return () => clearTimeout(t);
  }, []);

  const propsMapa = {
    onCapasListas: alCapasListas,
    onZonaSeleccionada: seleccionarZona,
    departamentos,
    datosMunicipios,
    codigoSeleccionado: zonaSeleccionada?.codigo ?? null,
    scoreSeleccionado: zonaSeleccionada?.score_privacion ?? null,
    nivelSeleccionado: zonaSeleccionada?.nivel ?? null,
    modoCapas,
  };

  return (
    <main className="app-shell" aria-busy={!listo}>
      {!listo && <PantallaCarga />}
      <CabezaDeNavegacion onLogout={onLogout} />
      <div className="dashboard-layout">
        <section className="dashboard-main-column" aria-label="Mapa y buscador">
          <BarraBuscadora
            onSeleccionarZona={seleccionarZona}
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
            zonaActiva={zonaSeleccionada}
            onEventoCapas={modoCapas[1]}
          />
          <div className="dashboard-map-container">
            <MapView {...propsMapa} />
          </div>
        </section>
        <PanelIndicadores onLogout={logout} departamentos={departamentos} datosMunicipios={datosMunicipios} zonaSeleccionada={zonaSeleccionada} />
      </div>
      {/* Oculto para la entrega -- el backend del chatbot no tiene
          ninguna ruta de chat real todavia (solo /health), se veria
          roto en vivo. No se elimina para reactivarlo cuando el
          backend este listo. */}
      {false && <ChatBot />}
    </main>
  );
}

export default App;
