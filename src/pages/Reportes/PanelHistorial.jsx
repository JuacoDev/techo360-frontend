import { Icono } from "./iconos.jsx";
import { nombreDePlantilla } from "./catalogo.js";
import { tiempoRelativo } from "../../services/reportesDatos.js";

const ETIQUETA_ESTADO = { pendiente: "en cola", procesando: "generando", error: "con error" };

// Lista desplegable de los reportes que el usuario ya hizo: título y hace cuánto. Solo guarda la
// CONFIGURACIÓN (el archivo vive 24 h en la caché del servidor); al abrir uno se vuelve a cargar en el
// editor para seguir editándolo, y al generar de nuevo reemplaza ese mismo reporte.
function PanelHistorial({ id, estado, items, mensaje, idActual, onAbrir, onEliminar, onNuevo, onReintentar }) {
  const ahora = Date.now();
  return (
    <div id={id} className="rp-historial" role="region" aria-label="Historial de reportes">
      <div className="rp-historial-cabecera">
        <strong>Tus reportes</strong>
        <button type="button" className="rp-enlace" onClick={onNuevo}>
          <Icono nombre="mas" tamano={13} /> Nuevo reporte
        </button>
      </div>

      {estado === "cargando" && !items.length && <p className="rp-pista">Cargando historial…</p>}
      {estado === "error" && (
        <p className="rp-error-campo" role="alert">
          {mensaje} <button type="button" className="rp-enlace" onClick={onReintentar}>Reintentar</button>
        </p>
      )}
      {estado !== "cargando" && estado !== "error" && items.length === 0 && (
        <p className="rp-pista">Aún no has generado reportes. Cuando generes uno aparecerá aquí para que puedas retomarlo.</p>
      )}

      {items.length > 0 && (
        <ul className="rp-historial-lista">
          {items.map((item) => (
            <li key={item.id} className={`rp-historial-item${item.id === idActual ? " is-actual" : ""}`}>
              <button type="button" className="rp-historial-abrir" onClick={() => onAbrir(item)} aria-current={item.id === idActual ? "true" : undefined}>
                <span className="rp-historial-icono"><Icono nombre={item.formato === "excel" ? "tabla" : "doc"} tamano={17} /></span>
                <span className="rp-historial-texto">
                  <strong>{item.titulo}</strong>
                  <small>
                    {tiempoRelativo(item.actualizado_en, ahora)} · {item.formato === "excel" ? "Excel" : "PDF"}
                    {item.plantilla ? ` · ${nombreDePlantilla(item.formato, item.plantilla) || item.plantilla}` : ""}
                    {ETIQUETA_ESTADO[item.estado] ? ` · ${ETIQUETA_ESTADO[item.estado]}` : ""}
                  </small>
                </span>
              </button>
              <button type="button" className="rp-historial-quitar" onClick={() => onEliminar(item)} aria-label={`Quitar «${item.titulo}» del historial`} title="Quitar del historial">
                <Icono nombre="papelera" tamano={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PanelHistorial;
