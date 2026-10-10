import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Utensils,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logoHotel from "../../assets/logo-hotel.png";

const recepcionistaMenu = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/reservas", label: "Reservas", icon: Calendar },
  { path: "/huespedes", label: "Huespedes", icon: Users },
  { path: "/habitaciones", label: "Habitaciones", icon: BedDouble },
  { path: "/checkin", label: "Check-in", icon: LogIn },
  { path: "/consumos", label: "Consumos y servicios", icon: Coffee },
  { path: "/pagos", label: "Pagos", icon: CreditCard },
  { path: "/checkout", label: "Check-out", icon: LogOut },
  { path: "/turnos", label: "Turno", icon: Clock },
];

const adminMenu = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/reservas", label: "Reservas", icon: Calendar },
  { path: "/huespedes", label: "Huespedes", icon: Users },
  { path: "/habitaciones", label: "Habitaciones", icon: BedDouble },
  { path: "/checkin", label: "Check-in", icon: LogIn },
  { path: "/consumos", label: "Consumos", icon: Utensils },
  { path: "/pagos", label: "Pagos", icon: CreditCard },
  { path: "/checkout", label: "Check-out", icon: LogOut },
  { path: "/servicios", label: "Servicios", icon: Coffee },
  { path: "/usuarios", label: "Usuarios", icon: ShieldCheck },
  { path: "/turnos", label: "Turnos", icon: Clock },
  { path: "/reportes", label: "Reportes", icon: BarChart3 },
  { path: "/configuracion", label: "Configuracion", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "ADMINISTRADOR";
  const currentMenu = isAdmin ? adminMenu : recepcionistaMenu;
  const rolLabel = isAdmin ? "Administrador" : "Recepcionista";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-60 bg-[#1e2720] text-slate-300 min-h-screen flex flex-col justify-between shrink-0 font-sans text-xs">
      <div>
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
          <img src={logoHotel} alt="" className="w-8 h-8 rounded-full object-cover" />
          <div>
            <h1 className="text-xs font-bold text-white tracking-wide">
              Huerto Hostel
            </h1>
            <p className="text-[10px] text-slate-400">Sistema PMS</p>
          </div>
        </div>

        <div className="p-3">
          <button
            onClick={() => navigate("/reservas", { state: { openNuevoIngreso: true } })}
            className="w-full bg-[#1b4332] hover:bg-[#143427] text-white py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors text-xs"
          >
            <Plus size={15} /> Nuevo Ingreso
          </button>
        </div>

        <nav className="px-2 space-y-0.5">
          <p className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            Menu {rolLabel}
          </p>
          {currentMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
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

      <div className="p-3 border-t border-slate-800/80 bg-[#19211b]">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 truncate">
            <div className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
              {isAdmin ? "ADM" : "REC"}
            </div>
            <div className="truncate">
              <p className="font-semibold text-white truncate">{user?.username ?? "Usuario"}</p>
              <p className="text-[9px] text-slate-400 truncate">{rolLabel}</p>
            </div>
          </div>
          <button
            title="Cerrar sesion"
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <Power size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
