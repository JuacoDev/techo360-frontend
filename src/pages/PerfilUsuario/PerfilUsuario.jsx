import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/api";
import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import Input from "../../components/Input";
import IconoPerfil from "../../assets/IconoPerfil.png";

function PerfilUsuario({ setScreen, onLogout }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
  getCurrentUser(onLogout)
    .then(setUser)
    .catch((err) => {
      if (err.status === 401) {
        alert("Sesión expirada, vuelve a iniciar sesión");
      } else {
        alert("Error al cargar usuario");
      }
      onLogout?.();
    });
}, [onLogout]);


  if (!user) return <p>Cargando...</p>;

  return (
    <>
      <CabezaDeNavegacion setScreen={setScreen} onLogout={onLogout} />

      <div className="perfil-container">
        <div className="perfil-card">
          <div className="perfil-left">
            <img src={IconoPerfil} alt="Usuario" className="perfil-avatar" />
            <p className="perfil-nombre">{user.namevar}</p>
          </div>

          <div className="perfil-right">
            <h3>Información de usuario</h3>

            <label>Nombre</label>
            <Input value={user.namevar} readOnly />

            <label>Correo Electrónico</label>
            <Input value={user.correo} readOnly />
          </div>
        </div>

        <div className="informes-card">
          <h3>Informes</h3>
          <p>Aquí podrás visualizar y gestionar tus informes.</p>
        </div>
      </div>
    </>
  );
}

export default PerfilUsuario;
