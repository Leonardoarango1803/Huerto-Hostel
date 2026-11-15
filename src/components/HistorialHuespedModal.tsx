import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { clientesApi, type HistorialHuesped } from "../api/clientes";
import { mensajeDeError } from "../api/errores";
import { fechaDMA } from "../utils/fechas";
import { AlertBanner, Badge, LoadingState, estadoReservaToVariant } from "./ui";
import type { Cliente } from "../api/types";

const ESTADO: Record<string, string> = {
  PENDIENTE_ADELANTO: "Pendiente",
  CONFIRMADA: "Confirmada",
  EN_CURSO: "En curso",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
};

const soles = (n: number | string | null | undefined) => `S/ ${Number(n ?? 0).toFixed(2)}`;
const fecha = (v: string | null | undefined) => (v ? fechaDMA(String(v).slice(0, 10)) : "—");

type Pestana = "estadias" | "consumos";

/** Historial de estadias y consumos de un huesped (RF11). Solo lectura. */
export function HistorialHuespedModal({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const [datos, setDatos] = useState<HistorialHuesped | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("estadias");

  useEffect(() => {
    let vigente = true;
    clientesApi
      .historial(cliente.idCliente)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(mensajeDeError(e, "No se pudo cargar el historial.")));
    return () => {
      vigente = false;
    };
  }, [cliente.idCliente]);

  const r = datos?.resumen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/45" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={`Historial de ${cliente.nombres}`} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">Historial de {cliente.nombres} {cliente.apellidos}</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">
              {cliente.numeroDocumento ? `${cliente.tipoDocumento} ${cliente.numeroDocumento}` : "Sin documento"}
              {r?.ultimaVisita ? ` · Última visita: ${fecha(r.ultimaVisita)}` : ""}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-500 hover:text-slate-800 ml-4 w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 text-xs">
          {error && <AlertBanner type="error" message={error} dismissible={false} />}
          {!datos && !error && <LoadingState />}
          {datos && r && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ["Visitas", `${r.visitas}`, `${r.noches} noche(s)`],
                  ["Reservas", `${r.reservas}`, `${r.canceladas} cancelada(s)`],
                  ["Consumido", soles(r.totalConsumos), `Alojamiento ${soles(r.totalAlojamiento)}`],
                  ["Pagado", soles(r.totalPagado), Number(r.deudaPendiente) > 0 ? `Debe ${soles(r.deudaPendiente)}` : "Sin deudas"],
                ].map(([t, v, s]) => (
                  <div key={t} className="rounded-xl border border-[#EFE6D6] p-3">
                    <p className="text-[12px] text-slate-500 uppercase font-semibold">{t}</p>
                    <p className="text-lg font-bold text-slate-900">{v}</p>
                    <p className={`text-[12px] ${t === "Pagado" && Number(r.deudaPendiente) > 0 ? "text-red-700 font-semibold" : "text-slate-500"}`}>{s}</p>
                  </div>
                ))}
              </div>
              {r.favoritos.length > 0 && (
                <p className="text-slate-600">
                  Suele pedir: {r.favoritos.map((f) => `${f.producto} (${f.cantidad})`).join(", ")}
                </p>
              )}

              <div role="tablist" className="flex gap-1 border-b border-slate-200">
                {([["estadias", `Reservas y estadías (${datos.reservas.length})`], ["consumos", `Consumos (${datos.consumos.length})`]] as const).map(([p, t]) => (
                  <button
                    key={p}
                    role="tab"
                    aria-selected={pestana === p}
                    onClick={() => setPestana(p)}
                    className={`px-3 min-h-[36px] -mb-px border-b-2 font-semibold ${pestana === p ? "border-huerto text-huerto" : "border-transparent text-slate-500"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {pestana === "estadias" && (
                datos.reservas.length === 0 ? <p className="text-slate-500">Aún no tiene reservas.</p> : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[12px] text-slate-500 uppercase border-b border-slate-200">
                        <th className="py-2 pr-2">Reserva</th>
                        <th className="py-2 pr-2">Hab.</th>
                        <th className="py-2 pr-2">Fechas</th>
                        <th className="py-2 pr-2 text-right">Alojamiento</th>
                        <th className="py-2 pr-2 text-right">Consumos</th>
                        <th className="py-2 pr-2 text-right">Pagado</th>
                        <th className="py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.reservas.map((x) => (
                        <tr key={x.id_reserva} className="border-b border-slate-100 align-top">
                          <td className="py-2 pr-2 font-mono">RES-{String(x.id_reserva).padStart(3, "0")}<div className="text-[11px] text-slate-400 font-sans">{x.canal === "ONLINE" ? "Web" : "Mostrador"}</div></td>
                          <td className="py-2 pr-2">{x.habitacion}<div className="text-[11px] text-slate-400">{x.tipo}</div></td>
                          <td className="py-2 pr-2">
                            {x.id_estadia
                              ? <>{fecha(x.fecha_checkin_real)} → {x.fecha_checkout_real ? fecha(x.fecha_checkout_real) : "en curso"}</>
                              : <>{fecha(x.fecha_checkin_previsto)} → {fecha(x.fecha_checkout_previsto)}</>}
                            <div className="text-[11px] text-slate-400">{x.num_noches} noche(s){x.salida_forzada ? " · salió con deuda" : ""}</div>
                          </td>
                          <td className="py-2 pr-2 text-right">{soles(x.monto_alojamiento_total)}</td>
                          <td className="py-2 pr-2 text-right">{soles(x.consumos)}</td>
                          <td className="py-2 pr-2 text-right">{soles(x.pagado)}</td>
                          <td className="py-2"><Badge variant={estadoReservaToVariant(x.estado)} label={ESTADO[x.estado] ?? x.estado} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {pestana === "consumos" && (
                datos.consumos.length === 0 ? <p className="text-slate-500">Sin consumos registrados.</p> : (
                  <>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[12px] text-slate-500 uppercase border-b border-slate-200">
                          <th className="py-2 pr-2">Fecha</th>
                          <th className="py-2 pr-2">Producto</th>
                          <th className="py-2 pr-2">Hab.</th>
                          <th className="py-2 pr-2 text-right">Cant.</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datos.consumos.map((c) => (
                          <tr key={c.id_consumo} className="border-b border-slate-100">
                            <td className="py-1.5 pr-2">{fecha(c.fecha_registro)}</td>
                            <td className="py-1.5 pr-2">{c.producto}</td>
                            <td className="py-1.5 pr-2">{c.habitacion}</td>
                            <td className="py-1.5 pr-2 text-right">{c.cantidad}</td>
                            <td className="py-1.5 text-right">{soles(c.total_consumo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {datos.consumosOmitidos > 0 && <p className="text-slate-500">Y {datos.consumosOmitidos} consumo(s) más antiguos.</p>}
                  </>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
