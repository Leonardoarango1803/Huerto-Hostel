import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { ProtectedRoute } from "./components/ProtectedRoute";
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

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#f5f6f8] font-sans">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/habitaciones" element={<HabitacionesView />} />
          <Route path="/reservas" element={<ReservasView />} />
          <Route path="/huespedes" element={<HuespedesView />} />
          <Route path="/checkin" element={<CheckInView />} />
          <Route path="/consumos" element={<ConsumosView />} />
          <Route path="/pagos" element={<PagosView />} />
          <Route path="/checkout" element={<CheckoutView />} />
          <Route path="/servicios" element={<ServiciosView />} />
          <Route path="/usuarios" element={<UsuariosView />} />
          <Route path="/turnos" element={<TurnosView />} />
          <Route path="/reportes" element={<ReportesView />} />
          <Route path="/configuracion" element={<ConfiguracionView />} />
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
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppLayout />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
