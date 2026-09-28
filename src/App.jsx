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
import Home from "./pages/Home/Home.jsx";
import ChatBotScreen from "./pages/ChatBot/ChatBotScreen.jsx";
import Proyectadas from "./pages/Proyeccion/Proyectadas.jsx";
import {getToken, limpiarToken, getZonasMunicipios, getZonasDepartamentos, getProyeccionZonas, } from "./services/api";

const PANTALLAS_PROPIAS = ["app", "loading", "perfil", "home", "chatbot", "proyeccion"];

function App() {
  const [screen, setScreen] = useState("home");
  const [pantallaDespuesDeLogin, setPantallaDespuesDeLogin] = useState("loading");
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  const [departamentos, setDepartamentos] = useState(null);
  const [datosMunicipios, setDatosMunicipios] = useState(null);
  const [departamentosAnio, setDepartamentosAnio] = useState(null);
  const [anioMapa, setAnioMapa] = useState(2025);
  const [selectorAnioActivo, setSelectorAnioActivo] = useState(false);
  const [datosMapaReales, setDatosMapaReales] = useState(null);
  const [datosMapaProyectados, setDatosMapaProyectados] = useState(null);
  const [fiabilidadMapa, setFiabilidadMapa] = useState(null);
  const [cargandoAnioMapa, setCargandoAnioMapa] = useState(false);
  const datosMapaPorAnio = useRef(new Map());

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
    setDepartamentosAnio(null);
    setDatosMapaReales(null);
    setDatosMapaProyectados(null);
    setFiabilidadMapa(null);
    setSelectorAnioActivo(false);
    setAnioMapa(2025);
    datosMapaPorAnio.current.clear();
    departamentosSolicitados.current = false;
    municipiosSolicitados.current = false;
    setMapReady(false);
    setDepartamentosReady(false);
    setMunicipiosReady(false);
    setBuscadorReady(false);
    setPantallaDespuesDeLogin("loading");
    setScreen("home");
    window.location.reload();
    
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

    getZonasDepartamentos(2025, logout)
      .then((datos) => {
        datosMapaPorAnio.current.set("departamentos-2025", datos);
        setDepartamentos(datos);
      })
      .catch((err) => console.error("Error cargando limites de departamentos:", err));
  }, [screen, logout]);

  useEffect(() => {
    const token = getToken();
    if (!token || municipiosSolicitados.current) return;
    municipiosSolicitados.current = true;

    getZonasMunicipios(2025, logout)
      .then((datos) => {
        datosMapaPorAnio.current.set("municipios-2025", datos);
        setDatosMunicipios(datos);
      })
      .catch((err) => console.error("Error cargando indicadores de municipios:", err));
  }, [screen, logout]);

  useEffect(() => {
    if (!selectorAnioActivo || screen !== "app") {
      setCargandoAnioMapa(false);
      return undefined;
    }

    let cancelado = false;
    setCargandoAnioMapa(true);
    setDatosMapaReales(null);
    setDepartamentosAnio(null);
    setDatosMapaProyectados(null);
    setFiabilidadMapa(null);
    const temporizador = setTimeout(async () => {
      try {
        if (anioMapa < 2025) {
          const [datos, departamentosDatos] = await Promise.all([
            datosMapaPorAnio.current.get(`municipios-${anioMapa}`)
              ?? getZonasMunicipios(anioMapa, logout),
            datosMapaPorAnio.current.get(`departamentos-${anioMapa}`)
              ?? getZonasDepartamentos(anioMapa, logout),
          ]);
          if (cancelado) return;
          datosMapaPorAnio.current.set(`municipios-${anioMapa}`, datos);
          datosMapaPorAnio.current.set(`departamentos-${anioMapa}`, departamentosDatos);
          setDatosMapaReales(datos);
          setDepartamentosAnio(departamentosDatos);
          setDatosMapaProyectados(null);
          setFiabilidadMapa(null);
        } else {
          let respuesta = datosMapaPorAnio.current.get(`proyeccion-${anioMapa}`);
          if (!respuesta) {
            respuesta = await getProyeccionZonas(anioMapa, undefined, logout);
            datosMapaPorAnio.current.set(`proyeccion-${anioMapa}`, respuesta);
          }
          if (cancelado) return;
          setDatosMapaReales(null);
          setDepartamentosAnio(null);
          setDatosMapaProyectados(respuesta.zonas ?? []);
          setFiabilidadMapa(respuesta.intervalo_confianza ?? respuesta.fiabilidad ?? null);
        }
      } catch (error) {
        if (!cancelado) console.error("Error cargando el año del mapa:", error);
      } finally {
        if (!cancelado) setCargandoAnioMapa(false);
      }
    }, 200);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [anioMapa, logout, screen, selectorAnioActivo]);

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

  const datosMunicipiosMapa = selectorAnioActivo && anioMapa < 2025
    ? datosMapaReales
    : datosMunicipios;
  const datosProyectadosMapa = selectorAnioActivo && anioMapa >= 2025
    ? datosMapaProyectados
    : null;
  const departamentosMapa = selectorAnioActivo && anioMapa < 2025
    ? departamentosAnio
    : departamentos;

  return (
    <>
      {screen === "loading" && (
        <>
          <PantallaCarga />
          <div className="map-loading-container">
            <MapView
              onMapLoaded={handleMapLoaded}
              onZonaSeleccionada={seleccionarZona}
              departamentos={departamentos}
              datosMunicipios={datosMunicipios}
              codigoSeleccionado={zonaSeleccionada?.codigo ?? null}
              scoreSeleccionado={zonaSeleccionada?.score_privacion ?? null}
              nivelSeleccionado={zonaSeleccionada?.nivel ?? null}
              mostrarSelectorAnio={false}
            />
          </div>
        </>
      )}

      {screen === "home" && (
        <Home
          setScreen={setScreen}
          onLogout={logout}
          onLoginFromHome={() => {
            setPantallaDespuesDeLogin("home");
            setScreen("login");
          }}
          onRequireLogin={(destino) => {
            setPantallaDespuesDeLogin(destino);
            setScreen("login");
          }}
        />
      )}

      {screen === "chatbot" && <ChatBotScreen setScreen={setScreen} onLogout={logout} />}

      {screen === "perfil" && <PerfilUsuario setScreen={setScreen} onLogout={logout} />}
      
      {screen === "proyeccion" && <Proyectadas setScreen={setScreen} onLogout={logout} departamentos={departamentos} datosMunicipios={datosMunicipios} />}

      {screen === "app" && (
        <main className="app-shell">
          <CabezaDeNavegacion setScreen={setScreen} onLogout={logout} />
          <div className="dashboard-layout">
            <section className="dashboard-main-column" aria-label="Mapa y buscador">
              <BarraBuscadora
                onSeleccionarZona={seleccionarZona}
                departamentos={departamentos}
                datosMunicipios={datosMunicipios}
                zonaActiva={zonaSeleccionada}
              />
              <div className="dashboard-map-container">
                <MapView
                  onMapLoaded={handleMapLoaded}
                  onZonaSeleccionada={seleccionarZona}
                  departamentos={departamentosMapa}
                  codigoSeleccionado={zonaSeleccionada?.codigo ?? null}
                  scoreSeleccionado={zonaSeleccionada?.score_privacion ?? null}
                  nivelSeleccionado={zonaSeleccionada?.nivel ?? null}
                  datosMunicipios={datosMunicipiosMapa}
                  datosProyectados={datosProyectadosMapa}
                  claveDatosMapa={selectorAnioActivo ? `anio-${anioMapa}` : "base"}
                  anioSeleccionado={anioMapa}
                  selectorAnioActivo={selectorAnioActivo}
                  cargandoAnio={cargandoAnioMapa}
                  fiabilidadProyeccion={fiabilidadMapa}
                  onAnioSeleccionado={setAnioMapa}
                  onSelectorAnioActivo={setSelectorAnioActivo}
                />
              </div>
            </section>
            <PanelIndicadores zonaSeleccionada={zonaSeleccionada} />
          </div>
          {/* Oculto para la entrega -- el backend del chatbot no tiene
              ninguna ruta de chat real todavia (solo /health), se veria
              roto en vivo. No se elimina para reactivarlo cuando el
              backend este listo. */}
          {false && <ChatBot />}
        </main>
      )}

      {!PANTALLAS_PROPIAS.includes(screen) && (
        <AutenticarScreens
          screen={screen}
          setScreen={setScreen}
          onLoginComplete={() => {
            const destino = pantallaDespuesDeLogin;
            setPantallaDespuesDeLogin("loading");
            setScreen(destino);
          }}
        />
      )}
    </>
  );
}

export default App;
