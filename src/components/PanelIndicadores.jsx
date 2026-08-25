const INDICADORES = [
  'Variable 1',
  'Variable 2',
  'Variable 3',
  'Variable 4',
  'Variable 5',
  'Variable 6',
]

function PanelIndicadores() {
  return (
    <aside className="panel-indicadores" aria-label="Indicadores de la zona seleccionada">
      <div className="panel-indicadores-header">
        <h2>Estadísticas de: Nariño</h2>
        <div className="panel-indicadores-actions" aria-hidden="true">
          <span>▤</span>
          <span>▦</span>
        </div>
      </div>

      <div className="panel-indicadores-grid">
        {INDICADORES.map((indicador) => (
          <div className="indicador-placeholder" key={indicador}>
            {indicador}
          </div>
        ))}
      </div>
    </aside>
  )
}

export default PanelIndicadores
