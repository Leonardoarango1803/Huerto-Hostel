import { useState, useEffect, useRef } from "react";
import { X, CheckCircle, UserPlus, AlertCircle, LogIn } from "lucide-react";
import { clientesApi } from "../api/clientes";
import { habitacionesApi } from "../api/habitaciones";
import { reservasApi } from "../api/reservas";
import { consultarDni } from "../api/decolecta";
import type { Cliente, Habitacion, NuevoClienteRequest } from "../api/types";
import { AlertBanner, FormField, Input, Select } from "./ui";
import { Button } from "./ui/Button";

type ClienteStatus = "idle" | "searching" | "found-db" | "found-reniec" | "not-found";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function NuevoIngresoModal({ open, onClose, onSuccess }: Props) {
  const [paso, setPaso] = useState<1 | 2>(1);

  // Paso 1
  const [dni, setDni] = useState("");
  const [clienteStatus, setClienteStatus] = useState<ClienteStatus>("idle");
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null);
  const [datosCliente, setDatosCliente] = useState<Partial<NuevoClienteRequest>>({
    tipoDocumento: "DNI",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    nacionalidad: "Peruana",
  });
  const searchRef = useRef("");

  // Paso 2
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [idHabitacion, setIdHabitacion] = useState(0);
  const [fechaCheckin, setFechaCheckin] = useState(getToday());
  const [fechaCheckout, setFechaCheckout] = useState(getTomorrow());
  const [checkinInmediato, setCheckinInmediato] = useState(false);

  // General
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPaso(1);
    setDni("");
    setClienteStatus("idle");
    setClienteEncontrado(null);
    setDatosCliente({ tipoDocumento: "DNI", nombres: "", apellidos: "", correo: "", telefono: "", nacionalidad: "Peruana" });
    setIdHabitacion(0);
    setFechaCheckin(getToday());
    setFechaCheckout(getTomorrow());
    setCheckinInmediato(false);
    setError(null);
    habitacionesApi.listar("DISPONIBLE").then(setHabitaciones).catch(() => setHabitaciones([]));
  }, [open]);

  useEffect(() => {
    if (dni.length !== 8) {
      setClienteStatus("idle");
      setClienteEncontrado(null);
      setDatosCliente((p) => ({ ...p, nombres: "", apellidos: "" }));
      return;
    }

    setClienteStatus("searching");
    const current = dni;
    searchRef.current = current;

    Promise.all([
      clientesApi.buscarPorDocumento(current).catch(() => null),
      consultarDni(current).catch(() => null),
    ]).then(([enBD, enReniec]) => {
      if (searchRef.current !== current) return;
      if (enBD) {
        setClienteStatus("found-db");
        setClienteEncontrado(enBD);
      } else if (enReniec) {
        setClienteStatus("found-reniec");
        setClienteEncontrado(null);
        setDatosCliente((p) => ({
          ...p,
          numeroDocumento: current,
          nombres: enReniec.first_name,
          apellidos: `${enReniec.first_last_name} ${enReniec.second_last_name}`.trim(),
        }));
      } else {
        setClienteStatus("not-found");
        setClienteEncontrado(null);
        setDatosCliente((p) => ({ ...p, numeroDocumento: current, nombres: "", apellidos: "" }));
      }
    });
  }, [dni]);

  function puedeAvanzar() {
    if (clienteStatus === "found-db") return true;
    if (
      (clienteStatus === "found-reniec" || clienteStatus === "not-found") &&
      datosCliente.nombres?.trim() &&
      datosCliente.apellidos?.trim()
    )
      return true;
    return false;
  }

  async function confirmar() {
    if (!idHabitacion || !fechaCheckin || !fechaCheckout) {
      setError("Selecciona una habitación y las fechas.");
      return;
    }
    if (fechaCheckout <= fechaCheckin) {
      setError("La fecha de check-out debe ser posterior al check-in.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let idCliente: number;

      if (clienteStatus === "found-db" && clienteEncontrado) {
        idCliente = clienteEncontrado.idCliente;
      } else {
        const nuevo = await clientesApi.crear({
          tipoDocumento: "DNI",
          numeroDocumento: dni,
          nombres: datosCliente.nombres!,
          apellidos: datosCliente.apellidos!,
          correo: datosCliente.correo || undefined,
          telefono: datosCliente.telefono || undefined,
          nacionalidad: datosCliente.nacionalidad || "Peruana",
        });
        idCliente = nuevo.idCliente;
      }

      const reserva = await reservasApi.crear({
        idCliente,
        idHabitacion,
        fechaCheckinPrevisto: fechaCheckin,
        fechaCheckoutPrevisto: fechaCheckout,
        canalReserva: "PRESENCIAL",
      });

      if (checkinInmediato) {
        await reservasApi.realizarCheckin(reserva.idReserva);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Ocurrió un error. Verifica los datos e intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const showManualFields = clienteStatus === "found-reniec" || clienteStatus === "not-found";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Nuevo Ingreso</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {paso === 1 ? "Paso 1 de 2 — Identificar al huésped" : "Paso 2 de 2 — Asignar habitación"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4">
            <X size={16} />
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="flex px-4 pt-3 gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-emerald-500" />
          <div className={`h-1 flex-1 rounded-full transition-colors ${paso === 2 ? "bg-emerald-500" : "bg-slate-200"}`} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <AlertBanner type="error" message={error} dismissible={false} />}

          {paso === 1 && (
            <>
              <FormField label="Número de DNI" required hint="Al ingresar 8 dígitos se consulta automáticamente">
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Ej. 12345678"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  />
                  {clienteStatus === "searching" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </FormField>

              {clienteStatus === "found-db" && clienteEncontrado && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                  <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">Huésped ya registrado</p>
                    <p className="text-[11px] text-emerald-700">
                      {clienteEncontrado.nombres} {clienteEncontrado.apellidos}
                    </p>
                  </div>
                </div>
              )}

              {clienteStatus === "found-reniec" && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                  <UserPlus size={14} className="text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800">Nuevo — datos pre-llenados desde RENIEC</p>
                    <p className="text-[11px] text-blue-700">
                      {datosCliente.nombres} {datosCliente.apellidos}
                    </p>
                  </div>
                </div>
              )}

              {clienteStatus === "not-found" && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800">DNI no encontrado — ingresa los datos manualmente.</p>
                </div>
              )}

              {showManualFields && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Nombres" required>
                      <Input
                        value={datosCliente.nombres ?? ""}
                        placeholder="Nombres"
                        onChange={(e) => setDatosCliente((p) => ({ ...p, nombres: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Apellidos" required>
                      <Input
                        value={datosCliente.apellidos ?? ""}
                        placeholder="Apellidos"
                        onChange={(e) => setDatosCliente((p) => ({ ...p, apellidos: e.target.value }))}
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Teléfono">
                      <Input
                        value={datosCliente.telefono ?? ""}
                        placeholder="Opcional"
                        onChange={(e) => setDatosCliente((p) => ({ ...p, telefono: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Email">
                      <Input
                        type="email"
                        value={datosCliente.correo ?? ""}
                        placeholder="Opcional"
                        onChange={(e) => setDatosCliente((p) => ({ ...p, correo: e.target.value }))}
                      />
                    </FormField>
                  </div>
                </>
              )}
            </>
          )}

          {paso === 2 && (
            <>
              <FormField label="Habitación disponible" required>
                <Select
                  value={idHabitacion || ""}
                  onChange={(e) => setIdHabitacion(Number(e.target.value))}
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
                    value={fechaCheckin}
                    onChange={(e) => {
                      setFechaCheckin(e.target.value);
                      setCheckinInmediato(false);
                    }}
                  />
                </FormField>
                <FormField label="Fecha Check-out" required>
                  <Input
                    type="date"
                    value={fechaCheckout}
                    onChange={(e) => setFechaCheckout(e.target.value)}
                  />
                </FormField>
              </div>

              {fechaCheckin === getToday() && (
                <label className="flex items-start gap-2.5 cursor-pointer bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={checkinInmediato}
                    onChange={(e) => setCheckinInmediato(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                      <LogIn size={12} /> Check-in inmediato
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      El huésped entra a la habitación ahora mismo.
                    </p>
                  </div>
                </label>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-2 p-4 border-t border-slate-200">
          {paso === 1 ? (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" disabled={!puedeAvanzar()} onClick={() => { setError(null); setPaso(2); }}>
                Continuar →
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => { setError(null); setPaso(1); }}>
                ← Atrás
              </Button>
              <Button variant="primary" loading={loading} onClick={confirmar}>
                {checkinInmediato ? "Confirmar y hacer Check-in" : "Confirmar Asignación"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
