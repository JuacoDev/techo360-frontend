import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { debeReemplazar } from "./rutas.js";

// navigate() con la regla de historial de la app (ver debeReemplazar en
// rutas.js): salir de login/registro/recuperacion reemplaza la entrada, el
// resto empuja. `opciones` (state, replace explicito) se pasa tal cual.
export function useIrA() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(
    (ruta, opciones = {}) => navigate(ruta, { replace: debeReemplazar(pathname, ruta), ...opciones }),
    [navigate, pathname]
  );
}
