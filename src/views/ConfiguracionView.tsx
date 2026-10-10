import { useState, useEffect } from "react";
import { Plus, Pencil } from "lucide-react";
import api from "../api/axiosConfig";
import {
  Button, Badge, KpiCard, LoadingState, AlertBanner,
  FormModal, FormField, Input, Select,
} from "../components/ui";

interface TipoHabitacion {
  idTipoHabitacion: number;
  nombre: string;
  descripcion?: string;
  capacidadPersonas?: number;
  precioNoche: number;
  estado: boolean;
}

const EMPTY_FORM = { nombre: "", descripcion: "", capacidadPersonas: "2", precioNoche: "" };

export function ConfiguracionView() {
  const [tipos, setTipos] = useState<TipoHabitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<TipoHabitacion | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TipoHabitacion[]>("/api/v1/tipos-habitacion");
      setTipos(res.data);
    } catch {
      setError("No se pudieron cargar los tipos de habitación.");
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

  function abrirEdicion(t: TipoHabitacion) {
    setEditando(t);
    setForm({
      nombre: t.nombre,
      descripcion: t.descripcion ?? "",
      capacidadPersonas: String(t.capacidadPersonas ?? 2),
      precioNoche: String(t.precioNoche),
    });
    setFormError(null);
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombre || !form.precioNoche || Number(form.precioNoche) <= 0) {
      setFormError("Nombre y precio por noche son requeridos.");
      return;
    }
    setFormLoading(true);
    setFormError(null);
    const body = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      capacidadPersonas: Number(form.capacidadPersonas),
      precioNoche: Number(form.precioNoche),
      estado: true,
    };
    try {
      if (editando) {
        await api.put(`/api/v1/tipos-habitacion/${editando.idTipoHabitacion}`, body);
        setSuccessMsg("Tipo de habitación actualizado.");
      } else {
        await api.post("/api/v1/tipos-habitacion", body);
        setSuccessMsg("Tipo de habitación creado.");
      }
      setShowForm(false);
      await cargar();
    } catch {
      setFormError("Error al guardar el tipo de habitación.");
    } finally {
      setFormLoading(false);
    }
  }

  async function toggleEstado(t: TipoHabitacion) {
    try {
      await api.put(`/api/v1/tipos-habitacion/${t.idTipoHabitacion}`, {
        nombre: t.nombre, descripcion: t.descripcion,
        capacidadPersonas: t.capacidadPersonas, precioNoche: t.precioNoche,
        estado: !t.estado,
      });
      await cargar();
    } catch {
      setError("No se pudo cambiar el estado.");
    }
  }

  const activos = tipos.filter((t) => t.estado).length;

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admin &gt; Configuración</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Configuración del Sistema</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">Tipos de habitación y parámetros del hostel.</p>
        </div>
        <Button icon={<Plus size={13} />} onClick={abrirNuevo}>Nuevo Tipo</Button>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} />}
      {error && <AlertBanner type="error" message={error} />}

      {/* Tipos de habitación */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-sm text-slate-800">Tipos de Habitación</h2>
          <span className="text-[10px] text-slate-400">{tipos.length} tipos registrados</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <KpiCard title="Tipos Activos" value={activos} subtitle="disponibles" color="emerald" />
          <KpiCard title="Tipos Inactivos" value={tipos.length - activos} subtitle="deshabilitados" color="slate" />
          <KpiCard title="Total Tipos" value={tipos.length} subtitle="configurados" color="blue" />
        </div>

        {loading ? <LoadingState /> : tipos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No hay tipos de habitación configurados.</p>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Tipo</th>
                <th className="p-3">Capacidad</th>
                <th className="p-3">Precio / Noche</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.idTipoHabitacion} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-semibold">{t.nombre}</div>
                    {t.descripcion && <div className="text-[10px] text-slate-400">{t.descripcion}</div>}
                  </td>
                  <td className="p-3">{t.capacidadPersonas ?? "—"} persona{(t.capacidadPersonas ?? 0) !== 1 ? "s" : ""}</td>
                  <td className="p-3 font-semibold">S/ {Number(t.precioNoche).toFixed(2)}</td>
                  <td className="p-3">
                    <Badge variant={t.estado ? "emerald" : "slate"} label={t.estado ? "Activo" : "Inactivo"} />
                  </td>
                  <td className="p-3 flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Pencil size={11} />} onClick={() => abrirEdicion(t)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleEstado(t)}>
                      {t.estado ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Parámetros generales */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-bold text-sm text-slate-800 mb-3">Parámetros Generales</h2>
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500">Nombre del Hostel</span>
              <span className="font-semibold">El Huerto Hostel</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500">Hora estándar Check-in</span>
              <span className="font-semibold">14:00</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500">Hora estándar Check-out</span>
              <span className="font-semibold">12:00</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500">Moneda</span>
              <span className="font-semibold">PEN (S/)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500">Versión Backend</span>
              <span className="font-semibold">Spring Boot 3.3.5</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500">BD</span>
              <span className="font-semibold">PostgreSQL / Supabase</span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3 italic">
          Los parámetros adicionales se configurarán en una futura versión del sistema.
        </p>
      </div>

      <FormModal open={showForm} title={editando ? "Editar Tipo de Habitación" : "Nuevo Tipo de Habitación"}
        subtitle="Define los parámetros del tipo de habitación"
        submitLabel={editando ? "Guardar Cambios" : "Crear Tipo"} loading={formLoading}
        onClose={() => setShowForm(false)} onSubmit={guardar} size="sm">
        {formError && <AlertBanner type="error" message={formError} dismissible={false} />}
        <FormField label="Nombre" required>
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Habitación Doble" />
        </FormField>
        <FormField label="Descripción">
          <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción breve (opcional)" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Capacidad (personas)" required>
            <Select value={form.capacidadPersonas} onChange={(e) => setForm({ ...form, capacidadPersonas: e.target.value })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} persona{n !== 1 ? "s" : ""}</option>)}
            </Select>
          </FormField>
          <FormField label="Precio / Noche (S/)" required>
            <Input type="number" min="0" step="0.50" value={form.precioNoche} onChange={(e) => setForm({ ...form, precioNoche: e.target.value })} placeholder="0.00" />
          </FormField>
        </div>
      </FormModal>
    </div>
  );
}
