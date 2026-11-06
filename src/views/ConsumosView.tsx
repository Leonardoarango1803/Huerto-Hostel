import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Coffee, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { puede, puedeEntrar } from "../auth/permisos";
import { mensajeDeError } from "../api/errores";
import {
  consumosApi,
  type ConsumoAnulado,
  type ConsumoEstadia,
  type EstadoDeCuenta as Cuenta,
  type ProductoCatalogo,
} from "../api/consumos";
import { EstadoDeCuenta } from "./consumos/EstadoDeCuenta";
import { ListaConsumos } from "./consumos/ListaConsumos";
import { SelectorProductos, type LineaCarrito } from "./consumos/SelectorProductos";

interface Estadia {
  idEstadia: number;
  estadoEstadia: string;
  fechaCheckinReal: string;
  habitacion?: { numero: string };
  reserva?: { cliente?: { nombres: string; apellidos: string } };
}

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

/**
 * Consumos y servicios de una estadia en curso: estado de cuenta, carga de productos y servicios con carrito, lo registrado
 * con su origen y quien lo cargo, y anulacion con motivo. Comida y bebida se piden mejor por Comandas.
 */
export function ConsumosView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const puedeRegistrar = puede(user?.role, "registrarConsumo");
  const veCuenta = puedeEntrar(user?.role, "checkout");

  const [estadias, setEstadias] = useState<Estadia[]>([]);
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [frecuentes, setFrecuentes] = useState<number[]>([]);
  const [seleccionada, setSeleccionada] = useState<Estadia | null>(null);
  const [consumos, setConsumos] = useState<ConsumoEstadia[]>([]);
  const [anulados, setAnulados] = useState<ConsumoAnulado[]>([]);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoEstadias, setCargandoEstadias] = useState(true);
  const [cargandoConsumos, setCargandoConsumos] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [avisosStock, setAvisosStock] = useState<string[]>([]);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      api.get<Estadia[]>("/api/v1/estadias?estado=EN_CURSO"),
      // El catalogo y los accesos rapidos solo hacen falta para cargar consumos; quien solo consulta no los pide.
      puedeRegistrar ? consumosApi.catalogo() : Promise.resolve([] as ProductoCatalogo[]),
      puedeRegistrar ? consumosApi.frecuentes().catch(() => [] as number[]) : Promise.resolve([] as number[]),
    ])
      .then(([est, prods, frec]) => {
        if (!vigente) return;
        setEstadias(est.data);
        setProductos(prods);
        setFrecuentes(frec);
      })
      .catch(() => vigente && setMensaje({ tipo: "error", texto: "Error al cargar datos. Verifica que el backend esté activo." }))
      .finally(() => vigente && setCargandoEstadias(false));
    return () => { vigente = false; };
  }, [puedeRegistrar]);

  const traerDeLaEstadia = useCallback(async (id: number) => {
    const [lista, anul, cta] = await Promise.all([
      consumosApi.listar(id),
      consumosApi.anulados(id).catch(() => [] as ConsumoAnulado[]),
      veCuenta ? consumosApi.estadoDeCuenta(id).catch(() => null) : Promise.resolve(null),
    ]);
    setConsumos(lista);
    setAnulados(anul);
    setCuenta(cta);
  }, [veCuenta]);

  const seleccionar = async (e: Estadia) => {
    setSeleccionada(e);
    setConsumos([]);
    setAnulados([]);
    setCuenta(null);
    setCarrito([]);
    setAvisosStock([]);
    setMensaje(null);
    setCargandoConsumos(true);
    try {
      await traerDeLaEstadia(e.idEstadia);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo cargar los consumos de esta estadía." });
    } finally {
      setCargandoConsumos(false);
    }
  };

  const registrar = async () => {
    if (!seleccionada || carrito.length === 0) return;
    setRegistrando(true);
    setMensaje(null);
    setAvisosStock([]);
    try {
      const r = await consumosApi.registrar(seleccionada.idEstadia, carrito.map((l) => ({ idProducto: l.producto.idProducto, cantidad: l.cantidad })));
      await traerDeLaEstadia(seleccionada.idEstadia);
      const resumen = carrito.map((l) => `${l.producto.nombre} ×${l.cantidad}`).join(", ");
      setMensaje({ tipo: "ok", texto: `Registrado en el folio: ${resumen}.` });
      setAvisosStock(r.advertencias);
      setCarrito([]);
      consumosApi.frecuentes().then(setFrecuentes).catch(() => undefined);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e, "Error al registrar los consumos.") });
    } finally {
      setRegistrando(false);
    }
  };

  const tras = async (texto: string) => {
    if (!seleccionada) return;
    setMensaje({ tipo: "ok", texto });
    try {
      await traerDeLaEstadia(seleccionada.idEstadia);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo actualizar la lista." });
    }
  };

  const estadiasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return estadias.filter((e) =>
      q === "" ||
      e.habitacion?.numero?.includes(busqueda.trim()) ||
      String(e.idEstadia).includes(busqueda.trim()) ||
      `${e.reserva?.cliente?.nombres ?? ""} ${e.reserva?.cliente?.apellidos ?? ""}`.toLowerCase().includes(q));
  }, [estadias, busqueda]);

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">Recepción › Consumos y servicios</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Consumos y servicios</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Carga servicios (late check-out, lavandería, transfer...) y consumos al folio de una estadía en curso. Si te equivocas,
          anula con motivo. Los pedidos de cocina y bar se hacen desde Comandas.
        </p>
      </div>

      {mensaje && (
        <div role="status" className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
          mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {mensaje.tipo === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span className="flex-1">{mensaje.texto}</span>
          <button onClick={() => setMensaje(null)} className="text-[10px] font-semibold opacity-70 hover:opacity-100">Cerrar</button>
        </div>
      )}
      {avisosStock.length > 0 && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-lg border bg-amber-50 border-amber-300 text-amber-900 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">El consumo quedó registrado, pero el almacén no alcanzó:</p>
            <ul className="list-disc pl-4 mt-0.5">{avisosStock.map((a) => <li key={a}>{a}</li>)}</ul>
            <p className="mt-0.5">Avisa a cocina/bar o repón el insumo en Inventario.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3 space-y-3">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Search size={13} className="text-slate-400" />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar estadía..."
              aria-label="Buscar estadía" className="flex-1 text-xs focus:outline-none" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-2.5 border-b border-slate-100">
              <span className="font-bold text-slate-700 text-xs">Estadías activas</span>
            </div>
            {cargandoEstadias ? (
              <p className="p-4 text-center text-slate-400 text-xs">Cargando...</p>
            ) : estadiasFiltradas.length === 0 ? (
              <p className="p-4 text-center text-slate-400 text-xs">No hay estadías activas.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {estadiasFiltradas.map((e) => (
                  <button key={e.idEstadia} onClick={() => seleccionar(e)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${seleccionada?.idEstadia === e.idEstadia ? "bg-emerald-50/60" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 text-[11px]">Estadía #{e.idEstadia}</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">EN CURSO</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">Hab. {e.habitacion?.numero ?? "—"}</p>
                    <p className="text-slate-400 text-[10px]">
                      {e.reserva?.cliente ? `${e.reserva.cliente.nombres} ${e.reserva.cliente.apellidos}` : "—"}
                    </p>
                    <p className="text-slate-400 text-[10px]">Check-in: {e.fechaCheckinReal ? e.fechaCheckinReal.slice(0, 10) : "—"}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-9 space-y-4">
          {!seleccionada ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Coffee size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Selecciona una estadía de la lista para ver y registrar consumos.</p>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Estadía #{seleccionada.idEstadia} · Hab. {seleccionada.habitacion?.numero ?? "—"}
                  {seleccionada.reserva?.cliente && (
                    <span className="font-normal text-slate-500"> — {seleccionada.reserva.cliente.nombres} {seleccionada.reserva.cliente.apellidos}</span>
                  )}
                </h2>
              </div>
              <EstadoDeCuenta cuenta={cuenta} onIrAlCheckout={veCuenta ? () => navigate("/checkout") : undefined} />
              {puedeRegistrar && (
                <SelectorProductos productos={productos} frecuentes={frecuentes} carrito={carrito} registrando={registrando}
                  onCarrito={setCarrito} onRegistrar={registrar} onIrAComandas={() => navigate("/comandas")} />
              )}
              <ListaConsumos idEstadia={seleccionada.idEstadia} consumos={consumos} anulados={anulados}
                cargando={cargandoConsumos} puedeAnular={puedeRegistrar} onCambio={tras}
                onError={(texto) => setMensaje({ tipo: "error", texto })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
