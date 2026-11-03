import { useState, useEffect, useCallback } from "react";
import {
  ConciergeBell,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { solicitudesApi } from "../api/portal";
import { useAuth } from "../context/AuthContext";
import { puede } from "../auth/permisos";
import type { EstadoSolicitud, SolicitudServicio } from "../api/types";

const BADGE: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  ASIGNADA: "bg-blue-100 text-blue-800",
  EN_ATENCION: "bg-blue-100 text-blue-800",
  ATENDIDA: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-slate-200 text-slate-600",
};

export function SolicitudesView() {
  const { user } = useAuth();
  const puedeCargar = puede(user?.role, "cargarSolicitudAlFolio");
  const [solicitudes, setSolicitudes] = useState<SolicitudServicio[]>([]);
  const [filtro, setFiltro] = useState<EstadoSolicitud | "">("");
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      setSolicitudes(await solicitudesApi.listar(filtro || undefined));
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las solicitudes." });
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const avanzar = async (s: SolicitudServicio, estado: EstadoSolicitud) => {
    setMensaje(null);
    try {
      await solicitudesApi.cambiarEstado(s.idSolicitud, estado);
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo actualizar la solicitud." });
    }
  };

  const cargarAlFolio = async (s: SolicitudServicio) => {
    setMensaje(null);
    try {
      await solicitudesApi.cargarAlFolio(s.idSolicitud);
      setMensaje({
        tipo: "ok",
        texto: `Cargado al folio de la estadia #${s.estadia?.idEstadia ?? ""}.`,
      });
      cargar();
    } catch {
      setMensaje({
        tipo: "error",
        texto: "No se pudo cargar al folio. Verifica que la solicitud sea cobrable.",
      });
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">
            Recepcion › Solicitudes
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Solicitudes del Huesped</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Pedidos enviados desde el portal. Los cobrables se cargan al folio de la estadia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as EstadoSolicitud | "")}
            className="border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            <option value="">Abiertas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_ATENCION">En atencion</option>
            <option value="ATENDIDA">Atendidas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
          <button
            onClick={cargar}
            title="Refrescar"
            className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={13} />
          </button>
        </div>
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <p className="p-4 text-center text-slate-400 text-xs">Cargando...</p>
        ) : solicitudes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ConciergeBell size={30} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No hay solicitudes.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Habitacion</th>
                <th className="p-3">Solicitud</th>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-right">Importe</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {solicitudes.map((s) => (
                <tr key={s.idSolicitud} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">
                    Hab. {s.estadia?.habitacion?.numero ?? "—"}
                  </td>
                  <td className="p-3 text-slate-600">
                    {s.descripcion}
                    {s.producto && (
                      <span className="text-slate-400">
                        {" "}
                        · {s.cantidad}x {s.producto.nombre}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-400">
                    {s.fechaSolicitud ? s.fechaSolicitud.slice(0, 16).replace("T", " ") : "—"}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {s.esCobrable
                      ? `S/ ${(Number(s.montoUnidad) * s.cantidad).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        BADGE[s.estado] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.estado}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-1.5 justify-end">
                      {s.estado === "PENDIENTE" && (
                        <button
                          onClick={() => avanzar(s, "EN_ATENCION")}
                          className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                        >
                          Atender
                        </button>
                      )}
                      {s.estado === "EN_ATENCION" && (
                        <button
                          onClick={() => avanzar(s, "ATENDIDA")}
                          className="bg-[#1b4332] hover:bg-[#143427] text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                        >
                          Completar
                        </button>
                      )}
                      {puedeCargar && s.esCobrable && s.estado === "ATENDIDA" && (
                        <button
                          onClick={() => cargarAlFolio(s)}
                          className="border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
                        >
                          <Receipt size={11} /> Cargar al folio
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
