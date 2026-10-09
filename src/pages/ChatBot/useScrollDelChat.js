import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { decidirScroll, estaCercaDelFondo, firmaMensajes } from "../../services/scrollChat.js";

// Scroll de la lista de mensajes: abre en el mensaje mas reciente (sin
// animacion, antes de pintar), sigue al final solo si el usuario ya estaba
// cerca o el mensaje nuevo es suyo, y si subio a leer muestra "ir al final"
// con aviso de mensaje nuevo en vez de arrastrarlo.
export function useScrollDelChat({ messages, sending, textoEnviando }) {
  const listaRef = useRef(null);
  const estabaCerca = useRef(true);
  const firmaAnterior = useRef(null);
  const [lejosDelFondo, setLejosDelFondo] = useState(false);
  const [hayNuevo, setHayNuevo] = useState(false);

  const alHacerScroll = useCallback(() => {
    const el = listaRef.current;
    if (!el) return;
    const cerca = estaCercaDelFondo(el);
    estabaCerca.current = cerca;
    setLejosDelFondo(!cerca);
    if (cerca) setHayNuevo(false);
  }, []);

  useLayoutEffect(() => {
    const el = listaRef.current;
    if (!el) return;
    const despues = firmaMensajes(messages, sending ? textoEnviando : null);
    const decision = decidirScroll({ estabaCerca: estabaCerca.current, antes: firmaAnterior.current, despues });
    firmaAnterior.current = despues;
    if (decision === "fondo") {
      el.scrollTop = el.scrollHeight;
      estabaCerca.current = true;
      setLejosDelFondo(false);
      setHayNuevo(false);
    } else if (decision === "avisar") {
      setHayNuevo(true);
    }
  }, [messages, sending, textoEnviando]);

  const irAlFinal = useCallback(() => {
    const el = listaRef.current;
    if (!el) return;
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reducir ? "auto" : "smooth" });
  }, []);

  return { listaRef, alHacerScroll, lejosDelFondo, hayNuevo, irAlFinal };
}
