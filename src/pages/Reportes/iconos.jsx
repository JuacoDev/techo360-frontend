// Iconos de linea (24x24, trazo = currentColor) para la pantalla de reportes.
const FORMAS = {
  panel: (<><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" /></>),
  doc: (<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><polyline points="14 3 14 8 19 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" /></>),
  tabla: (<><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="4" x2="9" y2="20" /></>),
  calendario: (<><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="3" y1="11" x2="21" y2="11" /></>),
  grafica: (<><line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="11" width="3" height="9" /><rect x="11" y="6" width="3" height="14" /><rect x="16" y="14" width="3" height="6" /></>),
  mapa: (<><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  descarga: (<><path d="M12 3v12" /><polyline points="7 11 12 16 17 11" /><line x1="5" y1="20" x2="19" y2="20" /></>),
  check: <polyline points="5 12 10 17 19 7" />,
  chevron: <polyline points="6 9 12 15 18 9" />,
  ojo: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  lista: (<><line x1="9" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="9" y1="18" x2="21" y2="18" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>),
  x: (<><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>),
  buscar: (<><circle cx="11" cy="11" r="6" /><line x1="20" y1="20" x2="15.5" y2="15.5" /></>),
  texto: (<><line x1="5" y1="6" x2="19" y2="6" /><line x1="12" y1="6" x2="12" y2="19" /><line x1="9" y1="19" x2="15" y2="19" /></>),
  sliders: (<><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="9" cy="7" r="2.2" fill="var(--rp-superficie, #fff)" /><circle cx="15" cy="17" r="2.2" fill="var(--rp-superficie, #fff)" /></>),
  indicador: (<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>),
  historial: (<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></>),
  arriba: <polyline points="6 15 12 9 18 15" />,
  abajo: <polyline points="6 9 12 15 18 9" />,
  arrastrar: (<><circle cx="9" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="18" r="1.2" /></>),
  mas: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  editar: (<><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13 7l4 4" /></>),
  papelera: (<><polyline points="4 7 20 7" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>),
  barras: (<><rect x="4" y="5" width="15" height="3" /><rect x="4" y="10.5" width="10" height="3" /><rect x="4" y="16" width="6" height="3" /></>),
  agrupadas: (<><rect x="4" y="4" width="14" height="2.5" /><rect x="4" y="7.5" width="10" height="2.5" /><rect x="4" y="13.5" width="12" height="2.5" /><rect x="4" y="17" width="7" height="2.5" /></>),
  apiladas: (<><rect x="4" y="5" width="8" height="4" /><rect x="12" y="5" width="7" height="4" /><rect x="4" y="12" width="5" height="4" /><rect x="9" y="12" width="9" height="4" /></>),
  lineas: (<><polyline points="3 17 9 11 13 15 21 7" /><line x1="3" y1="20" x2="21" y2="20" /></>),
  radar: (<><polygon points="12 3 21 10 17.5 20 6.5 20 3 10" /><polygon points="12 8 16.5 11.5 15 16 9 16 7.5 11.5" /></>),
  dispersion: (<><circle cx="6" cy="16" r="1.6" /><circle cx="10" cy="11" r="1.6" /><circle cx="15" cy="14" r="1.6" /><circle cx="18" cy="6" r="1.6" /><line x1="3" y1="20" x2="21" y2="20" /></>),
  histograma: (<><rect x="4" y="12" width="3.5" height="8" /><rect x="8.5" y="5" width="3.5" height="15" /><rect x="13" y="9" width="3.5" height="11" /><rect x="17.5" y="15" width="3" height="5" /></>),
  boxplot: (<><rect x="8" y="7" width="8" height="9" /><line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="16" x2="12" y2="21" /><line x1="8" y1="12" x2="16" y2="12" /></>),
  bullet: (<><rect x="3" y="9" width="18" height="6" /><line x1="15" y1="6" x2="15" y2="18" /><rect x="3" y="11" width="9" height="2" /></>),
  gauge: (<><path d="M4 17a8 8 0 0 1 16 0" /><line x1="12" y1="17" x2="16" y2="11" /></>),
  dumbbell: (<><circle cx="6" cy="8" r="2" /><circle cx="17" cy="8" r="2" /><line x1="8" y1="8" x2="15" y2="8" /><circle cx="9" cy="16" r="2" /><circle cx="19" cy="16" r="2" /><line x1="11" y1="16" x2="17" y2="16" /></>),
  donut: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>),
  treemap: (<><rect x="3" y="4" width="10" height="16" /><rect x="13" y="4" width="8" height="8" /><rect x="13" y="12" width="8" height="8" /></>),
  correlaciones: (<><rect x="3" y="3" width="6" height="6" /><rect x="9" y="3" width="6" height="6" /><rect x="15" y="3" width="6" height="6" /><rect x="3" y="9" width="6" height="6" /><rect x="9" y="9" width="6" height="6" /><rect x="15" y="9" width="6" height="6" /><rect x="3" y="15" width="6" height="6" /><rect x="9" y="15" width="6" height="6" /><rect x="15" y="15" width="6" height="6" /></>),
  paneles: (<><rect x="3" y="4" width="8" height="7" /><rect x="13" y="4" width="8" height="7" /><rect x="3" y="13" width="8" height="7" /><rect x="13" y="13" width="8" height="7" /></>),
};

export function Icono({ nombre, tamano = 18, className = "" }) {
  return (
    <svg
      className={`rp-icono ${className}`.trim()}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {FORMAS[nombre]}
    </svg>
  );
}
