import { useState, useEffect, useMemo } from "react";
import { FileText, Check, DoorOpen, BedDouble, Sun, AlertCircle, ReceiptText, Clock } from "lucide-react";
import { estadiasApi } from "../api/estadias";
import { comprobanteApi, type ComprobanteEstadia } from "../api/comprobante";
import { useAuth } from "../context/AuthContext";
import { useCaja } from "../context/CajaContext";
import { useIncidenciasPorHabitacion } from "../hooks/useIncidenciasPorHabitacion";
import { exportarCsv } from "../utils/csv";
import { fechaDMA, hoyISO } from "../utils/fechas";
import type { Estadia, SaldoResponse, ResumenCheckout } from "../api/types";
import { ComprobanteModal } from "./checkout/ComprobanteModal";
import { HistorialComprobantes } from "./checkout/HistorialComprobantes";
import { SalidaModal } from "./checkout/SalidaModal";
import {
  Button,
  Badge,
  SearchBar,
  KpiCard,
  LoadingState,
  EmptyState,
  AlertBanner,
  estadoEstadiaToVariant,
} from "../components/ui";

/** Lo que de verdad paso con la habitacion al salir el huesped (con una incidencia abierta que la bloquea, no va a limpieza). */
function destinoDeLaHabitacion(estadia?: Estadia): string {
  return estadia?.habitacion?.estadoOperativo === "MANTENIMIENTO"
    ? "La habitación quedó en mantenimiento porque tiene una incidencia abierta que la bloquea."
    : "Habitación enviada a limpieza.";
}

const formatFecha = (fecha?: string) => fechaDMA(fecha);

const soles = (n: number | string) => `S/ ${Math.abs(Number(n)).toFixed(2)}`;
const DIA_MS = 86400000;

/** Dias entre dos fechas AAAA-MM-DD (positivo si `hoy` es posterior a `prevista`). */
function diasEntre(prevista: string | undefined, hoy: string): number {
  if (!prevista) return 0;
  return Math.round((Date.parse(hoy) - Date.parse(prevista.slice(0, 10))) / DIA_MS);
}

/** Estado del dia de salida de una estadia: vence hoy, ya paso o aun le quedan dias. */
function EstadoDeSalida({ dias }: { dias: number }) {
  if (dias > 0) return <Badge variant="red" label={`Vencida hace ${dias} día${dias === 1 ? "" : "s"}`} />;
  if (dias === 0) return <Badge variant="amber" label="Sale hoy" />;
  return <span className="text-[10px] text-slate-400">Faltan {-dias} día{dias === -1 ? "" : "s"}</span>;
}

export function CheckoutView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMINISTRADOR";
  const { cajaCerrada, refrescar: refrescarCaja } = useCaja();
  const incidencias = useIncidenciasPorHabitacion();
  const [estadias, setEstadias] = useState<Estadia[]>([]);
  const [resumen, setResumen] = useState<ResumenCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Dia de hoy (AAAA-MM-DD) fijado al abrir la pantalla: referencia para "vence hoy" y "vencida".
  const [hoy] = useState(() => hoyISO());

  // Folio de la estadia seleccionada (saldo y detalle). Se descarta solo si cambia la seleccion: no hace falta limpiarlo.
  const [folio, setFolio] = useState<{ id: number; saldo: SaldoResponse | null; detalle: ComprobanteEstadia | null } | null>(null);

  const [showSalida, setShowSalida] = useState(false);
  /** Estadia cuyo comprobante se esta viendo (pre-cuenta, o el de la salida recien hecha). */
  const [comprobanteDe, setComprobanteDe] = useState<number | null>(null);
  const [vista, setVista] = useState<"curso" | "finalizadas">("curso");

  // La primera carga arranca con "cargando"; las siguientes (tras una salida) refrescan sin parpadeo.
  const [version, setVersion] = useState(0);
  const recargar = () => setVersion((v) => v + 1);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      estadiasApi.listar("EN_CURSO"),
      estadiasApi.resumenCheckout().then(setResumen).catch(() => null),
    ])
      .then(([ests]) => {
        if (!vigente) return;
        setEstadias(ests);
        setError(null);
        setSelectedId((actual) => (actual && ests.some((e) => e.idEstadia === actual) ? actual : ests[0]?.idEstadia ?? null));
      })
      .catch(() => vigente && setError("No se pudieron cargar las estadías activas. Verifica la conexión."))
      .finally(() => vigente && setLoading(false));
    return () => { vigente = false; };
  }, [version]);

  useEffect(() => {
    if (!selectedId) return;
    let vigente = true;
    // El detalle de consumos y pagos sale del mismo documento que el comprobante.
    Promise.all([
      estadiasApi.saldo(selectedId).catch(() => null),
      comprobanteApi.de(selectedId).catch(() => null),
    ]).then(([saldo, detalle]) => vigente && setFolio({ id: selectedId, saldo, detalle }));
    return () => { vigente = false; };
  }, [selectedId]);

  const folioActual = folio && folio.id === selectedId ? folio : null;
  const saldoDetalle = folioActual?.saldo ?? null;
  const detalle = folioActual?.detalle ?? null;
  const saldoLoading = selectedId !== null && !folioActual;

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

  /** Salidas del dia y vencidas, con su saldo, para llevar a papel o a Excel. */
  const exportarSalidas = () => {
    const filas = [...estadias]
      .sort((a, b) => String(a.reserva.fechaCheckoutPrevisto).localeCompare(String(b.reserva.fechaCheckoutPrevisto)))
      .map((e) => {
        const dias = diasEntre(e.reserva.fechaCheckoutPrevisto, hoy);
        const saldo = resumen?.saldos?.[String(e.idEstadia)];
        return [
          e.habitacion.numero,
          `${e.reserva.cliente.nombres} ${e.reserva.cliente.apellidos}`,
          `${e.reserva.cliente.tipoDocumento} ${e.reserva.cliente.numeroDocumento}`,
          formatFecha(e.fechaCheckinReal),
          formatFecha(e.reserva.fechaCheckoutPrevisto),
          e.reserva.numNoches,
          dias > 0 ? `Vencida hace ${dias} día(s)` : dias === 0 ? "Sale hoy" : `Faltan ${-dias} día(s)`,
          saldo === undefined ? "" : saldo.toFixed(2),
        ];
      });
    exportarCsv(`salidas-${hoy}`,
      ["Habitación", "Huésped", "Documento", "Ingreso", "Salida prevista", "Noches", "Situación", "Saldo (S/)"], filas);
  };

  const salidaHecha = (idEstadia: number, final: Estadia) => {
    setShowSalida(false);
    setSuccessMsg(`Check-out realizado correctamente. ${destinoDeLaHabitacion(final)} Se emitió el comprobante.`);
    setSelectedId(null);
    setComprobanteDe(idEstadia);
    recargar();
  };

  const saldoDeLista = (e: Estadia): number | undefined => resumen?.saldos?.[String(e.idEstadia)];

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
          <Button variant="secondary" icon={<FileText size={13} />} onClick={exportarSalidas} disabled={estadias.length === 0}
            title="Descarga las estadías en curso con su día de salida y su saldo (CSV para Excel)">
            Reporte de Salidas
          </Button>
        </div>
      </div>

      {successMsg && <AlertBanner type="success" message={successMsg} />}
      {error && <AlertBanner type="error" message={error} />}
      {resumen && resumen.vencidas > 0 && (
        <AlertBanner type="warning" dismissible={false}
          message={`${resumen.vencidas} ${resumen.vencidas === 1 ? "estadía ya pasó" : "estadías ya pasaron"} su día de salida. Al procesarlas puedes cobrar las noches de más.`} />
      )}
      {resumen && resumen.salidasConDeuda > 0 && (
        <AlertBanner type="info" dismissible={false}
          message={`${resumen.salidasConDeuda} ${resumen.salidasConDeuda === 1 ? "salida autorizada" : "salidas autorizadas"} con saldo pendiente: quedaron debiendo ${soles(resumen.deudaSalidasForzadas)} en total.`} />
      )}

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
          value={resumen ? soles(resumen.pendienteCobro) : "—"}
          subtitle="folios con saldo"
          icon={<AlertCircle size={16} />}
          color="amber"
        />
        <KpiCard
          title="Liquidado Hoy"
          value={resumen ? soles(resumen.liquidadoHoy) : "—"}
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

          <div className="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Estadías">
            {([["curso", "En curso"], ["finalizadas", "Finalizadas (comprobantes)"]] as const).map(([id, texto]) => (
              <button key={id} role="tab" aria-selected={vista === id} onClick={() => setVista(id)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px ${vista === id ? "border-[#1b4332] text-[#1b4332]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                {texto}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {vista === "finalizadas" ? (
              <HistorialComprobantes busqueda={searchTerm} onVer={setComprobanteDe} />
            ) : loading ? (
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
                  const saldo = saldoDeLista(e);
                  const isSelected = selectedId === e.idEstadia;
                  const dias = diasEntre(e.reserva.fechaCheckoutPrevisto, hoy);
                  return (
                    <div
                      key={e.idEstadia}
                      onClick={() => setSelectedId(e.idEstadia)}
                      className={`p-3 cursor-pointer transition-colors ${isSelected ? "bg-emerald-50 border-l-4 border-[#1b4332]" : "hover:bg-slate-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900">
                              {e.reserva.cliente.nombres} {e.reserva.cliente.apellidos}
                            </span>
                            <Badge variant={estadoEstadiaToVariant(e.estadoEstadia)} label="En curso" />
                            <EstadoDeSalida dias={dias} />
                          </div>
                          <div className="text-[10px] text-slate-500 flex gap-3 mt-0.5 flex-wrap">
                            <span>Hab. {e.habitacion.numero} — {e.habitacion.tipoHabitacion.nombre}</span>
                            <span>{e.reserva.cliente.tipoDocumento} {e.reserva.cliente.numeroDocumento}</span>
                            <span>Check-in: {formatFecha(e.fechaCheckinReal)}</span>
                            <span>Salida prevista: {formatFecha(e.reserva.fechaCheckoutPrevisto)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {saldo === undefined ? (
                            <p className="font-bold text-slate-400">—</p>
                          ) : saldo > 0 ? (
                            <p className="font-bold text-red-700">Debe {soles(saldo)}</p>
                          ) : saldo < 0 ? (
                            <p className="font-bold text-blue-700">A favor {soles(saldo)}</p>
                          ) : (
                            <p className="font-bold text-emerald-700">Cuenta saldada</p>
                          )}
                          <p className="text-[10px] text-slate-400">{e.reserva.numNoches} noches · alojamiento {soles(e.reserva.montoAlojamientoTotal)}</p>
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
                    <span>
                      {selectedEstadia.reserva.numNoches}
                      {saldoDetalle && saldoDetalle.nochesReales !== saldoDetalle.noches && (
                        <span className="text-amber-700"> · lleva {saldoDetalle.nochesReales}</span>
                      )}
                    </span>
                  </div>
                </div>

                {saldoDetalle && saldoDetalle.nochesReales < saldoDetalle.noches && (
                  <div className="flex items-start gap-2 text-[11px] bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
                    <Clock size={13} className="mt-0.5 flex-shrink-0" />
                    <span>Salida anticipada: usó {saldoDetalle.nochesReales} de {saldoDetalle.noches} noches. Al procesar la salida puedes cobrar solo las usadas.</span>
                  </div>
                )}
                {saldoDetalle && saldoDetalle.nochesReales > saldoDetalle.noches && (
                  <div className="flex items-start gap-2 text-[11px] bg-red-50 border border-red-200 text-red-900 rounded-lg px-3 py-2">
                    <Clock size={13} className="mt-0.5 flex-shrink-0" />
                    <span>Se quedó de más: lleva {saldoDetalle.nochesReales} noches y se reservaron {saldoDetalle.noches}. Al procesar la salida puedes cobrar las noches extra.</span>
                  </div>
                )}

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
                        <span>Pagado</span>
                        <span className="font-semibold">− S/ {Number(saldoDetalle.totalPagos).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className={`flex justify-between font-bold text-sm border-t pt-2 ${saldoDetalle.saldoPendiente < 0 ? "text-blue-700" : saldoDetalle.saldoPendiente === 0 ? "text-emerald-700" : "text-red-700"}`}>
                      <span>{saldoDetalle.saldoPendiente < 0 ? "Saldo a favor del huésped" : saldoDetalle.saldoPendiente === 0 ? "Cuenta saldada" : "Saldo pendiente"}</span>
                      <span>S/ {Math.abs(Number(saldoDetalle.saldoPendiente)).toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-3 text-center text-[11px] text-slate-400">
                    Saldo no disponible
                  </div>
                )}

                {saldoDetalle && (saldoDetalle.comandasActivas > 0 || saldoDetalle.solicitudesCobrablesPendientes > 0) && (
                  <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 space-y-0.5">
                    {saldoDetalle.comandasActivas > 0 && (
                      <p>• {saldoDetalle.comandasActivas} comanda{saldoDetalle.comandasActivas === 1 ? "" : "s"} sin entregar (aún no están en el folio).</p>
                    )}
                    {saldoDetalle.solicitudesCobrablesPendientes > 0 && (
                      <p>• {saldoDetalle.solicitudesCobrablesPendientes} solicitud{saldoDetalle.solicitudesCobrablesPendientes === 1 ? "" : "es"} cobrable{saldoDetalle.solicitudesCobrablesPendientes === 1 ? "" : "s"} sin atender.</p>
                    )}
                  </div>
                )}

                {detalle && (detalle.consumos.length > 0 || detalle.pagos.length > 0) && (
                  <div className="text-[11px] space-y-2" aria-label="Detalle del folio">
                    {detalle.consumos.length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Consumos ({detalle.consumos.length})</p>
                        <ul className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                          {detalle.consumos.map((c, i) => (
                            <li key={i} className="flex justify-between py-0.5 gap-2">
                              <span className="truncate">{c.cantidad} × {c.descripcion}</span>
                              <span className="font-semibold">{soles(c.total)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {detalle.pagos.length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Pagos ({detalle.pagos.length})</p>
                        <ul className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                          {detalle.pagos.map((p, i) => (
                            <li key={i} className="flex justify-between py-0.5 gap-2">
                              <span className="truncate">{formatFecha(p.fecha ?? undefined)} · {(p.metodo ?? "").replace(/_/g, " ").toLowerCase()}</span>
                              <span className="font-semibold text-emerald-700">{soles(p.monto)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  icon={<ReceiptText size={13} />}
                  className="w-full justify-center"
                  onClick={() => setComprobanteDe(selectedEstadia.idEstadia)}
                >
                  Pre-cuenta / imprimir estado de cuenta
                </Button>
                <Button
                  variant={saldoDetalle && saldoDetalle.saldoPendiente === 0 ? "success" : "primary"}
                  icon={<DoorOpen size={13} />}
                  className="w-full justify-center"
                  disabled={!saldoDetalle}
                  onClick={() => setShowSalida(true)}
                >
                  Procesar salida
                </Button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-xs text-slate-400">Selecciona una estadía para ver el folio y procesar la salida</p>
            </div>
          )}
        </div>
      </div>

      {showSalida && selectedEstadia && saldoDetalle && (
        <SalidaModal
          estadia={selectedEstadia}
          folio={saldoDetalle}
          habitacionBloqueada={incidencias.get(selectedEstadia.habitacion.idHabitacion)?.bloquea === true}
          cajaCerrada={cajaCerrada}
          esAdmin={isAdmin}
          onCerrar={() => setShowSalida(false)}
          onHecho={salidaHecha}
          onCajaCerrada={refrescarCaja}
        />
      )}

      {comprobanteDe !== null && <ComprobanteModal idEstadia={comprobanteDe} onCerrar={() => setComprobanteDe(null)} />}
    </div>
  );
}
