import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/api";

function PantallaInicialDeUsuario() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {
        alert("Sesión expirada, vuelve a iniciar sesión");
        window.location.href = "/login";
      });
  }, []);

  if (!user) return <p>Cargando...</p>;

  return (
    <div>
      <h1>Bienvenido {user.namevar}</h1>
      <p>Correo: {user.correo}</p>
    </div>
  );
}

export default PantallaInicialDeUsuario;
