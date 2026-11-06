import { useEffect, useState } from "react";
import { inventarioApi } from "../../api/inventario";
import { mensajeDeError } from "../../api/errores";
import type { Insumo, MovimientoInventario, TipoMovInventario } from "../../api/types";
import { Badge, EmptyState, LoadingState } from "../../components/ui";
import { SUMA_STOCK, TIPO_LABEL, hoyISO, num, soles, type Mensaje } from "./comun";

interface Props {
  insumos: Insumo[];
  /** Cambia cuando se registra algo en otra pestana, para volver a pedir la lista. */
  version: number;
  idInsumoInicial?: number;
  verCosto: boolean;
  onCambio: (mensaje: Mensaje) => void;
}

const LIMITE = 200;

const VARIANTE: Record<TipoMovInventario, "emerald" | "blue" | "amber" | "slate"> = {
  ENTRADA: "emerald",
  SALIDA_CONSUMO: "blue",
  AJUSTE_MERMA: "amber",
  AJUSTE_INGRESO: "slate",
  DEVOLUCION_CONSUMO: "emerald",
};

export function MovimientosTab({ insumos, version, idInsumoInicial, verCosto, onCambio }: Props) {
  const [idInsumo, setIdInsumo] = useState(idInsumoInicial ? String(idInsumoInicial) : "");
  const [tipo, setTipo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [soloFaltantes, setSoloFaltantes] = useState(false);
  const [resultado, setResultado] = useState<{ clave: string; datos: MovimientoInventario[] } | null>(null);

  // La lista mostrada trae la clave de los filtros con que se pidio: si no coincide con los actuales, esta cargando.
  const clave = JSON.stringify([idInsumo, tipo, desde, hasta, soloFaltantes, version]);
  const cargando = resultado?.clave !== clave;
  const movimientos = resultado?.datos ?? [];

  useEffect(() => {
    let vigente = true;
    inventarioApi
      .listarMovimientos({
        idInsumo: idInsumo ? Number(idInsumo) : undefined,
        tipo: (tipo || undefined) as TipoMovInventario | undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        soloFaltantes,
        limite: LIMITE,
      })
      .then((datos) => vigente && setResultado({ clave, datos }))
      .catch((e) => {
        if (!vigente) return;
        setResultado({ clave, datos: [] });
        onCambio({ tipo: "error", texto: mensajeDeError(e, "No se pudieron cargar los movimientos.") });
      });
    return () => {
      vigente = false;
    };
  }, [clave, idInsumo, tipo, desde, hasta, soloFaltantes, onCambio]);

  const hayFiltros = idInsumo || tipo || desde || hasta || soloFaltantes;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 bg-white p-3 rounded-xl border border-slate-200">
        <label className="text-[10px] font-bold text-slate-500 uppercase">
          Insumo
          <select
            value={idInsumo}
            onChange={(e) => setIdInsumo(e.target.value)}
            className="block mt-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-normal normal-case w-44"
          >
            <option value="">Todos</option>
            {insumos.map((i) => (
              <option key={i.idInsumo} value={i.idInsumo}>{i.nombre}</option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-slate-500 uppercase">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="block mt-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-normal normal-case"
          >
            <option value="">Todos</option>
            {(Object.keys(TIPO_LABEL) as TipoMovInventario[]).map((t) => (
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-slate-500 uppercase">
          Desde
          <input type="date" value={desde} max={hoyISO()} onChange={(e) => setDesde(e.target.value)}
            className="block mt-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-bold text-slate-500 uppercase">
          Hasta
          <input type="date" value={hasta} max={hoyISO()} onChange={(e) => setHasta(e.target.value)}
            className="block mt-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-normal" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-1.5">
          <input type="checkbox" checked={soloFaltantes} onChange={(e) => setSoloFaltantes(e.target.checked)} />
          Solo con faltante
        </label>
        {hayFiltros && (
          <button
            onClick={() => { setIdInsumo(""); setTipo(""); setDesde(""); setHasta(""); setSoloFaltantes(false); }}
            className="text-[11px] text-emerald-700 font-semibold hover:underline pb-1.5"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 text-xs">
          <span className="font-bold text-slate-700">Movimientos ({movimientos.length})</span>
          {movimientos.length >= LIMITE && (
            <span className="text-slate-400"> · se muestran los {LIMITE} mas recientes; usa los filtros para acotar</span>
          )}
        </div>
        {cargando ? (
          <LoadingState />
        ) : movimientos.length === 0 ? (
          <EmptyState title="Sin movimientos para estos filtros" />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Fecha</th>
                <th className="p-3">Insumo</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Cantidad</th>
                <th className="p-3 text-right">Stock resultante</th>
                <th className="p-3 text-right">Faltante</th>
                {verCosto && <th className="p-3 text-right">Costo unit.</th>}
                <th className="p-3">Referencia</th>
                <th className="p-3">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movimientos.map((m) => {
                const unidad = m.insumo?.unidadMedida ?? "";
                return (
                  <tr key={m.idMovimiento} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {m.fechaHora ? m.fechaHora.slice(0, 16).replace("T", " ") : "—"}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{m.insumo?.nombre ?? "—"}</td>
                    <td className="p-3"><Badge variant={VARIANTE[m.tipoMovimiento]} label={TIPO_LABEL[m.tipoMovimiento]} /></td>
                    <td className={`p-3 text-right font-bold ${SUMA_STOCK[m.tipoMovimiento] ? "text-emerald-700" : "text-slate-800"}`}>
                      {SUMA_STOCK[m.tipoMovimiento] ? "+" : "−"}{num(m.cantidad)} <span className="font-normal text-slate-400">{unidad}</span>
                    </td>
                    <td className="p-3 text-right text-slate-600">{num(m.stockResultante)}</td>
                    <td className="p-3 text-right">
                      {Number(m.cantidadFaltante ?? 0) > 0 ? (
                        <span className="text-red-600 font-semibold" title="La venta pidio mas de lo que el almacen tenia registrado">
                          {num(m.cantidadFaltante)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    {verCosto && (
                      <td className="p-3 text-right text-slate-500">
                        {m.costoUnitario != null ? soles(m.costoUnitario) : "—"}
                      </td>
                    )}
                    <td className="p-3 text-slate-500">
                      {m.referenciaOrigen ?? "—"}
                      {m.proveedor && <span className="text-slate-400"> · {m.proveedor.nombre}</span>}
                    </td>
                    <td className="p-3 text-slate-500">
                      {m.empleado ? `${m.empleado.nombres ?? ""} ${m.empleado.apellidos ?? ""}`.trim() || "—" : "Sistema"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
