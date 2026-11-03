import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { rutaDeInicio } from "../auth/permisos";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Quien entra a una pantalla ajena vuelve a SU inicio. Mandarlo a /dashboard (solo gestion)
  // dejaba a cocina, cajero y limpieza rebotando en un bucle de redireccion.
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={rutaDeInicio(user.role)} replace />;
  }

  return <Outlet />;
}
