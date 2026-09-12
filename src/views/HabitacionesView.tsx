import { useState } from "react";
import {
  Plus,
  Search,
  BedDouble,
  Users,
  LayoutGrid,
  List,
  Edit3,
  Wrench,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Lock,
  Calendar,
  User,
  ShieldAlert,
} from "lucide-react";

export function HabitacionesView() {
  const [activeStatusFilter, setActiveStatusFilter] = useState("Todas");
  const [activeTypeFilter, setActiveTypeFilter] = useState("Todos los tipos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");

  const rooms = [
    {
      id: "204",
      name: "Matrimonial Jardín",
      floor: "Piso 2",
      details: "Balcón privado interior",
      type: "Matrimonial",
      status: "Disponible",
      statusBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      statusDot: "bg-emerald-500",
      price: "150.00",
      capacity: "2 personas",
      beds: "1 Cama Queen",
      image:
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80",
      note: "Inspeccionada hoy por Recepción • Lista para ingresar",
      actions: ["Editar", "Mantenimiento", "Bloquear"],
    },
    {
      id: "102",
      name: "Matrimonial",
      floor: "Piso 1",
      details: "Vista Huacachina",
      type: "Matrimonial",
      status: "Ocupada",
      statusBadge: "bg-amber-100 text-amber-900 border-amber-300",
      statusDot: "bg-amber-600",
      price: "140.00",
      capacity: "2 personas",
      beds: "1 Cama Queen",
      image:
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80",
      currentGuest: "Mateo Silva",
      stayDates: "Estadía 12 - 16 Nov",
      actions: ["Editar", "Cambiar Estado", "Desactivar"],
    },
    {
      id: "103",
      name: "Doble Simple",
      floor: "Piso 1",
      details: "Ala Poniente",
      type: "Doble Simple",
      status: "Mantenimiento",
      statusBadge: "bg-rose-100 text-rose-800 border-rose-300",
      statusDot: "bg-rose-600",
      price: "120.00",
      capacity: "2 personas",
      beds: "2 Camas Twin",
      maintenanceAlert: {
        title: "Habitación Fuera de Servicio",
        reason: "Reparación de grifería y ducha",
        reported: "Hoy 09:30 PET • Técnico Carlos",
      },
      actions: ["Editar", "Dar de Alta", "Fuera de servicio"],
    },
    {
      id: "105",
      name: "Familiar Palmeras",
      floor: "Piso 1",
      details: "Frente a piscina del huerto",
      type: "Familiar",
      status: "En Limpieza",
      statusBadge: "bg-amber-50 text-amber-800 border-amber-200",
      statusDot: "bg-amber-500",
      price: "220.00",
      capacity: "4 personas",
      beds: "1 Queen + 2 Twin",
      cleaningInfo: {
        housekeeper: "Housekeeping Rosa",
        progress: "Limpieza profunda en proceso",
      },
      actions: ["Editar", "Aprobar Limpieza"],
    },
    {
      id: "201",
      name: "Compartida 4 Camas",
      floor: "Piso 2",
      details: "Lockers personales • A/C",
      type: "Compartida",
      status: "Ocupada",
      statusBadge: "bg-amber-100 text-amber-900 border-amber-300",
      statusDot: "bg-amber-600",
      price: "45.00",
      capacity: "4 camas (por cama)",
      beds: "4 Litera Individual",
      currentGuest: "Lukas K. & Grupo",
      stayDates: "Estadía 12 - 15 Nov",
      actions: ["Editar", "Mantenimiento"],
    },
    {
      id: "202",
      name: "Matrimonial Oasis",
      floor: "Piso 2",
      details: "Vista Viñedos y dunas",
      type: "Matrimonial",
      status: "Reservada",
      statusBadge: "bg-blue-100 text-blue-900 border-blue-300",
      statusDot: "bg-blue-600",
      price: "160.00",
      capacity: "2 personas",
      beds: "1 Cama King",
      image:
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
      expectedCheckIn: "Hoy 18:00 PET",
      actions: ["Editar", "Cambiar Estado"],
    },
  ];

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      {/* Sub-header de módulo */}
      <div className="flex justify-between items-center text-[11px] text-slate-500 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">
            El Huerto Hostel — PE
          </span>
          <span className="bg-amber-500/10 text-amber-800 font-bold px-2 py-0.5 rounded text-[9px]">
            PANEL DE ADMINISTRACIÓN
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-slate-400">
            ALOJAMIENTO &gt; Inventario & Tarifario Base
          </span>
          <span className="font-semibold text-slate-700">
            Tarifas en Soles Peruanos (PEN / S/)
          </span>
        </div>
      </div>

      {/* Encabezado Principal */}
      <div className="flex justify-between items-start pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Gestión y Catálogo de Habitaciones
          </h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Control del inventario físico, capacidades, tarifas oficiales por
            noche y estados operativos del hostel.
          </p>
        </div>
        <button className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm text-xs">
          <Plus size={15} /> Registrar Nueva Habitación
        </button>
      </div>

      {/* Tarjetas KPI Top (6 Metricas) */}
      <div className="grid grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            TOTAL HABITACIONES
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-900">24</span>
            <span className="text-[9px] text-slate-500 font-medium">habs</span>
          </div>
          <span className="text-[9px] text-emerald-700 font-medium">
            100% inventario activo
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            OCUPADAS
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-amber-900">14</span>
            <span className="text-[9px] text-slate-500">/ 24 habs</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-amber-600 h-full" style={{ width: "58%" }}></div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            DISPONIBLES
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-emerald-800">7</span>
            <span className="text-[9px] text-slate-500">libres</span>
          </div>
          <span className="text-[9px] text-slate-500">3 Check-in listos</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            EN LIMPIEZA
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-800">2</span>
            <span className="text-[9px] text-slate-500">habs</span>
          </div>
          <span className="text-[9px] text-amber-700 font-medium">
            Turno Tarde
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            MANTENIMIENTO
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-rose-700">1</span>
            <span className="text-[9px] text-slate-500">hab</span>
          </div>
          <span className="text-[9px] text-rose-700 font-medium">
            Hab. 103 fuera
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            CAPACIDAD HUÉSPEDES
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-900">48</span>
            <span className="text-[9px] text-slate-500">plazas</span>
          </div>
          <span className="text-[9px] text-slate-500">
            Capacidad total en cama
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Control de Vista */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        {/* Fila 1: Filtros por Estado y Búsqueda */}
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              ESTADO:
            </span>

            {[
              { label: "Todas", count: 24 },
              { label: "Disponibles", count: 7 },
              { label: "Reservadas", count: 3 },
              { label: "Ocupadas", count: 14 },
              { label: "En Limpieza", count: 2 },
              { label: "Mantenimiento", count: 1 },
            ].map((st) => {
              const isActive = activeStatusFilter === st.label;
              return (
                <button
                  key={st.label}
                  onClick={() => setActiveStatusFilter(st.label)}
                  className={`px-2.5 py-1 rounded-full font-medium text-[11px] transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {st.label} ({st.count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search
                size={13}
                className="absolute left-2.5 top-2.5 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar hab. o huésped..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex border border-slate-200 rounded-lg bg-slate-50 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded ${viewMode === "grid" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-400"}`}
                title="Vista Tarjetas"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1 rounded ${viewMode === "list" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-400"}`}
                title="Vista Lista"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Fila 2: Filtros por Tipo de Cuarto */}
        <div className="flex items-center gap-1.5 text-[11px] border-t border-slate-100 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            TIPO DE CUARTO:
          </span>
          {[
            "Todos los tipos",
            "Matrimonial (8)",
            "Doble Simple (4)",
            "Familiar (4)",
            "Compartida (8)",
          ].map((type) => {
            const isActive = activeTypeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  isActive
                    ? "bg-emerald-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grilla de Tarjetas de Habitaciones */}
      <div className="grid grid-cols-3 gap-4">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
          >
            {/* Header Tarjeta */}
            <div>
              <div className="p-3 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-900 font-mono">
                    {room.id}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      {room.name}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {room.floor} • {room.details}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${room.statusBadge}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${room.statusDot}`}
                  ></span>
                  {room.status}
                </span>
              </div>

              {/* Imagen (Si aplica) */}
              {room.image && (
                <div className="h-28 w-full overflow-hidden relative">
                  <img
                    src={room.image}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded backdrop-blur-sm">
                    {room.capacity}
                  </div>
                </div>
              )}

              {/* Alerta de Mantenimiento */}
              {room.maintenanceAlert && (
                <div className="p-3 bg-rose-50 border-b border-rose-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[11px]">
                    <Wrench size={13} />
                    <span>{room.maintenanceAlert.title}</span>
                  </div>
                  <p className="text-[10px] text-rose-700">
                    <strong>Motivo:</strong> {room.maintenanceAlert.reason}
                  </p>
                  <p className="text-[9px] text-rose-500">
                    {room.maintenanceAlert.reported}
                  </p>
                </div>
              )}

              {/* Info de Limpieza en Proceso */}
              {room.cleaningInfo && (
                <div className="p-3 bg-amber-50/70 border-b border-amber-100 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles size={12} /> {room.cleaningInfo.housekeeper}
                    </span>
                    <span className="text-[9px] bg-amber-200/60 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                      En Curso
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-800">
                    {room.cleaningInfo.progress}
                  </p>
                </div>
              )}

              {/* Información General de Tarifa y Capacidad */}
              <div className="p-3 space-y-2 text-[11px]">
                <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">
                      TARIFA POR NOCHE
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      S/ {room.price}
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-slate-600">
                    <span className="block font-semibold">{room.beds}</span>
                    <span className="text-[9px] text-slate-400">
                      {room.capacity}
                    </span>
                  </div>
                </div>

                {/* Info adicional (Huésped actual o Nota de recepción) */}
                {room.currentGuest && (
                  <div className="bg-slate-50 p-2 rounded-lg text-[10px] flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        HUÉSPED ACTUAL
                      </span>
                      <strong className="text-slate-800">
                        {room.currentGuest}
                      </strong>
                    </div>
                    <span className="text-[9px] text-slate-500 font-medium">
                      {room.stayDates}
                    </span>
                  </div>
                )}

                {room.expectedCheckIn && (
                  <div className="bg-blue-50/60 p-2 rounded-lg text-[10px] flex justify-between items-center text-blue-900">
                    <span className="font-medium">Check-in Previsto</span>
                    <strong className="font-bold">
                      {room.expectedCheckIn}
                    </strong>
                  </div>
                )}

                {room.note && (
                  <p className="text-[9px] text-emerald-800 flex items-center gap-1 bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
                    <CheckCircle size={11} /> {room.note}
                  </p>
                )}
              </div>
            </div>

            {/* Acciones de Tarjeta */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5">
              {room.status === "Mantenimiento" ? (
                <>
                  <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 py-1 rounded text-[10px] font-semibold">
                    Editar
                  </button>
                  <button className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white py-1 rounded text-[10px] font-semibold shadow-sm">
                    Dar de Alta
                  </button>
                </>
              ) : room.status === "En Limpieza" ? (
                <>
                  <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 py-1 rounded text-[10px] font-semibold">
                    Editar
                  </button>
                  <button className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white py-1 rounded text-[10px] font-semibold shadow-sm">
                    Aprobar Limpieza
                  </button>
                </>
              ) : (
                <>
                  <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 py-1 rounded text-[10px] font-semibold">
                    Editar
                  </button>
                  <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 py-1 rounded text-[10px] font-semibold">
                    Mantenimiento
                  </button>
                  <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                    <Lock size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
