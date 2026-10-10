import { useState, useEffect } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import api from "../api/axiosConfig";
import {
  Button, Badge, SearchBar, KpiCard, LoadingState, EmptyState,
  AlertBanner, FormModal, FormField, Input, Select,
} from "../components/ui";

interface Rol { idRol: number; nombre: string; }
interface Area { idArea: number; nombre: string; }
interface Turno { idTurno: number; nombre: string; }
interface Empleado {
  idEmpleado: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correo?: string;
  telefono?: string;
  estado: boolean;
  fechaIngreso?: string;
  rol?: Rol;
  area?: Area;
  turno?: Turno;
}

const EMPTY_FORM = {
  nombres: "", apellidos: "", tipoDocumento: "DNI", numeroDocumento: "",
  correo: "", telefono: "", fechaIngreso: "",
  idRol: "", idArea: "", idTurno: "",
};

export function UsuariosView() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const [empRes, rolRes, areaRes, turnoRes] = await Promise.all([
        api.get<Empleado[]>("/api/v1/empleados"),
        api.get<Rol[]>("/api/v1/roles").catch(() => ({ data: [] })),
        api.get<Area[]>("/api/v1/areas").catch(() => ({ data: [] })),
        api.get<Turno[]>("/api/v1/turnos"),
      ]);
      setEmpleados(empRes.data);
      setRoles(rolRes.data);
      setAreas(areaRes.data);
      setTurnos(turnoRes.data);
    } catch {
      setError("No se pudieron cargar los empleados.");
    } finally {
      setLoading(false);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setShowForm(true);
  }

  function abrirEdicion(e: Empleado) {
    setEditando(e);
    setForm({
      nombres: e.nombres, apellidos: e.apellidos, tipoDocumento: e.tipoDocumento,
      numeroDocumento: e.numeroDocumento, correo: e.correo ?? "", telefono: e.telefono ?? "",
      fechaIngreso: e.fechaIngreso ?? "",
      idRol: e.rol ? String(e.rol.idRol) : "", idArea: e.area ? String(e.area.idArea) : "",
      idTurno: e.turno ? String(e.turno.idTurno) : "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombres || !form.apellidos || !form.numeroDocumento) {
      setFormError("Nombres, apellidos y documento son requeridos.");
      return;
    }
    setFormLoading(true);
    setFormError(null);
    const body = {
      nombres: form.nombres, apellidos: form.apellidos, tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento, correo: form.correo, telefono: form.telefono,
      fechaIngreso: form.fechaIngreso || null,
      rol: form.idRol ? { idRol: Number(form.idRol) } : null,
      area: form.idArea ? { idArea: Number(form.idArea) } : null,
      turno: form.idTurno ? { idTurno: Number(form.idTurno) } : null,
    };
    try {
      if (editando) {
        await api.put(`/api/v1/empleados/${editando.idEmpleado}`, body);
        setSuccessMsg("Empleado actualizado.");
      } else {
        await api.post("/api/v1/empleados", body);
        setSuccessMsg("Empleado registrado.");
      }
      setShowForm(false);
      await cargar();
    } catch {
      setFormError("Error al guardar el empleado.");
    } finally {
      setFormLoading(false);
    }
  }

  async function toggleEstado(emp: Empleado) {
    try {
      await api.patch(`/api/v1/empleados/${emp.idEmpleado}/estado`, { estado: !emp.estado });
      await cargar();
    } catch {
      setError("No se pudo cambiar el estado.");
    }
  }

  const filtrados = empleados.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${e.nombres} ${e.apellidos}`.toLowerCase().includes(q) || e.numeroDocumento.includes(q);
  });

  const activos = empleados.filter((e) => e.estado).length;

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admin &gt; Usuarios</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Gestión de Empleados</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">Administración del personal del hostel.</p>
        </div>
        <Button icon={<Plus size={13} />} onClick={abrirNuevo}>Nuevo Empleado</Button>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} />}
      {error && <AlertBanner type="error" message={error} />}

      <div className="grid grid-cols-3 gap-3">
        <KpiCard title="Total Empleados" value={empleados.length} subtitle="registrados" color="slate" />
        <KpiCard title="Activos" value={activos} subtitle="en servicio" color="emerald" />
        <KpiCard title="Inactivos" value={empleados.length - activos} subtitle="deshabilitados" color="amber" />
      </div>

      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o documento" className="flex-1 max-w-xs" />
        <span className="text-[10px] text-slate-400 ml-auto">{filtrados.length} registros</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? <LoadingState /> : filtrados.length === 0 ? (
          <EmptyState title="Sin empleados" description="No hay empleados registrados." action={<Button onClick={abrirNuevo} icon={<Plus size={13} />}>Nuevo Empleado</Button>} />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Empleado</th>
                <th className="p-3">Documento</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Turno</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e) => (
                <tr key={e.idEmpleado} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-semibold">{e.nombres} {e.apellidos}</div>
                    {e.correo && <div className="text-[10px] text-slate-400">{e.correo}</div>}
                  </td>
                  <td className="p-3">{e.tipoDocumento} {e.numeroDocumento}</td>
                  <td className="p-3">{e.rol?.nombre ?? <span className="text-slate-400">—</span>}</td>
                  <td className="p-3">{e.turno?.nombre ?? <span className="text-slate-400">—</span>}</td>
                  <td className="p-3">
                    <Badge variant={e.estado ? "emerald" : "slate"} label={e.estado ? "Activo" : "Inactivo"} />
                  </td>
                  <td className="p-3 flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Pencil size={11} />} onClick={() => abrirEdicion(e)}>Editar</Button>
                    <Button size="sm" variant="ghost" icon={e.estado ? <ToggleRight size={11} /> : <ToggleLeft size={11} />} onClick={() => toggleEstado(e)}>
                      {e.estado ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FormModal open={showForm} title={editando ? "Editar Empleado" : "Nuevo Empleado"} subtitle="Datos del empleado"
        submitLabel={editando ? "Guardar Cambios" : "Registrar Empleado"} loading={formLoading}
        onClose={() => setShowForm(false)} onSubmit={guardar} size="md">
        {formError && <AlertBanner type="error" message={formError} dismissible={false} />}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nombres" required>
            <Input value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
          </FormField>
          <FormField label="Apellidos" required>
            <Input value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo Documento">
            <Select value={form.tipoDocumento} onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value })}>
              <option value="DNI">DNI</option>
              <option value="CE">Carné de Extranjería</option>
            </Select>
          </FormField>
          <FormField label="Número Documento" required>
            <Input value={form.numeroDocumento} onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })} maxLength={12} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Correo">
            <Input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          </FormField>
          <FormField label="Teléfono">
            <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Rol">
            <Select value={form.idRol} onChange={(e) => setForm({ ...form, idRol: e.target.value })}>
              <option value="">— Sin rol —</option>
              {roles.map((r) => <option key={r.idRol} value={r.idRol}>{r.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Área">
            <Select value={form.idArea} onChange={(e) => setForm({ ...form, idArea: e.target.value })}>
              <option value="">— Sin área —</option>
              {areas.map((a) => <option key={a.idArea} value={a.idArea}>{a.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Turno">
            <Select value={form.idTurno} onChange={(e) => setForm({ ...form, idTurno: e.target.value })}>
              <option value="">— Sin turno —</option>
              {turnos.map((t) => <option key={t.idTurno} value={t.idTurno}>{t.nombre}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Fecha de Ingreso">
          <Input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} />
        </FormField>
      </FormModal>
    </div>
  );
}
