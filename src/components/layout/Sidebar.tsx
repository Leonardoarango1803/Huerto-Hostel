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
  ChefHat,
  Package,
  Sparkles,
  Wrench,
  Wallet,
  ConciergeBell,
  Receipt,
  Utensils,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MODULOS_POR_ROL, RUTA, puede, type Modulo, type Rol } from "../../auth/permisos";
import logoHotel from "../../assets/logo-hotel.png";

/** Como se ve cada modulo en el menu. Que modulos ve cada rol lo decide auth/permisos.ts. */
const ITEMS: Record<Modulo, { label: string; icon: React.ElementType }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  reservas: { label: "Reservas", icon: Calendar },
  huespedes: { label: "Huespedes", icon: Users },
  habitaciones: { label: "Habitaciones", icon: BedDouble },
  checkin: { label: "Check-in", icon: LogIn },
  consumos: { label: "Consumos y servicios", icon: Utensils },
  pagos: { label: "Pagos", icon: CreditCard },
  checkout: { label: "Check-out", icon: LogOut },
  comandas: { label: "Comandas", icon: ChefHat },
  limpieza: { label: "Limpieza", icon: Sparkles },
  incidencias: { label: "Incidencias", icon: Wrench },
  solicitudes: { label: "Solicitudes", icon: ConciergeBell },
  caja: { label: "Caja", icon: Wallet },
  servicios: { label: "Productos y servicios", icon: Coffee },
  inventario: { label: "Inventario", icon: Package },
  usuarios: { label: "Usuarios", icon: ShieldCheck },
  turnos: { label: "Turnos", icon: Clock },
  reportes: { label: "Reportes", icon: BarChart3 },
  configuracion: { label: "Configuracion", icon: Settings },
  portal: { label: "Mi estadia", icon: Receipt },
};

const PERFILES: Record<Rol, { label: string; sigla: string }> = {
  ADMINISTRADOR: { label: "Administrador", sigla: "ADM" },
  RECEPCIONISTA: { label: "Recepcionista", sigla: "REC" },
  CAJERO: { label: "Cajero", sigla: "CAJ" },
  COCINA: { label: "Cocina", sigla: "COC" },
  BAR: { label: "Bar", sigla: "BAR" },
  HOUSEKEEPING: { label: "Limpieza", sigla: "LIM" },
  CLIENTE: { label: "Huesped", sigla: "HUE" },
};

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const rol = user?.role as Rol | undefined;
  const perfil = rol ? PERFILES[rol] : undefined;
  const rolLabel = perfil?.label ?? "Usuario";
  const modulos = rol ? MODULOS_POR_ROL[rol] ?? [] : [];

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

        {puede(rol, "ingresoDirecto") && (
          <div className="p-3">
            <button
              onClick={() => navigate("/reservas", { state: { openNuevoIngreso: true } })}
              className="w-full bg-[#1b4332] hover:bg-[#143427] text-white py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors text-xs"
            >
              <Plus size={15} /> Nuevo Ingreso
            </button>
          </div>
        )}

        <nav className="px-2 space-y-0.5">
          <p className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            Menu {rolLabel}
          </p>
          {modulos.map((modulo) => {
            const item = ITEMS[modulo];
            const Icon = item.icon;
            const ruta = RUTA[modulo];
            const isActive = location.pathname === ruta;
            return (
              <button
                key={modulo}
                onClick={() => navigate(ruta)}
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
              {perfil?.sigla ?? "?"}
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
