import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { turnosApi, type EmpleadoDeTurno } from "../api/turnos";

/** Franja con quien esta de turno ahora (de un rol) para saber a quien pedirle o asignarle el trabajo. */
export function PersonalDeTurno({ rol, titulo }: { rol: string; titulo: string }) {
  const [gente, setGente] = useState<EmpleadoDeTurno[] | null>(null);

  useEffect(() => {
    let vigente = true;
    const traer = () => turnosApi.enServicio(rol)
      .then((d) => vigente && setGente(d))
      .catch(() => vigente && setGente(null));
    traer();
    const timer = setInterval(traer, 60_000);
    return () => { vigente = false; clearInterval(timer); };
  }, [rol]);

  if (gente === null) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px]" aria-label={titulo}>
      <Clock size={13} className="text-slate-500" />
      <span className="font-semibold text-slate-700">{titulo}:</span>
      {gente.length === 0 ? (
        <span className="text-amber-700">nadie tiene asignado el turno en curso</span>
      ) : (
        gente.map((e) => (
          <span key={e.idEmpleado} className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
            {e.nombres} {e.apellidos}
          </span>
        ))
      )}
    </div>
  );
}
