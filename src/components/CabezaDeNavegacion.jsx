import IconoPerfil from "../assets/IconoPerfil.png";
import IconoLogo from "../assets/LogoMapa.png";

function CabezaDeNavegacion() {
  return (
    <nav className="CabezaDeNavegacion">
      <div className="CabezaDeNavegacion-logo">
        <img src={IconoLogo} alt="Logo Techo 360" className="logo-img" />
        <h2>Techo 360</h2>
      </div>

      <div className="CabezaDeNavegacion-links">
        <a href="#">Dashboard</a>
        <a href="#">Reportes</a>
        <a href="#">Configuración</a>

        <div className="CabezaDeNavegacion-profile">
          <img src={IconoPerfil} alt="Perfil" />
        </div>
      </div>
    </nav>
  );
}

export default CabezaDeNavegacion;
