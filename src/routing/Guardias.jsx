import { Navigate, Outlet, useLocation } from "react-router";
import { getToken } from "../services/api";
import { destinoConSesionEnLogin, rutaDeLogin } from "./rutas.js";

// Rutas que exigen sesion: sin token -> /login?volver=<ruta actual> (replace,
// para que Atras no vuelva a la ruta protegida y se repita la redireccion).
// El estado del historial (p. ej. el id del chat abierto, que no va en la URL)
// viaja como estadoDestino y se restaura tras el login.
// Solo mira si HAY token; si esta vencido, la primera peticion responde 401 y
// fetchConSesion llama a logout (App.jsx).
export function RequiereSesion() {
  const { pathname, state } = useLocation();
  if (!getToken()) return <Navigate to={rutaDeLogin(pathname)} replace state={state ? { estadoDestino: state } : undefined} />;
  return <Outlet />;
}

// /login con sesion activa no se muestra: va al ?volver= valido o al inicio.
export function SoloSinSesion({ children }) {
  const { search, state } = useLocation();
  if (getToken()) return <Navigate to={destinoConSesionEnLogin(search)} replace state={state?.estadoDestino} />;
  return children;
}
