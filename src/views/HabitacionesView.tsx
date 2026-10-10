import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  BedDouble,
  LayoutGrid,
  List,
  Wrench,
  Sparkles,
  CheckCircle,
  X,
} from "lucide-react";
import api from "../api/axiosConfig";

interface TipoHabitacion {
  idTipoHabitacion: number;
  nombre: string;
  precioNoche: number;
  capacidadPersonas: number;
}

interface Habitacion {
  idHabitacion: number;
  numero: string;
  piso: number;
  descripcion: string;
  estadoOperativo: string;
  tipoHabitacion: TipoHabitacion;
}

const statusConfig: Record<string, { badge: string; dot: string; label: string }> = {
  DISPONIBLE:         { badge: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500",  label: "Disponible"      },
  RESERVADO:          { badge: "bg-blue-100 text-blue-800 border-blue-300",          dot: "bg-blue-500",    label: "Reservado"        },
  OCUPADA:            { badge: "bg-amber-100 text-amber-900 border-amber-300",       dot: "bg-amber-600",   label: "Ocupada"          },
  PENDIENTE_LIMPIEZA: { badge: "bg-amber-50 text-amber-800 border-amber-200",        dot: "bg-amber-500",   label: "Pend. Limpieza"   },
  EN_LIMPIEZA:        { badge: "bg-amber-50 text-amber-800 border-amber-200",        dot: "bg-amber-500",   label: "En Limpieza"      },
  MANTENIMIENTO:      { badge: "bg-rose-100 text-rose-800 border-rose-300",          dot: "bg-rose-600",    label: "Mantenimiento"    },
};

const ESTADOS_CAMBIO: Record<string, { label: string; estado: string }[]> = {
  DISPONIBLE: [
    { label: "Enviar a Limpieza", estado: "EN_LIMPIEZA" },
    { label: "Mantenimiento",     estado: "MANTENIMIENTO" },
  ],
  RESERVADO: [
    { label: "Liberar (cancelar reserva)", estado: "DISPONIBLE" },
  ],
  PENDIENTE_LIMPIEZA: [
    { label: "Iniciar Limpieza",  estado: "EN_LIMPIEZA" },
    { label: "Aprobar Limpieza",  estado: "DISPONIBLE" },
  ],
  EN_LIMPIEZA: [
    { label: "Aprobar Limpieza",  estado: "DISPONIBLE" },
  ],
  MANTENIMIENTO: [
    { label: "Dar de Alta",       estado: "DISPONIBLE" },
  ],
  OCUPADA: [],
};

const EMPTY_FORM = { idTipoHabitacion: "", numero: "", piso: "1", descripcion: "" };

export function HabitacionesView() {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [tipos, setTipos] = useState<TipoHabitacion[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useState("Todas");
  const [activeTypeFilter, setActiveTypeFilter]   = useState("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Habitacion[]>("/api/v1/habitaciones")
      .then((res) => setHabitaciones(res.data))
      .catch(() => {});
    api.get<TipoHabitacion[]>("/api/v1/tipos-habitacion")
      .then((res) => setTipos(res.data))
      .catch(() => {});
  }, []);

  const cambiarEstado = (id: number, estado: string) => {
    if (estado === "DISPONIBLE" && habitaciones.find(h => h.idHabitacion === id)?.estadoOperativo === "RESERVADO") {
      api.post(`/api/v1/reservas/por-habitacion/${id}/cancelar`)
        .then(() => api.get<Habitacion>(`/api/v1/habitaciones/${id}`))
        .then((res) => {
          setHabitaciones((prev) => prev.map((h) => h.idHabitacion === id ? res.data : h));
        })
        .catch(() => {});
      return;
    }
    api.patch(`/api/v1/habitaciones/${id}/estado`, { estado })
      .then((res) => {
        setHabitaciones((prev) => prev.map((h) => h.idHabitacion === id ? res.data : h));
      })
      .catch(() => {});
  };

  const crearHabitacion = async () => {
    if (!form.idTipoHabitacion || !form.numero || !form.piso) {
      setFormError("Completa los campos obligatorios.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await api.post<Habitacion>("/api/v1/habitaciones", {
        idTipoHabitacion: Number(form.idTipoHabitacion),
        numero: form.numero.trim(),
        piso: Number(form.piso),
        descripcion: form.descripcion.trim() || null,
      });
      setHabitaciones((prev) => [...prev, res.data]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? "Error al crear la habitacion.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = habitaciones.filter((h) => {
    if (activeStatusFilter !== "Todas") {
      if (activeStatusFilter === "Aprob. Limpieza" && h.estadoOperativo !== "PENDIENTE_LIMPIEZA") return false;
      else if (activeStatusFilter !== "Aprob. Limpieza") {
        const statusLabel = statusConfig[h.estadoOperativo]?.label ?? "";
        if (statusLabel !== activeStatusFilter) return false;
      }
    }
    if (activeTypeFilter !== "Todos" && h.tipoHabitacion.nombre !== activeTypeFilter) return false;
    if (searchTerm && !h.numero.includes(searchTerm) && !h.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const countByStatus = (status: string) => habitaciones.filter((h) => h.estadoOperativo === status).length;
  const tiposUnicos = [...new Set(habitaciones.map((h) => h.tipoHabitacion.nombre))];

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex justify-between items-start pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestion de Habitaciones</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">Control del inventario fisico, tarifas y estados operativos.</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(null); setForm(EMPTY_FORM); }}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm text-xs"
        >
          <Plus size={15} /> Nueva Habitacion
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-2.5">
        {[
          { label: "Total",        value: habitaciones.length,                                          color: "text-slate-900"   },
          { label: "Disponibles",  value: countByStatus("DISPONIBLE"),                                  color: "text-emerald-800" },
          { label: "Ocupadas",     value: countByStatus("OCUPADA"),                                     color: "text-amber-900"   },
          { label: "En Limpieza",  value: countByStatus("PENDIENTE_LIMPIEZA") + countByStatus("EN_LIMPIEZA"), color: "text-amber-600"   },
          { label: "Mantenimiento",value: countByStatus("MANTENIMIENTO"),                               color: "text-rose-700"    },
        ].map((k) => (
          <div key={k.label} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">ESTADO:</span>
            {["Todas", "Disponible", "Ocupada", "Aprob. Limpieza", "En Limpieza", "Mantenimiento"].map((st) => (
              <button
                key={st}
                onClick={() => setActiveStatusFilter(st)}
                className={`px-2.5 py-1 rounded-full font-medium text-[11px] transition-colors ${
                  activeStatusFilter === st ? "bg-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar habitacion..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              />
            </div>
            <div className="flex border border-slate-200 rounded-lg bg-slate-50 p-0.5">
              <button onClick={() => setViewMode("grid")} className={`p-1 rounded ${viewMode === "grid" ? "bg-white shadow-sm text-slate-900" : "text-slate-400"}`}><LayoutGrid size={15} /></button>
              <button onClick={() => setViewMode("list")} className={`p-1 rounded ${viewMode === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-400"}`}><List size={15} /></button>
            </div>
          </div>
        </div>
        {tiposUnicos.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] border-t border-slate-100 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">TIPO:</span>
            <button onClick={() => setActiveTypeFilter("Todos")} className={`px-2 py-0.5 rounded text-[10px] font-medium ${activeTypeFilter === "Todos" ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Todos</button>
            {tiposUnicos.map((t) => (
              <button key={t} onClick={() => setActiveTypeFilter(t)} className={`px-2 py-0.5 rounded text-[10px] font-medium ${activeTypeFilter === t ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <BedDouble size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No se encontraron habitaciones.</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-3 gap-4" : "space-y-2"}>
          {filtered.map((room) => {
            const cfg = statusConfig[room.estadoOperativo] ?? statusConfig.DISPONIBLE;
            const acciones = ESTADOS_CAMBIO[room.estadoOperativo] ?? [];
            return (
              <div key={room.idHabitacion} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-3 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-900 font-mono">{room.numero}</span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs">{room.tipoHabitacion.nombre}</h3>
                        <p className="text-[10px] text-slate-400">Piso {room.piso}{room.descripcion ? ` - ${room.descripcion}` : ""}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="p-3 space-y-2 text-[11px]">
                    <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Tarifa / noche</span>
                        <span className="text-lg font-bold text-slate-900">S/ {room.tipoHabitacion.precioNoche?.toFixed(2)}</span>
                      </div>
                      <div className="text-right text-[10px] text-slate-600">
                        <span className="block font-semibold">{room.tipoHabitacion.capacidadPersonas} personas</span>
                      </div>
                    </div>
                    {room.estadoOperativo === "DISPONIBLE" && (
                      <p className="text-[9px] text-emerald-800 flex items-center gap-1 bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
                        <CheckCircle size={11} /> Lista para ingresar
                      </p>
                    )}
                    {room.estadoOperativo === "MANTENIMIENTO" && (
                      <div className="bg-rose-50 p-2 rounded-lg text-[10px] text-rose-800 flex items-center gap-1">
                        <Wrench size={12} /> Fuera de servicio
                      </div>
                    )}
                    {(room.estadoOperativo === "EN_LIMPIEZA" || room.estadoOperativo === "PENDIENTE_LIMPIEZA") && (
                      <div className="bg-amber-50/70 p-2 rounded-lg text-[10px] text-amber-800 flex items-center gap-1">
                        <Sparkles size={12} /> Limpieza en proceso
                      </div>
                    )}
                  </div>
                </div>
                {acciones.length > 0 && (
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5">
                    {acciones.map((ac) => (
                      <button
                        key={ac.estado}
                        onClick={() => cambiarEstado(room.idHabitacion, ac.estado)}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white py-1 rounded text-[10px] font-semibold shadow-sm"
                      >
                        {ac.label}
                      </button>
                    ))}
                  </div>
                )}
                {room.estadoOperativo === "OCUPADA" && (
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 italic">Ocupada — checkout desde Recepcion</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nueva Habitacion */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col">
            <div className="flex items-start justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Nueva Habitacion</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Se creara con estado Disponible</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 ml-4"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              {formError && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded p-2">{formError}</p>}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Tipo de habitacion <span className="text-red-500">*</span></label>
                <select
                  value={form.idTipoHabitacion}
                  onChange={(e) => setForm((f) => ({ ...f, idTipoHabitacion: e.target.value }))}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                >
                  <option value="">-- Seleccionar --</option>
                  {tipos.map((t) => (
                    <option key={t.idTipoHabitacion} value={t.idTipoHabitacion}>
                      {t.nombre} — S/ {t.precioNoche?.toFixed(2)} / noche
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">N° habitacion <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                    placeholder="Ej: 101"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">Piso <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.piso}
                    onChange={(e) => setForm((f) => ({ ...f, piso: e.target.value }))}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Descripcion</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Vista al jardin, cama queen"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button onClick={crearHabitacion} disabled={saving} className="px-3 py-1.5 text-xs rounded-lg bg-[#1b4332] hover:bg-[#143427] text-white font-semibold disabled:opacity-50">
                {saving ? "Guardando..." : "Crear Habitacion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
