import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Download, Plus, LogIn, CreditCard, Trash2 } from "lucide-react";
import { NuevoIngresoModal } from "../components/NuevoIngresoModal";
import { reservasApi } from "../api/reservas";
import { habitacionesApi } from "../api/habitaciones";
import { clientesApi } from "../api/clientes";
import type { Reserva, Habitacion, Cliente, NuevaReservaRequest, PagoReserva } from "../api/types";
import {
  Button,
  Badge,
  SearchBar,
  FilterPills,
  KpiCard,
  LoadingState,
  EmptyState,
  AlertBanner,
  ConfirmModal,
  FormModal,
  FormField,
  Input,
  Select,
  estadoReservaToVariant,
} from "../components/ui";

const estadoLabel: Record<string, string> = {
  PENDIENTE_ADELANTO: "Pendiente",
  CONFIRMADA: "Confirmada",
  EN_CURSO: "Activa",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
};

const canalLabel: Record<string, string> = {
  ONLINE: "En Línea",
  PRESENCIAL: "Mostrador",
};

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCodigo(id: number) {
  return `RES-${String(id).padStart(3, "0")}`;
}

const FILTER_OPTIONS = [
  { label: "Pendiente", value: "PENDIENTE_ADELANTO" },
  { label: "Confirmada", value: "CONFIRMADA" },
  { label: "Activa", value: "EN_CURSO" },
  { label: "Completada", value: "COMPLETADA" },
  { label: "Cancelada", value: "CANCELADA" },
  { label: "Todas", value: "TODAS" },
];

export function ReservasView() {


  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(["PENDIENTE_ADELANTO"]);
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [showNuevoIngreso, setShowNuevoIngreso] = useState(false);

  useEffect(() => {
    if ((location.state as { openNuevoIngreso?: boolean })?.openNuevoIngreso) {
      setShowNuevoIngreso(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [hiddenCanceladas, setHiddenCanceladas] = useState<number[]>([]);
  const [confirmBorrar, setConfirmBorrar] = useState<number | null>(null);

  const [showNuevaReserva, setShowNuevaReserva] = useState(false);
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [form, setForm] = useState<NuevaReservaRequest>({
    idCliente: 0,
    idHabitacion: 0,
    fechaCheckinPrevisto: "",
    fechaCheckoutPrevisto: "",
    canalReserva: "PRESENCIAL",
    observaciones: "",
  });

  // Pagos de la reserva seleccionada
  const [pagosReserva, setPagosReserva] = useState<PagoReserva[]>([]);

  // Adelanto payment state
  const [showAdelanto, setShowAdelanto] = useState(false);
  const [adelantoMonto, setAdelantoMonto] = useState("");
  const [adelantoMetodo, setAdelantoMetodo] = useState("EFECTIVO");
  const [adelantoLoading, setAdelantoLoading] = useState(false);
  const [adelantoError, setAdelantoError] = useState<string | null>(null);

  useEffect(() => {
    cargarReservas();
  }, []);

  useEffect(() => {
    if (!selectedId) { setPagosReserva([]); return; }
    reservasApi.listarPagos(selectedId)
      .then(setPagosReserva)
      .catch(() => setPagosReserva([]));
  }, [selectedId]);

  async function cargarReservas() {
    setLoading(true);
    setError(null);
    try {
      const data = await reservasApi.listar();
    setReservas(data);
    const primera = (activeFilters.length > 0
        ? data.find((r) => activeFilters.includes(r.estadoReserva))
        : null)
      ?? data.find((r) => !["CANCELADA", "COMPLETADA"].includes(r.estadoReserva))
      ?? data[0] ?? null;
    setSelectedId(primera?.idReserva ?? null);
    } catch {
      setError("No se pudieron cargar las reservas. Verifica la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirNuevaReserva() {
    setShowNuevaReserva(true);
    setFormError(null);
    setForm({ idCliente: 0, idHabitacion: 0, fechaCheckinPrevisto: "", fechaCheckoutPrevisto: "", canalReserva: "PRESENCIAL", observaciones: "" });
    const [habs, clts] = await Promise.all([
      habitacionesApi.listar("DISPONIBLE").catch(() => []),
      clientesApi.listar().catch(() => []),
    ]);
    setHabitaciones(habs);
    setClientes(clts);
  }

  async function crearReserva() {
    if (!form.idCliente || !form.idHabitacion || !form.fechaCheckinPrevisto || !form.fechaCheckoutPrevisto) {
      setFormError("Completa todos los campos requeridos.");
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      await reservasApi.crear(form);
      setShowNuevaReserva(false);
      setSuccessMsg("Reserva creada correctamente.");
      await cargarReservas();
    } catch {
      setFormError("Error al crear la reserva. Verifica los datos e intenta nuevamente.");
    } finally {
      setFormLoading(false);
    }
  }

  async function cancelarReserva() {
    if (!confirmCancel) return;
    setConfirmLoading(true);
    try {
      await reservasApi.cambiarEstado(confirmCancel, "CANCELADA");
      setConfirmCancel(null);
      setSuccessMsg("Reserva cancelada.");
      await cargarReservas();
    } catch {
      setError("No se pudo cancelar la reserva.");
      setConfirmCancel(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function hacerCheckin(idReserva: number) {
    try {
      await reservasApi.realizarCheckin(idReserva);
      setSuccessMsg("Check-in realizado correctamente.");
      await cargarReservas();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "No se pudo realizar el check-in.");
    }
  }

  async function registrarAdelanto() {
    if (!selectedId || !adelantoMonto || Number(adelantoMonto) <= 0) {
      setAdelantoError("Ingresa un monto válido.");
      return;
    }
    setAdelantoLoading(true);
    setAdelantoError(null);
    try {
      await reservasApi.registrarAdelanto(selectedId, {
        monto: Number(adelantoMonto),
        metodoPago: adelantoMetodo,
      });
      setShowAdelanto(false);
      setAdelantoMonto("");
      setSuccessMsg("Adelanto registrado. Reserva confirmada.");
      await cargarReservas();
    } catch {
      setAdelantoError("No se pudo registrar el adelanto.");
    } finally {
      setAdelantoLoading(false);
    }
  }

  const filtradas = useMemo(() => {
    return reservas
      .filter((r) => !hiddenCanceladas.includes(r.idReserva))
      .filter((r) => {
        if (activeFilters.length === 0) return r.estadoReserva !== "CANCELADA";
        return activeFilters.includes(r.estadoReserva);
      })
      .filter((r) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        const nombre = `${r.cliente.nombres} ${r.cliente.apellidos}`.toLowerCase();
        return (
          nombre.includes(q) ||
          r.cliente.numeroDocumento.includes(q) ||
          formatCodigo(r.idReserva).toLowerCase().includes(q) ||
          r.habitacion.numero.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (activeFilters.length > 0) return 0;
        if (a.estadoReserva === "CANCELADA" && b.estadoReserva !== "CANCELADA") return 1;
        if (a.estadoReserva !== "CANCELADA" && b.estadoReserva === "CANCELADA") return -1;
        return 0;
      });
  }, [reservas, activeFilters, searchTerm, hiddenCanceladas]);

  const selectedReserva = reservas.find((r) => r.idReserva === selectedId);

  const kpiTotal = reservas.filter((r) => !["CANCELADA", "COMPLETADA"].includes(r.estadoReserva)).length;
  const kpiConfirmadas = reservas.filter((r) => r.estadoReserva === "CONFIRMADA").length;
  const kpiPendiente = reservas.filter((r) => r.estadoReserva === "PENDIENTE_ADELANTO").length;

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Recepción &gt; Reservas
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Gestión de Reservas</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Registro, seguimiento y gestión de reservas del hostel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<Download size={13} />}
            onClick={() => {
              const header = "Código,Huésped,Documento,Habitación,Tipo,Check-in,Check-out,Noches,Monto,Canal,Estado";
              const rows = filtradas.map((r) =>
                [
                  formatCodigo(r.idReserva),
                  `${r.cliente.nombres} ${r.cliente.apellidos}`,
                  `${r.cliente.tipoDocumento} ${r.cliente.numeroDocumento}`,
                  `Hab. ${r.habitacion.numero}`,
                  r.habitacion.tipoHabitacion.nombre,
                  formatFecha(r.fechaCheckinPrevisto),
                  formatFecha(r.fechaCheckoutPrevisto),
                  r.numNoches,
                  Number(r.montoAlojamientoTotal).toFixed(2),
                  canalLabel[r.canalReserva] ?? r.canalReserva,
                  estadoLabel[r.estadoReserva] ?? r.estadoReserva,
                ].join(",")
              );
              const BOM = "﻿";
              const csv = BOM + [header, ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "reservas.csv";
              a.click();
            }}
          >
            Exportar CSV
          </Button>
          <Button icon={<Plus size={13} />} onClick={abrirNuevaReserva}>
            Nueva Reserva
          </Button>
        </div>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} />}
      {error && <AlertBanner type="error" message={error} />}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard title="Reservas Activas" value={kpiTotal} subtitle="sin canceladas ni completadas" color="slate" />
        <KpiCard title="Confirmadas" value={kpiConfirmadas} subtitle="adelanto pagado, esperan check-in" color="blue" />
        <KpiCard title="Pendiente de Adelanto" value={kpiPendiente} subtitle="requieren pago de adelanto para confirmar" color="amber" />
      </div>

      {/* Búsqueda y filtros */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por código, huésped, DNI o habitación"
            className="flex-1 max-w-xs"
          />
          <FilterPills options={FILTER_OPTIONS} activeValues={activeFilters} onSelectMulti={setActiveFilters} />
        </div>
        <span className="text-[10px] text-slate-400">{filtradas.length} registros</span>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-12 gap-4">
        {/* Tabla */}
        <div className="col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <LoadingState />
          ) : filtradas.length === 0 ? (
            <EmptyState
              title="Sin reservas"
              description={searchTerm || activeFilters.includes("TODAS") === false ? "Cambia los filtros para ver resultados." : "Aún no hay reservas registradas."}
              action={<Button onClick={abrirNuevaReserva} icon={<Plus size={13} />}>Nueva Reserva</Button>}
            />
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                  <th className="p-3">Código</th>
                  <th className="p-3">Huésped</th>
                  <th className="p-3">Habitación</th>
                  <th className="p-3">Check-in</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r) => (
                  <tr
                    key={r.idReserva}
                    onClick={() => setSelectedId(r.idReserva)}
                    className={`border-b border-slate-100 cursor-pointer transition-colors ${
                      selectedId === r.idReserva ? "bg-emerald-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-3 font-mono font-semibold text-[11px] text-slate-700">
                      {formatCodigo(r.idReserva)}
                      <div className="text-[9px] text-slate-400 font-normal">{canalLabel[r.canalReserva]}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">{r.cliente.nombres} {r.cliente.apellidos}</div>
                      <div className="text-[10px] text-slate-400">{r.cliente.tipoDocumento} {r.cliente.numeroDocumento}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">Hab. {r.habitacion.numero}</div>
                      <div className="text-[10px] text-slate-400">{r.habitacion.tipoHabitacion.nombre}</div>
                    </td>
                    <td className="p-3 text-slate-600">{formatFecha(r.fechaCheckinPrevisto)}</td>
                    <td className="p-3">
                      <Badge variant={estadoReservaToVariant(r.estadoReserva)} label={estadoLabel[r.estadoReserva] ?? r.estadoReserva} />
                    </td>
                    <td className="p-3 flex gap-1">
                      {r.estadoReserva === "PENDIENTE_ADELANTO" && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setConfirmCancel(r.idReserva); }}
                        >
                          Cancelar
                        </Button>
                      )}
                      {r.estadoReserva === "CANCELADA" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={11} />}
                          onClick={(e) => { e.stopPropagation(); setConfirmBorrar(r.idReserva); }}
                          title="Borrar del historial"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Panel de detalle */}
        <div className="col-span-5 space-y-3">
          {selectedReserva ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Detalle de Reserva</p>
                  <h2 className="text-sm font-bold text-slate-900">{formatCodigo(selectedReserva.idReserva)}</h2>
                </div>
                <Badge
                  variant={estadoReservaToVariant(selectedReserva.estadoReserva)}
                  label={estadoLabel[selectedReserva.estadoReserva]}
                />
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0">Huésped</span>
                  <span className="font-semibold">{selectedReserva.cliente.nombres} {selectedReserva.cliente.apellidos}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0">Documento</span>
                  <span>{selectedReserva.cliente.tipoDocumento} {selectedReserva.cliente.numeroDocumento}</span>
                </div>
                {selectedReserva.cliente.telefono && (
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24 flex-shrink-0">Teléfono</span>
                    <span>{selectedReserva.cliente.telefono}</span>
                  </div>
                )}
                {selectedReserva.cliente.correo && (
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24 flex-shrink-0">Email</span>
                    <span className="truncate">{selectedReserva.cliente.correo}</span>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-2 space-y-2">
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24 flex-shrink-0">Habitación</span>
                    <span className="font-semibold">Hab. {selectedReserva.habitacion.numero} — {selectedReserva.habitacion.tipoHabitacion.nombre}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24 flex-shrink-0">Check-in</span>
                    <span>{formatFecha(selectedReserva.fechaCheckinPrevisto)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24 flex-shrink-0">Check-out</span>
                    <span>{formatFecha(selectedReserva.fechaCheckoutPrevisto)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24 flex-shrink-0">Noches</span>
                    <span>{selectedReserva.numNoches}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24 flex-shrink-0">Canal</span>
                    <span>{canalLabel[selectedReserva.canalReserva]}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 bg-slate-50 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800 text-sm">
                    <span>Total Alojamiento</span>
                    <span>S/ {Number(selectedReserva.montoAlojamientoTotal).toFixed(2)}</span>
                  </div>
                  {pagosReserva.length > 0 && (() => {
                    const totalAdelanto = pagosReserva.reduce((s, p) => s + Number(p.monto), 0);
                    const restante = Number(selectedReserva.montoAlojamientoTotal) - totalAdelanto;
                    return (
                      <>
                        <div className="flex justify-between text-emerald-700 text-[11px]">
                          <span>Adelanto pagado</span>
                          <span className="font-semibold">− S/ {totalAdelanto.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between font-bold text-[12px] border-t border-slate-200 pt-1 ${restante <= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                          <span>{restante <= 0 ? "Pagado completo" : "Restante a pagar"}</span>
                          <span>S/ {Math.abs(restante).toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                  {selectedReserva.estadoReserva === "CANCELADA" && (
                    <p className="text-[10px] text-slate-400 italic mt-1">
                      ℹ Las reservas canceladas se eliminan del historial después de 1 día.
                    </p>
                  )}
                </div>

                {selectedReserva.observaciones && (
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-slate-400 block mb-1">Observaciones</span>
                    <p className="text-slate-700 italic">{selectedReserva.observaciones}</p>
                  </div>
                )}

                {selectedReserva.estadoReserva === "PENDIENTE_ADELANTO" && (
                  <>
                    {showAdelanto ? (
                      <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                        <p className="text-[10px] font-bold text-amber-700 uppercase">Registrar Adelanto</p>
                        {adelantoError && <AlertBanner type="error" message={adelantoError} dismissible={false} />}
                        <div className="flex gap-2">
                          <select
                            className="border border-slate-300 rounded-md px-2 py-1 text-xs flex-1"
                            value={adelantoMetodo}
                            onChange={(e) => setAdelantoMetodo(e.target.value)}
                          >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TARJETA_POS">Tarjeta POS</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="PASARELA_ONLINE">Pasarela Online</option>
                          </select>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="Monto S/"
                            className="border border-slate-300 rounded-md px-2 py-1 text-xs w-28"
                            value={adelantoMonto}
                            onChange={(e) => setAdelantoMonto(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={registrarAdelanto} loading={adelantoLoading} className="flex-1 justify-center">
                            Confirmar pago
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowAdelanto(false)} className="flex-1 justify-center">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        icon={<CreditCard size={13} />}
                        className="w-full justify-center"
                        onClick={() => { setShowAdelanto(true); setAdelantoError(null); }}
                      >
                        Registrar Adelanto
                      </Button>
                    )}
                    {!showAdelanto && (
                      <Button
                        variant="success"
                        icon={<LogIn size={13} />}
                        className="w-full justify-center"
                        onClick={() => hacerCheckin(selectedReserva.idReserva)}
                      >
                        Check-In
                      </Button>
                    )}
                  </>
                )}

                {selectedReserva.estadoReserva === "CONFIRMADA" && (
                  <Button
                    variant="success"
                    icon={<LogIn size={13} />}
                    className="w-full justify-center"
                    onClick={() => hacerCheckin(selectedReserva.idReserva)}
                  >
                    Check-In
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-xs text-slate-400">Selecciona una reserva para ver el detalle</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Reserva */}
      <FormModal
        open={showNuevaReserva}
        title="Nueva Reserva"
        subtitle="Registra una reserva presencial en el counter"
        submitLabel="Crear Reserva"
        loading={formLoading}
        onClose={() => setShowNuevaReserva(false)}
        onSubmit={crearReserva}
        size="md"
      >
        {formError && <AlertBanner type="error" message={formError} dismissible={false} />}

        <FormField label="Cliente" required>
          <Select
            value={form.idCliente || ""}
            onChange={(e) => setForm({ ...form, idCliente: Number(e.target.value) })}
          >
            <option value="">— Seleccionar cliente —</option>
            {clientes.map((c) => (
              <option key={c.idCliente} value={c.idCliente}>
                {c.nombres} {c.apellidos} ({c.tipoDocumento} {c.numeroDocumento})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Habitación disponible" required>
          <Select
            value={form.idHabitacion || ""}
            onChange={(e) => setForm({ ...form, idHabitacion: Number(e.target.value) })}
          >
            <option value="">— Seleccionar habitación —</option>
            {habitaciones.map((h) => (
              <option key={h.idHabitacion} value={h.idHabitacion}>
                Hab. {h.numero} — {h.tipoHabitacion.nombre} (S/ {h.tipoHabitacion.precioNoche}/noche)
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fecha Check-in" required>
            <Input
              type="date"
              value={form.fechaCheckinPrevisto}
              onChange={(e) => setForm({ ...form, fechaCheckinPrevisto: e.target.value })}
            />
          </FormField>
          <FormField label="Fecha Check-out" required>
            <Input
              type="date"
              value={form.fechaCheckoutPrevisto}
              onChange={(e) => setForm({ ...form, fechaCheckoutPrevisto: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Canal">
          <Select
            value={form.canalReserva}
            onChange={(e) => setForm({ ...form, canalReserva: e.target.value as "ONLINE" | "PRESENCIAL" })}
          >
            <option value="PRESENCIAL">Mostrador (Presencial)</option>
            <option value="ONLINE">En Línea</option>
          </Select>
        </FormField>

        <FormField label="Observaciones">
          <Input
            type="text"
            value={form.observaciones}
            placeholder="Notas adicionales (opcional)"
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          />
        </FormField>
      </FormModal>

      {/* Modal Confirmar Cancelación */}
      <ConfirmModal
        open={!!confirmCancel}
        title="Cancelar reserva"
        message={`¿Confirmas la cancelación de ${confirmCancel ? formatCodigo(confirmCancel) : ""}? Esta acción no puede deshacerse.`}
        confirmLabel="Sí, cancelar"
        loading={confirmLoading}
        onConfirm={cancelarReserva}
        onCancel={() => setConfirmCancel(null)}
      />

      {/* Modal Borrar del historial */}
      <ConfirmModal
        open={!!confirmBorrar}
        title="Borrar del historial"
        message="¿Deseas ocultar esta reserva cancelada del historial? Las reservas canceladas se eliminan automáticamente después de 1 día."
        confirmLabel="Sí, borrar"
        variant="danger"
        onConfirm={() => {
          if (confirmBorrar) {
            setHiddenCanceladas((prev) => [...prev, confirmBorrar]);
            if (selectedId === confirmBorrar) setSelectedId(null);
          }
          setConfirmBorrar(null);
        }}
        onCancel={() => setConfirmBorrar(null)}
      />

      {/* Modal Nuevo Ingreso (walk-in rápido con búsqueda DNI) */}
      <NuevoIngresoModal
        open={showNuevoIngreso}
        onClose={() => setShowNuevoIngreso(false)}
        onSuccess={async () => {
          setSuccessMsg("Ingreso registrado correctamente.");
          await cargarReservas();
        }}
      />
    </div>
  );
}
