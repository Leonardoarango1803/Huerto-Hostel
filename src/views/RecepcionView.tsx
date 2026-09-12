import { BedDouble, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { Room } from "../types";

const mockRooms: Room[] = [
  {
    id: "1",
    number: "101",
    type: "Matrimonial Standard",
    capacity: 2,
    pricePerNight: 120,
    status: "ocupado",
    guestName: "Juan Pérez",
    checkOutDate: "14 Sep 2026",
  },
  {
    id: "2",
    number: "102",
    type: "Doble Twin",
    capacity: 2,
    pricePerNight: 140,
    status: "disponible",
  },
  {
    id: "3",
    number: "103",
    type: "Shared Dorm (6 beds)",
    capacity: 6,
    pricePerNight: 45,
    status: "disponible",
  },
  {
    id: "4",
    number: "201",
    type: "Suite Deluxe",
    capacity: 2,
    pricePerNight: 220,
    status: "limpieza",
  },
  {
    id: "5",
    number: "202",
    type: "Matrimonial Balcón",
    capacity: 2,
    pricePerNight: 160,
    status: "ocupado",
    guestName: "Maria Gomez",
    checkOutDate: "13 Sep 2026",
  },
  {
    id: "6",
    number: "203",
    type: "Doble Twin",
    capacity: 2,
    pricePerNight: 140,
    status: "mantenimiento",
  },
];

export function RecepcionView() {
  const statusStyles = {
    disponible: "bg-emerald-50 text-emerald-800 border-emerald-200",
    ocupado: "bg-rose-50 text-rose-800 border-rose-200",
    limpieza: "bg-amber-50 text-amber-800 border-amber-200",
    mantenimiento: "bg-slate-100 text-slate-700 border-slate-300",
  };

  const statusLabels = {
    disponible: "Disponible",
    ocupado: "Ocupada",
    limpieza: "En Limpieza",
    mantenimiento: "Mantenimiento",
  };

  return (
    <div className="space-y-6">
      {/* Título de la sección */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Panel de Recepción
          </h1>
          <p className="text-xs text-slate-500">
            Estado en tiempo real de las habitaciones y disponibilidad.
          </p>
        </div>
        <button className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-4 py-2 rounded-lg font-semibold shadow-sm transition-all">
          + Nueva Reserva / Check-in
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Habitaciones Libres
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">2</p>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Ocupadas</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">2</p>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-lg text-rose-700">
            <BedDouble size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">En Limpieza</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">1</p>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Mantenimiento
            </p>
            <p className="text-2xl font-bold text-slate-700 mt-1">1</p>
          </div>
          <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Grid de Habitaciones */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 mb-3">
          Estado de Habitaciones
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-lg font-extrabold text-slate-800">
                    Hab. {room.number}
                  </span>
                  <p className="text-xs text-slate-500">{room.type}</p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusStyles[room.status]}`}
                >
                  {statusLabels[room.status]}
                </span>
              </div>

              {room.status === "ocupado" && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs mb-3 space-y-1">
                  <p className="font-medium text-slate-700">
                    Huésped:{" "}
                    <span className="font-semibold">{room.guestName}</span>
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Salida: {room.checkOutDate}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-800">
                  S/ {room.pricePerNight}{" "}
                  <span className="text-[10px] font-normal text-slate-500">
                    / noche
                  </span>
                </span>
                <button className="text-emerald-800 font-semibold hover:underline text-xs">
                  Ver detalle
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
