import { useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, ToggleLeft, ToggleRight, UserPlus } from "lucide-react";
import { Badge, Button, ConfirmModal, EmptyState, KpiCard, SearchBar, Select } from "../../components/ui";
import { mensajeDeError } from "../../api/errores";
import { usuariosApi, type Catalogo, type EmpleadoAdmin, type ResultadoCuenta } from "../../api/usuarios";
import { AccesoModalsHost } from "./AccesoHost";
import { EmpleadoFormModal } from "./EmpleadoFormModal";
import { ETIQUETA_ROL, TEXTO_ACCESO, estadoDeAcceso, fechaHora, nombreCompleto, type EstadoAcceso } from "./comun";

interface Props {
  empleados: EmpleadoAdmin[];
  roles: Catalogo[];
  turnos: Catalogo[];
  onCambio: (mensaje?: string) => void;
  onError: (mensaje: string) => void;
}

type Modal =
  | { tipo: "form"; editando: EmpleadoAdmin | null }
  | { tipo: "acceso"; empleado: EmpleadoAdmin }
  | { tipo: "restablecer"; empleado: EmpleadoAdmin }
  | { tipo: "clave"; username: string; clave: string; nombre: string; motivo: "nueva" | "restablecida" }
  | null;

/** Empleados y su acceso al sistema en una sola lista: quien puede entrar, quien no, y que falta por hacer. */
export function EmpleadosTab({ empleados, roles, turnos, onCambio, onError }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroAcceso, setFiltroAcceso] = useState<"" | EstadoAcceso>("");
  const [filtroEstado, setFiltroEstado] = useState<"" | "activos" | "inactivos">("");
  const [modal, setModal] = useState<Modal>(null);
  const [aDesactivar, setADesactivar] = useState<EmpleadoAdmin | null>(null);
  const [cambiando, setCambiando] = useState(false);

  const activos = empleados.filter((e) => e.estado);
  const sinCuenta = activos.filter((e) => !e.acceso.tieneCuenta).length;
  const conCuentaActiva = empleados.filter((e) => e.acceso.tieneCuenta && e.acceso.activa).length;
  const temporales = empleados.filter((e) => estadoDeAcceso(e) === "TEMPORAL").length;

  const filtrados = useMemo(() => empleados.filter((e) => {
    const q = busqueda.trim().toLowerCase();
    if (q && !(`${nombreCompleto(e)} ${e.acceso.username ?? ""}`.toLowerCase().includes(q) || e.numeroDocumento.includes(q))) return false;
    if (filtroRol && e.rol?.nombre !== filtroRol) return false;
    if (filtroAcceso && estadoDeAcceso(e) !== filtroAcceso) return false;
    if (filtroEstado === "activos" && !e.estado) return false;
    if (filtroEstado === "inactivos" && e.estado) return false;
    return true;
  }), [empleados, busqueda, filtroRol, filtroAcceso, filtroEstado]);

  const tras = (r: ResultadoCuenta, motivo: "nueva" | "restablecida") => {
    onCambio(motivo === "nueva" ? "Acceso creado." : "Contraseña restablecida.");
    if (r.passwordTemporal) {
      setModal({ tipo: "clave", username: r.username, clave: r.passwordTemporal, nombre: nombreCompleto(r.empleado), motivo });
    } else {
      setModal(null);
    }
  };

  const confirmarCambioDeEstado = async () => {
    if (!aDesactivar) return;
    setCambiando(true);
    try {
      await usuariosApi.cambiarEstado(aDesactivar.idEmpleado, !aDesactivar.estado);
      onCambio(aDesactivar.estado ? "Empleado desactivado: su cuenta quedó bloqueada." : "Empleado activado.");
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo cambiar el estado."));
    } finally {
      setCambiando(false);
      setADesactivar(null);
    }
  };

  const activar = async (e: EmpleadoAdmin) => {
    try {
      await usuariosApi.cambiarEstado(e.idEmpleado, true);
      onCambio("Empleado activado.");
    } catch (err) {
      onError(mensajeDeError(err, "No se pudo activar al empleado."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard title="Empleados activos" value={activos.length} subtitle={`de ${empleados.length} registrados`} color="slate" />
        <KpiCard title="Con acceso activo" value={conCuentaActiva} subtitle="pueden entrar al sistema" color="emerald" />
        <KpiCard title="Sin cuenta" value={sinCuenta} subtitle="activos que no pueden entrar" color={sinCuenta ? "amber" : "slate"} />
        <KpiCard title="Clave temporal" value={temporales} subtitle="aún no la cambian" color={temporales ? "amber" : "slate"} />
      </div>

      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2">
        <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, usuario o documento" className="flex-1 min-w-52 max-w-xs" />
        <Select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} aria-label="Filtrar por rol" className="!w-auto">
          <option value="">Todos los roles</option>
          {roles.map((r) => <option key={r.id} value={r.nombre}>{ETIQUETA_ROL[r.nombre] ?? r.nombre}</option>)}
        </Select>
        <Select value={filtroAcceso} onChange={(e) => setFiltroAcceso(e.target.value as "" | EstadoAcceso)} aria-label="Filtrar por acceso" className="!w-auto">
          <option value="">Todo acceso</option>
          <option value="SIN_CUENTA">Sin cuenta</option>
          <option value="ACTIVA">Cuenta activa</option>
          <option value="TEMPORAL">Clave temporal pendiente</option>
          <option value="BLOQUEADA">Bloqueada</option>
        </Select>
        <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as "" | "activos" | "inactivos")} aria-label="Filtrar por estado" className="!w-auto">
          <option value="">Activos e inactivos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </Select>
        <span className="text-[10px] text-slate-400 ml-auto">{filtrados.length} registros</span>
        <Button icon={<Plus size={13} />} onClick={() => setModal({ tipo: "form", editando: null })}>Nuevo empleado</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtrados.length === 0 ? (
          <EmptyState title="Sin resultados" description="Ningún empleado coincide con los filtros." />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Empleado</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Turno</th>
                <th className="p-3">Acceso al sistema</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e) => {
                const acceso = estadoDeAcceso(e);
                const t = TEXTO_ACCESO[acceso];
                return (
                  <tr key={e.idEmpleado} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                    <td className="p-3">
                      <div className="font-semibold">{nombreCompleto(e)}</div>
                      <div className="text-[10px] text-slate-400">{e.tipoDocumento} {e.numeroDocumento}{e.correo ? ` · ${e.correo}` : ""}</div>
                    </td>
                    <td className="p-3">
                      {e.rol ? ETIQUETA_ROL[e.rol.nombre] ?? e.rol.nombre : <span className="text-slate-400">—</span>}
                      {e.area && <div className="text-[10px] text-slate-400">{e.area.nombre}</div>}
                    </td>
                    <td className="p-3">{e.turno?.nombre ?? <span className="text-slate-400">—</span>}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {e.acceso.username && <span className="font-mono text-[11px] text-slate-700">{e.acceso.username}</span>}
                        <Badge variant={t.variante} label={t.texto} />
                      </div>
                      {e.acceso.tieneCuenta && (
                        <div className="text-[10px] text-slate-400 mt-0.5">Último ingreso: {fechaHora(e.acceso.ultimoAcceso)}</div>
                      )}
                    </td>
                    <td className="p-3"><Badge variant={e.estado ? "emerald" : "slate"} label={e.estado ? "Activo" : "Inactivo"} /></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="secondary" icon={<Pencil size={11} />} onClick={() => setModal({ tipo: "form", editando: e })}>Editar</Button>
                        {!e.acceso.tieneCuenta && e.estado && (
                          <Button size="sm" variant="secondary" icon={<UserPlus size={11} />} onClick={() => setModal({ tipo: "acceso", empleado: e })}>Dar acceso</Button>
                        )}
                        {e.acceso.tieneCuenta && (
                          <Button size="sm" variant="secondary" icon={<KeyRound size={11} />} onClick={() => setModal({ tipo: "restablecer", empleado: e })}>Restablecer clave</Button>
                        )}
                        <Button size="sm" variant="ghost" icon={e.estado ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                          onClick={() => (e.estado ? setADesactivar(e) : activar(e))}>
                          {e.estado ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal?.tipo === "form" && (
        <EmpleadoFormModal editando={modal.editando} roles={roles} turnos={turnos} onCerrar={() => setModal(null)}
          onGuardado={(emp, clave, creado) => {
            onCambio(creado ? "Empleado registrado." : "Empleado actualizado.");
            if (clave && emp.acceso.username) {
              setModal({ tipo: "clave", username: emp.acceso.username, clave, nombre: nombreCompleto(emp), motivo: "nueva" });
            } else {
              setModal(null);
            }
          }} />
      )}
      <AccesoModalsHost modal={modal} onCerrar={() => setModal(null)} onAcceso={(r) => tras(r, "nueva")} onRestablecido={(r) => tras(r, "restablecida")} />

      <ConfirmModal open={aDesactivar !== null} title="Desactivar empleado"
        message={aDesactivar ? `${nombreCompleto(aDesactivar)} dejará de poder entrar al sistema${aDesactivar.acceso.tieneCuenta ? ": su cuenta se bloquea ahora mismo y se cierran sus sesiones" : ""}. Puedes reactivarlo cuando quieras.` : ""}
        confirmLabel="Desactivar" loading={cambiando} onConfirm={confirmarCambioDeEstado} onCancel={() => setADesactivar(null)} />
    </div>
  );
}
