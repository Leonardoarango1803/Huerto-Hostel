import { useState, useEffect } from "react";
import { CreditCard, Search, CheckCircle, AlertCircle, DollarSign } from "lucide-react";
import api from "../api/axiosConfig";

interface Estadia {
  idEstadia: number;
  estadoEstadia: string;
  fechaCheckinReal: string;
  habitacion?: { numero: string };
  reserva?: {
    idReserva: number;
    cliente?: { nombres: string; apellidos: string };
    montoAlojamientoTotal: number;
  };
}

interface SaldoResponse {
  saldoPendiente: number;
}

interface Pago {
  idPago: number;
  monto: number;
  metodoPago: string;
  concepto: string;
  fechaPago: string;
  numTransaccionComprobante?: string;
}

const METODOS_PAGO = ["EFECTIVO", "TARJETA_POS", "PASARELA_ONLINE", "TRANSFERENCIA"];
const CONCEPTOS_PAGO = ["ADELANTO_RESERVA", "PAGO_PARCIAL_ESTADIA", "LIQUIDACION_CHECKOUT"];

export function PagosView() {
  const [estadias, setEstadias] = useState<Estadia[]>([]);
  const [selectedEstadia, setSelectedEstadia] = useState<Estadia | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    monto: "",
    metodoPago: "EFECTIVO",
    conceptoPago: "PAGO_PARCIAL_ESTADIA",
    numTransaccionComprobante: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    api.get<Estadia[]>("/api/v1/estadias?estado=EN_CURSO")
      .then((res) => setEstadias(res.data))
      .catch(() => setMensaje({ tipo: "error", texto: "Error al cargar estadías activas." }))
      .finally(() => setLoading(false));
  }, []);

  const seleccionarEstadia = async (e: Estadia) => {
    setSelectedEstadia(e);
    setSaldo(null);
    setPagos([]);
    setMensaje(null);
    setLoadingSaldo(true);
    try {
      const [saldoRes, pagosRes] = await Promise.all([
        api.get<SaldoResponse>(`/api/v1/estadias/${e.idEstadia}/saldo`),
        api.get<Pago[]>(`/api/v1/reservas/${e.reserva?.idReserva}/pagos`),
      ]);
      setSaldo(saldoRes.data.saldoPendiente);
      setPagos(pagosRes.data);
    } catch {
      setMensaje({ tipo: "error", texto: "Error al cargar saldo o pagos." });
    } finally {
      setLoadingSaldo(false);
    }
  };

  const registrarPago = async () => {
    if (!selectedEstadia || !form.monto) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const payload = {
        estadia: { idEstadia: selectedEstadia.idEstadia },
        reserva: selectedEstadia.reserva?.idReserva
          ? { idReserva: selectedEstadia.reserva.idReserva }
          : undefined,
        monto: parseFloat(form.monto),
        metodoPago: form.metodoPago,
        concepto: form.conceptoPago,
        numTransaccionComprobante: form.numTransaccionComprobante || null,
      };
      const res = await api.post<Pago>("/api/v1/pagos", payload);
      setPagos((prev) => [...prev, res.data]);
      setMensaje({ tipo: "ok", texto: `Pago registrado: S/ ${parseFloat(form.monto).toFixed(2)} en ${form.metodoPago}` });
      setForm((f) => ({ ...f, monto: "", numTransaccionComprobante: "" }));
      // Actualizar saldo
      const saldoRes = await api.get<SaldoResponse>(`/api/v1/estadias/${selectedEstadia.idEstadia}/saldo`);
      setSaldo(saldoRes.data.saldoPendiente);
    } catch {
      setMensaje({ tipo: "error", texto: "Error al registrar el pago." });
    } finally {
      setGuardando(false);
    }
  };

  const estadiasFiltradas = estadias.filter(
    (e) =>
      searchTerm === "" ||
      e.habitacion?.numero?.includes(searchTerm) ||
      String(e.idEstadia).includes(searchTerm) ||
      e.reserva?.cliente?.nombres?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPagos = pagos.reduce((s, p) => s + p.monto, 0);

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">Recepción › Pagos</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Registro de Pagos</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Registra pagos parciales, anticipos y liquidaciones de estadías activas.
        </p>
      </div>

      {mensaje && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
            mensaje.tipo === "ok"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          {mensaje.tipo === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Lista de estadías */}
        <div className="col-span-4 space-y-3">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Search size={13} className="text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar estadía..."
              className="flex-1 text-xs focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-2.5 border-b border-slate-100">
              <span className="font-bold text-slate-700 text-xs">Estadías en curso</span>
            </div>
            {loading ? (
              <p className="p-4 text-center text-slate-400 text-xs">Cargando...</p>
            ) : estadiasFiltradas.length === 0 ? (
              <p className="p-4 text-center text-slate-400 text-xs">No hay estadías activas.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {estadiasFiltradas.map((e) => (
                  <button
                    key={e.idEstadia}
                    onClick={() => seleccionarEstadia(e)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                      selectedEstadia?.idEstadia === e.idEstadia ? "bg-emerald-50/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 text-[11px]">
                        Estadía #{e.idEstadia}
                      </span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        EN CURSO
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">Hab. {e.habitacion?.numero ?? "—"}</p>
                    <p className="text-slate-400 text-[10px]">
                      {e.reserva?.cliente
                        ? `${e.reserva.cliente.nombres} ${e.reserva.cliente.apellidos}`
                        : "—"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel de pagos */}
        <div className="col-span-8 space-y-4">
          {!selectedEstadia ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Selecciona una estadía para registrar pagos.</p>
            </div>
          ) : (
            <>
              {/* Saldo actual */}
              <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${
                saldo != null && saldo <= 0
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-amber-50 border-amber-300"
              }`}>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Saldo pendiente — Estadía #{selectedEstadia.idEstadia}
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    {selectedEstadia.reserva?.cliente
                      ? `${selectedEstadia.reserva.cliente.nombres} ${selectedEstadia.reserva.cliente.apellidos}`
                      : ""}{" "}
                    · Hab. {selectedEstadia.habitacion?.numero ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  {loadingSaldo ? (
                    <p className="text-slate-400 text-xs">Calculando...</p>
                  ) : (
                    <>
                      <p className={`text-2xl font-bold ${saldo != null && saldo <= 0 ? "text-emerald-700" : "text-amber-800"}`}>
                        S/ {saldo != null ? Math.abs(saldo).toFixed(2) : "—"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {saldo != null && saldo <= 0 ? "Liquidado" : "Por cobrar"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Formulario nuevo pago */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <DollarSign size={13} className="text-emerald-700" /> Registrar pago presencial
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Monto (S/)</label>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={form.monto}
                      onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                      placeholder="0.00"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Método</label>
                    <select
                      value={form.metodoPago}
                      onChange={(e) => setForm((f) => ({ ...f, metodoPago: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      {METODOS_PAGO.map((m) => (
                        <option key={m} value={m}>{m.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Concepto</label>
                    <select
                      value={form.conceptoPago}
                      onChange={(e) => setForm((f) => ({ ...f, conceptoPago: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      {CONCEPTOS_PAGO.map((c) => (
                        <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                      N° Transacción / Boleta (opcional)
                    </label>
                    <input
                      type="text"
                      value={form.numTransaccionComprobante}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, numTransaccionComprobante: e.target.value }))
                      }
                      placeholder="B01-449, YPE-00123..."
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
                <button
                  onClick={registrarPago}
                  disabled={!form.monto || parseFloat(form.monto) <= 0 || guardando}
                  className="bg-[#1b4332] hover:bg-[#143427] disabled:bg-slate-300 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
                >
                  <CheckCircle size={12} />
                  {guardando ? "Registrando..." : "Confirmar pago"}
                </button>
              </div>

              {/* Historial de pagos */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-xs">
                    Pagos registrados ({pagos.length})
                  </span>
                  {pagos.length > 0 && (
                    <span className="text-[11px] font-bold text-slate-800">
                      Total recibido: S/ {totalPagos.toFixed(2)}
                    </span>
                  )}
                </div>
                {pagos.length === 0 ? (
                  <p className="p-4 text-center text-slate-400 text-xs">Sin pagos registrados aún.</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Concepto</th>
                        <th className="p-3">Método</th>
                        <th className="p-3">Comprobante</th>
                        <th className="p-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagos.map((p) => (
                        <tr key={p.idPago} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500">
                            {p.fechaPago ? p.fechaPago.slice(0, 16).replace("T", " ") : "—"}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                              {p.concepto?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {p.metodoPago?.replace("_", " ")}
                          </td>
                          <td className="p-3 text-slate-400">
                            {p.numTransaccionComprobante ?? "—"}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            S/ {p.monto?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
