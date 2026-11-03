import { useState, useEffect, useCallback } from "react";
import { Wrench, Plus, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { incidenciasApi } from "../api/incidencias";
import { habitacionesApi } from "../api/habitaciones";
import type {
  EstadoIncidencia,
  Habitacion,
  IncidenciaMantenimiento,
  TipoIncidencia,
} from "../api/types";

const TIPOS: { value: TipoIncidencia; label: string }[] = [
  { value: "GRIFERIA_DUCHA", label: "Griferia / ducha" },
  { value: "AIRE_ACONDICIONADO", label: "Aire acondicionado" },
  { value: "ELECTRICO_FOCO", label: "Electrico / foco" },
  { value: "CERRADURA_VENTANA", label: "Cerradura / ventana" },
  { value: "OTRO", label: "Otro" },
];

const BADGE: Record<EstadoIncidencia, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  EN_REPARACION: "bg-blue-100 text-blue-800",
  RESUELTO: "bg-emerald-100 text-emerald-800",
};

export function IncidenciasView() {
  const [incidencias, setIncidencias] = useState<IncidenciaMantenimiento[]>([]);
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [filtro, setFiltro] = useState<EstadoIncidencia | "">("");
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [form, setForm] = useState<{
    idHabitacion: string;
    tipoIncidencia: TipoIncidencia;
    descripcion: string;
  }>({ idHabitacion: "", tipoIncidencia: "OTRO", descripcion: "" });

  const cargar = useCallback(async () => {
    try {
      const data = await incidenciasApi.listar(filtro || undefined);
      setIncidencias(data);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las incidencias." });
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    habitacionesApi
      .listar()
      .then(setHabitaciones)
      .catch(() => undefined);
  }, []);

  const reportar = async () => {
    if (!form.idHabitacion || !form.descripcion.trim()) {
      setMensaje({ tipo: "error", texto: "Selecciona la habitacion y describe el problema." });
      return;
    }
    try {
      await incidenciasApi.reportar({
        idHabitacion: Number(form.idHabitacion),
        tipoIncidencia: form.tipoIncidencia,
        descripcion: form.descripcion,
      });
      setMensaje({ tipo: "ok", texto: "Incidencia registrada." });
      setForm({ idHabitacion: "", tipoIncidencia: "OTRO", descripcion: "" });
      setMostrarForm(false);
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo registrar la incidencia." });
    }
  };

  const avanzar = async (inc: IncidenciaMantenimiento, estado: EstadoIncidencia) => {
    setMensaje(null);
    try {
      await incidenciasApi.cambiarEstado(inc.idIncidencia, estado);
      setMensaje({
        tipo: "ok",
        texto:
          estado === "EN_REPARACION"
            ? "Incidencia en reparacion. La habitacion quedo en MANTENIMIENTO."
            : "Incidencia resuelta. La habitacion pasa a limpieza antes de venderse.",
      });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo actualizar la incidencia." });
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">
            Operacion › Mantenimiento
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Incidencias de Mantenimiento</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Averias reportadas por habitacion y su seguimiento hasta la reparacion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as EstadoIncidencia | "")}
            className="border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            <option value="">Todas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_REPARACION">En reparacion</option>
            <option value="RESUELTO">Resueltas</option>
          </select>
          <button
            onClick={cargar}
            title="Refrescar"
            className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Plus size={13} /> Reportar
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

      {mostrarForm && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
            Nueva incidencia
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Habitacion
              </label>
              <select
                value={form.idHabitacion}
                onChange={(e) => setForm((f) => ({ ...f, idHabitacion: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="">Selecciona...</option>
                {habitaciones.map((h) => (
                  <option key={h.idHabitacion} value={h.idHabitacion}>
                    Hab. {h.numero} — {h.estadoOperativo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Tipo
              </label>
              <select
                value={form.tipoIncidencia}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipoIncidencia: e.target.value as TipoIncidencia }))
                }
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Descripcion
              </label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Detalle del problema"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
          <button
            onClick={reportar}
            className="bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            Registrar incidencia
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <p className="p-4 text-center text-slate-400 text-xs">Cargando...</p>
        ) : incidencias.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wrench size={30} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No hay incidencias registradas.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Habitacion</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Descripcion</th>
                <th className="p-3">Reportada</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidencias.map((i) => (
                <tr key={i.idIncidencia} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">
                    Hab. {i.habitacion?.numero ?? "—"}
                  </td>
                  <td className="p-3 text-slate-600">
                    {TIPOS.find((t) => t.value === i.tipoIncidencia)?.label ?? i.tipoIncidencia}
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">{i.descripcion}</td>
                  <td className="p-3 text-slate-400">
                    {i.fechaReporte ? i.fechaReporte.slice(0, 16).replace("T", " ") : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${BADGE[i.estado]}`}>
                      {i.estado}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {i.estado === "PENDIENTE" && (
                      <button
                        onClick={() => avanzar(i, "EN_REPARACION")}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                      >
                        Iniciar reparacion
                      </button>
                    )}
                    {i.estado === "EN_REPARACION" && (
                      <button
                        onClick={() => avanzar(i, "RESUELTO")}
                        className="bg-[#1b4332] hover:bg-[#143427] text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                      >
                        Marcar resuelta
                      </button>
                    )}
                    {i.estado === "RESUELTO" && (
                      <span className="text-[10px] text-slate-400">
                        {i.fechaResolucion ? i.fechaResolucion.slice(0, 10) : "—"}
                      </span>
                    )}
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
