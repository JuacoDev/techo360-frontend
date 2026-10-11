import { plural } from "./catalogo.js";
import { Icono } from "./iconos.jsx";

const ETIQUETA_ESTADO = {
  pendiente: "En cola",
  procesando: "Generando",
  listo: "Listo para descargar",
  error: "Con error",
};

function Dato({ icono, etiqueta, valor, detalle }) {
  return (
    <li className="rp-dato">
      <span className="rp-dato-icono"><Icono nombre={icono} /></span>
      <span className="rp-dato-texto">
        <span className="rp-dato-etiqueta">{etiqueta}</span>
        <strong className="rp-dato-valor">{valor}</strong>
        {detalle && <span className="rp-dato-detalle">{detalle}</span>}
      </span>
    </li>
  );
}

// Cabecero informativo: resumen vivo de la configuracion, avance de los pasos
// obligatorios y estado del ultimo reporte.

function CabeceraReportes({ datos, pasos, reporte }) {
  const completados = pasos.filter((paso) => paso.ok).length;
  const porcentaje = Math.round((completados / pasos.length) * 100);

  return (
    <header className="rp-cabecera">
      <div className="rp-cabecera-fila">
        <h1>Visualizar y generar reportes</h1>
        <p className="rp-subtitulo">
          Configura el análisis, revisa el documento antes de solicitarlo y descárgalo en PDF o Excel.
        </p>
      </div>

      <ul className="rp-datos" aria-label="Resumen de la configuración">
        <Dato
          icono="mapa"
          etiqueta="Zonas"
          valor={datos.zonas}
          detalle={`${datos.departamentos} ${plural(datos.departamentos, "dpto.", "dptos.")} · ${datos.municipios} ${plural(datos.municipios, "municipio", "municipios")}`}
        />
        <Dato icono="indicador" etiqueta="Variables" valor={datos.variables} detalle={plural(datos.variables, "indicador incluido", "indicadores incluidos")} />
        <Dato icono="calendario" etiqueta="Periodo" valor={datos.periodo} detalle={datos.anios} />
        <Dato
          icono={datos.formato === "excel" ? "tabla" : "doc"}
          etiqueta="Formato"
          valor={datos.formato === "excel" ? "Excel" : "PDF"}
          detalle={datos.graficas ? "con gráficas" : "sin gráficas"}
        />
      </ul>

      <div className="rp-avance">
        <div className="rp-avance-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} aria-label="Avance de la configuración">
          <span style={{ width: `${porcentaje}%` }} />
        </div>
        <ul className="rp-pasos">
          {pasos.map((paso) => (
            <li key={paso.id} className={`rp-paso${paso.ok ? " is-ok" : ""}`}>
              <span className="rp-paso-marca">{paso.ok ? <Icono nombre="check" tamano={12} /> : null}</span>
              {paso.etiqueta}
            </li>
          ))}
        </ul>
        {reporte && (
          <span className={`rp-estado rp-estado--${reporte.estado}`} role="status">
            Último reporte: {ETIQUETA_ESTADO[reporte.estado] ?? reporte.estado}
          </span>
        )}
      </div>
    </header>
  );
}

export default CabeceraReportes;
