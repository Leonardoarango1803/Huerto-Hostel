import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { inventarioApi } from "../../api/inventario";
import { mensajeDeError } from "../../api/errores";
import type { Insumo, ResumenReceta } from "../../api/types";
import { Badge, Button, EmptyState, LoadingState } from "../../components/ui";
import { num, soles, type Mensaje } from "./comun";

interface Props {
  insumos: Insumo[];
  puedeGestionar: boolean;
  onCambio: (mensaje: Mensaje) => void;
}

type Filtro = "todos" | "sin" | "con";
type Linea = { idInsumo: string; cantidad: string };

const CATEGORIA_LABEL = { COCINA: "Cocina", BAR: "Bar", DIRECTO: "Directo" } as const;

export function RecetasTab({ insumos, puedeGestionar, onCambio }: Props) {
  const [resumen, setResumen] = useState<ResumenReceta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [seleccionado, setSeleccionado] = useState<ResumenReceta | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errorReceta, setErrorReceta] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    inventarioApi
      .resumenRecetas()
      .then((datos) => vigente && setResumen(datos))
      .catch((e) => vigente && onCambio({ tipo: "error", texto: mensajeDeError(e, "No se pudieron cargar las recetas.") }))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [onCambio]);

  const seleccionar = async (p: ResumenReceta) => {
    setSeleccionado(p);
    setErrorReceta(null);
    try {
      const receta = await inventarioApi.listarReceta(p.idProducto);
      setLineas(receta.map((r) => ({ idInsumo: String(r.insumo.idInsumo), cantidad: String(r.cantidad) })));
    } catch (e) {
      setLineas([]);
      setErrorReceta(mensajeDeError(e, "No se pudo cargar la receta."));
    }
  };

  const porId = useMemo(() => new Map(insumos.map((i) => [String(i.idInsumo), i])), [insumos]);

  // Costo de una unidad del producto con los costos actuales de cada insumo.
  const costoActual = lineas.reduce((suma, l) => {
    const i = porId.get(l.idInsumo);
    return suma + (i ? Number(l.cantidad || 0) * Number(i.costoUnitario ?? 0) : 0);
  }, 0);
  const margen = seleccionado ? Number(seleccionado.precioVenta) - costoActual : 0;

  const sinReceta = resumen.filter((p) => p.sinReceta && p.categoria !== "DIRECTO").length;
  const visibles = resumen.filter((p) =>
    filtro === "todos" ? true : filtro === "sin" ? p.sinReceta : !p.sinReceta
  );

  const guardar = async () => {
    if (!seleccionado) return;
    const validas = lineas.filter((l) => l.idInsumo && Number(l.cantidad) > 0);
    if (validas.length !== lineas.length) {
      setErrorReceta("Completa el insumo y una cantidad mayor a cero en cada linea, o quita la linea.");
      return;
    }
    setGuardando(true);
    setErrorReceta(null);
    try {
      await inventarioApi.guardarReceta(
        seleccionado.idProducto,
        validas.map((l) => ({ insumo: { idInsumo: Number(l.idInsumo) }, cantidad: Number(l.cantidad) }))
      );
      onCambio({ tipo: "ok", texto: `Receta de "${seleccionado.nombre}" guardada. Se descuenta al vender el producto.` });
      const actualizado = await inventarioApi.resumenRecetas();
      setResumen(actualizado);
      const nuevo = actualizado.find((p) => p.idProducto === seleccionado.idProducto);
      if (nuevo) setSeleccionado(nuevo);
    } catch (e) {
      setErrorReceta(mensajeDeError(e, "No se pudo guardar la receta."));
    } finally {
      setGuardando(false);
    }
  };

  const actualizarLinea = (idx: number, cambio: Partial<Linea>) =>
    setLineas((ls) => ls.map((l, i) => (i === idx ? { ...l, ...cambio } : l)));

  const yaUsados = new Set(lineas.map((l) => l.idInsumo));

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
        <div className="p-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700 text-xs">Productos ({visibles.length})</span>
          {sinReceta > 0 && (
            <Badge variant="amber" label={`${sinReceta} de cocina y bar sin receta`} />
          )}
          <div className="ml-auto flex gap-1">
            {([["todos", "Todos"], ["sin", "Sin receta"], ["con", "Con receta"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFiltro(id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                  filtro === id ? "bg-[#1b4332] text-white border-[#1b4332]" : "bg-white text-slate-600 border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {cargando ? (
          <LoadingState />
        ) : visibles.length === 0 ? (
          <EmptyState title="No hay productos para este filtro" />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Producto</th>
                <th className="p-3">Area</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 text-center">Insumos</th>
                <th className="p-3 text-right">Costo</th>
                <th className="p-3 text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((p) => (
                <tr
                  key={p.idProducto}
                  onClick={() => seleccionar(p)}
                  className={`cursor-pointer hover:bg-slate-50 ${seleccionado?.idProducto === p.idProducto ? "bg-emerald-50/60" : ""}`}
                >
                  <td className="p-3 font-semibold text-slate-800">{p.nombre}</td>
                  <td className="p-3 text-slate-500">{CATEGORIA_LABEL[p.categoria]}</td>
                  <td className="p-3 text-right">{soles(p.precioVenta)}</td>
                  <td className="p-3 text-center">
                    {p.sinReceta ? (
                      p.categoria === "DIRECTO" ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <Badge variant="amber" label="Sin receta" />
                      )
                    ) : (
                      p.lineas
                    )}
                  </td>
                  <td className="p-3 text-right text-slate-600">{p.sinReceta ? "—" : soles(p.costoReceta)}</td>
                  <td className={`p-3 text-right font-semibold ${p.sinReceta ? "text-slate-400" : Number(p.margen) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {p.sinReceta || p.margen === null ? "—" : soles(p.margen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {puedeGestionar && (
          <p className="p-3 text-[10px] text-slate-400 border-t border-slate-100">
            Para crear un producto nuevo o cambiar su precio, ve a{" "}
            <Link to="/servicios" className="text-emerald-700 font-semibold hover:underline">Productos y servicios</Link>.
          </p>
        )}
      </div>

      <div className="col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 h-fit">
        {!seleccionado ? (
          <p className="p-6 text-center text-slate-400 text-xs">
            Selecciona un producto para ver o definir que insumos consume cada unidad vendida.
          </p>
        ) : (
          <>
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">{seleccionado.nombre}</h3>
              <p className="text-[11px] text-slate-500">
                Cantidad de insumo que consume <strong>una unidad</strong>. Se descuenta al entregar la comanda o al
                cargar el consumo a la habitacion.
              </p>
            </div>
            {errorReceta && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{errorReceta}</p>
            )}
            <div className="space-y-2">
              {lineas.length === 0 && (
                <p className="text-[11px] text-slate-400">Este producto no descuenta nada del almacen.</p>
              )}
              {lineas.map((l, idx) => {
                const insumo = porId.get(l.idInsumo);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      aria-label="Insumo de la receta"
                      value={l.idInsumo}
                      disabled={!puedeGestionar}
                      onChange={(e) => actualizarLinea(idx, { idInsumo: e.target.value })}
                      className="col-span-6 border border-slate-300 rounded-lg px-2 py-1.5 text-xs disabled:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    >
                      <option value="">Insumo...</option>
                      {insumos
                        .filter((i) => i.estado !== false && (!yaUsados.has(String(i.idInsumo)) || String(i.idInsumo) === l.idInsumo))
                        .map((i) => (
                          <option key={i.idInsumo} value={i.idInsumo}>{i.nombre}</option>
                        ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      aria-label="Cantidad por unidad"
                      value={l.cantidad}
                      disabled={!puedeGestionar}
                      onChange={(e) => actualizarLinea(idx, { cantidad: e.target.value })}
                      className="col-span-3 border border-slate-300 rounded-lg px-2 py-1.5 text-xs disabled:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    />
                    <span className="col-span-2 text-[10px] text-slate-500">
                      {insumo ? `${insumo.unidadMedida} · ${soles(Number(l.cantidad || 0) * Number(insumo.costoUnitario ?? 0))}` : ""}
                    </span>
                    {puedeGestionar && (
                      <button
                        onClick={() => setLineas((ls) => ls.filter((_, i) => i !== idx))}
                        className="col-span-1 text-red-400 hover:text-red-600 flex justify-center"
                        title="Quitar"
                        aria-label="Quitar linea"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
              {puedeGestionar && (
                <button
                  onClick={() => setLineas((ls) => [...ls, { idInsumo: "", cantidad: "" }])}
                  className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1 hover:text-emerald-900"
                >
                  <Plus size={11} /> Agregar insumo
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-lg p-2 text-[11px]">
              <div><p className="text-slate-400">Precio</p><p className="font-bold">{soles(seleccionado.precioVenta)}</p></div>
              <div><p className="text-slate-400">Costo</p><p className="font-bold">{soles(costoActual)}</p></div>
              <div>
                <p className="text-slate-400">Margen</p>
                <p className={`font-bold ${margen < 0 ? "text-red-600" : "text-emerald-700"}`}>{soles(margen)}</p>
              </div>
            </div>
            {lineas.some((l) => Number(porId.get(l.idInsumo)?.costoUnitario ?? 0) === 0 && l.idInsumo) && (
              <p className="text-[10px] text-amber-700">
                Algun insumo no tiene costo registrado; el costo y el margen salen incompletos.
              </p>
            )}

            {puedeGestionar && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <Button onClick={guardar} loading={guardando}>Guardar receta</Button>
                <span className="text-[10px] text-slate-400">{num(seleccionado.lineas)} insumo(s) guardados</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
