import { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Coffee,
  ConciergeBell,
  CheckCircle,
  AlertCircle,
  Plus,
  CalendarDays,
} from "lucide-react";
import { MisReservasPortal } from "./web/MisReservasPortal";
import api from "../api/axiosConfig";
import { portalApi } from "../api/portal";
import type {
  ConsumoEstadia,
  MiFolio,
  Producto,
  SolicitudServicio,
} from "../api/types";

type Tab = "folio" | "consumos" | "solicitudes" | "reservas";

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  ASIGNADA: "bg-blue-100 text-blue-800",
  EN_ATENCION: "bg-blue-100 text-blue-800",
  ATENDIDA: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-slate-200 text-slate-600",
};

export function PortalView() {
  const [tab, setTab] = useState<Tab>("folio");
  const [folio, setFolio] = useState<MiFolio | null>(null);
  const [consumos, setConsumos] = useState<ConsumoEstadia[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudServicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinEstadia, setSinEstadia] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [form, setForm] = useState({ descripcion: "", idProducto: "", cantidad: "1" });

  const cargar = useCallback(async () => {
    try {
      const data = await portalApi.miFolio();
      setFolio(data);
      setSinEstadia(false);
    } catch {
      setSinEstadia(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    api
      .get<Producto[]>("/api/v1/productos")
      .then((r) => setProductos(r.data))
      .catch(() => undefined);
  }, [cargar]);

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
      setMensaje({ tipo: "error", texto: "Cuentanos que necesitas." });
      return;
    }
    try {
      await portalApi.solicitar({
        descripcion: form.descripcion,
        idProducto: form.idProducto ? Number(form.idProducto) : undefined,
        cantidad: Number(form.cantidad || "1"),
      });
      setMensaje({ tipo: "ok", texto: "Tu solicitud fue enviada a recepcion." });
      setForm({ descripcion: "", idProducto: "", cantidad: "1" });
      setSolicitudes(await portalApi.misSolicitudes());
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo enviar la solicitud." });
    }
  };

  if (cargando) {
    return <p className="p-6 text-center text-slate-500 text-sm">Cargando tu estadía...</p>;
  }

  if (sinEstadia) {
    // Antes de llegar (o despues de salir) el portal muestra sus reservas en vez de quedar vacio.
    return (
      <div className="flex flex-col gap-6 max-w-[1080px]">
        <div>
          <p className="text-[12px] text-slate-500 uppercase font-semibold tracking-wider">Portal del huésped</p>
          <h1 className="text-xl text-slate-900 mt-0.5">Hola de nuevo</h1>
          <p className="text-slate-600 text-sm mt-1">
            Cuando hagas tu check-in, aquí verás tu cuenta y podrás pedir servicios. Mientras tanto, revisa tus reservas.
          </p>
        </div>
        <MisReservasPortal />
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-slate-800 text-sm max-w-[1080px]">
      <div>
        <p className="text-[12px] text-slate-500 uppercase font-semibold tracking-wider">Portal del huésped</p>
        <h1 className="text-xl text-slate-900 mt-0.5">
          Habitación {folio?.habitacion ?? "—"}
        </h1>
        <p className="text-slate-600 text-sm mt-0.5">
          Consulta tu cuenta, revisa tus consumos y pide servicios desde aquí.
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

      <div className="flex gap-1 border-b border-slate-200">
        {([
          { id: "folio", label: "Mi cuenta", icon: Receipt },
          { id: "consumos", label: "Consumos", icon: Coffee },
          { id: "solicitudes", label: "Servicios", icon: ConciergeBell },
          { id: "reservas", label: "Mis reservas", icon: CalendarDays },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 -mb-px ${
                tab === t.id
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "folio" && folio && (
        <div className="space-y-3 max-w-lg">
          <div
            className={`p-4 rounded-xl border shadow-sm ${
              folio.saldoPendiente <= 0
                ? "bg-emerald-50 border-emerald-300"
                : "bg-amber-50 border-amber-300"
            }`}
          >
            <p className="text-[12px] font-bold uppercase text-slate-500">Saldo pendiente</p>
            <p
              className={`text-3xl font-bold ${
                folio.saldoPendiente <= 0 ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              S/ {Math.abs(Number(folio.saldoPendiente ?? 0)).toFixed(2)}
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {folio.saldoPendiente <= 0 ? "Tu cuenta esta al dia" : "Por pagar al check-out"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFE6D6] divide-y divide-slate-100">
            {[
              { label: "Alojamiento", value: folio.totalAlojamiento },
              { label: "Consumos", value: folio.totalConsumos },
              { label: "Pagos realizados", value: folio.totalPagos },
            ].map((f) => (
              <div key={f.label} className="flex items-center justify-between p-3">
                <span className="text-slate-600">{f.label}</span>
                <span className="font-bold text-slate-900">
                  S/ {Number(f.value ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#EFE6D6] p-3 text-xs text-slate-500 space-y-1">
            <p>
              Check-in:{" "}
              {folio.fechaCheckin ? folio.fechaCheckin.slice(0, 16).replace("T", " ") : "—"}
            </p>
            <p>Salida prevista: {folio.fechaCheckoutPrevisto ?? "—"}</p>
          </div>
        </div>
      )}

      {tab === "consumos" && (
        <div className="bg-white rounded-2xl border border-[#EFE6D6] overflow-hidden max-w-lg">
          {consumos.length === 0 ? (
            <p className="p-6 text-center text-slate-400 text-xs">
              Todavia no tienes consumos registrados.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {consumos.map((c) => (
                <div key={c.idConsumo} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {c.cantidad}x {c.producto?.nombre ?? "—"}
                    </p>
                    <p className="text-[12px] text-slate-400">
                      {c.fechaRegistro ? c.fechaRegistro.slice(0, 16).replace("T", " ") : "—"}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">
                    S/ {Number(c.totalConsumo ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "reservas" && <MisReservasPortal />}

      {tab === "solicitudes" && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-white p-4 rounded-2xl border border-[#EFE6D6] space-y-3">
            <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
              Pedir un servicio
            </h3>
            <textarea
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Toallas extra, limpieza de habitacion, una bebida..."
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                value={form.idProducto}
                onChange={(e) => setForm((f) => ({ ...f, idProducto: e.target.value }))}
                className="col-span-2 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="">Sin producto (solo pedido)</option>
                {productos.map((p) => (
                  <option key={p.idProducto} value={p.idProducto}>
                    {p.nombre} — S/ {p.precioVenta.toFixed(2)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={form.cantidad}
                onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                className="border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            {form.idProducto && (
              <p className="text-[12px] text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                Al elegir un producto, el importe se cargara a tu cuenta.
              </p>
            )}
            <button
              onClick={enviarSolicitud}
              className="w-full bg-[#2D5A27] hover:bg-[#1E3F1A] text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5"
            >
              <Plus size={13} /> Enviar solicitud
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFE6D6] overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <span className="font-bold text-slate-700 text-xs">
                Mis solicitudes ({solicitudes.length})
              </span>
            </div>
            {solicitudes.length === 0 ? (
              <p className="p-4 text-center text-slate-400 text-xs">Sin solicitudes aun.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {solicitudes.map((s) => (
                  <div key={s.idSolicitud} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-slate-700 flex-1">{s.descripcion}</p>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          ESTADO_BADGE[s.estado] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {s.estado}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      {s.fechaSolicitud
                        ? s.fechaSolicitud.slice(0, 16).replace("T", " ")
                        : "—"}
                      {s.esCobrable && s.producto
                        ? ` · ${s.cantidad}x ${s.producto.nombre} (S/ ${(
                            Number(s.montoUnidad) * s.cantidad
                          ).toFixed(2)})`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
