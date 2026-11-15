import { Navigate } from "react-router-dom";
import { rutaDeInicio } from "../../auth/permisos";
import { CambiarPasswordModal } from "../../components/CambiarPasswordModal";
import { useAuth } from "../../context/AuthContext";
import { PortalView } from "../PortalView";
import { WebLayout } from "./WebLayout";

/**
 * El portal del huesped vive dentro de la web (misma cabecera y pie), no en el panel del personal. Sin sesion lleva a
 * "Mi cuenta"; el personal va a su panel. Con una clave temporal (la que dio recepcion) primero debe elegir la suya.
 */
export function PortalWeb() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/ingresar" replace />;
  if (user.role !== "CLIENTE") return <Navigate to={rutaDeInicio(user.role)} replace />;
  if (user.debeCambiarPassword) return <CambiarPasswordModal obligatorio />;
  return (
    <WebLayout>
      <PortalView />
    </WebLayout>
  );
}
