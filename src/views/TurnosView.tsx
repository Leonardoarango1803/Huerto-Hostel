import { useAuth } from "../context/AuthContext";
import { MiTurno } from "./turnos/MiTurno";
import { Planificacion } from "./turnos/Planificacion";

/**
 * Turnos laborales. El administrador planifica (edita horarios y mueve empleados); recepcion ve su turno y el de todo el
 * hostel; el resto del personal ve su propio turno y a sus companeros.
 */
export function TurnosView() {
  const { user } = useAuth();
  const esAdmin = user?.role === "ADMINISTRADOR";
  const esRecepcion = user?.role === "RECEPCIONISTA";

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="pt-1">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {esAdmin ? "Admin > Turnos" : "Mi turno"}
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">{esAdmin ? "Gestión de turnos" : "Mi turno de trabajo"}</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          {esAdmin
            ? "Horarios del personal, quién está de turno ahora y qué roles cubre cada turno."
            : "Tu horario, si estás en tu turno ahora y quiénes trabajan contigo."}
        </p>
      </div>

      {esAdmin ? (
        <Planificacion soloLectura={false} />
      ) : (
        <>
          <MiTurno />
          {esRecepcion && (
            <div className="space-y-2 pt-2">
              <h2 className="text-sm font-bold text-slate-800">Turnos del hostel</h2>
              <Planificacion soloLectura />
            </div>
          )}
        </>
      )}
    </div>
  );
}
