import { useState, useEffect } from "react";
import { Users, Clock, User } from "lucide-react";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { LoadingState, AlertBanner, KpiCard } from "../components/ui";

interface Empleado {
  idEmpleado: number;
  nombres: string;
  apellidos: string;
  rol?: { nombre: string };
}

interface TurnoConEmpleados {
  idTurno: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  descripcion?: string;
  empleados: Empleado[];
}

const turnoColor: Record<string, string> = {
  "Mañana":  "border-amber-200 bg-amber-50",
  "Tarde":   "border-blue-200 bg-blue-50",
  "Noche":   "border-indigo-200 bg-indigo-50",
};

const turnoIconColor: Record<string, string> = {
  "Mañana": "text-amber-600",
  "Tarde":  "text-blue-600",
  "Noche":  "text-indigo-600",
};

function formatHora(hora: string) {
  if (!hora) return "";
  return hora.substring(0, 5);
}

export function TurnosView() {
  const { user } = useAuth();
  const isRecep = user?.role === "RECEPCIONISTA";
  const [turnos, setTurnos] = useState<TurnoConEmpleados[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TurnoConEmpleados[]>("/api/v1/turnos/con-empleados");
      setTurnos(res.data);
    } catch {
      setError("No se pudieron cargar los turnos.");
    } finally {
      setLoading(false);
    }
  }

  const totalEmpleados = turnos.reduce((acc, t) => acc + t.empleados.length, 0);

  // Turno del recepcionista autenticado (busca por idEmpleado = userId del JWT)
  const miTurno = isRecep && user
    ? turnos.find((t) => t.empleados.some((e) => e.idEmpleado === user.userId))
    : null;
  const miEmpleado = miTurno
    ? miTurno.empleados.find((e) => e.idEmpleado === user?.userId)
    : null;

  if (isRecep) {
    return (
      <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
        <div className="pt-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recepción &gt; Mi Turno</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Mi Turno de Trabajo</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">Información de tu turno y horario asignado.</p>
        </div>

        {error && <AlertBanner type="error" message={error} />}

        {loading ? <LoadingState /> : miTurno ? (
          <>
            {/* Card principal del turno */}
            <div className={`rounded-xl border p-6 space-y-4 ${turnoColor[miTurno.nombre] ?? "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center border border-slate-200">
                  <Clock size={22} className={turnoIconColor[miTurno.nombre] ?? "text-slate-500"} />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-800">Turno {miTurno.nombre}</h2>
                  <p className="text-sm text-slate-600">{formatHora(miTurno.horaInicio)} – {formatHora(miTurno.horaFin)}</p>
                  {miTurno.descripcion && <p className="text-[11px] text-slate-500 italic mt-0.5">{miTurno.descripcion}</p>}
                </div>
              </div>

              {miEmpleado && (
                <div className="bg-white/70 rounded-lg p-4 space-y-2 border border-white/60">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Tu información</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <User size={18} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{miEmpleado.nombres} {miEmpleado.apellidos}</p>
                      {miEmpleado.rol && (
                        <p className="text-[11px] text-slate-500">{miEmpleado.rol.nombre}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compañeros del turno */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                <Users size={12} />
                <span>Compañeros en este turno ({miTurno.empleados.length})</span>
              </div>
              <ul className="space-y-1.5">
                {miTurno.empleados.map((e) => (
                  <li key={e.idEmpleado} className={`flex items-center justify-between rounded-lg px-3 py-2 ${e.idEmpleado === user?.userId ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50"}`}>
                    <div className="flex items-center gap-2">
                      <User size={13} className={e.idEmpleado === user?.userId ? "text-emerald-700" : "text-slate-400"} />
                      <span className={`font-medium ${e.idEmpleado === user?.userId ? "text-emerald-800" : "text-slate-700"}`}>
                        {e.nombres} {e.apellidos}
                        {e.idEmpleado === user?.userId && <span className="ml-1.5 text-[9px] bg-emerald-200 text-emerald-800 px-1 py-0.5 rounded font-bold">TÚ</span>}
                      </span>
                    </div>
                    {e.rol && <span className="text-[10px] text-slate-400">{e.rol.nombre}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
            <Clock size={28} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Sin turno asignado</p>
            <p className="text-[11px] text-slate-400">Contacta al administrador para que te asigne un turno.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admin &gt; Turnos</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Gestión de Turnos</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">Horarios de trabajo y empleados asignados por turno.</p>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} />}

      <div className="grid grid-cols-3 gap-3">
        <KpiCard title="Turnos Activos" value={turnos.length} subtitle="configurados" color="blue" />
        <KpiCard title="Total Empleados" value={totalEmpleados} subtitle="asignados a turnos" color="emerald" />
        <KpiCard title="Sin turno" value={0} subtitle="empleados sin asignar" color="slate" />
      </div>

      {loading ? <LoadingState /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {turnos.map((t) => (
            <div key={t.idTurno} className={`rounded-xl border p-4 space-y-3 ${turnoColor[t.nombre] ?? "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-2">
                <Clock size={16} className={turnoIconColor[t.nombre] ?? "text-slate-500"} />
                <div>
                  <h2 className="font-bold text-sm text-slate-800">{t.nombre}</h2>
                  <p className="text-[10px] text-slate-500">{formatHora(t.horaInicio)} – {formatHora(t.horaFin)}</p>
                </div>
              </div>

              {t.descripcion && (
                <p className="text-[11px] text-slate-500 italic">{t.descripcion}</p>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase">
                  <Users size={10} />
                  <span>{t.empleados.length} empleado{t.empleados.length !== 1 ? "s" : ""}</span>
                </div>
                {t.empleados.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Sin empleados asignados</p>
                ) : (
                  <ul className="space-y-1">
                    {t.empleados.map((e) => (
                      <li key={e.idEmpleado} className="flex items-center justify-between bg-white/60 rounded-lg px-2 py-1">
                        <span className="font-medium">{e.nombres} {e.apellidos}</span>
                        {e.rol && <span className="text-[10px] text-slate-400">{e.rol.nombre}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
