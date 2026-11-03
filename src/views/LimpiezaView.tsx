import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Wrench,
  PlayCircle,
} from "lucide-react";
import { limpiezaApi } from "../api/limpieza";
import { incidenciasApi } from "../api/incidencias";
import type { EstadoTareaLimpieza, TareaLimpieza, TipoIncidencia } from "../api/types";

const ORIGEN_LABEL: Record<string, string> = {
  CHECK_OUT: "Salida de huesped",
  SOLICITUD_HUESPED: "Pedido del huesped",
  PROGRAMADO: "Programada",
};

const TIPOS_INCIDENCIA: { value: TipoIncidencia; label: string }[] = [
  { value: "GRIFERIA_DUCHA", label: "Griferia / ducha" },
  { value: "AIRE_ACONDICIONADO", label: "Aire acondicionado" },
  { value: "ELECTRICO_FOCO", label: "Electrico / foco" },
  { value: "CERRADURA_VENTANA", label: "Cerradura / ventana" },
  { value: "OTRO", label: "Otro" },
];

export function LimpiezaView() {
  const [tareas, setTareas] = useState<TareaLimpieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<EstadoTareaLimpieza | "">("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [reportando, setReportando] = useState<number | null>(null);
  const [formIncidencia, setFormIncidencia] = useState<{
    tipoIncidencia: TipoIncidencia;
    descripcion: string;
  }>({ tipoIncidencia: "OTRO", descripcion: "" });

  const cargar = useCallback(async () => {
    try {
      const data = await limpiezaApi.listar(filtro || undefined);
      setTareas(data);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las tareas de limpieza." });
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const avanzar = async (tarea: TareaLimpieza, nuevo: EstadoTareaLimpieza) => {
    setMensaje(null);
    try {
      await limpiezaApi.cambiarEstado(tarea.idTarea, nuevo);
      setMensaje({
        tipo: "ok",
        texto:
          nuevo === "COMPLETADA"
            ? `Habitacion ${tarea.habitacion?.numero ?? ""} lista y marcada como DISPONIBLE.`
            : `Limpieza iniciada en la habitacion ${tarea.habitacion?.numero ?? ""}.`,
      });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo actualizar la tarea." });
    }
  };

  const reportarIncidencia = async (tarea: TareaLimpieza) => {
    const idHabitacion = tarea.habitacion?.idHabitacion;
    if (!idHabitacion || !formIncidencia.descripcion.trim()) {
      setMensaje({ tipo: "error", texto: "Describe la incidencia antes de reportarla." });
      return;
    }
    try {
      await incidenciasApi.reportar({
        idHabitacion,
        tipoIncidencia: formIncidencia.tipoIncidencia,
        descripcion: formIncidencia.descripcion,
      });
      setMensaje({ tipo: "ok", texto: "Incidencia reportada a mantenimiento." });
      setReportando(null);
      setFormIncidencia({ tipoIncidencia: "OTRO", descripcion: "" });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo reportar la incidencia." });
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-4 sm:p-6 min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">
            Operacion › Housekeeping
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Tareas de Limpieza</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Al completar una tarea la habitacion pasa automaticamente a DISPONIBLE.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as EstadoTareaLimpieza | "")}
            className="border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            <option value="">Abiertas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="COMPLETADA">Completadas</option>
          </select>
          <button
            onClick={cargar}
            title="Refrescar"
            className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={14} />
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

      {cargando ? (
        <p className="p-6 text-center text-slate-400 text-xs">Cargando tareas...</p>
      ) : tareas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Sparkles size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs">No hay tareas de limpieza pendientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tareas.map((t) => (
            <div
              key={t.idTarea}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    Hab. {t.habitacion?.numero ?? "—"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t.habitacion?.tipoHabitacion?.nombre ?? ""}
                    {t.habitacion?.piso ? ` · Piso ${t.habitacion.piso}` : ""}
                  </p>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    t.estado === "PENDIENTE"
                      ? "bg-amber-100 text-amber-800"
                      : t.estado === "EN_PROCESO"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {t.estado}
                </span>
              </div>

              <p className="text-[11px] text-slate-500">
                {ORIGEN_LABEL[t.origen] ?? t.origen} ·{" "}
                {t.fechaCreacion ? t.fechaCreacion.slice(0, 16).replace("T", " ") : "—"}
              </p>

              {t.observaciones && (
                <p className="text-[10px] text-slate-600 bg-slate-50 rounded px-2 py-1.5">
                  {t.observaciones}
                </p>
              )}

              {t.estado !== "COMPLETADA" && (
                <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                  {t.estado === "PENDIENTE" && (
                    <button
                      onClick={() => avanzar(t, "EN_PROCESO")}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <PlayCircle size={14} /> Iniciar limpieza
                    </button>
                  )}
                  <button
                    onClick={() => avanzar(t, "COMPLETADA")}
                    className="w-full bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Marcar como lista
                  </button>
                  <button
                    onClick={() =>
                      setReportando(reportando === t.idTarea ? null : t.idTarea)
                    }
                    className="w-full border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Wrench size={13} /> Reportar incidencia
                  </button>
                </div>
              )}

              {reportando === t.idTarea && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <select
                    value={formIncidencia.tipoIncidencia}
                    onChange={(e) =>
                      setFormIncidencia((f) => ({
                        ...f,
                        tipoIncidencia: e.target.value as TipoIncidencia,
                      }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    {TIPOS_INCIDENCIA.map((t2) => (
                      <option key={t2.value} value={t2.value}>
                        {t2.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={formIncidencia.descripcion}
                    onChange={(e) =>
                      setFormIncidencia((f) => ({ ...f, descripcion: e.target.value }))
                    }
                    rows={2}
                    placeholder="Describe el problema..."
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    onClick={() => reportarIncidencia(t)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 rounded-lg"
                  >
                    Enviar reporte
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
