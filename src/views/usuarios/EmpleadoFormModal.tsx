import { useState } from "react";
import { AlertBanner, FormField, FormModal, Input, Select } from "../../components/ui";
import { mensajeDeError } from "../../api/errores";
import { usuariosApi, type Catalogo, type EmpleadoAdmin, type EmpleadoDatos } from "../../api/usuarios";
import { AREA_DEL_ROL, ETIQUETA_ROL } from "./comun";

interface Props {
  editando: EmpleadoAdmin | null;
  roles: Catalogo[];
  turnos: Catalogo[];
  onCerrar: () => void;
  /** Se llama tras guardar. `clave` solo viene al crear con acceso: hay que mostrarla una vez. */
  onGuardado: (empleado: EmpleadoAdmin, clave: string | null, creado: boolean) => void;
}

function inicial(e: EmpleadoAdmin | null): EmpleadoDatos & { username: string } {
  return {
    nombres: e?.nombres ?? "",
    apellidos: e?.apellidos ?? "",
    tipoDocumento: e?.tipoDocumento ?? "DNI",
    numeroDocumento: e?.numeroDocumento ?? "",
    correo: e?.correo ?? "",
    telefono: e?.telefono ?? "",
    fechaIngreso: e?.fechaIngreso ?? "",
    idRol: e?.rol?.idRol ?? null,
    idArea: null, // el area la deduce el servidor del rol
    idTurno: e?.turno?.idTurno ?? null,
    crearAcceso: true,
    username: "",
  };
}

/** Alta o edicion de un empleado. Al crear se puede dejar listo su acceso con una clave temporal. */
export function EmpleadoFormModal({ editando, roles, turnos, onCerrar, onGuardado }: Props) {
  const [form, setForm] = useState(() => inicial(editando));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rolElegido = roles.find((r) => r.id === form.idRol)?.nombre;
  const area = rolElegido ? AREA_DEL_ROL[rolElegido] : undefined;
  const set = <K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) => setForm((f) => ({ ...f, [campo]: valor }));

  const guardar = async () => {
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.numeroDocumento.trim()) {
      setError("Nombres, apellidos y documento son obligatorios.");
      return;
    }
    if (!form.idRol) return setError("Elige el rol: define lo que podrá hacer en el sistema.");
    if (!form.idTurno) return setError("Elige el turno del empleado.");
    setGuardando(true);
    setError(null);
    try {
      const datos: EmpleadoDatos = { ...form, fechaIngreso: form.fechaIngreso || null };
      if (editando) {
        onGuardado(await usuariosApi.actualizar(editando.idEmpleado, datos), null, false);
      } else {
        const r = await usuariosApi.crear(datos);
        onGuardado(r.empleado, r.passwordTemporal ?? null, true);
      }
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo guardar el empleado."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal open title={editando ? "Editar empleado" : "Nuevo empleado"}
      subtitle={editando ? "Los cambios de rol se aplican de inmediato." : "Datos del empleado y, si quieres, su acceso al sistema."}
      submitLabel={editando ? "Guardar cambios" : "Registrar empleado"} loading={guardando}
      onClose={onCerrar} onSubmit={guardar} size="md">
      {error && <AlertBanner type="error" message={error} dismissible={false} />}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nombres" required>
          <Input value={form.nombres} onChange={(e) => set("nombres", e.target.value)} aria-label="Nombres" />
        </FormField>
        <FormField label="Apellidos" required>
          <Input value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} aria-label="Apellidos" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tipo de documento">
          <Select value={form.tipoDocumento} onChange={(e) => set("tipoDocumento", e.target.value)} aria-label="Tipo de documento">
            <option value="DNI">DNI</option>
            <option value="CE">Carné de extranjería</option>
          </Select>
        </FormField>
        <FormField label="Número de documento" required hint={form.tipoDocumento === "DNI" ? "8 dígitos" : "9 a 12 letras o números"}>
          <Input value={form.numeroDocumento} maxLength={12} onChange={(e) => set("numeroDocumento", e.target.value)} aria-label="Número de documento" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Correo">
          <Input type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)} aria-label="Correo" />
        </FormField>
        <FormField label="Teléfono">
          <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} aria-label="Teléfono" />
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Rol" required>
          <Select value={form.idRol ?? ""} onChange={(e) => set("idRol", e.target.value ? Number(e.target.value) : null)} aria-label="Rol">
            <option value="">— Elige un rol —</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{ETIQUETA_ROL[r.nombre] ?? r.nombre}</option>)}
          </Select>
        </FormField>
        <FormField label="Área" hint="Según el rol">
          <Input value={area ?? "—"} disabled aria-label="Área" />
        </FormField>
        <FormField label="Turno" required>
          <Select value={form.idTurno ?? ""} onChange={(e) => set("idTurno", e.target.value ? Number(e.target.value) : null)} aria-label="Turno">
            <option value="">— Elige un turno —</option>
            {turnos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </Select>
        </FormField>
      </div>
      <FormField label="Fecha de ingreso">
        <Input type="date" value={form.fechaIngreso ?? ""} onChange={(e) => set("fechaIngreso", e.target.value)} aria-label="Fecha de ingreso" />
      </FormField>

      {!editando && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={form.crearAcceso} onChange={(e) => set("crearAcceso", e.target.checked)} aria-label="Crear su acceso" />
            Crear también su acceso al sistema
          </label>
          {form.crearAcceso ? (
            <>
              <p className="text-[11px] text-slate-500">
                Se genera una clave temporal que verás una sola vez; la persona la cambia al entrar.
              </p>
              <FormField label="Usuario" hint="Déjalo vacío y se sugiere uno (por ejemplo kflores).">
                <Input value={form.username} onChange={(e) => set("username", e.target.value.toLowerCase())} aria-label="Usuario" />
              </FormField>
            </>
          ) : (
            <p className="text-[11px] text-slate-500">Sin acceso no podrá entrar al sistema. Puedes dárselo después desde la lista.</p>
          )}
        </div>
      )}
    </FormModal>
  );
}
