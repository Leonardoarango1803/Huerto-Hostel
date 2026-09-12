import { useState } from "react";
import {
  Download,
  Search,
  Printer,
  FileText,
  Clock,
  User,
  Phone,
  Mail,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  History,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
} from "lucide-react";

export function ReservasView() {
  const [selectedFolioId, setSelectedFolioId] = useState("RES-2024-108");
  const [searchTerm, setSearchTerm] = useState("");

  const reservations = [
    {
      id: "RES-2024-108",
      channel: "Mostrador",
      time: "11:24",
      guestName: "Mateo Silva Carrión",
      docType: "DNI",
      docNumber: "72491028",
      phone: "+51 956 123 456",
      email: "mateo.silva@email.com",
      room: "Hab 102",
      roomType: "Matrimonial Jardín",
      checkIn: "24/10/2024",
      checkInSub: "14:00 Check-in",
      checkOut: "27/10/2024",
      checkOutSub: "3 noches • 2 pax",
      total: "515.00",
      pending: "215.00",
      status: "En estadía",
      statusColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    },
    {
      id: "RES-2024-109",
      channel: "WhatsApp",
      time: "09:15",
      guestName: "Luciana Vega Wong",
      docType: "CE",
      docNumber: "004819201",
      phone: "+51 987 654 321",
      email: "luciana.vega@email.com",
      room: "Hab 204",
      roomType: "Doble Estándar",
      checkIn: "25/10/2024",
      checkInSub: "Reserva ant.",
      checkOut: "28/10/2024",
      checkOutSub: "3 noches • 2 pax",
      total: "420.00",
      pending: "0.00",
      status: "Confirmada",
      statusColor: "bg-blue-100 text-blue-800 border-blue-300",
    },
    {
      id: "RES-2024-110",
      channel: "Mostrador",
      time: "14:02",
      guestName: "Rodrigo Paredes Soto",
      docType: "DNI",
      docNumber: "45192837",
      phone: "+51 912 345 678",
      email: "rodrigo.paredes@email.com",
      room: "Dorm 108-B",
      roomType: "Cama Compartida",
      checkIn: "24/10/2024",
      checkInSub: "14:02 Check-in",
      checkOut: "25/10/2024",
      checkOutSub: "1 noche • 1 pax",
      total: "65.00",
      pending: "0.00",
      status: "Finalizada",
      statusColor: "bg-slate-200 text-slate-800 border-slate-300",
    },
    {
      id: "RES-2024-111",
      channel: "Teléfono",
      time: "16:30",
      guestName: "Valeria Castro Ruiz",
      docType: "DNI",
      docNumber: "10293847",
      phone: "+51 944 556 677",
      email: "valeria.castro@email.com",
      room: "Hab 201",
      roomType: "Familiar Palmeras",
      checkIn: "28/10/2024",
      checkInSub: "Pendiente llegada",
      checkOut: "31/10/2024",
      checkOutSub: "3 noches • 4 pax",
      total: "680.00",
      pending: "680.00",
      status: "Pendiente",
      statusColor: "bg-amber-100 text-amber-800 border-amber-300",
    },
    {
      id: "RES-2024-105",
      channel: "Mostrador",
      time: "18:10",
      guestName: "Jean-Pierre Dupont",
      docType: "PAS",
      docNumber: "FRA-99210",
      phone: "+33 612 345 678",
      email: "jp.dupont@email.com",
      room: "Hab 105",
      roomType: "Matrimonial",
      checkIn: "22/10/2024",
      checkInSub: "No-show",
      checkOut: "24/10/2024",
      checkOutSub: "Anulada",
      total: "0.00",
      pending: "0.00",
      status: "Cancelada",
      statusColor: "bg-red-100 text-red-800 border-red-300",
    },
  ];

  const selectedFolio =
    reservations.find((r) => r.id === selectedFolioId) || reservations[0];

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center text-[11px] text-slate-500 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">
            El Huerto Hostel — Ica, PE
          </span>
          <span className="bg-amber-500/10 text-amber-800 font-bold px-2 py-0.5 rounded text-[9px]">
            PANEL DE ADMINISTRACIÓN
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span>15:42 PET • 14 Nov 2026</span>
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{" "}
            Recepción Activa
          </span>
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
            <div className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-[9px]">
              AM
            </div>
            <span className="font-bold text-slate-800">Alejandro Morales</span>
          </div>
        </div>
      </div>

      {/* Header Título & Botón Exportar */}
      <div className="flex justify-between items-start pt-1">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            AUDITORÍA PRESENCIAL • Recepción El Huerto (Ica)
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Supervisión Central de Reservas
          </h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Consulta integral y auditoría de reservas presenciales registradas
            directamente en el counter por el personal de turno. Sin
            intermediarios OTA ni pasarelas virtuales.
          </p>
        </div>
        <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm text-xs">
          <Download size={14} /> Exportar Lista (CSV / PDF)
        </button>
      </div>

      {/* KPI Cards Top */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Ocupación Física
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">87.5%</span>
            <span className="text-[10px] text-slate-500 font-medium">
              14/16 habs
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Saldos en Counter
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">S/ 1,480</span>
            <span className="text-[10px] text-amber-700 font-semibold">
              por liquidar
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Entradas Hoy
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">6 Pax</span>
            <span className="text-[10px] text-slate-500 font-medium">
              4 Check-in
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Personal Activo
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">2 Turnos</span>
            <span className="text-[10px] text-slate-500">
              C. Vidal / C. Mendoza
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-2.5 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar código, huésped o DNI"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none"
            />
          </div>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
            <Calendar size={13} /> Este mes - Oct
          </button>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            Estado: Todos
          </button>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            Pago: Todos
          </button>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-3">
          <span>Visualizando 6 registros presenciales filtrados</span>
          <span>•</span>
          <span>Canales: Mostrador / WhatsApp Directo Ica</span>
          <button className="text-emerald-800 hover:underline font-semibold">
            Restablecer vista
          </button>
        </div>
      </div>

      {/* Grid Principal (8 cols Tabla + Bitácora / 4 cols Folio Detail) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Columna Izquierda (8 cols) */}
        <div className="col-span-8 space-y-4">
          {/* Tabla de Reservas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Código</th>
                  <th className="p-3">Huésped</th>
                  <th className="p-3">Habitación</th>
                  <th className="p-3">Fecha Entrada</th>
                  <th className="p-3">Fecha Salida</th>
                  <th className="p-3">Total</th>
                  <th className="p-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((item) => {
                  const isSelected = selectedFolioId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedFolioId(item.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-emerald-50/60 font-medium"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="p-3 font-bold text-slate-900">
                        <span className="block text-emerald-800">
                          #{item.id}
                        </span>
                        <span className="text-[9px] text-slate-400 font-normal">
                          {item.channel} {item.time}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">
                          {item.guestName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.docType} {item.docNumber}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">
                          {item.room}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.roomType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="block text-slate-800">
                          {item.checkIn}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.checkInSub}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="block text-slate-800">
                          {item.checkOut}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.checkOutSub}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">
                          S/ {item.total}
                        </span>
                        <span
                          className={`text-[9px] font-semibold ${
                            parseFloat(item.pending) > 0
                              ? "text-amber-700"
                              : "text-slate-400"
                          }`}
                        >
                          {parseFloat(item.pending) > 0
                            ? `Pend: S/ ${item.pending}`
                            : "Liquidado"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.statusColor}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[10px] text-slate-500">
              <span>
                Filas por página: 15 • Total registros supervisados: 148
              </span>
              <div className="flex items-center gap-1">
                <button className="p-1 hover:bg-slate-200 rounded">
                  <ChevronLeft size={14} />
                </button>
                <button className="px-2 py-0.5 bg-slate-800 text-white rounded font-bold">
                  1
                </button>
                <button className="px-2 py-0.5 hover:bg-slate-200 rounded">
                  2
                </button>
                <button className="px-2 py-0.5 hover:bg-slate-200 rounded">
                  3
                </button>
                <button className="p-1 hover:bg-slate-200 rounded">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Bitácora de Eventos en Counter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <History size={14} className="text-slate-600" /> Bitácora de
                Eventos en Counter
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Turno Mañana/Tarde — 24 Oct
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Camila Mendoza</span>
                  <span className="text-slate-400">15:10 PET</span>
                </div>
                <p className="text-slate-600">
                  Registró consumo presencial:{" "}
                  <strong className="text-slate-800">
                    1x Salchipapa Huerto (S/ 15.00)
                  </strong>{" "}
                  cargado al folio #RES-2024-108.
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Carlos Vidal</span>
                  <span className="text-slate-400">14:32 PET</span>
                </div>
                <p className="text-slate-600">
                  Cobro en efectivo de{" "}
                  <strong className="text-slate-800">S/ 100.00</strong> como
                  abono para Hab 102 (Boleta física #B01-449).
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Camila Mendoza</span>
                  <span className="text-slate-400">11:24 PET</span>
                </div>
                <p className="text-slate-600">
                  Creación presencial y check-in inmediato de reserva{" "}
                  <strong className="text-slate-800">#RES-2024-108</strong>{" "}
                  (Huésped Mateo Silva).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Panel Lateral Detalle del Folio (4 cols) */}
        <div className="col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          {/* Status Header */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              EXPEDIENTE AUDITADO
            </span>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">
                Folio #{selectedFolio.id}
              </p>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded uppercase">
                {selectedFolio.status}
              </span>
            </div>
          </div>

          <h2 className="text-base font-bold text-slate-900">
            Supervisión de Folio
          </h2>

          {/* Identidad del Huésped */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
              <span>Identidad del Huésped</span>
              <User size={13} />
            </div>
            <p className="font-bold text-slate-900 text-sm">
              {selectedFolio.guestName}
            </p>
            <div className="text-[10px] text-slate-600 space-y-0.5">
              <p>
                DOCUMENTO:{" "}
                <strong className="text-slate-800">
                  {selectedFolio.docType} {selectedFolio.docNumber}
                </strong>
              </p>
              <p className="flex items-center gap-1">
                <Phone size={10} /> {selectedFolio.phone}
              </p>
              <p className="flex items-center gap-1">
                <Mail size={10} /> {selectedFolio.email}
              </p>
            </div>
          </div>

          {/* Alojamiento Presencial */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px]">
            <div className="flex justify-between items-center text-slate-400 font-bold uppercase">
              <span>Alojamiento Presencial</span>
              <BedDouble size={13} />
            </div>
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-slate-900 text-xs">
                {selectedFolio.room}
              </span>
              <span className="text-slate-500">Tarifa Pactada</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">
                {selectedFolio.roomType} • 2 Huéspedes
              </span>
              <span className="font-bold text-slate-900">
                S/ 150.00 / noche
              </span>
            </div>
            <p className="text-slate-400 pt-1 border-t border-slate-200/60">
              📅 24 al 27 Octubre 2026 —{" "}
              <strong className="text-slate-700">3 noches (S/ 450.00)</strong>
            </p>
          </div>

          {/* Abonos Presenciales */}
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between text-slate-400 font-bold uppercase border-b border-slate-100 pb-1">
              <span>Abonos Presenciales</span>
              <span className="text-slate-800 font-bold">Total: S/ 300.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                Anticipo en Caja{" "}
                <span className="text-slate-400">
                  (Yape Presencial • 20/10 11:30)
                </span>
              </span>
              <span className="font-semibold text-slate-800">S/ 200.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                Abono Check-in{" "}
                <span className="text-slate-400">
                  (Efectivo Mostrador • 24/10 14:32)
                </span>
              </span>
              <span className="font-semibold text-slate-800">S/ 100.00</span>
            </div>
          </div>

          {/* Consumos en Propiedad */}
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between text-slate-400 font-bold uppercase border-b border-slate-100 pb-1">
              <span>Consumos en Propiedad</span>
              <span className="text-slate-800 font-bold">Total: S/ 65.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>2x Desayunos Continental Huerto</span>
              <span className="font-semibold text-slate-800">S/ 30.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>1x Servicio de Lavandería (Bolsa 3kg)</span>
              <span className="font-semibold text-slate-800">S/ 20.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>1x Salchipapa Huerto Oasis</span>
              <span className="font-semibold text-slate-800">S/ 15.00</span>
            </div>
          </div>

          {/* Caja Resumen Financiero */}
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Hospedaje base (3 noches):</span>
              <span>S/ 450.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Consumos internos cargados:</span>
              <span>+ S/ 65.00</span>
            </div>
            <div className="flex justify-between text-slate-600 border-b border-amber-200/60 pb-1">
              <span>Abonos recibidos en caja:</span>
              <span>- S/ 300.00</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <div>
                <strong className="block text-amber-900 font-bold text-xs">
                  SALDO PENDIENTE DE COBRO
                </strong>
                <span className="text-[9px] text-amber-700">
                  A liquidar en Counter al Check-out
                </span>
              </div>
              <span className="text-xl font-bold text-amber-800">
                S/ {selectedFolio.pending}
              </span>
            </div>
          </div>

          {/* Trazabilidad de Registro */}
          <p className="text-[9px] text-slate-400 leading-tight">
            🛡️ <strong>Trazabilidad de Registro:</strong> Registrada
            presencialmente por Recepcionista <strong>Camila Mendoza</strong> el
            20/10/2026 a las 11:24 PET en Terminal Recepción 01.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px]">
              <Printer size={13} /> Imprimir Folio
            </button>
            <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[10px]">
              <FileText size={13} /> Exportar Folio PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
