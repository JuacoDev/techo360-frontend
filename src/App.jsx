import { useCallback, useEffect, useRef, useState } from "react";
import "./Css/StyleComponents.css";
import "./Css/StyleInicioYRegistroCuenta.css";
import "./Css/StylePerfilUsuario.css";
import CabezaDeNavegacion from "./components/CabezaDeNavegacion";
import BarraBuscadora from "./components/BarraBuscadora";
import ChatBot from "./components/Chatbot";
import MapView from "./components/MapView";
import PanelIndicadores from "./components/PanelIndicadores";
import PantallaCarga from "./components/PantallaCarga";
import AutenticarScreens from "./pages/InicioYRegistroCuenta/AutenticarScreens";
import PerfilUsuario from "./pages/PerfilUsuario/PerfilUsuario.jsx";
import { API_URL, getToken, limpiarToken, ANIO_INDICADORES } from "./services/api";

function App() {
  const [screen, setScreen] = useState("login");
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  const [departamentos, setDepartamentos] = useState(null);
  const [datosMunicipios, setDatosMunicipios] = useState(null);

  const [mapReady, setMapReady] = useState(false);
  const [departamentosReady, setDepartamentosReady] = useState(false);
  const [municipiosReady, setMunicipiosReady] = useState(false);
  const [buscadorReady, setBuscadorReady] = useState(false);

  const essentialReady = mapReady && departamentosReady && municipiosReady && buscadorReady;

  useEffect(() => {
    if (screen === "loading" && essentialReady) {
      setScreen("app");
    }
  }, [essentialReady, screen]);

  // "Ya se disparo el fetch de esta sesion" -- ref, no state, porque solo
  // nos importa como guardia sincrona dentro del efecto (si fuera state,
  // el propio cambio del guard forzaria un re-render/re-chequeo extra sin
  // aportar nada). Se resetea unicamente en logout(). Sin esta guardia,
  // el efecto se re-evalua en cada cambio de `screen` -- incluyendo la
  // transicion "loading" -> "app", que ocurre en cuanto el mapa esta
  // listo (whenReady), casi siempre ANTES de que la descarga de ~5MB de
  // municipios termine -- y volveria a disparar una segunda peticion
  // identica todavia en curso.
  const departamentosSolicitados = useRef(false);
  const municipiosSolicitados = useRef(false);

  
  const handleMapLoaded = () => {
    setScreen("app");
  };

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
    departamentosSolicitados.current = false;
    municipiosSolicitados.current = false;
    setMapReady(false);
    setDepartamentosReady(false);
    setMunicipiosReady(false);
    setBuscadorReady(false);
    setScreen("login");
    
  }, []);

  // Datos geograficos de departamentos y municipios (con sus 7 indicadores
  // y el score_privacion) cargados UNA vez por sesion, aqui en App -- no
  // en MapView, que se monta y desmonta al pasar de la pantalla de carga
  // a la de la app. MapView y BarraBuscadora reciben estos datos por
  // props en vez de pedirlos cada uno por su cuenta, para no repetir la
  // descarga completa (GET /api/zonas?nivel=municipio pesa ~5MB).
  //
  // Dependen de `screen` (no de `[]`): en el primer render de App, screen
  // sigue en "login" y todavia no hay token -- si el efecto disparara ahi
  // mandaria "Authorization: Bearer null" y el backend responde 401. El
  // guard `!token` evita ese fetch prematuro; `screen` como dependencia
  // hace que se reintente en cuanto cambia de pantalla tras el login
  // (cuando el token ya esta guardado).
  useEffect(() => {
    const token = getToken();
    if (!token || departamentosSolicitados.current) return;
    departamentosSolicitados.current = true;

    fetch(`${API_URL}/api/zonas?nivel=departamento`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          logout();
          throw new Error("Sesion expirada");
        }
        if (!res.ok) throw new Error(`No se pudo cargar el GeoJSON de departamentos (${res.status})`);
        return res.json();
      })
      .then(setDepartamentos)
      .catch((err) => console.error("Error cargando limites de departamentos:", err));
  }, [screen, logout]);

  useEffect(() => {
    const token = getToken();
    if (!token || municipiosSolicitados.current) return;
    municipiosSolicitados.current = true;

    fetch(`${API_URL}/api/zonas?nivel=municipio&anio=${ANIO_INDICADORES}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          logout();
          throw new Error("Sesion expirada");
        }
        if (!res.ok) throw new Error(`No se pudo cargar los indicadores de municipios (${res.status})`);
        return res.json();
      })
      .then(setDatosMunicipios)
      .catch((err) => console.error("Error cargando indicadores de municipios:", err));
  }, [screen, logout]);

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

  return (
    <>
      {screen === "loading" && (
        <>
          <PantallaCarga />
          <MapView
            onMapLoaded={handleMapLoaded}
            onZonaSeleccionada={seleccionarZona}
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
            codigoSeleccionado={zonaSeleccionada?.codigo ?? null}
          />
        </>
      )}

      {screen === "perfil" && <PerfilUsuario setScreen={setScreen} onLogout={logout} />}

      {screen === "app" && (
        <main className="app-shell">
          <MapView
            onMapLoaded={handleMapLoaded}
            onZonaSeleccionada={seleccionarZona}
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
            codigoSeleccionado={zonaSeleccionada?.codigo ?? null}
          />
          <CabezaDeNavegacion setScreen={setScreen} onLogout={logout} />
          <BarraBuscadora
            onSeleccionarZona={seleccionarZona}
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
          />
          <PanelIndicadores zonaSeleccionada={zonaSeleccionada} />
          {/* Oculto para la entrega -- el backend del chatbot no tiene
              ninguna ruta de chat real todavia (solo /health), se veria
              roto en vivo. No se elimina para reactivarlo cuando el
              backend este listo. */}
          {false && <ChatBot />}
        </main>
      )}

      {screen !== "app" && screen !== "loading" && (
        <AutenticarScreens screen={screen} setScreen={setScreen} />
      )}
    </>
  );
}

export default App;
