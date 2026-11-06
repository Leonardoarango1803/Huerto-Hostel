import { useEffect, useState } from "react";
import { Clock, User, Users } from "lucide-react";
import { Badge, LoadingState } from "../../components/ui";
import { mensajeDeError } from "../../api/errores";
import { turnosApi, type MiTurno as DatosMiTurno } from "../../api/turnos";
import { ETIQUETA_ROL } from "../usuarios/comun";

/** El turno de quien esta conectado, sea cual sea su rol: horario, si esta en curso ahora y quienes lo acompanan. */
export function MiTurno() {
  const [datos, setDatos] = useState<DatosMiTurno | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    const traer = () => turnosApi.miTurno()
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(mensajeDeError(e, "No se pudo cargar tu turno.")));
    traer();
    const timer = setInterval(traer, 60_000);
    return () => { vigente = false; clearInterval(timer); };
  }, []);

  if (error) return <p className="text-xs text-red-700">{error}</p>;
  if (!datos) return <LoadingState />;

  if (!datos.asignado || !datos.turno) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <Clock size={28} className="mx-auto text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Sin turno asignado</p>
        <p className="text-[11px] text-slate-400">Pide al administrador que te asigne un turno.</p>
      </div>
    );
  }

  const t = datos.turno;
  const yoId = datos.yo?.idEmpleado;
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-6 space-y-3 ${t.enCurso ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center border border-slate-200">
            <Clock size={22} className={t.enCurso ? "text-emerald-700" : "text-slate-500"} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-800">Turno {t.nombre}</h2>
            <p className="text-sm text-slate-600">{t.horaInicio} – {t.horaFin}{t.cruzaMedianoche ? " (cruza la medianoche)" : ""}</p>
            {t.descripcion && <p className="text-[11px] text-slate-500 italic mt-0.5">{t.descripcion}</p>}
          </div>
          <div className="ml-auto">
            {t.enCurso
              ? <Badge variant="emerald" label="Tu turno está en curso" />
              : <Badge variant="slate" label={`Fuera de tu horario (ahora ${datos.ahora})`} />}
          </div>
        </div>
        {datos.yo && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <User size={16} className="text-slate-500" />
            <span className="font-semibold">{datos.yo.nombres} {datos.yo.apellidos}</span>
            {datos.yo.rol && <span className="text-[11px] text-slate-500">· {ETIQUETA_ROL[datos.yo.rol] ?? datos.yo.rol}</span>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
          <Users size={12} /> Tus compañeros de turno ({t.empleados.length})
        </div>
        <ul className="space-y-1.5">
          {t.empleados.map((e) => (
            <li key={e.idEmpleado}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${e.idEmpleado === yoId ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50"}`}>
              <span className="font-medium text-slate-700">
                {e.nombres} {e.apellidos}
                {e.idEmpleado === yoId && <span className="ml-1.5 text-[9px] bg-emerald-200 text-emerald-800 px-1 py-0.5 rounded font-bold">TÚ</span>}
              </span>
              {e.rol && <span className="text-[10px] text-slate-400">{ETIQUETA_ROL[e.rol] ?? e.rol}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
