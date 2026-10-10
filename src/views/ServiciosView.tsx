import { useState, useEffect } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import api from "../api/axiosConfig";
import {
  Button, Badge, SearchBar, KpiCard, LoadingState, EmptyState,
  AlertBanner, ConfirmModal, FormModal, FormField, Input, Select,
} from "../components/ui";

interface Producto {
  idProducto: number;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precioVenta: number;
  estado: boolean;
}

const categoriaLabel: Record<string, string> = {
  COCINA: "Cocina",
  BAR: "Bar",
  DIRECTO: "Servicio Directo",
};

const categoriaVariant: Record<string, string> = {
  COCINA: "amber",
  BAR: "blue",
  DIRECTO: "emerald",
};

const EMPTY_FORM = { nombre: "", descripcion: "", categoria: "DIRECTO", precioVenta: "" };

export function ServiciosView() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Producto[]>("/api/v1/productos");
      setProductos(res.data);
    } catch {
      setError("No se pudieron cargar los productos/servicios.");
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

  function abrirEdicion(p: Producto) {
    setEditando(p);
    setForm({ nombre: p.nombre, descripcion: p.descripcion ?? "", categoria: p.categoria, precioVenta: String(p.precioVenta) });
    setFormError(null);
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombre || !form.precioVenta || Number(form.precioVenta) <= 0) {
      setFormError("Nombre y precio son requeridos.");
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      const body = { nombre: form.nombre, descripcion: form.descripcion, categoria: form.categoria, precioVenta: Number(form.precioVenta) };
      if (editando) {
        await api.put(`/api/v1/productos/${editando.idProducto}`, body);
        setSuccessMsg("Producto actualizado.");
      } else {
        await api.post("/api/v1/productos", body);
        setSuccessMsg("Producto creado.");
      }
      setShowForm(false);
      await cargar();
    } catch {
      setFormError("Error al guardar el producto.");
    } finally {
      setFormLoading(false);
    }
  }

  async function toggleEstado(p: Producto) {
    try {
      await api.patch(`/api/v1/productos/${p.idProducto}/estado`, { estado: !p.estado });
      await cargar();
    } catch {
      setError("No se pudo cambiar el estado.");
    }
  }

  async function eliminar() {
    if (!confirmDelete) return;
    setConfirmLoading(true);
    try {
      await api.delete(`/api/v1/productos/${confirmDelete}`);
      setConfirmDelete(null);
      setSuccessMsg("Producto eliminado.");
      await cargar();
    } catch {
      setError("No se pudo eliminar el producto.");
      setConfirmDelete(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  const filtrados = productos.filter((p) =>
    !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || categoriaLabel[p.categoria]?.toLowerCase().includes(search.toLowerCase())
  );

  const activos = productos.filter((p) => p.estado).length;

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admin &gt; Servicios</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Catálogo de Servicios</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">Gestión de productos y servicios del hostel.</p>
        </div>
        <Button icon={<Plus size={13} />} onClick={abrirNuevo}>Nuevo Producto</Button>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} />}
      {error && <AlertBanner type="error" message={error} />}

      <div className="grid grid-cols-3 gap-3">
        <KpiCard title="Total Productos" value={productos.length} subtitle="en catálogo" color="slate" />
        <KpiCard title="Activos" value={activos} subtitle="disponibles para venta" color="emerald" />
        <KpiCard title="Inactivos" value={productos.length - activos} subtitle="deshabilitados" color="amber" />
      </div>

      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o categoría" className="flex-1 max-w-xs" />
        <span className="text-[10px] text-slate-400 ml-auto">{filtrados.length} registros</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? <LoadingState /> : filtrados.length === 0 ? (
          <EmptyState title="Sin productos" description="No hay productos/servicios registrados." action={<Button onClick={abrirNuevo} icon={<Plus size={13} />}>Nuevo Producto</Button>} />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Nombre</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Precio Venta</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.idProducto} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-semibold">{p.nombre}</div>
                    {p.descripcion && <div className="text-[10px] text-slate-400">{p.descripcion}</div>}
                  </td>
                  <td className="p-3">
                    <Badge variant={(categoriaVariant[p.categoria] ?? "default") as "amber" | "blue" | "emerald"} label={categoriaLabel[p.categoria] ?? p.categoria} />
                  </td>
                  <td className="p-3 font-semibold">S/ {Number(p.precioVenta).toFixed(2)}</td>
                  <td className="p-3">
                    <Badge variant={p.estado ? "emerald" : "slate"} label={p.estado ? "Activo" : "Inactivo"} />
                  </td>
                  <td className="p-3 flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Pencil size={11} />} onClick={() => abrirEdicion(p)}>Editar</Button>
                    <Button size="sm" variant="ghost" icon={p.estado ? <ToggleRight size={11} /> : <ToggleLeft size={11} />} onClick={() => toggleEstado(p)}>
                      {p.estado ? "Desactivar" : "Activar"}
                    </Button>
                    <Button size="sm" variant="danger" icon={<Trash2 size={11} />} onClick={() => setConfirmDelete(p.idProducto)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FormModal open={showForm} title={editando ? "Editar Producto" : "Nuevo Producto"} subtitle="Datos del producto o servicio"
        submitLabel={editando ? "Guardar Cambios" : "Crear Producto"} loading={formLoading}
        onClose={() => setShowForm(false)} onSubmit={guardar} size="sm">
        {formError && <AlertBanner type="error" message={formError} dismissible={false} />}
        <FormField label="Nombre" required>
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Café con leche" />
        </FormField>
        <FormField label="Descripción">
          <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción breve (opcional)" />
        </FormField>
        <FormField label="Categoría" required>
          <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            <option value="COCINA">Cocina</option>
            <option value="BAR">Bar</option>
            <option value="DIRECTO">Servicio Directo</option>
          </Select>
        </FormField>
        <FormField label="Precio de Venta (S/)" required>
          <Input type="number" min="0" step="0.10" value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} placeholder="0.00" />
        </FormField>
      </FormModal>

      <ConfirmModal open={!!confirmDelete} title="Eliminar producto"
        message="¿Confirmas la eliminación de este producto? Esta acción no puede deshacerse."
        confirmLabel="Sí, eliminar" loading={confirmLoading} onConfirm={eliminar} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}
