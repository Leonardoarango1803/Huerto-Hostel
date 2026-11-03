import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChefHat,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  RefreshCw,
} from "lucide-react";
import api from "../api/axiosConfig";
import { comandasApi } from "../api/comandas";
import { mensajeDeError } from "../api/errores";
import { useAuth } from "../context/AuthContext";
import type {
  AreaDestino,
  Comanda,
  EstadoComanda,
  Producto,
} from "../api/types";

/** Solo la habitacion: el tablero de cocina y bar no ve datos del huesped. */
interface EstadiaActiva {
  idEstadia: number;
  numeroHabitacion?: string | null;
}

/** Columnas del tablero y el estado al que avanza cada tarjeta. */
const COLUMNAS: { estado: EstadoComanda; titulo: string; siguiente: EstadoComanda; accion: string }[] = [
  { estado: "PENDIENTE", titulo: "Pendientes", siguiente: "EN_PREPARACION", accion: "Preparar" },
  { estado: "EN_PREPARACION", titulo: "En preparacion", siguiente: "PREPARADA", accion: "Marcar lista" },
  { estado: "PREPARADA", titulo: "Listas para entregar", siguiente: "ENTREGADA", accion: "Entregar" },
];

const INTERVALO_REFRESCO_MS = 10000;

export function ComandasView() {
  const { user } = useAuth();

  // La cocina y el bar entran directo a su propia area.
  const areaDelRol: AreaDestino | "" =
    user?.role === "COCINA" ? "COCINA" : user?.role === "BAR" ? "BAR" : "";

  const [area, setArea] = useState<AreaDestino | "">(areaDelRol);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [estadias, setEstadias] = useState<EstadiaActiva[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [form, setForm] = useState<{
    idEstadia: string;
    areaDestino: AreaDestino;
    observaciones: string;
    items: { idProducto: string; cantidad: string; notas: string }[];
  }>({
    idEstadia: "",
    areaDestino: areaDelRol || "COCINA",
    observaciones: "",
    items: [{ idProducto: "", cantidad: "1", notas: "" }],
  });

  const cargarComandas = useCallback(async () => {
    try {
      const data = await comandasApi.listar(area || undefined);
      setComandas(data);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las comandas." });
    } finally {
      setCargando(false);
    }
  }, [area]);

  useEffect(() => {
    cargarComandas();
    const id = setInterval(cargarComandas, INTERVALO_REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargarComandas]);

  useEffect(() => {
    Promise.all([
      comandasApi.estadiasActivas(),
      api.get<Producto[]>("/api/v1/productos"),
    ])
      .then(([e, p]) => {
        setEstadias(e);
        setProductos(p.data);
      })
      .catch(() => {
        /* el tablero sigue siendo util aunque no se pueda crear una comanda */
      });
  }, []);

  const avanzar = async (comanda: Comanda, nuevo: EstadoComanda) => {
    setMensaje(null);
    try {
      await comandasApi.cambiarEstado(comanda.idComanda, nuevo);
      if (nuevo === "ENTREGADA") {
        setMensaje({
          tipo: "ok",
          texto: `Comanda #${comanda.idComanda} entregada: cargada al folio y descontada del inventario.`,
        });
      }
      cargarComandas();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e, "No se pudo actualizar el estado de la comanda.") });
    }
  };

  const cancelar = async (comanda: Comanda) => {
    // Una comanda que ya se preparo gasto insumos: se cancela sin cobrar, pero queda como merma en el inventario.
    const yaSePreparo = comanda.estadoComanda !== "PENDIENTE";
    if (
      yaSePreparo &&
      !window.confirm(
        `La comanda #${comanda.idComanda} ya se estaba preparando. Si la cancelas no se cobra, y los insumos usados se registran como merma. ¿Cancelar?`
      )
    ) {
      return;
    }
    setMensaje(null);
    try {
      await comandasApi.cambiarEstado(comanda.idComanda, "CANCELADA");
      if (yaSePreparo) {
        setMensaje({
          tipo: "ok",
          texto: `Comanda #${comanda.idComanda} cancelada: sin cargo al huesped; los insumos quedaron como merma.`,
        });
      }
      cargarComandas();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e, "No se pudo cancelar la comanda.") });
    }
  };

  const crearComanda = async () => {
    const items = form.items
      .filter((i) => i.idProducto)
      .map((i) => ({
        idProducto: Number(i.idProducto),
        cantidad: Number(i.cantidad || "1"),
        notas: i.notas || undefined,
      }));

    if (!form.idEstadia || items.length === 0) {
      setMensaje({ tipo: "error", texto: "Selecciona una estadia y al menos un producto." });
      return;
    }

    setGuardando(true);
    setMensaje(null);
    try {
      await comandasApi.crear({
        idEstadia: Number(form.idEstadia),
        areaDestino: form.areaDestino,
        observaciones: form.observaciones || undefined,
        items,
      });
      setMensaje({ tipo: "ok", texto: "Comanda enviada a " + form.areaDestino + "." });
      setForm({
        idEstadia: "",
        areaDestino: areaDelRol || "COCINA",
        observaciones: "",
        items: [{ idProducto: "", cantidad: "1", notas: "" }],
      });
      setMostrarForm(false);
      cargarComandas();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e, "No se pudo registrar la comanda.") });
    } finally {
      setGuardando(false);
    }
  };

  const productosDelArea = useMemo(() => {
    const activos = productos.filter((p) => p.estado !== false);
    if (form.areaDestino === "COCINA") return activos.filter((p) => p.categoria === "COCINA");
    if (form.areaDestino === "BAR") return activos.filter((p) => p.categoria === "BAR");
    return activos;
  }, [productos, form.areaDestino]);

  const porEstado = (estado: EstadoComanda) =>
    comandas.filter((c) => c.estadoComanda === estado);

  const minutosDesde = (fecha: string) => {
    const diff = Date.now() - new Date(fecha).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">
            Operacion › Comandas
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Comandas de Cocina y Bar</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Tablero en tiempo real. Al entregar, la comanda se carga al folio de la estadia y
            descuenta los insumos segun receta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as AreaDestino | "")}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            <option value="">Todas las areas</option>
            <option value="COCINA">Cocina</option>
            <option value="BAR">Bar</option>
            <option value="VENTA_DIRECTA">Venta directa</option>
          </select>
          <button
            onClick={cargarComandas}
            title="Refrescar"
            className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Plus size={13} /> Nueva comanda
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
            Nueva comanda
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Estadia
              </label>
              <select
                value={form.idEstadia}
                onChange={(e) => setForm((f) => ({ ...f, idEstadia: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="">Selecciona...</option>
                {estadias.map((e) => (
                  <option key={e.idEstadia} value={e.idEstadia}>
                    #{e.idEstadia} — Hab. {e.numeroHabitacion ?? "—"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Area destino
              </label>
              <select
                value={form.areaDestino}
                onChange={(e) =>
                  setForm((f) => ({ ...f, areaDestino: e.target.value as AreaDestino }))
                }
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="COCINA">Cocina</option>
                <option value="BAR">Bar</option>
                <option value="VENTA_DIRECTA">Venta directa</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Observaciones
              </label>
              <input
                type="text"
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                placeholder="Sin sal, para llevar..."
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase block">Items</label>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <select
                  value={item.idProducto}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      items: f.items.map((it, i) =>
                        i === idx ? { ...it, idProducto: e.target.value } : it
                      ),
                    }))
                  }
                  className="col-span-6 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">Producto...</option>
                  {productosDelArea.map((p) => (
                    <option key={p.idProducto} value={p.idProducto}>
                      {p.nombre} — S/ {p.precioVenta.toFixed(2)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      items: f.items.map((it, i) =>
                        i === idx ? { ...it, cantidad: e.target.value } : it
                      ),
                    }))
                  }
                  className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <input
                  type="text"
                  value={item.notas}
                  placeholder="Notas"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      items: f.items.map((it, i) =>
                        i === idx ? { ...it, notas: e.target.value } : it
                      ),
                    }))
                  }
                  className="col-span-3 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <button
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items,
                    }))
                  }
                  className="col-span-1 text-red-400 hover:text-red-600 flex justify-center"
                  title="Quitar item"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  items: [...f.items, { idProducto: "", cantidad: "1", notas: "" }],
                }))
              }
              className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1 hover:text-emerald-900"
            >
              <Plus size={11} /> Agregar item
            </button>
          </div>

          <button
            onClick={crearComanda}
            disabled={guardando}
            className="bg-[#1b4332] hover:bg-[#143427] disabled:bg-slate-300 text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            {guardando ? "Enviando..." : "Enviar comanda"}
          </button>
        </div>
      )}

      {cargando ? (
        <p className="p-6 text-center text-slate-400 text-xs">Cargando tablero...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {COLUMNAS.map((col) => {
            const lista = porEstado(col.estado);
            return (
              <div key={col.estado} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                    {col.titulo}
                  </h3>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                    {lista.length}
                  </span>
                </div>

                {lista.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
                    <ChefHat size={22} className="mx-auto mb-1 opacity-30" />
                    <p className="text-[11px]">Sin comandas</p>
                  </div>
                ) : (
                  lista.map((c) => {
                    const minutos = minutosDesde(c.fechaRegistro);
                    const demorada = minutos >= 15 && col.estado !== "PREPARADA";
                    return (
                      <div
                        key={c.idComanda}
                        className={`bg-white rounded-xl border shadow-sm p-3 space-y-2 ${
                          demorada ? "border-red-300" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800 text-[11px]">
                            #{c.idComanda} — Hab. {c.numeroHabitacion ?? "—"}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                              demorada
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <Clock size={9} /> {minutos} min
                          </span>
                        </div>

                        <span className="inline-block text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                          {c.areaDestino}
                        </span>

                        <ul className="space-y-1">
                          {c.items.map((i) => (
                            <li key={i.idDetalle} className="text-[11px] text-slate-700">
                              <strong>{i.cantidad}x</strong> {i.nombreProducto}
                              {i.notas && (
                                <span className="text-slate-400 italic"> — {i.notas}</span>
                              )}
                            </li>
                          ))}
                        </ul>

                        {c.observaciones && (
                          <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-1">
                            {c.observaciones}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[11px] font-bold text-slate-900">
                            S/ {c.total?.toFixed(2)}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => cancelar(c)}
                              className="text-[10px] text-red-500 hover:text-red-700 font-semibold px-1.5 py-1"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => avanzar(c, col.siguiente)}
                              className="bg-[#1b4332] hover:bg-[#143427] text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                            >
                              {col.accion}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
