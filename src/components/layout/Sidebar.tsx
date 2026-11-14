import React, { useState } from "react";
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
  KeyRound,
  ChefHat,
  Package,
  Sparkles,
  Wrench,
  Wallet,
  ConciergeBell,
  Receipt,
  Utensils,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCaja } from "../../context/CajaContext";
import { MODULOS_POR_ROL, RUTA, puede, type Modulo, type Rol } from "../../auth/permisos";
import { CambiarPasswordModal } from "../CambiarPasswordModal";
import { LogoHuerto } from "./LogoHuerto";

/** Como se ve cada modulo en el menu. Que modulos ve cada rol lo decide auth/permisos.ts. */
const ITEMS: Record<Modulo, { label: string; icon: React.ElementType }> = {
  dashboard: { label: "Panel", icon: LayoutDashboard },
  reservas: { label: "Reservas", icon: Calendar },
  huespedes: { label: "Huéspedes", icon: Users },
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
  configuracion: { label: "Configuración", icon: Settings },
  portal: { label: "Mi estadía", icon: Receipt },
};

/** Grupos del menu (rediseño): cada rol ve solo los modulos que permisos.ts le da, en este orden. */
const GRUPOS: { titulo: string; tituloEquipo?: string; modulos: Modulo[] }[] = [
  { titulo: "Hoy", modulos: ["dashboard", "portal"] },
  { titulo: "Recepción", modulos: ["reservas", "checkin", "checkout", "huespedes", "habitaciones"] },
  { titulo: "Servicios", modulos: ["consumos", "comandas", "solicitudes"] },
  { titulo: "Dinero", modulos: ["caja", "pagos", "reportes"] },
  { titulo: "Operación", modulos: ["limpieza", "incidencias", "inventario"] },
  { titulo: "Administración", tituloEquipo: "Mi equipo", modulos: ["servicios", "usuarios", "turnos", "configuracion"] },
];

const PERFILES: Record<Rol, { label: string; area: string }> = {
  ADMINISTRADOR: { label: "Administrador", area: "Administración" },
  RECEPCIONISTA: { label: "Recepcionista", area: "Recepción" },
  CAJERO: { label: "Cajero", area: "Caja" },
  COCINA: { label: "Cocina", area: "Cocina" },
  BAR: { label: "Bar", area: "Bar" },
  HOUSEKEEPING: { label: "Limpieza", area: "Housekeeping" },
  CLIENTE: { label: "Huésped", area: "Portal del huésped" },
};

function iniciales(nombre?: string) {
  if (!nombre) return "?";
  return nombre.slice(0, 2).toUpperCase();
}

function horaApertura(fecha?: string) {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-PE", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { estado: caja } = useCaja();
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const rol = user?.role as Rol | undefined;
  const perfil = rol ? PERFILES[rol] : undefined;
  const permitidos = rol ? MODULOS_POR_ROL[rol] ?? [] : [];

  // En el celular el menu es un cajon: se cierra al elegir una pantalla.
  const ir = (ruta: string) => {
    setAbierto(false);
    navigate(ruta);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const grupos = GRUPOS.map((g) => ({
    titulo: rol !== "ADMINISTRADOR" && g.tituloEquipo ? g.tituloEquipo : g.titulo,
    modulos: g.modulos.filter((m) => permitidos.includes(m)),
  })).filter((g) => g.modulos.length > 0);

  return (
    <>
      {/* Barra superior solo en pantallas chicas */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-arena px-4 py-2.5 no-imprimir">
        <LogoHuerto subtitulo={perfil?.area} />
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="w-11 h-11 rounded-xl border border-slate-300 bg-white flex items-center justify-center"
        >
          <Menu size={20} />
        </button>
      </div>

      {abierto && <div className="md:hidden fixed inset-0 z-40 bg-tinta/40" onClick={() => setAbierto(false)} />}

      <aside
        aria-label="Menú del sistema"
        className={`fixed inset-y-0 left-0 z-50 w-[264px] transform transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        } bg-arena-2 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto`}
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <LogoHuerto subtitulo={perfil?.area} />
          <button onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        {puede(rol, "ingresoDirecto") && (
          <div className="px-4 pb-2">
            <button
              onClick={() => {
                setAbierto(false);
                navigate("/reservas", { state: { openNuevoIngreso: true } });
              }}
              className="w-full bg-huerto hover:bg-huerto-oscuro text-white min-h-[40px] px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Plus size={16} /> Nuevo ingreso
            </button>
          </div>
        )}

        <nav className="px-3 py-2 flex flex-col gap-4 flex-1">
          {grupos.map((g) => (
            <div key={g.titulo} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">{g.titulo}</p>
              {g.modulos.map((modulo) => {
                const item = ITEMS[modulo];
                const Icon = item.icon;
                const ruta = RUTA[modulo];
                const isActive = location.pathname === ruta;
                return (
                  <button
                    key={modulo}
                    onClick={() => ir(ruta)}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 min-h-[40px] rounded-xl text-sm transition-colors ${
                      isActive
                        ? "bg-huerto text-white font-bold"
                        : "text-slate-800 font-medium hover:bg-slate-200/70"
                    }`}
                  >
                    <Icon size={17} className={isActive ? "text-white" : "text-slate-500"} />
                    <span>{modulo === "turnos" && rol !== "ADMINISTRADOR" ? "Mi turno" : item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-2 flex flex-col gap-2">
          {caja && (
            <button
              onClick={() => ir("/caja")}
              className="text-left bg-white border border-slate-200 rounded-2xl px-3 py-2.5 flex flex-col gap-0.5 hover:border-slate-300"
            >
              <span className={`flex items-center gap-2 text-[13px] font-bold ${caja.abierta ? (caja.excedeLimite ? "text-red-800" : "text-emerald-800") : "text-amber-800"}`}>
                <span className={`w-2 h-2 rounded-full ${caja.abierta ? (caja.excedeLimite ? "bg-red-600" : "bg-emerald-700") : "bg-amber-500"}`} />
                {caja.abierta ? (caja.excedeLimite ? `Caja abierta hace ${caja.horasAbierta} h` : "Caja abierta") : "Caja cerrada"}
              </span>
              <span className="text-[12px] text-slate-600 leading-snug">
                {caja.abierta
                  ? `${caja.abiertaPor ? `Abrió ${caja.abiertaPor}` : "Turno en curso"}${caja.fechaApertura ? ` · ${horaApertura(caja.fechaApertura)}` : ""}`
                  : "Ábrela para cobrar y hacer check-in"}
              </span>
            </button>
          )}

          <div className="flex items-center gap-2.5 px-1 pt-1">
            <span className="w-9 h-9 rounded-full bg-huerto text-white text-[13px] font-bold flex items-center justify-center shrink-0">
              {iniciales(user?.username)}
            </span>
            <span className="flex flex-col leading-tight min-w-0 flex-1">
              <strong className="text-sm truncate">{user?.username ?? "Usuario"}</strong>
              <span className="text-[12px] text-slate-600 truncate">{perfil?.label ?? "Usuario"}</span>
            </span>
            <button
              title="Cambiar mi contraseña"
              aria-label="Cambiar mi contraseña"
              onClick={() => setCambiandoClave(true)}
              className="w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-200 flex items-center justify-center"
            >
              <KeyRound size={16} />
            </button>
            <button
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              onClick={handleLogout}
              className="w-9 h-9 rounded-lg text-red-700 hover:bg-red-100 flex items-center justify-center"
            >
              <Power size={16} />
            </button>
          </div>
        </div>
      </aside>
      {/* Fuera del <aside>: su transform (cajon del celular) haria que el modal se ubique dentro del menu
          en vez de centrarse en la pantalla. */}
      {cambiandoClave && <CambiarPasswordModal onCerrar={() => setCambiandoClave(false)} />}
    </>
  );
};
