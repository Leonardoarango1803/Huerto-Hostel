import { useState, useEffect } from "react";
import { LogIn, BedDouble, User, Calendar, Search, CheckCircle, AlertCircle } from "lucide-react";
import api from "../api/axiosConfig";

interface Reserva {
  idReserva: number;
  estadoReserva: string;
  fechaCheckinPrevisto: string;
  fechaCheckoutPrevisto: string;
  montoAlojamientoTotal: number;
  canalReserva: string;
  cliente?: { nombres: string; apellidos: string; numeroDocumento: string };
  habitacion?: { numero: string; tipoHabitacion?: { nombre: string } };
}

interface Estadia {
  idEstadia: number;
  estadoEstadia: string;
  fechaCheckinReal: string;
  habitacion?: { numero: string };
}

export function CheckInView() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [procesando, setProcesando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    api.get<Reserva[]>("/api/v1/reservas")
      .then((res) => setReservas(res.data))
      .catch(() => setMensaje({ tipo: "error", texto: "No se pudo cargar las reservas. Verifica que el backend esté activo." }))
      .finally(() => setLoading(false));
  }, []);

  const pendientes = reservas.filter(
    (r) =>
      r.estadoReserva === "CONFIRMADA" &&
      (searchTerm === "" ||
        r.cliente?.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.cliente?.numeroDocumento?.includes(searchTerm) ||
        String(r.idReserva).includes(searchTerm) ||
        r.habitacion?.numero?.includes(searchTerm))
  );

  const hacerCheckin = async (idReserva: number) => {
    setProcesando(idReserva);
    setMensaje(null);
    try {
      const res = await api.post<Estadia>(`/api/v1/reservas/${idReserva}/checkin`);
      setMensaje({
        tipo: "ok",
        texto: `✓ Check-in realizado. Estadía #${res.data.idEstadia} activa — Hab. ${res.data.habitacion?.numero ?? "—"}. El huésped ya aparece en Check-out.`,
      });
      setReservas((prev) => prev.filter((r) => r.idReserva !== idReserva));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al realizar el check-in.";
      setMensaje({ tipo: "error", texto: msg });
    } finally {
      setProcesando(null);
    }
  };

  const estadoColor: Record<string, string> = {
    PENDIENTE_ADELANTO: "bg-amber-100 text-amber-800 border-amber-300",
    CONFIRMADA: "bg-blue-100 text-blue-800 border-blue-300",
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">Recepción › Check-in</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Registro de Entrada</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Selecciona una reserva confirmada para registrar el ingreso y activar la estadía.
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

      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search size={14} className="text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, DNI, N° reserva o habitación"
          className="flex-1 text-xs text-slate-700 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
          Cargando reservas...
        </div>
      ) : pendientes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
          No hay reservas pendientes de check-in.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center gap-1.5">
            <LogIn size={14} className="text-emerald-700" />
            <span className="font-bold text-slate-700 text-xs">
              Reservas pendientes de check-in ({pendientes.length})
            </span>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3">N° Reserva</th>
                <th className="p-3">Huésped</th>
                <th className="p-3">Habitación</th>
                <th className="p-3">Fechas</th>
                <th className="p-3">Total</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendientes.map((r) => (
                <tr key={r.idReserva} className="hover:bg-slate-50/80">
                  <td className="p-3 font-bold text-emerald-800">#{r.idReserva}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                        <User size={11} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {r.cliente ? `${r.cliente.nombres} ${r.cliente.apellidos}` : "—"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {r.cliente?.numeroDocumento ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <BedDouble size={12} className="text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {r.habitacion?.numero ?? "—"}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {r.habitacion?.tipoHabitacion?.nombre ?? ""}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Calendar size={11} className="text-slate-400" />
                      <span>
                        {r.fechaCheckinPrevisto ? r.fechaCheckinPrevisto.slice(0, 10) : "—"} →{" "}
                        {r.fechaCheckoutPrevisto ? r.fechaCheckoutPrevisto.slice(0, 10) : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 font-bold text-slate-900">
                    S/ {r.montoAlojamientoTotal?.toFixed(2) ?? "0.00"}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        estadoColor[r.estadoReserva] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.estadoReserva.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => hacerCheckin(r.idReserva)}
                      disabled={procesando === r.idReserva}
                      className="bg-[#1b4332] hover:bg-[#143427] disabled:bg-slate-300 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 mx-auto"
                    >
                      <LogIn size={11} />
                      {procesando === r.idReserva ? "Procesando..." : "Check-in"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
