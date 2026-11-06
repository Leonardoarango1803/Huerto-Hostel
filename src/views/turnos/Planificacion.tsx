import { useCallback, useEffect, useState } from "react";
import { Clock, Pencil, Users } from "lucide-react";
import { AlertBanner, Badge, Button, FormField, FormModal, Input, KpiCard, LoadingState, Select, Textarea } from "../../components/ui";
import { mensajeDeError } from "../../api/errores";
import { turnosApi, type ResumenTurnos, type TurnoLaboral } from "../../api/turnos";
import { usuariosApi } from "../../api/usuarios";
import { ETIQUETA_ROL } from "../usuarios/comun";

const COLOR: Record<string, string> = {
  Manana: "border-amber-200 bg-amber-50",
  Mañana: "border-amber-200 bg-amber-50",
  Tarde: "border-blue-200 bg-blue-50",
  Noche: "border-indigo-200 bg-indigo-50",
};
const ROLES_COBERTURA = ["RECEPCIONISTA", "CAJERO", "COCINA", "BAR", "HOUSEKEEPING"];

function EditarTurnoModal({ turno, onCerrar, onGuardado }: { turno: TurnoLaboral; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(turno.nombre);
  const [inicio, setInicio] = useState(turno.horaInicio);
  const [fin, setFin] = useState(turno.horaFin);
  const [descripcion, setDescripcion] = useState(turno.descripcion ?? "");
  const [activo, setActivo] = useState(turno.estado);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await turnosApi.actualizar(turno.idTurno, { nombre, horaInicio: inicio, horaFin: fin, descripcion, estado: activo });
      onGuardado();
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo guardar el turno."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal open title="Editar turno" subtitle="El horario decide quién está de turno ahora y los avisos del sistema."
      submitLabel="Guardar turno" loading={guardando} onClose={onCerrar} onSubmit={guardar} size="sm">
      {error && <AlertBanner type="error" message={error} dismissible={false} />}
      <FormField label="Nombre" required>
        <Input value={nombre} maxLength={50} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre del turno" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Inicio" required>
          <Input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} aria-label="Hora de inicio" />
        </FormField>
        <FormField label="Fin" required hint={inicio && fin && inicio > fin ? "Cruza la medianoche" : undefined}>
          <Input type="time" value={fin} onChange={(e) => setFin(e.target.value)} aria-label="Hora de fin" />
        </FormField>
      </div>
      <FormField label="Descripción">
        <Textarea rows={2} maxLength={200} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} aria-label="Descripción del turno" />
      </FormField>
      <label className="flex items-center gap-2 text-[11px] text-slate-700">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} aria-label="Turno activo" />
        Turno activo (un turno con empleados asignados no se puede desactivar)
      </label>
    </FormModal>
  );
}

/**
 * Todos los turnos con su gente. El administrador edita horarios y mueve empleados de un turno a otro; recepcion lo ve
 * en solo lectura. Muestra cual esta en curso ahora y si falta cubrir recepcion.
 */
export function Planificacion({ soloLectura }: { soloLectura: boolean }) {
  const [datos, setDatos] = useState<ResumenTurnos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [editando, setEditando] = useState<TurnoLaboral | null>(null);

  useEffect(() => {
    let vigente = true;
    const traer = () => turnosApi.resumen()
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(mensajeDeError(e, "No se pudieron cargar los turnos.")));
    traer();
    const timer = setInterval(traer, 60_000); // la hora cambia: el turno en curso se mueve solo
    return () => { vigente = false; clearInterval(timer); };
  }, []);

  const recargar = useCallback((mensaje?: string) => {
    if (mensaje) setExito(mensaje);
    setError(null);
    turnosApi.resumen().then(setDatos).catch((e) => setError(mensajeDeError(e, "No se pudieron cargar los turnos.")));
  }, []);

  const mover = async (idEmpleado: number, idTurno: number) => {
    try {
      await usuariosApi.asignarTurno(idEmpleado, idTurno);
      recargar("Turno reasignado.");
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo reasignar el turno."));
    }
  };

  if (!datos) return error ? <AlertBanner type="error" message={error} /> : <LoadingState />;

  const activos = datos.turnos.filter((t) => t.estado);
  const asignados = activos.reduce((n, t) => n + t.empleados.length, 0);
  const enCurso = datos.turnos.find((t) => t.enCurso);
  const recepcionCubierta = datos.enServicio.some((e) => e.rol === "RECEPCIONISTA");

  return (
    <div className="space-y-4">
      {exito && <AlertBanner key={exito} type="success" message={exito} />}
      {error && <AlertBanner type="error" message={error} />}

      <div className="grid grid-cols-4 gap-3">
        <KpiCard title="Hora actual" value={datos.ahora} subtitle={enCurso ? `Turno ${enCurso.nombre} en curso` : "Ningún turno en curso"} color="blue" />
        <KpiCard title="De turno ahora" value={datos.enServicio.length} subtitle="empleados activos" color="emerald" />
        <KpiCard title="Asignados a turnos" value={asignados} subtitle={`en ${activos.length} turnos activos`} color="slate" />
        <KpiCard title="Recepción ahora" value={recepcionCubierta ? "Cubierta" : "Sin cubrir"}
          subtitle={recepcionCubierta ? "hay recepcionista de turno" : "nadie de recepción en este horario"} color={recepcionCubierta ? "emerald" : "amber"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {datos.turnos.map((t) => (
          <div key={t.idTurno} className={`rounded-xl border p-4 space-y-3 ${t.estado ? COLOR[t.nombre] ?? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100 opacity-70"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-600" />
                <div>
                  <h2 className="font-bold text-sm text-slate-800">
                    {t.nombre} {t.enCurso && <Badge variant="emerald" label="En curso ahora" className="ml-1" />}
                    {!t.estado && <Badge variant="slate" label="Desactivado" className="ml-1" />}
                  </h2>
                  <p className="text-[11px] text-slate-600">{t.horaInicio} – {t.horaFin}{t.cruzaMedianoche ? " (cruza la medianoche)" : ""}</p>
                </div>
              </div>
              {!soloLectura && (
                <Button size="sm" variant="secondary" icon={<Pencil size={11} />} onClick={() => setEditando(t)}>Editar</Button>
              )}
            </div>
            {t.descripcion && <p className="text-[11px] text-slate-500 italic">{t.descripcion}</p>}

            <div className="flex flex-wrap gap-1">
              {ROLES_COBERTURA.map((r) => {
                const n = t.porRol[r] ?? 0;
                const faltaRecepcion = r === "RECEPCIONISTA" && n === 0 && t.estado;
                return (
                  <span key={r} title={faltaRecepcion ? "Este turno no tiene recepcionista" : undefined}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${faltaRecepcion ? "bg-red-50 border-red-300 text-red-700 font-semibold" : n ? "bg-white/70 border-slate-200 text-slate-700" : "bg-white/40 border-slate-200 text-slate-400"}`}>
                    {ETIQUETA_ROL[r]}: {n}
                  </span>
                );
              })}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase">
                <Users size={10} /> {t.empleados.length} empleado{t.empleados.length !== 1 ? "s" : ""}
              </div>
              {t.empleados.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Sin empleados asignados</p>
              ) : (
                <ul className="space-y-1">
                  {t.empleados.map((e) => (
                    <li key={e.idEmpleado} className="flex items-center justify-between gap-2 bg-white/60 rounded-lg px-2 py-1">
                      <span className="font-medium">
                        {e.nombres} {e.apellidos}
                        {e.rol && <span className="ml-1.5 text-[10px] text-slate-400">{ETIQUETA_ROL[e.rol] ?? e.rol}</span>}
                      </span>
                      {!soloLectura && (
                        <Select value={t.idTurno} aria-label={`Mover a ${e.nombres} de turno`} className="!w-auto !py-0.5 !text-[10px]"
                          onChange={(ev) => mover(e.idEmpleado, Number(ev.target.value))}>
                          {datos.turnos.filter((o) => o.estado).map((o) => <option key={o.idTurno} value={o.idTurno}>{o.nombre}</option>)}
                        </Select>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <EditarTurnoModal turno={editando} onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); recargar("Turno actualizado."); }} />
      )}
    </div>
  );
}
