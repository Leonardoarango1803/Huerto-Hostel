import { useState } from "react";
import {
  Users,
  BedDouble,
  Award,
  Globe,
  Search,
  Plus,
  Download,
  Calendar,
  MoreVertical,
  LogIn,
  FileText,
  ShieldCheck,
  Edit3,
  Filter,
  RotateCcw,
} from "lucide-react";

export function HuespedesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("En Casa (14)");

  const guests = [
    {
      id: 1,
      initials: "MS",
      avatarBg: "bg-emerald-800 text-white",
      name: "Mateo Silva Carrión",
      tag: "Frecuente • 3ª visita",
      docType: "DNI",
      docNum: "72481920",
      registered: "Ene 2026",
      originFlag: "🇵🇪",
      originCity: "Lima, Perú",
      phone: "+51 956 123 789",
      email: "mateo.silva@gmail.com",
      preferences: [
        { label: "Planta baja", icon: "⬇️" },
        { label: "Dieta vegetariana", icon: "🥗" },
        { label: "Silenciosa", icon: "🔇" },
      ],
      historyVisits: "3 visitas (8 noches)",
      historyAmount: "S/ 1,480.00 acumulados",
      lastVisit: "Última: 22 Oct 2026",
      status: "En Casa • Hab. 102",
      statusSub: "Matrimonial • Salida: 25 Oct",
      statusColor: "bg-emerald-800 text-white",
      actionType: "in-house",
    },
    {
      id: 2,
      initials: "AD",
      avatarBg: "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
      name: "Antoine Dubois",
      tag: "Turista Extranjero",
      docType: "PAS",
      docNum: "21FR90421",
      registered: "Exonerado IGV (TAM)",
      originFlag: "🇫🇷",
      originCity: "Burdeos, Francia",
      phone: "+33 6 12 34 56 78",
      email: "a.dubois@gvoyage.fr",
      preferences: [
        { label: "Piso alto con balcón", icon: "🏢" },
        { label: "Cata de Pisco Iqueño", icon: "🍷" },
      ],
      historyVisits: "1ª visita (2 noches)",
      historyAmount: "S/ 390.00 pendiente",
      lastVisit: "Reserva Booking.com",
      status: "Llega Hoy • 17:30",
      statusSub: "Hab. 204 • Asignada",
      statusColor:
        "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
      actionType: "checkin",
    },
    {
      id: 3,
      initials: "VG",
      avatarBg: "bg-slate-200 text-slate-700 font-bold",
      name: "Valeria Goycochea",
      tag: "Familia (3 pax)",
      docType: "DNI",
      docNum: "71209384",
      registered: "Arequipa",
      originFlag: "🇵🇪",
      originCity: "Arequipa, Perú",
      phone: "+51 984 552 110",
      email: "valeria.g@outlook.pe",
      preferences: [
        { label: "Cuna adicional", icon: "👶" },
        { label: "Cerca al jardín", icon: "🌿" },
      ],
      historyVisits: "2 visitas (5 noches)",
      historyAmount: "S/ 920.00 acumulados",
      lastVisit: "Pagado total",
      status: "Check-out Hoy • 12:00",
      statusSub: "Equipaje en custodia (Rack #4)",
      statusColor:
        "bg-slate-100 text-slate-700 border border-slate-300 font-medium",
      actionType: "checkout",
    },
    {
      id: 4,
      initials: "CP",
      avatarBg: "bg-emerald-700 text-white font-bold",
      name: "Carlos Paredes V.",
      tag: "Corporativo • 4ª visita",
      docType: "DNI",
      docNum: "09483721",
      registered: "Factura RUC 20561234901",
      originFlag: "🇵🇪",
      originCity: "Cusco, Perú",
      phone: "+51 974 332 901",
      email: "c.paredes@cusconet.pe",
      preferences: [
        { label: "Factura empresa obligatoria", icon: "📄" },
        { label: "Early check-in 11:00", icon: "⏰" },
      ],
      historyVisits: "4 visitas (6 noches)",
      historyAmount: "S/ 1,150.00 total",
      lastVisit: "Cliente frecuente B2B",
      status: "En Casa • Hab. 101",
      statusSub: "Individual Ejecutiva",
      statusColor: "bg-emerald-800 text-white",
      actionType: "in-house",
    },
    {
      id: 5,
      initials: "LR",
      avatarBg: "bg-slate-100 text-slate-500 font-bold border border-slate-200",
      name: "Lucía Romero",
      tag: "Regular",
      docType: "DNI",
      docNum: "45091283",
      registered: "Trujillo",
      originFlag: "🇵🇪",
      originCity: "Trujillo, Perú",
      phone: "+51 944 112 003",
      email: "lromero@gmail.com",
      preferences: [{ label: "Vista piscina / huerto", icon: "🏊‍♂️" }],
      historyVisits: "1 visita (3 noches)",
      historyAmount: "S/ 480.00",
      lastVisit: "Pagos liquidados",
      status: "Check-out 24 Oct (Ayer)",
      statusSub: "Sin estadía activa",
      statusColor: "bg-slate-100 text-slate-500 border border-slate-200",
      actionType: "past",
    },
    {
      id: 6,
      initials: "SD",
      avatarBg: "bg-amber-100 text-amber-800 border border-amber-300 font-bold",
      name: "Sophie Dupont",
      tag: "Turista Mochilera",
      docType: "PAS",
      docNum: "21FR9912",
      registered: "Lyon, Francia",
      originFlag: "🇫🇷",
      originCity: "Lyon, Francia",
      phone: "+33 7 88 90 12 34",
      email: "sophie.d@voyages.com",
      preferences: [
        { label: "Tour Buggy Huacachina", icon: "🏎️" },
        { label: "Locker grande", icon: "🔒" },
      ],
      historyVisits: "1ª visita (2 noches)",
      historyAmount: "S/ 160.00",
      lastVisit: "Cama Compartida #3",
      status: "Por llegar • 16:00",
      statusSub: "Dormitorio Compartido 204",
      statusColor:
        "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
      actionType: "checkin",
    },
  ];

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      {/* Encabezado Superior con Botones de Acción */}
      <div className="flex justify-between items-start pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
              FICHERO MAESTRO
            </span>
            <span className="text-[10px] text-slate-400">
              • MINCETUR D.S. N° 001-2015-MINCETUR
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Directorio de Huéspedes
          </h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Historial de huéspedes, preferencias de hospedaje, documentos de
            identidad y registro de fidelidad en Ica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm text-xs">
            <Download size={14} /> Exportar Padrón Policial
          </button>
          <button className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm text-xs">
            <Plus size={15} /> Registrar Nuevo Huésped
          </button>
        </div>
      </div>

      {/* Tarjetas KPI Superiores (4 columnas) */}
      <div className="grid grid-cols-4 gap-3">
        {/* Total Registrados */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL REGISTRADOS
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-slate-900">342</span>
              <span className="text-[10px] text-slate-500 font-medium">
                acumulados
              </span>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">
              📈 +18 nuevos este mes de octubre
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        {/* Huéspedes en casa */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              HUÉSPEDES EN CASA (HOY)
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-slate-900">14</span>
              <span className="text-[10px] text-slate-500 font-medium">
                en 9 habitaciones activas
              </span>
            </div>
            <div className="w-36 bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full"
                style={{ width: "75%" }}
              ></div>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <BedDouble size={18} />
          </div>
        </div>

        {/* Huéspedes frecuentes */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              HUÉSPEDES FRECUENTES
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">58</span>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                17% fidelidad
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              🎯 ≥ 2 visitas en El Huerto Ica
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Award size={18} />
          </div>
        </div>

        {/* Nacionalidades clave */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              NACIONALIDADES CLAVE
            </p>
            <div className="mt-1.5 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>🇵🇪 Perú (Nacionales)</span>
                <strong className="text-slate-800">62%</strong>
              </div>
              <div className="flex justify-between">
                <span>🇫🇷 Francia</span>
                <strong className="text-slate-800">14%</strong>
              </div>
              <div className="flex justify-between">
                <span>🇩🇪 Alemania & Otros</span>
                <strong className="text-slate-800">24%</strong>
              </div>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center ml-2">
            <Globe size={18} />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, DNI, Pasaporte, correo o teléfono..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              />
            </div>

            <select className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none font-medium">
              <option>En Casa Ahora (Activos)</option>
              <option>Todos los huéspedes</option>
              <option>Check-in hoy</option>
              <option>Check-out hoy</option>
            </select>

            <select className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none font-medium">
              <option>Este año (2026)</option>
              <option>Año 2025</option>
              <option>Histórico completo</option>
            </select>

            <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
              <RotateCcw size={12} /> Limpiar
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Filtros Rápidos:
            </span>

            {[
              "En Casa (14)",
              "Llegan Hoy (3)",
              "Con Notas Especiales (8)",
              "Extranjeros con Tasa 0% IGV (18)",
            ].map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
            />
            <span className="font-medium">
              Solo con reservas activas o pendientes
            </span>
          </label>
        </div>
      </div>

      {/* Tabla de Huéspedes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <th className="p-3">Huésped / Documento</th>
              <th className="p-3">Contacto & Procedencia</th>
              <th className="p-3">Preferencias & Alertas</th>
              <th className="p-3">Historial / Noches</th>
              <th className="p-3">Estado Actual</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {guests.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50/70 transition-colors"
              >
                {/* Huésped / Documento */}
                <td className="p-3">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] shrink-0 ${item.avatarBg}`}
                    >
                      {item.initials}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        {item.name}
                      </span>
                      <span className="inline-block bg-slate-100 text-slate-700 text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5">
                        {item.tag}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <span>
                          {item.docType}:{" "}
                          <strong className="text-slate-700">
                            {item.docNum}
                          </strong>
                        </span>
                        <span className="mx-1">•</span>
                        <span className="text-[9px] text-slate-400">
                          {item.registered}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contacto & Procedencia */}
                <td className="p-3 text-[11px]">
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    <span>{item.originFlag}</span> {item.originCity}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    {item.phone}
                  </p>
                  <p className="text-slate-400 text-[10px]">{item.email}</p>
                </td>

                {/* Preferencias & Alertas */}
                <td className="p-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {item.preferences.map((pref, i) => (
                      <span
                        key={i}
                        className="bg-amber-50/80 border border-amber-200/60 text-amber-900 text-[9px] px-2 py-0.5 rounded flex items-center gap-1"
                      >
                        <span>{pref.icon}</span> {pref.label}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Historial / Noches */}
                <td className="p-3">
                  <strong className="text-slate-900 block text-xs">
                    {item.historyVisits}
                  </strong>
                  <span className="text-slate-600 text-[10px] font-semibold block">
                    {item.historyAmount}
                  </span>
                  <span className="text-slate-400 text-[9px]">
                    {item.lastVisit}
                  </span>
                </td>

                {/* Estado Actual */}
                <td className="p-3">
                  <span
                    className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full ${item.statusColor}`}
                  >
                    {item.status}
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-1">
                    {item.statusSub}
                  </span>
                </td>

                {/* Acciones */}
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      title="Ver Historial"
                    >
                      <Calendar size={14} />
                    </button>
                    {item.actionType === "checkin" ? (
                      <button
                        className="p-1 hover:bg-slate-100 rounded text-emerald-800 font-bold"
                        title="Procesar Check-in"
                      >
                        <LogIn size={14} />
                      </button>
                    ) : (
                      <button
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        title="Editar Ficha"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    <button
                      className="p-1 hover:bg-slate-100 rounded text-slate-400"
                      title="Más opciones"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[10px] text-slate-500">
          <span>
            Mostrando <strong>1 – 6</strong> de <strong>342</strong> huéspedes
            registrados • Directorio sincronizado en terminal
          </span>

          <div className="flex items-center gap-1">
            <button className="px-2 py-0.5 border border-slate-200 bg-white hover:bg-slate-100 rounded text-slate-600">
              Anterior
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
            <span>...</span>
            <button className="px-2 py-0.5 hover:bg-slate-200 rounded">
              57
            </button>
            <button className="px-2 py-0.5 border border-slate-200 bg-white hover:bg-slate-100 rounded text-slate-600">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Banner Inferior: Padrón Oficial MINCETUR / DIRCETUR Ica */}
      <div className="bg-emerald-950 text-white p-4 rounded-xl border border-emerald-900 flex justify-between items-center shadow-md">
        <div className="flex items-start gap-3 max-w-3xl">
          <div className="w-9 h-9 rounded-lg bg-emerald-900/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-700/50">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-emerald-100">
              Padrón Oficial MINCETUR / Control Diario de Huéspedes al Día
            </h3>
            <p className="text-[10px] text-emerald-300/80 mt-0.5 leading-relaxed">
              Conforme a las normativas de la DIRCETUR Ica, todo huésped
              nacional debe contar con DNI verificado en RENIEC y los turistas
              extranjeros con sello migratorio o TAM Virtual para la exoneración
              del Impuesto General a las Ventas (IGV - D.L. 919).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/60 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors">
            <Download size={13} /> Descargar TXT Padrón
          </button>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors shadow-sm">
            <FileText size={13} /> Ficha de Registro
          </button>
        </div>
      </div>
    </div>
  );
}
