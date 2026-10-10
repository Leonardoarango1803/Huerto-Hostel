import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import api from "../api/axiosConfig";
import { LoadingState, AlertBanner, KpiCard } from "../components/ui";

interface ReporteResumen {
  ingresosPorMes: { mes: string; ingresos: number }[];
  totalHabitaciones: number;
  habitacionesOcupadas: number;
  habitacionesReservadas: number;
  habitacionesDisponibles: number;
  tasaOcupacion: number;
  ingresoTotal: number;
  reservasPorEstado: Record<string, number>;
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE_ADELANTO: "Pendiente",
  CONFIRMADA: "Confirmada",
  EN_CURSO: "Activa",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

function formatMes(mes: string) {
  const partes = mes.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  if (partes.length === 3) {
    // YYYY-MM-DD → "DD Mon"
    const [, m, d] = partes;
    return `${Number(d)} ${meses[Number(m) - 1]}`;
  }
  // YYYY-MM → "Mon YYYY"
  const [y, m] = partes;
  return `${meses[Number(m) - 1]} ${y}`;
}

const hoy = new Date().toISOString().slice(0, 10);
const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

export function ReportesView() {
  const [data, setData] = useState<ReporteResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meses, setMeses] = useState(6);
  const [modo, setModo] = useState<"meses" | "dias">("meses");
  const [desde, setDesde] = useState(hace30);
  const [hasta, setHasta] = useState(hoy);

  useEffect(() => { cargar(); }, [meses, modo, desde, hasta]);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/v1/reportes/resumen?meses=${meses}`;
      if (modo === "dias" && desde && hasta) {
        url = `/api/v1/reportes/resumen?desde=${desde}&hasta=${hasta}`;
      }
      const res = await api.get<ReporteResumen>(url);
      setData(res.data);
    } catch {
      setError("No se pudieron cargar los reportes.");
    } finally {
      setLoading(false);
    }
  }

  const pieData = data
    ? Object.entries(data.reservasPorEstado).map(([estado, count]) => ({
        name: ESTADO_LABEL[estado] ?? estado,
        value: count,
      }))
    : [];

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admin &gt; Reportes</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Reportes y Estadísticas</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">Métricas de ocupación e ingresos del hostel.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs">
            <button
              className={`px-3 py-1.5 font-medium ${modo === "meses" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              onClick={() => setModo("meses")}
            >Por meses</button>
            <button
              className={`px-3 py-1.5 font-medium ${modo === "dias" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              onClick={() => setModo("dias")}
            >Por fechas</button>
          </div>
          {modo === "meses" ? (
            <select
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              value={meses}
              onChange={(e) => setMeses(Number(e.target.value))}
            >
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Último año</option>
            </select>
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Desde</span>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
              <span className="text-slate-500">hasta</span>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
            </div>
          )}
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {loading ? <LoadingState /> : data ? (
        <>
          <div className="grid grid-cols-4 gap-3">
            <KpiCard title="Ingreso Total" value={`S/ ${Number(data.ingresoTotal).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`} subtitle={modo === "dias" ? `${desde} — ${hasta}` : `últimos ${meses} meses`} color="emerald" />
            <KpiCard title="Tasa Ocupación" value={`${data.tasaOcupacion}%`} subtitle="habitaciones ocupadas hoy" color="blue" />
            <KpiCard title="Hab. Disponibles" value={data.habitacionesDisponibles} subtitle={`de ${data.totalHabitaciones} habitaciones`} color="slate" />
            <KpiCard title="Hab. Reservadas" value={data.habitacionesReservadas} subtitle="con check-in pendiente" color="amber" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Ingresos por mes */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-bold text-sm text-slate-800 mb-3">
                {modo === "dias" ? "Ingresos por Día (S/)" : "Ingresos por Mes (S/)"}
              </h2>
              {data.ingresosPorMes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Sin datos de ingresos</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.ingresosPorMes.map((d) => ({ ...d, mes: formatMes(d.mes) }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `S/${v}`} />
                    <Tooltip formatter={(v: number) => [`S/ ${v.toFixed(2)}`, "Ingresos"]} />
                    <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Reservas por estado */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-bold text-sm text-slate-800 mb-3">Reservas por Estado</h2>
              {pieData.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Sin reservas registradas</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Ocupación detallada */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold text-sm text-slate-800 mb-3">Estado Actual de Habitaciones</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Disponibles", value: data.habitacionesDisponibles, color: "bg-emerald-500" },
                { label: "Reservadas", value: data.habitacionesReservadas, color: "bg-blue-500" },
                { label: "Ocupadas", value: data.habitacionesOcupadas, color: "bg-amber-500" },
                { label: "Otras", value: data.totalHabitaciones - data.habitacionesDisponibles - data.habitacionesReservadas - data.habitacionesOcupadas, color: "bg-rose-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div>
                    <p className="font-bold text-sm">{item.value}</p>
                    <p className="text-[10px] text-slate-500">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Barra de ocupación */}
            <div className="mt-3">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                {[
                  { value: data.habitacionesDisponibles, color: "bg-emerald-500" },
                  { value: data.habitacionesReservadas, color: "bg-blue-500" },
                  { value: data.habitacionesOcupadas, color: "bg-amber-500" },
                  { value: data.totalHabitaciones - data.habitacionesDisponibles - data.habitacionesReservadas - data.habitacionesOcupadas, color: "bg-rose-400" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`${item.color} transition-all`}
                    style={{ width: data.totalHabitaciones ? `${(item.value / data.totalHabitaciones) * 100}%` : "0%" }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
