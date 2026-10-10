import { useState, useEffect } from "react";
import { Coffee, Plus, Search, AlertCircle, CheckCircle } from "lucide-react";
import api from "../api/axiosConfig";

interface Estadia {
  idEstadia: number;
  estadoEstadia: string;
  fechaCheckinReal: string;
  habitacion?: { numero: string };
  reserva?: { cliente?: { nombres: string; apellidos: string } };
}

interface Producto {
  idProducto: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  precioVenta: number;
}

interface ConsumoEstadia {
  idConsumo: number;
  cantidad: number;
  precioUnitario: number;
  totalConsumo: number;
  fechaRegistro: string;
  producto?: { nombre: string; categoria: string };
}

export function ConsumosView() {
  const [estadias, setEstadias] = useState<Estadia[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [consumos, setConsumos] = useState<ConsumoEstadia[]>([]);
  const [selectedEstadia, setSelectedEstadia] = useState<Estadia | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ idProducto: "", cantidad: "1" });
  const [loadingEstadias, setLoadingEstadias] = useState(true);
  const [loadingConsumos, setLoadingConsumos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Estadia[]>("/api/v1/estadias?estado=EN_CURSO"),
      api.get<Producto[]>("/api/v1/productos"),
    ])
      .then(([estadiasRes, productosRes]) => {
        setEstadias(estadiasRes.data);
        setProductos(productosRes.data);
      })
      .catch(() => setMensaje({ tipo: "error", texto: "Error al cargar datos. Verifica que el backend esté activo." }))
      .finally(() => setLoadingEstadias(false));
  }, []);

  const seleccionarEstadia = async (e: Estadia) => {
    setSelectedEstadia(e);
    setConsumos([]);
    setLoadingConsumos(true);
    setMensaje(null);
    try {
      const res = await api.get<ConsumoEstadia[]>(`/api/v1/estadias/${e.idEstadia}/consumos`);
      setConsumos(res.data);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo cargar los consumos de esta estadía." });
    } finally {
      setLoadingConsumos(false);
    }
  };

  const registrarConsumo = async () => {
    if (!selectedEstadia || !form.idProducto) return;
    setGuardando(true);
    setMensaje(null);
    const producto = productos.find((p) => String(p.idProducto) === form.idProducto);
    if (!producto) return;
    try {
      const payload = {
        producto: { idProducto: producto.idProducto },
        cantidad: parseInt(form.cantidad),
        precioUnitario: producto.precioVenta,
      };
      await api.post<ConsumoEstadia>(
        `/api/v1/estadias/${selectedEstadia.idEstadia}/consumos`,
        payload
      );
      const listaRes = await api.get<ConsumoEstadia[]>(`/api/v1/estadias/${selectedEstadia.idEstadia}/consumos`);
      setConsumos(listaRes.data);
      setMensaje({ tipo: "ok", texto: `Consumo registrado: ${producto.nombre} x${form.cantidad}` });
      setForm({ idProducto: "", cantidad: "1" });
    } catch {
      setMensaje({ tipo: "error", texto: "Error al registrar el consumo." });
    } finally {
      setGuardando(false);
    }
  };

  const estadiasFiltradas = estadias.filter(
    (e) =>
      searchTerm === "" ||
      e.habitacion?.numero?.includes(searchTerm) ||
      String(e.idEstadia).includes(searchTerm) ||
      e.reserva?.cliente?.nombres?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalConsumos = consumos.reduce((s, c) => s + c.totalConsumo, 0);

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">Recepción › Consumos y servicios</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Consumos en Estadía</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Selecciona una estadía activa para registrar consumos de bar, cocina o servicios adicionales.
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

      <div className="grid grid-cols-12 gap-4">
        {/* Lista de estadías activas */}
        <div className="col-span-4 space-y-3">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Search size={13} className="text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar estadía..."
              className="flex-1 text-xs focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-2.5 border-b border-slate-100">
              <span className="font-bold text-slate-700 text-xs">Estadías activas</span>
            </div>
            {loadingEstadias ? (
              <p className="p-4 text-center text-slate-400 text-xs">Cargando...</p>
            ) : estadiasFiltradas.length === 0 ? (
              <p className="p-4 text-center text-slate-400 text-xs">No hay estadías activas.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {estadiasFiltradas.map((e) => (
                  <button
                    key={e.idEstadia}
                    onClick={() => seleccionarEstadia(e)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                      selectedEstadia?.idEstadia === e.idEstadia ? "bg-emerald-50/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 text-[11px]">
                        Estadía #{e.idEstadia}
                      </span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        EN CURSO
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      Hab. {e.habitacion?.numero ?? "—"}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      {e.reserva?.cliente
                        ? `${e.reserva.cliente.nombres} ${e.reserva.cliente.apellidos}`
                        : "—"}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Check-in: {e.fechaCheckinReal ? e.fechaCheckinReal.slice(0, 10) : "—"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel de consumos */}
        <div className="col-span-8 space-y-4">
          {!selectedEstadia ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Coffee size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Selecciona una estadía de la lista para ver y registrar consumos.</p>
            </div>
          ) : (
            <>
              {/* Formulario de nuevo consumo */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Plus size={13} className="text-emerald-700" /> Agregar consumo —{" "}
                    <span className="text-emerald-800">Estadía #{selectedEstadia.idEstadia}</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Hab. {selectedEstadia.habitacion?.numero ?? "—"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                      Producto / Servicio
                    </label>
                    <select
                      value={form.idProducto}
                      onChange={(e) => setForm((f) => ({ ...f, idProducto: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      <option value="">Selecciona un producto...</option>
                      {["COCINA", "BAR", "DIRECTO"].map((cat) => (
                        <optgroup key={cat} label={cat}>
                          {productos
                            .filter((p) => p.categoria === cat)
                            .map((p) => (
                              <option key={p.idProducto} value={p.idProducto}>
                                {p.nombre} — S/ {p.precioVenta.toFixed(2)}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={form.cantidad}
                      onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                {form.idProducto && (
                  <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600">
                    Subtotal:{" "}
                    <strong className="text-slate-900">
                      S/{" "}
                      {(
                        (productos.find((p) => String(p.idProducto) === form.idProducto)?.precioVenta ?? 0) *
                        parseInt(form.cantidad || "1")
                      ).toFixed(2)}
                    </strong>
                  </div>
                )}

                <button
                  onClick={registrarConsumo}
                  disabled={!form.idProducto || guardando}
                  className="bg-[#1b4332] hover:bg-[#143427] disabled:bg-slate-300 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
                >
                  <Plus size={12} />
                  {guardando ? "Registrando..." : "Registrar consumo"}
                </button>
              </div>

              {/* Lista de consumos */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs">
                    Consumos registrados ({consumos.length})
                  </span>
                  {consumos.length > 0 && (
                    <span className="text-[11px] font-bold text-slate-800">
                      Total: S/ {totalConsumos.toFixed(2)}
                    </span>
                  )}
                </div>
                {loadingConsumos ? (
                  <p className="p-4 text-center text-slate-400 text-xs">Cargando consumos...</p>
                ) : consumos.length === 0 ? (
                  <p className="p-4 text-center text-slate-400 text-xs">Sin consumos registrados aún.</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                        <th className="p-3">Producto</th>
                        <th className="p-3 text-center">Cant.</th>
                        <th className="p-3 text-right">P. Unit.</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consumos.map((c) => (
                        <tr key={c.idConsumo} className="hover:bg-slate-50">
                          <td className="p-3">
                            <p className="font-semibold text-slate-800">
                              {c.producto?.nombre ?? "—"}
                            </p>
                            <p className="text-[10px] text-slate-400">{c.producto?.categoria}</p>
                          </td>
                          <td className="p-3 text-center font-bold">{c.cantidad}</td>
                          <td className="p-3 text-right text-slate-600">
                            S/ {c.precioUnitario?.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            S/ {c.totalConsumo?.toFixed(2)}
                          </td>
                          <td className="p-3 text-slate-400">
                            {c.fechaRegistro ? c.fechaRegistro.slice(0, 16).replace("T", " ") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
