import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  CheckCircle,
  ChefHat,
  Package,
  Truck,
} from "lucide-react";
import { inventarioApi } from "../api/inventario";
import { mensajeDeError } from "../api/errores";
import type { Insumo, Proveedor } from "../api/types";
import { puede, type Rol } from "../auth/permisos";
import { useAuth } from "../context/AuthContext";
import { InsumosTab } from "./inventario/InsumosTab";
import { MovimientosTab } from "./inventario/MovimientosTab";
import { ProveedoresTab } from "./inventario/ProveedoresTab";
import { RecetasTab } from "./inventario/RecetasTab";
import { ReportesTab } from "./inventario/ReportesTab";
import { estadoStock, type Mensaje } from "./inventario/comun";

type Tab = "insumos" | "recetas" | "movimientos" | "proveedores" | "reportes";

const TABS: { id: Tab; label: string; icon: typeof Package; roles?: Rol[] }[] = [
  { id: "insumos", label: "Insumos", icon: Package },
  // Recetas y proveedores son de almacen/cocina; housekeeping solo mueve sus insumos de limpieza.
  { id: "recetas", label: "Recetas", icon: ChefHat, roles: ["ADMINISTRADOR", "COCINA", "BAR"] },
  { id: "movimientos", label: "Movimientos", icon: ArrowDownUp },
  { id: "proveedores", label: "Proveedores", icon: Truck, roles: ["ADMINISTRADOR", "COCINA", "BAR"] },
  { id: "reportes", label: "Reportes", icon: BarChart3 },
];

export function InventarioView() {
  const { user } = useAuth();
  const rol = user?.role;
  const puedeGestionar = puede(rol, "gestionarInventario");
  const esHousekeeping = rol === "HOUSEKEEPING";

  const [tab, setTab] = useState<Tab>("insumos");
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  /** Sube con cada cambio de datos para que las pestanas que listan vuelvan a pedir lo suyo. */
  const [version, setVersion] = useState(0);
  const [historialDe, setHistorialDe] = useState<number | undefined>(undefined);

  // Cada cambio exitoso sube la version y este efecto vuelve a pedir insumos y proveedores.
  useEffect(() => {
    let vigente = true;
    inventarioApi
      .listarInsumos()
      .then((datos) => vigente && setInsumos(datos))
      .catch((e) => vigente && setMensaje({ tipo: "error", texto: mensajeDeError(e, "No se pudieron cargar los insumos.") }))
      .finally(() => vigente && setCargando(false));
    if (!esHousekeeping) {
      inventarioApi
        .listarProveedores()
        .then((datos) => vigente && setProveedores(datos))
        .catch(() => vigente && setProveedores([]));
    }
    return () => {
      vigente = false;
    };
  }, [version, esHousekeeping]);

  /** Estable: las pestanas lo usan como dependencia de sus efectos. Un error solo se muestra; un exito recarga. */
  const notificar = useCallback((m: Mensaje) => {
    setMensaje(m);
    if (m?.tipo === "ok") setVersion((v) => v + 1);
  }, []);

  const verHistorial = (idInsumo: number) => {
    setHistorialDe(idInsumo);
    setTab("movimientos");
  };

  const reponer = insumos.filter((i) => estadoStock(i) === "reponer");
  const agotados = insumos.filter((i) => estadoStock(i) === "agotado");
  const tabsVisibles = TABS.filter((t) => !t.roles || (rol && t.roles.includes(rol as Rol)));

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">
          {esHousekeeping ? "Limpieza" : "Administracion"} › Inventario
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">
          {esHousekeeping ? "Insumos de limpieza" : "Inventario y Recetas"}
        </h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Controla el stock, define las recetas de cada producto y revisa la trazabilidad de cada movimiento del
          almacen.
        </p>
      </div>

      {mensaje && (
        <div
          role="status"
          className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
            mensaje.tipo === "ok"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          {mensaje.tipo === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span className="flex-1">{mensaje.texto}</span>
          <button onClick={() => setMensaje(null)} className="text-[10px] font-semibold opacity-70 hover:opacity-100">
            Cerrar
          </button>
        </div>
      )}

      {(agotados.length > 0 || reponer.length > 0) && (
        <div className="flex items-start gap-2 p-3 rounded-lg border bg-amber-50 border-amber-300 text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {agotados.length > 0 && (
              <>
                <strong>{agotados.length}</strong> agotado(s): {agotados.map((i) => i.nombre).join(", ")}.{" "}
              </>
            )}
            {reponer.length > 0 && (
              <>
                <strong>{reponer.length}</strong> en o por debajo del stock minimo: {reponer.map((i) => i.nombre).join(", ")}.
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {tabsVisibles.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 -mb-px ${
                tab === t.id
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "insumos" && (
        <InsumosTab
          insumos={insumos}
          proveedores={proveedores}
          cargando={cargando}
          puedeGestionar={puedeGestionar}
          verFiltroArea={!esHousekeeping}
          onCambio={notificar}
          onVerHistorial={verHistorial}
        />
      )}
      {tab === "recetas" && (
        <RecetasTab insumos={insumos} puedeGestionar={puedeGestionar} onCambio={notificar} />
      )}
      {tab === "movimientos" && (
        <MovimientosTab
          insumos={insumos}
          version={version}
          idInsumoInicial={historialDe}
          verCosto={puedeGestionar}
          onCambio={notificar}
        />
      )}
      {tab === "proveedores" && (
        <ProveedoresTab proveedores={proveedores} puedeGestionar={puedeGestionar} onCambio={notificar} />
      )}
      {tab === "reportes" && <ReportesTab verCosto={puedeGestionar} onCambio={notificar} />}
    </div>
  );
}
