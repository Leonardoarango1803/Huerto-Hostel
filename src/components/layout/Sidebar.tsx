import React from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BedDouble,
  LogIn,
  Coffee,
  CreditCard,
  LogOut,
  Clock,
  ShieldCheck,
  BarChart3,
  Settings,
  Plus,
  Power,
} from "lucide-react";

export type UserRole = "Recepcionista" | "Administrador";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
}) => {
  // Opciones para Recepcionista
  const recepcionistaMenu = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "reservas", label: "Reservas", icon: Calendar },
    { id: "huespedes", label: "Huéspedes", icon: Users },
    { id: "habitaciones", label: "Habitaciones", icon: BedDouble },
    { id: "checkin", label: "Check-in", icon: LogIn },
    { id: "consumos", label: "Consumos y servicios", icon: Coffee },
    { id: "pagos", label: "Pagos", icon: CreditCard },
    { id: "checkout", label: "Check-out", icon: LogOut },
    { id: "turno", label: "Turno", icon: Clock },
  ];

  // Opciones para Administrador
  const adminMenu = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "reservas", label: "Reservas", icon: Calendar },
    { id: "huespedes", label: "Huéspedes", icon: Users },
    { id: "habitaciones", label: "Habitaciones", icon: BedDouble },
    { id: "servicios", label: "Servicios", icon: Coffee },
    { id: "usuarios", label: "Usuarios", icon: ShieldCheck },
    { id: "turnos", label: "Turnos", icon: Clock },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ];

  const currentMenu =
    userRole === "Administrador" ? adminMenu : recepcionistaMenu;

  return (
    <aside className="w-60 bg-[#1e2720] text-slate-300 min-h-screen flex flex-col justify-between shrink-0 font-sans text-xs">
      <div>
        {/* Header Logo */}
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-emerald-800 flex items-center justify-center text-white font-bold text-sm">
            H
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wide">
              Huerto Hostel
            </h1>
            <p className="text-[10px] text-slate-400">Sistema PMS • Ica, PE</p>
          </div>
        </div>

        {/* Selector rápido de Rol (para pruebas) */}
        <div className="p-3 pb-0">
          <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
            Rol Actual:
          </label>
          <select
            value={userRole}
            onChange={(e) => {
              const newRole = e.target.value as UserRole;
              setUserRole(newRole);
              setActiveTab("dashboard"); // Resetea a la vista principal
            }}
            className="w-full bg-[#151c17] text-emerald-400 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none"
          >
            <option value="Recepcionista">Recepcionista</option>
            <option value="Administrador">Administrador</option>
          </select>
        </div>

        {/* Botón Nueva Reserva */}
        <div className="p-3">
          <button className="w-full bg-[#1b4332] hover:bg-[#143427] text-white py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors text-xs">
            <Plus size={15} /> Nueva Reserva
          </button>
        </div>

        {/* Menú Filtrado */}
        <nav className="px-2 space-y-0.5">
          <p className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            Menú {userRole}
          </p>
          {currentMenu.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#2d3a30] text-white font-semibold"
                    : "text-slate-400 hover:bg-[#253127] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    className={isActive ? "text-white" : "text-slate-400"}
                  />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Usuario */}
      <div className="p-3 border-t border-slate-800/80 bg-[#19211b]">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 truncate">
            <div className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
              {userRole === "Administrador" ? "ADM" : "REC"}
            </div>
            <div className="truncate">
              <p className="font-semibold text-white truncate">Carlos Espejo</p>
              <p className="text-[9px] text-slate-400 truncate">{userRole}</p>
            </div>
          </div>
          <button
            title="Estado de Caja"
            className="text-emerald-400 hover:text-emerald-300 p-1"
          >
            <Power size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
