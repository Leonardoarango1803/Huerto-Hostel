import { useState, useEffect, useMemo } from "react";
import { FileText, Check, DoorOpen, BedDouble, Sun, AlertCircle } from "lucide-react";
import { estadiasApi } from "../api/estadias";
import { reservasApi } from "../api/reservas";
import { useAuth } from "../context/AuthContext";
import type { Estadia, SaldoResponse, ResumenCheckout, PagoReserva } from "../api/types";
import {
  Button,
  Badge,
  SearchBar,
  KpiCard,
  LoadingState,
  EmptyState,
  AlertBanner,
  ConfirmModal,
  FormModal,
  FormField,
  Input,
  Select,
  estadoEstadiaToVariant,
} from "../components/ui";

interface CheckoutForm {
  metodoPago: string;
  monto: string;
}

function formatFecha(fecha?: string) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CheckoutView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMINISTRADOR";
  const [estadias, setEstadias] = useState<Estadia[]>([]);
  const [resumen, setResumen] = useState<ResumenCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [saldoDetalle, setSaldoDetalle] = useState<SaldoResponse | null>(null);
  const [saldoLoading, setSaldoLoading] = useState(false);
  const [_pagosAdelanto, setPagosAdelanto] = useState<PagoReserva[]>([]);

  const [showLiquidacion, setShowLiquidacion] = useState(false);
  const [liquidacionLoading, setLiquidacionLoading] = useState(false);
  const [liquidacionError, setLiquidacionError] = useState<string | null>(null);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({ metodoPago: "EFECTIVO", monto: "" });

  const [confirmExpresa, setConfirmExpresa] = useState<number | null>(null);
  const [expresaLoading, setExpresaLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setError(null);
    try {
      const [ests] = await Promise.all([
        estadiasApi.listar("EN_CURSO"),
        estadiasApi.resumenCheckout().then(setResumen).catch(() => null),
      ]);
      setEstadias(ests);
      if (ests.length > 0) setSelectedId(ests[0].idEstadia);
    } catch {
      setError("No se pudieron cargar las estadías activas. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedId) cargarSaldo(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const estadia = estadias.find((e) => e.idEstadia === selectedId);
    const idReserva = estadia?.reserva.idReserva;
    if (!idReserva) { setPagosAdelanto([]); return; }
    reservasApi.listarPagos(idReserva)
      .then((p) => setPagosAdelanto(Array.isArray(p) ? p : []))
      .catch(() => setPagosAdelanto([]));
  }, [selectedId, estadias]);

  async function cargarSaldo(id: number) {
    setSaldoLoading(true);
    setSaldoDetalle(null);
    try {
      const saldo = await estadiasApi.saldo(id);
      setSaldoDetalle(saldo);
    } catch {
      /* saldo no disponible */
    } finally {
      setSaldoLoading(false);
    }
  }

  async function procesarCheckoutExpresa() {
    if (!confirmExpresa) return;
    setExpresaLoading(true);
    try {
      await estadiasApi.checkout(confirmExpresa);
      setConfirmExpresa(null);
      setSuccessMsg("Check-out realizado correctamente. Habitación enviada a limpieza.");
      setSelectedId(null);
      setSaldoDetalle(null);
      await cargarDatos();
    } catch {
      setError("Error al procesar el check-out.");
      setConfirmExpresa(null);
    } finally {
      setExpresaLoading(false);
    }
  }

  async function procesarLiquidacion() {
    if (!selectedId) return;
    const monto = parseFloat(checkoutForm.monto);
    if (isNaN(monto) || monto < 0) {
      setLiquidacionError("Ingresa un monto válido.");
      return;
    }
    setLiquidacionLoading(true);
    setLiquidacionError(null);
    try {
      const pagoBody = monto > 0
        ? { metodoPago: checkoutForm.metodoPago, monto, concepto: "LIQUIDACION_CHECKOUT" }
        : undefined;
      await estadiasApi.checkout(selectedId, pagoBody);
      setShowLiquidacion(false);
      setSuccessMsg("Liquidación y check-out completados. Habitación enviada a limpieza.");
      setSelectedId(null);
      setSaldoDetalle(null);
      await cargarDatos();
    } catch {
      setLiquidacionError("Error al procesar la liquidación. Verifica el saldo e intenta nuevamente.");
    } finally {
      setLiquidacionLoading(false);
    }
  }

  const filtradas = useMemo(() => {
    if (!searchTerm) return estadias;
    const q = searchTerm.toLowerCase();
    return estadias.filter((e) => {
      const nombre = `${e.reserva.cliente.nombres} ${e.reserva.cliente.apellidos}`.toLowerCase();
      return (
        nombre.includes(q) ||
        e.reserva.cliente.numeroDocumento.includes(q) ||
        e.habitacion.numero.toLowerCase().includes(q)
      );
    });
  }, [estadias, searchTerm]);

  const selectedEstadia = estadias.find((e) => e.idEstadia === selectedId);

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Recepción &gt; Check-out
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Salidas y Check-out del Día</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Supervisión de salidas, verificación de folios y liquidación de estadías.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<FileText size={13} />}>
            Reporte de Salidas
          </Button>
        </div>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} />}
      {error && <AlertBanner type="error" message={error} />}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          title="Salidas Programadas"
          value={resumen?.salidaHoy ?? estadias.length}
          subtitle="hoy"
          icon={<DoorOpen size={16} />}
          color="slate"
        />
        <KpiCard
          title="Pendiente de Cobro"
          value={resumen ? `S/ ${Number(resumen.pendienteCobro).toFixed(2)}` : "—"}
          subtitle="folios con saldo"
          icon={<AlertCircle size={16} />}
          color="amber"
        />
        <KpiCard
          title="Liquidado Hoy"
          value={resumen ? `S/ ${Number(resumen.liquidadoHoy).toFixed(2)}` : "—"}
          subtitle="check-outs completados"
          icon={<Check size={16} />}
          color="green"
        />
        <KpiCard
          title="A Limpieza"
          value={resumen?.aCuartoLimpieza ?? "—"}
          subtitle="habitaciones"
          icon={<Sun size={16} />}
          color="blue"
        />
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-12 gap-4">
        {/* Lista estadías */}
        <div className="col-span-7 space-y-3">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por huésped, DNI o habitación"
              className="flex-1"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <LoadingState />
            ) : filtradas.length === 0 ? (
              <EmptyState
                title="Sin estadías activas"
                description="No hay estadías EN_CURSO en este momento."
                icon={<BedDouble size={28} className="text-slate-300" />}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {filtradas.map((e) => {
                  const saldo = Number(e.reserva.montoAlojamientoTotal);
                  const isSelected = selectedId === e.idEstadia;
                  return (
                    <div
                      key={e.idEstadia}
                      onClick={() => setSelectedId(e.idEstadia)}
                      className={`p-3 cursor-pointer transition-colors ${isSelected ? "bg-emerald-50 border-l-4 border-[#1b4332]" : "hover:bg-slate-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {e.reserva.cliente.nombres} {e.reserva.cliente.apellidos}
                            </span>
                            <Badge variant={estadoEstadiaToVariant(e.estadoEstadia)} label="En curso" />
                          </div>
                          <div className="text-[10px] text-slate-500 flex gap-3 mt-0.5 flex-wrap">
                            <span>Hab. {e.habitacion.numero} — {e.habitacion.tipoHabitacion.nombre}</span>
                            <span>{e.reserva.cliente.tipoDocumento} {e.reserva.cliente.numeroDocumento}</span>
                            <span>Check-in: {formatFecha(e.fechaCheckinReal)}</span>
                            <span>Salida prevista: {formatFecha(e.reserva.fechaCheckoutPrevisto)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-slate-900">S/ {saldo.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400">{e.reserva.numNoches} noches</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel de detalle */}
        <div className="col-span-5 space-y-3">
          {selectedEstadia ? (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Folio de Estadía</p>
                  <h2 className="text-sm font-bold text-slate-900">
                    {selectedEstadia.reserva.cliente.nombres} {selectedEstadia.reserva.cliente.apellidos}
                  </h2>
                  <p className="text-[11px] text-slate-500">Hab. {selectedEstadia.habitacion.numero} · {selectedEstadia.habitacion.tipoHabitacion.nombre}</p>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24">Check-in real</span>
                    <span>{formatFecha(selectedEstadia.fechaCheckinReal)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24">Salida prevista</span>
                    <span>{formatFecha(selectedEstadia.reserva.fechaCheckoutPrevisto)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-24">Noches</span>
                    <span>{selectedEstadia.reserva.numNoches}</span>
                  </div>
                </div>

                {saldoLoading ? (
                  <div className="h-24 bg-slate-100 animate-pulse rounded-lg" />
                ) : saldoDetalle ? (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                    <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Resumen de Folio</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Alojamiento</span>
                        <span className="font-semibold">S/ {Number(saldoDetalle.totalAlojamiento).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Consumo Total</span>
                        <span className="font-semibold">S/ {Number(saldoDetalle.totalConsumos).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-semibold text-slate-700">
                        <span>Total</span>
                        <span>S/ {(Number(saldoDetalle.totalAlojamiento) + Number(saldoDetalle.totalConsumos)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Adelanto de Pagos</span>
                        <span className="font-semibold">− S/ {Number(saldoDetalle.totalPagos).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className={`flex justify-between font-bold text-sm border-t pt-2 ${saldoDetalle.saldoPendiente <= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      <span>{saldoDetalle.saldoPendiente <= 0 ? "Saldo pagado" : "Saldo pendiente"}</span>
                      <span>S/ {Math.abs(Number(saldoDetalle.saldoPendiente)).toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-3 text-center text-[11px] text-slate-400">
                    Saldo no disponible
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {saldoDetalle && saldoDetalle.saldoPendiente <= 0 ? (
                  <Button
                    variant="success"
                    icon={<Check size={13} />}
                    className="w-full justify-center"
                    onClick={() => setConfirmExpresa(selectedEstadia.idEstadia)}
                  >
                    Salida Expresa (Saldo Pagado)
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    icon={<DoorOpen size={13} />}
                    className="w-full justify-center"
                    onClick={() => {
                      setCheckoutForm({ metodoPago: "EFECTIVO", monto: saldoDetalle ? String(saldoDetalle.saldoPendiente.toFixed(2)) : "" });
                      setLiquidacionError(null);
                      setShowLiquidacion(true);
                    }}
                  >
                    Procesar Liquidación y Salida
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-slate-500"
                    onClick={() => setConfirmExpresa(selectedEstadia.idEstadia)}
                  >
                    Forzar Check-out sin pago
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-xs text-slate-400">Selecciona una estadía para ver el folio y procesar la salida</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Liquidación */}
      <FormModal
        open={showLiquidacion}
        title="Liquidación y Check-out"
        subtitle={`${selectedEstadia?.reserva.cliente.nombres ?? ""} — Hab. ${selectedEstadia?.habitacion.numero ?? ""}`}
        submitLabel="Confirmar Pago y Check-out"
        loading={liquidacionLoading}
        onClose={() => setShowLiquidacion(false)}
        onSubmit={procesarLiquidacion}
        size="sm"
      >
        {liquidacionError && <AlertBanner type="error" message={liquidacionError} dismissible={false} />}
        {saldoDetalle && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs mb-1">
            <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Resumen de Folio</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Alojamiento</span>
                <span className="font-semibold">S/ {Number(saldoDetalle.totalAlojamiento).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Consumo Total</span>
                <span className="font-semibold">S/ {Number(saldoDetalle.totalConsumos).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-semibold text-slate-700">
                <span>Total</span>
                <span>S/ {(Number(saldoDetalle.totalAlojamiento) + Number(saldoDetalle.totalConsumos)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Adelanto de Pagos</span>
                <span className="font-semibold">− S/ {Number(saldoDetalle.totalPagos).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-sm border-t pt-2 text-red-700">
              <span>Saldo pendiente a cobrar</span>
              <span>S/ {Number(saldoDetalle.saldoPendiente).toFixed(2)}</span>
            </div>
          </div>
        )}
        <FormField label="Método de pago" required>
          <Select
            value={checkoutForm.metodoPago}
            onChange={(e) => setCheckoutForm({ ...checkoutForm, metodoPago: e.target.value })}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA_POS">Tarjeta POS</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="PASARELA_ONLINE">Pasarela Online</option>
          </Select>
        </FormField>
        <FormField label="Monto a cobrar (S/)" required>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={checkoutForm.monto}
            onChange={(e) => setCheckoutForm({ ...checkoutForm, monto: e.target.value })}
            placeholder="0.00"
          />
        </FormField>
      </FormModal>

      {/* Confirm Salida Expresa */}
      <ConfirmModal
        open={!!confirmExpresa}
        title="Confirmar Check-out"
        message="¿Confirmas la salida? La habitación pasará a estado 'Pendiente Limpieza'."
        confirmLabel="Confirmar Salida"
        variant="primary"
        loading={expresaLoading}
        onConfirm={procesarCheckoutExpresa}
        onCancel={() => setConfirmExpresa(null)}
      />
    </div>
  );
}
