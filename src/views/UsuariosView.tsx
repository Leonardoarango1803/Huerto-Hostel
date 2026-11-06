import { useCallback, useEffect, useState } from "react";
import { AlertBanner, LoadingState } from "../components/ui";
import { mensajeDeError } from "../api/errores";
import { turnosApi } from "../api/turnos";
import { usuariosApi, type Catalogo, type EmpleadoAdmin } from "../api/usuarios";
import { EmpleadosTab } from "./usuarios/EmpleadosTab";
import { HistorialTab, RolesTab } from "./usuarios/RolesYHistorial";

type Pestana = "empleados" | "roles" | "historial";

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: "empleados", texto: "Empleados y accesos" },
  { id: "roles", texto: "Qué puede hacer cada rol" },
  { id: "historial", texto: "Historial de cambios" },
];

/** Personal del hostel y su acceso al sistema: crear, dar de baja, restablecer claves y ver quien hizo que. */
export function UsuariosView() {
  const [pestana, setPestana] = useState<Pestana>("empleados");
  const [empleados, setEmpleados] = useState<EmpleadoAdmin[]>([]);
  const [roles, setRoles] = useState<Catalogo[]>([]);
  const [turnos, setTurnos] = useState<Catalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const traer = useCallback(
    () => Promise.all([usuariosApi.listar(), usuariosApi.roles(), turnosApi.resumen()]),
    []
  );

  const aplicar = useCallback(([emps, rls, res]: Awaited<ReturnType<typeof traer>>) => {
    setEmpleados(emps);
    setRoles(rls);
    setTurnos(res.turnos.filter((t) => t.estado).map((t) => ({ id: t.idTurno, nombre: t.nombre })));
  }, []);

  useEffect(() => {
    let vigente = true;
    traer()
      .then((d) => vigente && aplicar(d))
      .catch((e) => vigente && setError(mensajeDeError(e, "No se pudieron cargar los empleados.")))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [traer, aplicar]);

  const refrescar = useCallback((mensaje?: string) => {
    setError(null);
    if (mensaje) setExito(mensaje);
    traer().then(aplicar).catch((e) => setError(mensajeDeError(e, "No se pudo actualizar la lista.")));
  }, [traer, aplicar]);

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="pt-1">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admin &gt; Usuarios</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Empleados y accesos</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Quién trabaja en el hostel, qué rol tiene y si puede entrar al sistema. Desactivar a un empleado también bloquea su cuenta.
        </p>
      </div>

      {exito && <AlertBanner key={exito} type="success" message={exito} />}
      {error && <AlertBanner type="error" message={error} />}

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {PESTANAS.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              pestana === p.id ? "border-[#1b4332] text-[#1b4332]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {p.texto}
          </button>
        ))}
      </div>

      {cargando ? <LoadingState /> : (
        <>
          {pestana === "empleados" && (
            <EmpleadosTab empleados={empleados} roles={roles} turnos={turnos} onCambio={refrescar}
              onError={(m) => setError(m)} />
          )}
          {pestana === "roles" && <RolesTab empleados={empleados} />}
          {pestana === "historial" && <HistorialTab />}
        </>
      )}
    </div>
  );
}
