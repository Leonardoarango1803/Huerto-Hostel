import type { ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { CajaBanner } from "./components/CajaBanner";
import { CajaProvider } from "./context/CajaContext";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RUTA, rolesDelModulo, rutaDeInicio, type Modulo } from "./auth/permisos";
import { LoginView } from "./views/LoginView";
import { DashboardView } from "./views/DashboardView";
import { CheckoutView } from "./views/CheckoutView";
import { ReservasView } from "./views/ReservasView";
import { HuespedesView } from "./views/HuespedesView";
import { HabitacionesView } from "./views/HabitacionesView";
import { CheckInView } from "./views/CheckInView";
import { ConsumosView } from "./views/ConsumosView";
import { PagosView } from "./views/PagosView";
import { ServiciosView } from "./views/ServiciosView";
import { UsuariosView } from "./views/UsuariosView";
import { TurnosView } from "./views/TurnosView";
import { ReportesView } from "./views/ReportesView";
import { ConfiguracionView } from "./views/ConfiguracionView";
import { ComandasView } from "./views/ComandasView";
import { InventarioView } from "./views/InventarioView";
import { LimpiezaView } from "./views/LimpiezaView";
import { IncidenciasView } from "./views/IncidenciasView";
import { CajaView } from "./views/CajaView";
import { PortalView } from "./views/PortalView";
import { SolicitudesView } from "./views/SolicitudesView";

/** Pantalla de cada modulo. Quien puede entrar a cada una lo decide auth/permisos.ts. */
const VISTAS: Record<Modulo, ReactElement> = {
  dashboard: <DashboardView />,
  reservas: <ReservasView />,
  huespedes: <HuespedesView />,
  habitaciones: <HabitacionesView />,
  checkin: <CheckInView />,
  consumos: <ConsumosView />,
  pagos: <PagosView />,
  checkout: <CheckoutView />,
  comandas: <ComandasView />,
  limpieza: <LimpiezaView />,
  incidencias: <IncidenciasView />,
  solicitudes: <SolicitudesView />,
  caja: <CajaView />,
  servicios: <ServiciosView />,
  inventario: <InventarioView />,
  usuarios: <UsuariosView />,
  turnos: <TurnosView />,
  reportes: <ReportesView />,
  configuracion: <ConfiguracionView />,
  portal: <PortalView />,
};

function InicioSegunRol() {
  const { user } = useAuth();
  return <Navigate to={rutaDeInicio(user?.role)} replace />;
}

function AppLayout() {
  return (
    <CajaProvider>
      <div className="flex min-h-screen bg-[#f5f6f8] font-sans">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <CajaBanner />
          <Routes>
            <Route path="/" element={<InicioSegunRol />} />
            {(Object.keys(VISTAS) as Modulo[]).map((modulo) => (
              <Route key={modulo} element={<ProtectedRoute allowedRoles={rolesDelModulo(modulo)} />}>
                <Route path={RUTA[modulo]} element={VISTAS[modulo]} />
              </Route>
            ))}
            <Route
              path="*"
              element={
                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <h1 className="font-bold text-slate-800 text-base uppercase">
                    Modulo en desarrollo
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Este modulo estara disponible proximamente.
                  </p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </CajaProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppLayout />} />
      </Route>
    </Routes>
  );
}

export default App;
