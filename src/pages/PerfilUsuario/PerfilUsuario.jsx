import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import Input from "../../components/Input";
import IconoPerfil from "../../assets/IconoPerfil.png";

function PerfilUsuario({ setScreen }) {
  return (
    <>
      <CabezaDeNavegacion setScreen={setScreen} />

      <div className="perfil-container">
        {/* Recuadro principal: avatar + info */}
        <div className="perfil-card">
          {/* Columna izquierda */}
          <div className="perfil-left">
            <img src={IconoPerfil} alt="Usuario" className="perfil-avatar" />
            <p className="perfil-nombre">usuarioPrueba</p>
          </div>

          {/* Columna derecha */}
          <div className="perfil-right">
            <h3>Información de usuario</h3>

            <label>Nombre</label>
            <Input value="usuarioPrueba" readOnly />

            <label>Correo Electrónico</label>
            <Input value="correoprueba@gmail.com" readOnly />
          </div>
        </div>

        {/* Recuadro independiente debajo */}
        <div className="informes-card">
          <h3>Informes</h3>
          <p>Aquí podrás visualizar y gestionar tus informes.</p>
        </div>
      </div>
    </>
  );
}

export default PerfilUsuario;
