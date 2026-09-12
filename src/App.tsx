import { useState } from "react";
import { Sidebar, type UserRole } from "./components/layout/Sidebar";
import { CheckoutView } from "./views/CheckoutView";
import { DashboardView } from "./views/DashboardView";
import { ReservasView } from "./views/ReservasView";
import { HuespedesView } from "./views/HuespedesView";
import { HabitacionesView } from "./views/HabitacionesView";

export function App() {
  const [activeTab, setActiveTab] = useState("habitaciones");
  const [userRole, setUserRole] = useState<UserRole>("Recepcionista");

  return (
    <div className="flex min-h-screen bg-[#f5f6f8] font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
      />

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === "dashboard" && (
          <DashboardView userRole={userRole} setActiveTab={setActiveTab} />
        )}
        {activeTab === "checkout" && <CheckoutView />}
        {activeTab === "reservas" && <ReservasView />}
        {activeTab === "huespedes" && <HuespedesView />}
        {activeTab === "habitaciones" && <HabitacionesView />}

        {activeTab !== "dashboard" &&
          activeTab !== "checkout" &&
          activeTab !== "reservas" &&
          activeTab !== "huespedes" &&
          activeTab !== "habitaciones" && (
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h1 className="font-bold text-slate-800 text-base uppercase">
                Vista: {activeTab}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Módulo asignado al rol{" "}
                <span className="font-semibold text-emerald-800">
                  {userRole}
                </span>
                .
              </p>
            </div>
          )}
      </main>
    </div>
  );
}

export default App;
