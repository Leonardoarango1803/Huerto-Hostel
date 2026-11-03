import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { inventarioApi } from "../../api/inventario";
import { mensajeDeError } from "../../api/errores";
import type { Proveedor } from "../../api/types";
import { Badge, Button, EmptyState, FormField, FormModal, Input } from "../../components/ui";
import type { Mensaje } from "./comun";

interface Props {
  proveedores: Proveedor[];
  puedeGestionar: boolean;
  onCambio: (mensaje: Mensaje) => void;
}

const VACIO = { nombre: "", contacto: "", telefono: "", email: "", estado: true };

export function ProveedoresTab({ proveedores, puedeGestionar, onCambio }: Props) {
  const [editando, setEditando] = useState<Proveedor | "nuevo" | null>(null);
  const [form, setForm] = useState({ ...VACIO });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const abrir = (p: Proveedor | "nuevo") => {
    setError(null);
    setEditando(p);
    setForm(
      p === "nuevo"
        ? { ...VACIO }
        : {
            nombre: p.nombre,
            contacto: p.contacto ?? "",
            telefono: p.telefono ?? "",
            email: p.email ?? "",
            estado: p.estado !== false,
          }
    );
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      setError("El proveedor necesita un nombre.");
      return;
    }
    const datos: Partial<Proveedor> = {
      nombre: form.nombre.trim(),
      contacto: form.contacto.trim() || undefined,
      telefono: form.telefono.trim() || undefined,
      email: form.email.trim() || undefined,
    };
    setGuardando(true);
    setError(null);
    try {
      if (editando === "nuevo") {
        await inventarioApi.crearProveedor(datos);
        onCambio({ tipo: "ok", texto: `Proveedor "${datos.nombre}" creado.` });
      } else if (editando) {
        await inventarioApi.actualizarProveedor(editando.idProveedor, { ...datos, estado: form.estado });
        onCambio({ tipo: "ok", texto: `Proveedor "${datos.nombre}" actualizado.` });
      }
      setEditando(null);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo guardar el proveedor."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <span className="font-bold text-slate-700 text-xs">Proveedores ({proveedores.length})</span>
        {puedeGestionar && (
          <Button size="sm" icon={<Plus size={12} />} onClick={() => abrir("nuevo")}>Nuevo proveedor</Button>
        )}
      </div>
      {proveedores.length === 0 ? (
        <EmptyState title="Aun no hay proveedores registrados" />
      ) : (
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
              <th className="p-3">Proveedor</th>
              <th className="p-3">Contacto</th>
              <th className="p-3">Telefono</th>
              <th className="p-3">Correo</th>
              <th className="p-3 text-center">Estado</th>
              {puedeGestionar && <th className="p-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proveedores.map((p) => (
              <tr key={p.idProveedor} className={`hover:bg-slate-50 ${p.estado === false ? "opacity-60" : ""}`}>
                <td className="p-3 font-semibold text-slate-800">{p.nombre}</td>
                <td className="p-3 text-slate-500">{p.contacto ?? "—"}</td>
                <td className="p-3 text-slate-500">{p.telefono ?? "—"}</td>
                <td className="p-3 text-slate-500">{p.email ?? "—"}</td>
                <td className="p-3 text-center">
                  <Badge variant={p.estado === false ? "slate" : "emerald"} label={p.estado === false ? "Inactivo" : "Activo"} />
                </td>
                {puedeGestionar && (
                  <td className="p-3 text-right">
                    <button
                      title="Editar proveedor"
                      aria-label={`Editar ${p.nombre}`}
                      onClick={() => abrir(p)}
                      className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      <Pencil size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FormModal
        open={editando !== null}
        title={editando === "nuevo" ? "Nuevo proveedor" : "Editar proveedor"}
        submitLabel={editando === "nuevo" ? "Crear proveedor" : "Guardar cambios"}
        loading={guardando}
        onClose={() => setEditando(null)}
        onSubmit={guardar}
      >
        <div className="space-y-3">
          {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
          <FormField label="Nombre" required>
            <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Persona de contacto">
              <Input value={form.contacto} onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))} />
            </FormField>
            <FormField label="Telefono">
              <Input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Correo">
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </FormField>
          {editando !== "nuevo" && (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.checked }))} />
              Proveedor activo
            </label>
          )}
        </div>
      </FormModal>
    </div>
  );
}
