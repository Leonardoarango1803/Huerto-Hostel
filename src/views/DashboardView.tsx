import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosConfig";

interface DashboardData {
  totalHabitaciones: number;
  disponibles: number;
  ocupadas: number;
  pendienteLimpieza: number;
  mantenimiento: number;
  totalReservas: number;
  totalClientes: number;
}

export function DashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const isAdmin = user?.role === "ADMINISTRADOR";

  useEffect(() => {
    if (isAdmin) {
      api.get<DashboardData>("/api/v1/dashboard/resumen")
        .then((res) => setData(res.data))
        .catch(() => {});
    } else {
      Promise.all([
        api.get("/api/v1/habitaciones/resumen"),
        api.get("/api/v1/reservas").catch(() => ({ data: [] })),
      ]).then(([habRes, resRes]) => {
        const reservas = Array.isArray(resRes.data) ? resRes.data : [];
        const activas = reservas.filter(
          (r: { estadoReserva: string }) => !["CANCELADA", "COMPLETADA"].includes(r.estadoReserva)
        ).length;
        setData({
          totalHabitaciones: 0,
          disponibles: habRes.data.disponibles ?? 0,
          ocupadas: habRes.data.ocupadas ?? 0,
          pendienteLimpieza: habRes.data.pendienteLimpieza ?? 0,
          mantenimiento: habRes.data.mantenimiento ?? 0,
          totalReservas: activas,
          totalClientes: 0,
        });
      }).catch(() => {});
    }
  }, [isAdmin]);

  const disponibles = data?.disponibles ?? 0;
  const ocupadas = data?.ocupadas ?? 0;
  const pendienteLimpieza = data?.pendienteLimpieza ?? 0;
  const mantenimiento = data?.mantenimiento ?? 0;
  const total = disponibles + ocupadas + pendienteLimpieza + mantenimiento;
  const ocupacion = total > 0 ? Math.round((ocupadas / total) * 100) : 0;

  return (
    <div className="space-y-6 font-sans text-slate-800 text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard General</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Bienvenido, {user?.username} ({isAdmin ? "Administrador" : "Recepcionista"}).
            Resumen en tiempo real de la propiedad.
          </p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sistema en Linea
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ocupacion Actual</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{ocupacion}%</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp size={12} /> {ocupadas} de {total} habitaciones
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <BedDouble size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reservas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data?.totalReservas ?? 0}</p>
            <button onClick={() => navigate("/checkin")} className="text-[10px] text-emerald-700 hover:underline font-semibold mt-1 block">
              Ver lista de ingresos
            </button>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <LogIn size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{ocupadas}</p>
            <button onClick={() => navigate("/checkout")} className="text-[10px] text-emerald-700 hover:underline font-semibold mt-1 block">
              Procesar salidas
            </button>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <LogOut size={20} />
          </div>
        </div>

        {isAdmin ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Clientes</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data?.totalClientes ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Registrados en el sistema</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponibles</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{disponibles}</p>
              <p className="text-[10px] text-slate-400 mt-1">Habitaciones libres</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-800 text-xs">Estado de Habitaciones</h2>
            <button onClick={() => navigate("/habitaciones")} className="text-emerald-700 hover:underline text-[10px] font-semibold">
              Ir al mapa de cuartos
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Disponibles</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{disponibles}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Ocupadas</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{ocupadas}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">En Limpieza</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{pendienteLimpieza}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Mantenimiento</p>
              <p className="text-xl font-bold text-red-600 mt-1">{mantenimiento}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" /> Avisos Pendientes
          </h2>
          <div className="space-y-2 text-[11px]">
            <div className="p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-amber-900">
              <p className="font-semibold flex items-center gap-1">
                <Clock size={12} /> Sistema conectado
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Los avisos se actualizan en tiempo real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
