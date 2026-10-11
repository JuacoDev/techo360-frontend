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
