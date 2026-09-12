import {
  Search,
  FileText,
  Check,
  ArrowRight,
  Sun,
  Briefcase,
  Clock,
  AlertCircle,
} from "lucide-react";

export function CheckoutView() {
  return (
    <div className="space-y-5 bg-[#f5f6f8] min-h-screen -m-8 p-6 font-sans text-slate-800 text-xs">
      {/* Top Header info */}
      <div className="flex justify-between items-center text-[11px] text-slate-500 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">
            Operaciones de Recepción
          </span>
          <span>/</span>
          <span>Jueves 24 de Octubre 2024 - 16:42 PET</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{" "}
            Conexión Local Estable
          </span>
          <span className="bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-semibold">
            Caja Abierta: S/ 850.00
          </span>
        </div>
      </div>

      {/* Title & Main Actions */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">
            Recepción &gt; Control de Salidas
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Salidas y Check-out del Día
          </h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Supervisión de salidas programadas, verificación de folios de
            consumo, entrega de llaves e inspección de housekeeping hacia el
            estado disponible.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-50">
            <FileText size={14} /> Reporte de Salidas
          </button>
          <button className="bg-[#1b4332] hover:bg-[#143427] text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
            <Check size={14} /> Salida Expresa
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Salidas Programadas
          </p>
          <div className="flex justify-between items-baseline mt-2">
            <span className="text-2xl font-bold text-slate-900">
              8{" "}
              <span className="text-xs font-medium text-slate-500">
                habitaciones
              </span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            3 Pendientes • 4 Completados • 1 Late
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
              Pendiente de Cobro
            </p>
            <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-bold">
              3 folios
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">S/ 842.00</p>
          <p className="text-[10px] text-slate-400 mt-2">
            3 folios con saldo a regularizar en mostrador
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Liquidado Hoy
            </p>
            <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold">
              POS OK
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">S/ 1,890.00</p>
          <p className="text-[10px] text-slate-400 mt-2">
            4 Check-outs • Caja POS conciliada
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            A Limpieza / Cuartos
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            5{" "}
            <span className="text-xs font-medium text-slate-500">
              en proceso
            </span>
          </p>
          <p className="text-[10px] text-slate-400 mt-2">
            Rosa Torres (Turno Tarde) activo
          </p>
        </div>
      </div>

      {/* Grid Principal: 2 columnas */}
      <div className="grid grid-cols-3 gap-5">
        {/* Columna Izquierda: Listado (2 cols) */}
        <div className="col-span-2 space-y-3">
          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-2.5 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar por huésped, hab, id, DNI, DNI o número de folio..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock size={12} /> Límite estándar: 12:00 PM (Tolerancia 12:30
                PM)
              </span>
            </div>

            <div className="flex gap-1.5 border-t border-slate-100 pt-2.5">
              <button className="bg-slate-800 text-white font-semibold px-2.5 py-1 rounded-md text-[11px]">
                Todos (8)
              </button>
              <button className="bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-md text-[11px]">
                Pendientes 3
              </button>
              <button className="bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-1 rounded-md text-[11px]">
                Completados 4
              </button>
              <button className="bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded-md text-[11px]">
                Late Check-out 1
              </button>
            </div>
          </div>

          {/* Card 1: Mateo Silva */}
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-orange-500 border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 text-orange-700 font-bold rounded-lg flex items-center justify-center text-sm">
                  102
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Mateo Silva Carrión
                    </h3>
                    <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                      EN MOSTRADOR - VENCIDO
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    DNI 72491028 (Lima) • Matrimonial Jardín • #RES-2024-108 (3
                    noches)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-orange-600 font-semibold flex items-center gap-1 justify-end">
                  <Clock size={11} /> 12:00 PM (Demorado)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
              <div>
                <p className="text-[9px] text-slate-400">
                  Total Consumos + Est.
                </p>
                <p className="font-bold text-slate-800">S/ 507.00</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">Anticipos / Seña</p>
                <p className="font-bold text-slate-800">-S/ 200.00</p>
              </div>
              <div>
                <p className="text-[9px] text-orange-600 font-bold">
                  Saldo Pendiente
                </p>
                <p className="font-bold text-orange-600 text-sm">S/ 307.00</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 text-[10px]">
              <div className="flex gap-4 text-slate-500">
                <span>
                  🔑 Llave:{" "}
                  <strong className="text-slate-700">Pendiente</strong>
                </span>
                <span>
                  🔍 Inspección:{" "}
                  <strong className="text-slate-700">En curso</strong>
                </span>
                <span>
                  🧳 Custodia:{" "}
                  <strong className="text-slate-700">No solicita</strong>
                </span>
              </div>
              <button className="bg-[#1b4332] hover:bg-[#143427] text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                Procesar Liquidación y Salida <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Card 2: Antoine Dubois */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 text-slate-700 font-bold rounded-lg flex items-center justify-center text-sm">
                  204
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Antoine Dubois
                    </h3>
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Late Check-out Autorizado
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Pasaporte FR-88912 • Suite Oasis • #RES-2024-099
                  </p>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                <span>Salida extendida: 14:30 PM (+S/ 40.00)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
              <div>
                <p className="text-[9px] text-slate-400">
                  Consumos (Bar & Tours)
                </p>
                <p className="font-bold text-slate-800">S/ 160.00</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">Estadía Base</p>
                <p className="font-bold text-emerald-700">Cancelado 100%</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold">
                  Por Cobrar
                </p>
                <p className="font-bold text-slate-900">S/ 160.00</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 text-[10px]">
              <div className="flex gap-4 text-slate-500">
                <span>
                  🔑 Llave:{" "}
                  <strong className="text-slate-700">Pendiente</strong>
                </span>
                <span>
                  🔍 Inspección:{" "}
                  <strong className="text-emerald-700">Conforme</strong>
                </span>
                <span>
                  🧳 Custodia:{" "}
                  <strong className="text-slate-700">Sí (Ticket #09)</strong>
                </span>
              </div>
              <button className="bg-[#1b4332] text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                Cobrar y Check-out <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Card 3: Carla Paredes (Completado) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 opacity-85 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-800 font-bold rounded-lg flex items-center justify-center text-xs">
                104
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">Carla Paredes</h4>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                    Check-out Completado
                  </span>
                  <span className="text-[9px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded font-semibold">
                    Hab. en Limpieza
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Hab Familiar • Salida: 10:15 AM • Boleta B001-0045 (S/ 350.00)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block">
                Saldo: S/ 0.00
              </span>
              <button className="text-emerald-800 hover:underline text-[10px] font-semibold">
                Folio Cerrado
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Widgets (1 col) */}
        <div className="space-y-4">
          {/* Widget 1: Protocolo Check-out */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Check size={14} className="text-emerald-700" /> Protocolo
                Check-out
              </h3>
              <span className="text-[9px] text-slate-400 uppercase font-semibold">
                GUÍA RECEPCIÓ
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Pasos obligatorios para recepción antes de autorizar la salida
              física del huésped:
            </p>

            <ol className="space-y-2.5 text-[11px] text-slate-700">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="block text-slate-800">
                    Revisar consumos de última hora:
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Consultar frigobar, consumos en cafetería y tienda de
                    artesanías.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="block text-slate-800">
                    Validar abonos en el folio:
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Comprobar depósitos previos y señas antes de emitir
                    liquidación.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="block text-slate-800">
                    Cobrar saldo pendiente:
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Aceptar Efectivo, tarjeta vía POS Ipay o Yape/Plin si no hay
                    tarjeta.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong className="block text-slate-800">
                    Recibir llaves físicas & controles:
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Verificar llave de habitación + mando de aire acondicionado
                    / TV.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  5
                </span>
                <div>
                  <strong className="block text-slate-800">
                    Notificar a Housekeeping:
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Cambiar habitación a "Sucia / Limpieza" en sistema para
                    Rosa.
                  </span>
                </div>
              </li>
            </ol>
          </div>

          {/* Widget 2: Custodia de Equipaje */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Briefcase size={14} className="text-slate-700" /> Custodia de
                Equipaje
              </h3>
              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                3 en Bodega
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Huéspedes en tours de tarde por Huacachina / Nazca antes de su bus
              nocturno:
            </p>

            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-bold text-amber-800">#09</span>{" "}
                  <span className="font-semibold text-slate-700">
                    Antoine Dubois (Hab. 204)
                  </span>
                  <p className="text-[9px] text-slate-400">
                    1 Mochila senderismo + 1 Maleta
                  </p>
                </div>
                <span className="text-slate-400 font-medium">
                  Retiro: 18:30 PET (Cruz del Sur)
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-bold text-amber-800">#08</span>{" "}
                  <span className="font-semibold text-slate-700">
                    Luciana Cárdenas (Ex-108)
                  </span>
                  <p className="text-[9px] text-slate-400">
                    2 Carry-on pequeños
                  </p>
                </div>
                <span className="text-slate-400 font-medium">
                  Retiro: 19:00 PET (Oltursa)
                </span>
              </div>
            </div>

            <button className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 py-1.5 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1">
              + Registrar Nuevo Equipaje
            </button>
          </div>

          {/* Widget 3: Clima en Ica */}
          <div className="bg-[#1b4332] text-white p-4 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <Sun size={18} className="text-amber-300" />
              <h4 className="font-bold text-xs">Clima en Ica (Hoy)</h4>
            </div>
            <p className="text-[10px] text-emerald-100 leading-relaxed">
              27°C Sol radiante y despejado. Gran afluencia de pasajeros hacia
              Huacachina a las 17:00. Recordar ofrecer botella de agua fría al
              cerrar check-out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
