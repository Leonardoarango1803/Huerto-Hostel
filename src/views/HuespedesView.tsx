import { useState, useEffect, useMemo } from "react";
import { Plus, Download, Users, Home, Award, LogIn, Edit3, Loader2, AlertTriangle } from "lucide-react";
import { clientesApi } from "../api/clientes";
import { reservasApi } from "../api/reservas";
import { consultarDni, consultarRuc } from "../api/decolecta";
import type { Cliente, NuevoClienteRequest, EstadisticasClientes } from "../api/types";
import {
  Button,
  SearchBar,
  FilterPills,
  KpiCard,
  LoadingState,
  EmptyState,
  AlertBanner,
  FormModal,
  FormField,
  Input,
  Select,
} from "../components/ui";
import { useNavigate } from "react-router-dom";

const FILTER_OPTIONS = [
  { label: "Todos", value: "TODOS" },
  { label: "Activos", value: "ACTIVOS" },
  { label: "Inactivos", value: "INACTIVOS" },
];

function formatFecha(fecha?: string) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-PE", { month: "short", year: "numeric" });
}

function getInitials(nombres: string, apellidos: string) {
  return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-emerald-800 text-white",
  "bg-blue-700 text-white",
  "bg-amber-700 text-white",
  "bg-purple-700 text-white",
  "bg-rose-700 text-white",
  "bg-teal-700 text-white",
];

const CAMPOS_DOC = ["DNI", "CE", "PAS", "RUC"];

const EMPTY_FORM: NuevoClienteRequest = {
  tipoDocumento: "DNI",
  numeroDocumento: "",
  nombres: "",
  apellidos: "",
  correo: "",
  telefono: "",
  nacionalidad: "Peruana",
  fechaNacimiento: "",
};

export function HuespedesView() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasClientes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("TODOS");

  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<NuevoClienteRequest>(EMPTY_FORM);
  const [dniLoading, setDniLoading] = useState(false);
  const [checkinWarning, setCheckinWarning] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setError(null);
    try {
      const [clts] = await Promise.all([
        clientesApi.listar(),
        clientesApi.estadisticas().then(setEstadisticas).catch(() => null),
      ]);
      setClientes(clts);
    } catch {
      setError("No se pudieron cargar los huéspedes. Verifica la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDniLoading(false);
    setShowForm(true);
  }

  async function handleDocumentoChange(valor: string) {
    setForm((f) => ({ ...f, numeroDocumento: valor }));
    if (form.tipoDocumento === "DNI" && valor.length === 8 && !editando) {
      setDniLoading(true);
      try {
        const data = await consultarDni(valor);
        setForm((f) => ({
          ...f,
          nombres: data.first_name ?? f.nombres,
          apellidos: `${data.first_last_name ?? ""} ${data.second_last_name ?? ""}`.trim() || f.apellidos,
        }));
      } catch {
        // silently ignore — user can fill manually
      } finally {
        setDniLoading(false);
      }
    }
    if (form.tipoDocumento === "RUC" && valor.length === 11 && !editando) {
      setDniLoading(true);
      try {
        const data = await consultarRuc(valor);
        setForm((f) => ({
          ...f,
          nombres: data.razon_social ?? f.nombres,
          apellidos: "",
        }));
      } catch {
        // silently ignore — user can fill manually
      } finally {
        setDniLoading(false);
      }
    }
  }

  function abrirEdicion(c: Cliente) {
    setEditando(c);
    setForm({
      tipoDocumento: c.tipoDocumento,
      numeroDocumento: c.numeroDocumento,
      nombres: c.nombres,
      apellidos: c.apellidos,
      correo: c.correo ?? "",
      telefono: c.telefono ?? "",
      nacionalidad: c.nacionalidad ?? "",
      fechaNacimiento: c.fechaNacimiento ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function irACheckin(idCliente: number) {
    setCheckinWarning(null);
    try {
      const reservas = await reservasApi.listar();
      const clienteReservas = reservas.filter((r) => r.cliente.idCliente === idCliente);
      const tieneConfirmada = clienteReservas.some((r) => r.estadoReserva === "CONFIRMADA");
      if (!tieneConfirmada) {
        const tieneAlguna = clienteReservas.some(
          (r) => r.estadoReserva === "PENDIENTE_ADELANTO"
        );
        if (tieneAlguna) {
          setCheckinWarning("Este huésped tiene una reserva pendiente de adelanto. Registra el pago para confirmarla antes del check-in.");
        } else {
          setCheckinWarning("Este huésped no tiene reservaciones confirmadas. Registra una reserva primero.");
        }
        return;
      }
      navigate("/checkin");
    } catch {
      navigate("/checkin");
    }
  }

  async function guardar() {
    if (!form.nombres || !form.apellidos || !form.numeroDocumento) {
      setFormError("Nombre, apellidos y documento son obligatorios.");
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      if (editando) {
        await clientesApi.actualizar(editando.idCliente, form);
        setSuccessMsg("Huésped actualizado correctamente.");
      } else {
        await clientesApi.crear(form);
        setSuccessMsg("Huésped registrado correctamente.");
      }
      setShowForm(false);
      await cargarDatos();
    } catch {
      setFormError("Error al guardar el huésped. Verifica los datos.");
    } finally {
      setFormLoading(false);
    }
  }

  const filtrados = useMemo(() => {
    return clientes
      .filter((c) => {
        if (activeFilter === "ACTIVOS") return c.estado !== false;
        if (activeFilter === "INACTIVOS") return c.estado === false;
        return true;
      })
      .filter((c) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          `${c.nombres} ${c.apellidos}`.toLowerCase().includes(q) ||
          c.numeroDocumento.includes(q) ||
          (c.correo ?? "").toLowerCase().includes(q) ||
          (c.telefono ?? "").includes(q)
        );
      });
  }, [clientes, activeFilter, searchTerm]);

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Recepción &gt; Huéspedes
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Directorio de Huéspedes</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Registro y gestión de clientes del hostel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<Download size={13} />}
            onClick={() => {
              const csv = filtrados.map((c) => [
                c.nombres, c.apellidos, c.tipoDocumento, c.numeroDocumento, c.correo ?? "", c.telefono ?? "", c.nacionalidad ?? "",
              ].join(",")).join("\n");
              const blob = new Blob([`Nombres,Apellidos,TipoDoc,Documento,Correo,Teléfono,Nacionalidad\n${csv}`], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "huespedes.csv";
              a.click();
            }}
          >
            Exportar
          </Button>
          <Button icon={<Plus size={13} />} onClick={abrirNuevo}>
            Registrar Huésped
          </Button>
        </div>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} />}
      {error && <AlertBanner type="error" message={error} />}
      {checkinWarning && (
        <div className="flex items-start gap-2 p-3 rounded-lg border bg-amber-50 border-amber-300 text-amber-900 text-xs">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{checkinWarning}</span>
          <button onClick={() => setCheckinWarning(null)} className="ml-auto text-amber-600 hover:text-amber-800 font-bold">✕</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          title="Total Registrados"
          value={estadisticas?.totalClientes ?? clientes.length}
          subtitle="en el sistema"
          icon={<Users size={16} />}
          color="slate"
        />
        <KpiCard
          title="En Casa Hoy"
          value={estadisticas?.enCasaHoy ?? "—"}
          subtitle="estadías activas"
          icon={<Home size={16} />}
          color="green"
        />
        <KpiCard
          title="Frecuentes"
          value={estadisticas?.frecuentes ?? "—"}
          subtitle="más de 1 visita"
          icon={<Award size={16} />}
          color="amber"
        />
      </div>

      {/* Búsqueda y filtros */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nombre, documento, correo o teléfono"
            className="flex-1 max-w-sm"
          />
          <FilterPills options={FILTER_OPTIONS} active={activeFilter} onSelect={setActiveFilter} />
        </div>
        <span className="text-[10px] text-slate-400">{filtrados.length} registros</span>
      </div>

      {/* Lista de huéspedes */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : filtrados.length === 0 ? (
          <EmptyState
            title="Sin huéspedes"
            description={searchTerm ? "No hay coincidencias con tu búsqueda." : "Aún no hay huéspedes registrados."}
            action={<Button onClick={abrirNuevo} icon={<Plus size={13} />}>Registrar Huésped</Button>}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrados.map((c, idx) => (
              <div key={c.idCliente} className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0 ${
                    AVATAR_COLORS[idx % AVATAR_COLORS.length]
                  }`}
                >
                  {getInitials(c.nombres, c.apellidos)}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{c.nombres} {c.apellidos}</span>
                    {c.estado === false && (
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">INACTIVO</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-3 mt-0.5 flex-wrap">
                    <span>{c.tipoDocumento} {c.numeroDocumento}</span>
                    {c.correo && <span className="truncate max-w-[160px]">{c.correo}</span>}
                    {c.telefono && <span>{c.telefono}</span>}
                    {c.nacionalidad && <span>{c.nacionalidad}</span>}
                    <span>Desde {formatFecha(c.fechaRegistro)}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit3 size={12} />}
                    onClick={() => abrirEdicion(c)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<LogIn size={12} />}
                    onClick={() => irACheckin(c.idCliente)}
                  >
                    Check-in
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FormModal Crear/Editar */}
      <FormModal
        open={showForm}
        title={editando ? "Editar Huésped" : "Registrar Nuevo Huésped"}
        subtitle={editando ? `Editando: ${editando.nombres} ${editando.apellidos}` : "Completa los datos del nuevo huésped"}
        submitLabel={editando ? "Guardar cambios" : "Registrar"}
        loading={formLoading}
        onClose={() => setShowForm(false)}
        onSubmit={guardar}
        size="md"
      >
        {formError && <AlertBanner type="error" message={formError} dismissible={false} />}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo de documento" required>
            <Select value={form.tipoDocumento} onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value })}>
              {CAMPOS_DOC.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </FormField>
          <FormField
            label="Número de documento"
            required
            hint={form.tipoDocumento === "DNI" && !editando ? "Se autocompletará al ingresar 8 dígitos" : undefined}
          >
            <div className="relative">
              <Input
                value={form.numeroDocumento}
                onChange={(e) => handleDocumentoChange(e.target.value)}
                placeholder={form.tipoDocumento === "DNI" ? "8 dígitos" : "Ej: CE-123456"}
                maxLength={form.tipoDocumento === "DNI" ? 8 : 20}
              />
              {dniLoading && (
                <Loader2 size={13} className="absolute right-2.5 top-2 text-[#1b4332] animate-spin" />
              )}
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nombres" required>
            <Input
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              placeholder="Ej: Juan Carlos"
            />
          </FormField>
          <FormField label="Apellidos" required>
            <Input
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              placeholder="Ej: García López"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Correo electrónico">
            <Input
              type="email"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              placeholder="correo@ejemplo.com"
            />
          </FormField>
          <FormField label="Teléfono">
            <Input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="+51 9XX XXX XXX"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nacionalidad">
            <Input
              value={form.nacionalidad}
              onChange={(e) => setForm({ ...form, nacionalidad: e.target.value })}
              placeholder="Ej: Peruana"
            />
          </FormField>
          <FormField label="Fecha de nacimiento">
            <Input
              type="date"
              value={form.fechaNacimiento}
              onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
            />
          </FormField>
        </div>
      </FormModal>
    </div>
  );
}
