function PantallaCarga({ transparente = false, mensaje = "Cargando mapa..." }) {
  return (
    <div
      className={
        transparente
          ? "pantalla-carga pantalla-carga-transparente"
          : "pantalla-carga"
      }
    >
      <div className="loader"></div>
      <p>{mensaje}</p>
    </div>
  );
}

export default PantallaCarga;
