import { useEffect, useState } from "react";
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

  const handleMapLoaded = () => {
    setScreen("app");
  };

  // Datos geograficos de departamentos y municipios (con sus 7 indicadores
  // y el score_privacion) cargados UNA sola vez por sesion, aqui en App --
  // no en MapView, que se monta y desmonta al pasar de la pantalla de
  // carga a la de la app. MapView y BarraBuscadora reciben estos datos
  // por props en vez de pedirlos cada uno por su cuenta, para no repetir
  // la descarga completa (GET /api/zonas?nivel=municipio pesa ~5MB).
  useEffect(() => {
    const token = getToken();

    fetch(`${API_URL}/api/zonas?nivel=departamento`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          limpiarToken();
          setScreen("login");
          throw new Error("Sesion expirada");
        }
        if (!res.ok) throw new Error(`No se pudo cargar el GeoJSON de departamentos (${res.status})`);
        return res.json();
      })
      .then(setDepartamentos)
      .catch((err) => console.error("Error cargando limites de departamentos:", err));
  }, []);

  useEffect(() => {
    const token = getToken();

    fetch(`${API_URL}/api/zonas?nivel=municipio&anio=${ANIO_INDICADORES}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          limpiarToken();
          setScreen("login");
          throw new Error("Sesion expirada");
        }
        if (!res.ok) throw new Error(`No se pudo cargar los indicadores de municipios (${res.status})`);
        return res.json();
      })
      .then(setDatosMunicipios)
      .catch((err) => console.error("Error cargando indicadores de municipios:", err));
  }, []);

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

      {screen === "perfil" && <PerfilUsuario setScreen={setScreen} />}

      {screen === "app" && (
        <main className="app-shell">
          <MapView
            onMapLoaded={handleMapLoaded}
            onZonaSeleccionada={seleccionarZona}
            departamentos={departamentos}
            datosMunicipios={datosMunicipios}
            codigoSeleccionado={zonaSeleccionada?.codigo ?? null}
          />
          <CabezaDeNavegacion setScreen={setScreen} />
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
