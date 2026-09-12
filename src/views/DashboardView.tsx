import React from "react";
import {
  BedDouble,
  Users,
  LogIn,
  LogOut,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { UserRole } from "../components/layout/Sidebar";

interface DashboardProps {
  userRole: UserRole;
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  userRole,
  setActiveTab,
}) => {
  return (
    <div className="space-y-6 font-sans text-slate-800 text-xs">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Dashboard General
          </h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Bienvenido al panel de control ({userRole}). Resumen en tiempo real
            de la propiedad.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
            Sistema en Línea
          </span>
        </div>
      </div>

      {/* Tarjetas de Métricas Principales */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ocupación Actual
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">75%</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp size={12} /> +12% vs. semana pasada
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <BedDouble size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Llegadas Hoy (Check-in)
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              4{" "}
              <span className="text-xs font-normal text-slate-400">
                / 6 completados
              </span>
            </p>
            <button
              onClick={() => setActiveTab("checkin")}
              className="text-[10px] text-emerald-700 hover:underline font-semibold mt-1 block"
            >
              Ver lista de ingresos →
            </button>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <LogIn size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Salidas Hoy (Check-out)
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              8{" "}
              <span className="text-xs font-normal text-slate-400">
                programadas
              </span>
            </p>
            <button
              onClick={() => setActiveTab("checkout")}
              className="text-[10px] text-emerald-700 hover:underline font-semibold mt-1 block"
            >
              Procesar salidas →
            </button>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <LogOut size={20} />
          </div>
        </div>

        {userRole === "Administrador" ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ingresos Estimados Hoy
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                S/ 2,430.00
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Caja + POS + Reservas Web
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Huéspedes Activos
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">32</p>
              <p className="text-[10px] text-slate-400 mt-1">
                En 18 habitaciones
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Sección Inferior: Estado de Habitaciones & Alertas Operativas */}
      <div className="grid grid-cols-3 gap-5">
        {/* Resumen de Habitaciones (2 Cols) */}
        <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-800 text-xs">
              Estado de Habitaciones
            </h2>
            <button
              onClick={() => setActiveTab("habitaciones")}
              className="text-emerald-700 hover:underline text-[10px] font-semibold"
            >
              Ir al mapa de cuartos →
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                Disponibles
              </p>
              <p className="text-xl font-bold text-emerald-700 mt-1">6</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                Ocupadas
              </p>
              <p className="text-xl font-bold text-slate-800 mt-1">14</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                En Limpieza
              </p>
              <p className="text-xl font-bold text-amber-600 mt-1">3</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                Mantenimiento
              </p>
              <p className="text-xl font-bold text-red-600 mt-1">1</p>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Alertas Rápidas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" /> Avisos
            Pendientes
          </h2>
          <div className="space-y-2 text-[11px]">
            <div className="p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-amber-900">
              <p className="font-semibold flex items-center gap-1">
                <Clock size={12} /> Late Check-out Hab. 204
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Antoine Dubois solicitó salida extendida a las 14:30.
              </p>
            </div>

            <div className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg text-slate-800">
              <p className="font-semibold">🧹 Housekeeping Pendiente</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Habitaciones 104 y 108 listas para inspección.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
