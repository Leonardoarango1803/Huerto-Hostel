import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Receipt, Coffee, ConciergeBell, CheckCircle, AlertCircle, Send, CalendarPlus, BedDouble, Sparkles, Lock } from "lucide-react";
import { MisReservasPortal } from "./web/MisReservasPortal";
import { PagarEnLineaModal } from "./web/PagarEnLineaModal";
import { MiEquipaje } from "./web/MiEquipaje";
import { portalApi, type PerfilHuesped, type ProductoParaPedir } from "../api/portal";
import { fechaDMA } from "../utils/fechas";
import type { ConsumoEstadia, MiFolio, SolicitudServicio } from "../api/types";

type Tab = "folio" | "consumos" | "solicitudes";

const ESTADO_SOLICITUD: Record<string, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Recibida", clase: "bg-amber-100 text-amber-800" },
  ASIGNADA: { texto: "En camino", clase: "bg-blue-100 text-blue-800" },
  EN_ATENCION: { texto: "Atendiéndola", clase: "bg-blue-100 text-blue-800" },
  ATENDIDA: { texto: "Lista", clase: "bg-emerald-100 text-emerald-800" },
  CANCELADA: { texto: "Cancelada", clase: "bg-slate-200 text-slate-600" },
};

/** Pedidos de un toque: llenan el texto (el huesped puede cambiarlo antes de enviar). */
const PEDIDOS_RAPIDOS = ["Toallas extra", "Limpieza de la habitación", "Más papel higiénico", "Una almohada extra"];

const tarjeta = "bg-white border border-[#EFE6D6] rounded-[22px]";
const soles = (n: number | string | undefined) => `S/ ${Math.abs(Number(n ?? 0)).toFixed(2)}`;
/** "14/11/2026 · 14:10" (la fecha como dia local, sin correrla por la zona horaria). */
const fechaHora = (iso?: string) => (iso ? `${fechaDMA(iso.slice(0, 10))} · ${iso.slice(11, 16)}` : "—");

function saludo(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

/**
 * Portal del huesped, dentro de la web del hotel (con su cabecera y su pie): saluda por su nombre, muestra su estadia
 * (cuenta, consumos y servicios) y sus reservas. Antes de llegar o despues de salir, solo sus reservas.
 */
export function PortalView() {
  const [tab, setTab] = useState<Tab>("folio");
  const [perfil, setPerfil] = useState<PerfilHuesped | null>(null);
  const [folio, setFolio] = useState<MiFolio | null>(null);
  const [consumos, setConsumos] = useState<ConsumoEstadia[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudServicio[]>([]);
  const [productos, setProductos] = useState<ProductoParaPedir[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinEstadia, setSinEstadia] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [form, setForm] = useState({ descripcion: "", idProducto: "", cantidad: "1" });
  const [pagando, setPagando] = useState(false);
  /** Sube tras un pago para que "Mis reservas" vuelva a pedir lo pagado. */
  const [versionReservas, setVersionReservas] = useState(0);

  useEffect(() => {
    let vigente = true;
    // Sin estadia en curso el folio llega vacio (204): entonces se muestran solo sus reservas y no se pide el catalogo.
    portalApi.miFolio()
      .then((data) => {
        if (!vigente) return;
        setFolio(data);
        setSinEstadia(data === null);
        if (data !== null) {
          portalApi.productos().then((p) => vigente && setProductos(p)).catch(() => undefined);
        }
      })
      .catch(() => vigente && setSinEstadia(true))
      .finally(() => vigente && setCargando(false));
    portalApi.perfil().then((p) => vigente && setPerfil(p)).catch(() => undefined);
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (sinEstadia) return;
    if (tab === "consumos") {
      portalApi.misConsumos().then(setConsumos).catch(() => undefined);
    } else if (tab === "solicitudes") {
      portalApi.misSolicitudes().then(setSolicitudes).catch(() => undefined);
    }
  }, [tab, sinEstadia]);

  const enviarSolicitud = async () => {
    if (!form.descripcion.trim()) {
      setMensaje({ tipo: "error", texto: "Cuéntanos qué necesitas." });
      return;
    }
    setEnviando(true);
    try {
      await portalApi.solicitar({
        descripcion: form.descripcion,
        idProducto: form.idProducto ? Number(form.idProducto) : undefined,
        cantidad: Number(form.cantidad || "1"),
      });
      setMensaje({ tipo: "ok", texto: "Listo, recepción ya recibió tu pedido." });
      setForm({ descripcion: "", idProducto: "", cantidad: "1" });
      setSolicitudes(await portalApi.misSolicitudes());
    } catch {
      setMensaje({ tipo: "error", texto: "No pudimos enviar tu pedido. Inténtalo de nuevo o llama a recepción." });
    } finally {
      setEnviando(false);
    }
  };

  const nombre = perfil?.nombres?.split(" ")[0];
  const debe = (folio?.saldoPendiente ?? 0) > 0;

  return (
    <main className="flex flex-col">
      {/* Saludo */}
      <section className="bg-gradient-to-br from-[#2D5A27] to-[#1E3F1A] text-white">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-[640px]">
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.12em] uppercase text-emerald-100">
              <Sparkles size={15} /> Mi cuenta
            </span>
            <h1 className="m-0 font-display font-semibold text-[clamp(32px,5vw,48px)] leading-[1.05]">
              {saludo()}{nombre ? `, ${nombre}` : ""}
            </h1>
            <p className="m-0 text-base sm:text-lg leading-relaxed text-emerald-50/90">
              {cargando
                ? "Estamos preparando tu información…"
                : sinEstadia
                  ? "Aquí tienes tus reservas. Cuando hagas tu check-in, también verás tu cuenta y podrás pedir servicios a tu habitación."
                  : `Estás en la habitación ${folio?.habitacion ?? "—"}. Pide lo que necesites y revisa tu cuenta cuando quieras.`}
            </p>
          </div>
          <Link to="/hospedaje" className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-terracota hover:bg-terracota-oscuro text-white font-bold">
            <CalendarPlus size={18} /> Nueva reserva
          </Link>
        </div>
      </section>

      <div className="max-w-[1180px] w-full mx-auto px-4 sm:px-6 py-10 flex flex-col gap-10">
        {cargando && <div className="h-40 rounded-[22px] bg-slate-100 animate-pulse" />}

        {!cargando && !sinEstadia && folio && (
          <section aria-labelledby="h-estadia" className="flex flex-col gap-5">
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <div className={`${tarjeta} p-5 flex items-center gap-4`}>
                <span className="w-12 h-12 rounded-2xl bg-huerto-suave text-huerto flex items-center justify-center"><BedDouble size={22} /></span>
                <div className="flex flex-col">
                  <span className="text-[13px] text-slate-600">Tu habitación</span>
                  <strong id="h-estadia" className="font-display text-2xl">{folio.habitacion ?? "—"}</strong>
                </div>
              </div>
              <div className={`${tarjeta} p-5 flex flex-col`}>
                <span className="text-[13px] text-slate-600">Llegaste</span>
                <strong className="text-lg">{fechaHora(folio.fechaCheckin)}</strong>
              </div>
              <div className={`${tarjeta} p-5 flex flex-col`}>
                <span className="text-[13px] text-slate-600">Salida prevista</span>
                <strong className="text-lg">{fechaDMA(folio.fechaCheckoutPrevisto)} · hasta las 12:00</strong>
              </div>
              <div className={`rounded-[22px] border p-5 flex flex-col ${debe ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                <span className="text-[13px] text-slate-600">{debe ? "Por pagar" : "Tu cuenta"}</span>
                <strong className={`font-display text-2xl ${debe ? "text-amber-800" : "text-emerald-800"}`}>{debe ? soles(folio.saldoPendiente) : "Al día"}</strong>
              </div>
            </div>

            <div role="tablist" aria-label="Tu estadía" className="flex flex-wrap gap-2">
              {([
                { id: "folio", label: "Mi cuenta", icon: Receipt },
                { id: "consumos", label: "Consumos", icon: Coffee },
                { id: "solicitudes", label: "Pedir un servicio", icon: ConciergeBell },
              ] as const).map((t) => {
                const Icon = t.icon;
                const activa = tab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={activa}
                    onClick={() => setTab(t.id)}
                    className={`min-h-[44px] px-5 rounded-full text-sm font-bold inline-flex items-center gap-2 border transition-colors ${
                      activa ? "bg-huerto text-white border-huerto" : "bg-white text-tinta border-slate-300 hover:border-huerto"
                    }`}
                  >
                    <Icon size={16} /> {t.label}
                  </button>
                );
              })}
            </div>

            {mensaje && (
              <div role="status" className={`flex items-start gap-2 px-4 py-3 rounded-2xl text-sm font-semibold ${mensaje.tipo === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>
                {mensaje.tipo === "ok" ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
                <span>{mensaje.texto}</span>
              </div>
            )}

            {tab === "folio" && (
              <div className={`${tarjeta} p-5 sm:p-6 max-w-[620px]`}>
                <dl className="m-0 grid grid-cols-[1fr_auto] gap-3 text-[15px]">
                  <dt className="text-slate-600">Alojamiento</dt><dd className="m-0 font-semibold">{soles(folio.totalAlojamiento)}</dd>
                  <dt className="text-slate-600">Consumos y servicios</dt><dd className="m-0 font-semibold">{soles(folio.totalConsumos)}</dd>
                  <dt className="text-emerald-800">Pagado</dt><dd className="m-0 font-semibold text-emerald-800">− {soles(folio.totalPagos)}</dd>
                  <dt className="pt-3 border-t border-[#F1EADD] font-bold">{debe ? "Saldo por pagar" : Number(folio.saldoPendiente) < 0 ? "Saldo a tu favor" : "Saldo"}</dt>
                  <dd className="m-0 pt-3 border-t border-[#F1EADD] font-bold">{soles(folio.saldoPendiente)}</dd>
                </dl>
                {debe && (
                  <button
                    type="button"
                    onClick={() => setPagando(true)}
                    className="mt-5 w-full min-h-[50px] rounded-full bg-terracota hover:bg-terracota-oscuro text-white font-bold inline-flex items-center justify-center gap-2"
                  >
                    <Lock size={17} /> Pagar en línea {soles(folio.saldoPendiente)}
                  </button>
                )}
                <p className="m-0 mt-4 text-[13px] text-slate-600">Puedes pagar aquí con tarjeta o Yape/Plin, o en recepción al salir. Si ves algo que no reconoces, avísanos.</p>
              </div>
            )}

            {tab === "consumos" && (
              <div className={`${tarjeta} overflow-hidden max-w-[620px]`}>
                {consumos.length === 0 ? (
                  <p className="m-0 p-6 text-center text-slate-600 text-sm">Todavía no tienes consumos. Lo que pidas a cocina, bar o recepción aparecerá aquí.</p>
                ) : (
                  <ul className="m-0 p-0 list-none divide-y divide-[#F1EADD]">
                    {consumos.map((c) => (
                      <li key={c.idConsumo} className="flex items-center justify-between gap-3 px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold">{c.cantidad} × {c.producto?.nombre ?? "—"}</span>
                          <span className="text-[13px] text-slate-500">{fechaHora(c.fechaRegistro)}</span>
                        </div>
                        <strong>{soles(c.totalConsumo)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "solicitudes" && (
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] items-start">
                <div className={`${tarjeta} p-5 sm:p-6 flex flex-col gap-4`}>
                  <h2 className="m-0 font-display text-2xl font-semibold">¿Qué necesitas?</h2>
                  <div className="flex flex-wrap gap-2">
                    {PEDIDOS_RAPIDOS.map((p) => (
                      <button key={p} type="button" onClick={() => setForm((f) => ({ ...f, descripcion: p }))}
                        className="min-h-[38px] px-3.5 rounded-full border border-slate-300 bg-arena text-[13px] font-semibold hover:border-huerto">
                        {p}
                      </button>
                    ))}
                  </div>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">Tu pedido
                    <textarea rows={3} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                      placeholder="Ej. toallas extra para dos personas"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] font-normal focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto" />
                  </label>
                  <div className="grid grid-cols-[1fr_96px] gap-3">
                    <label className="flex flex-col gap-1.5 text-sm font-semibold">Algo de la carta (opcional)
                      <select value={form.idProducto} onChange={(e) => setForm((f) => ({ ...f, idProducto: e.target.value }))}
                        className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal focus:outline-none focus:ring-2 focus:ring-huerto/30">
                        <option value="">Solo el pedido</option>
                        {productos.map((p) => (
                          <option key={p.idProducto} value={p.idProducto}>{p.nombre} — S/ {Number(p.precioVenta).toFixed(2)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-semibold">Cantidad
                      <input type="number" min={1} value={form.cantidad} onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                        className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal focus:outline-none focus:ring-2 focus:ring-huerto/30" />
                    </label>
                  </div>
                  {form.idProducto && (
                    <p className="m-0 text-[13px] text-amber-900 bg-amber-100 rounded-xl px-3 py-2">El importe se sumará a tu cuenta.</p>
                  )}
                  <button onClick={enviarSolicitud} disabled={enviando}
                    className="min-h-[50px] rounded-full bg-huerto hover:bg-huerto-oscuro disabled:opacity-60 text-white font-bold inline-flex items-center justify-center gap-2">
                    <Send size={17} /> {enviando ? "Enviando…" : "Enviar a recepción"}
                  </button>
                </div>

                <div className={`${tarjeta} overflow-hidden`}>
                  <h2 className="m-0 px-5 py-4 border-b border-[#F1EADD] text-base font-bold">Tus pedidos ({solicitudes.length})</h2>
                  {solicitudes.length === 0 ? (
                    <p className="m-0 p-6 text-center text-slate-600 text-sm">Aún no has pedido nada.</p>
                  ) : (
                    <ul className="m-0 p-0 list-none divide-y divide-[#F1EADD]">
                      {solicitudes.map((s) => {
                        const estado = ESTADO_SOLICITUD[s.estado] ?? { texto: s.estado, clase: "bg-slate-100 text-slate-600" };
                        return (
                          <li key={s.idSolicitud} className="px-5 py-3.5 flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-semibold">{s.descripcion}</span>
                              <span className={`text-[12px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${estado.clase}`}>{estado.texto}</span>
                            </div>
                            <span className="text-[13px] text-slate-500">
                              {fechaHora(s.fechaSolicitud)}
                              {s.esCobrable && s.producto ? ` · ${s.cantidad} × ${s.producto.nombre} (${soles(Number(s.montoUnidad) * s.cantidad)})` : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <MiEquipaje puedePedir />
              </div>
            )}
          </section>
        )}

        {/* Despues del check-out: si dejo maletas en custodia, que vea su codigo para recogerlas. */}
        {!cargando && sinEstadia && <MiEquipaje puedePedir={false} />}

        {!cargando && <MisReservasPortal version={versionReservas} onPagado={() => setVersionReservas((v) => v + 1)} />}
        {pagando && folio && (
          <PagarEnLineaModal
            titulo="Pagar mi cuenta"
            pendiente={Number(folio.saldoPendiente)}
            onCerrar={() => setPagando(false)}
            onPagado={async (r) => {
              setPagando(false);
              setTab("folio");
              setMensaje({ tipo: "ok", texto: `Pago aprobado: ${soles(r.monto)} (operación ${r.codigoOperacion}). Es un pago de demostración, no se cobró dinero real.` });
              setVersionReservas((v) => v + 1);
              const nuevo = await portalApi.miFolio().catch(() => null);
              if (nuevo) setFolio(nuevo);
            }}
          />
        )}
      </div>
    </main>
  );
}
