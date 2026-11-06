import { useMemo, useState } from "react";
import { Info, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "../../components/ui";
import type { ProductoCatalogo } from "../../api/consumos";

export interface LineaCarrito {
  producto: ProductoCatalogo;
  cantidad: number;
}

type Pestana = "TODOS" | "DIRECTO" | "COCINA" | "BAR";

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: "TODOS", texto: "Todos" },
  { id: "DIRECTO", texto: "Servicios" },
  { id: "COCINA", texto: "Cocina" },
  { id: "BAR", texto: "Bar" },
];

const MAXIMO = 99;
const soles = (n: number) => `S/ ${n.toFixed(2)}`;

interface Props {
  productos: ProductoCatalogo[];
  frecuentes: number[];
  carrito: LineaCarrito[];
  registrando: boolean;
  onCarrito: (carrito: LineaCarrito[]) => void;
  onRegistrar: () => void;
  onIrAComandas: () => void;
}

/**
 * Elegir lo que se carga al folio: busqueda, categorias, accesos rapidos a lo mas pedido y un carrito para registrar varias
 * lineas de una vez. Los servicios son lo propio de este modulo; comida y bebida se piden mejor por Comandas.
 */
export function SelectorProductos({ productos, frecuentes, carrito, registrando, onCarrito, onRegistrar, onIrAComandas }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState<Pestana>("DIRECTO");

  const activos = useMemo(() => productos.filter((p) => p.estado), [productos]);
  const rapidos = useMemo(
    () => frecuentes.map((id) => activos.find((p) => p.idProducto === id)).filter((p): p is ProductoCatalogo => Boolean(p)),
    [frecuentes, activos]
  );
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return activos.filter((p) => (pestana === "TODOS" || p.categoria === pestana)
      && (!q || p.nombre.toLowerCase().includes(q) || (p.descripcion ?? "").toLowerCase().includes(q)));
  }, [activos, pestana, busqueda]);

  const agregar = (p: ProductoCatalogo) => {
    const existe = carrito.find((l) => l.producto.idProducto === p.idProducto);
    onCarrito(existe
      ? carrito.map((l) => (l === existe ? { ...l, cantidad: Math.min(MAXIMO, l.cantidad + 1) } : l))
      : [...carrito, { producto: p, cantidad: 1 }]);
  };
  const cambiar = (id: number, delta: number) =>
    onCarrito(carrito
      .map((l) => (l.producto.idProducto === id ? { ...l, cantidad: Math.min(MAXIMO, l.cantidad + delta) } : l))
      .filter((l) => l.cantidad > 0));
  const quitar = (id: number) => onCarrito(carrito.filter((l) => l.producto.idProducto !== id));

  const total = carrito.reduce((s, l) => s + l.producto.precioVenta * l.cantidad, 0);
  const unidades = carrito.reduce((s, l) => s + l.cantidad, 0);
  const llevaComida = carrito.some((l) => l.producto.categoria !== "DIRECTO") || pestana === "COCINA" || pestana === "BAR";

  return (
    <div className="grid grid-cols-5 gap-3">
      <div className="col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <Search size={13} className="text-slate-400" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto o servicio..."
            aria-label="Buscar producto o servicio" className="flex-1 text-xs focus:outline-none" />
        </div>

        {rapidos.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Lo más pedido</p>
            <div className="flex flex-wrap gap-1.5">
              {rapidos.map((p) => (
                <button key={p.idProducto} onClick={() => agregar(p)} aria-label={`Agregar rápido ${p.nombre}`}
                  className="text-[11px] border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 px-2 py-1 rounded-full">
                  {p.nombre} · {soles(p.precioVenta)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-1 border-b border-slate-200" role="tablist">
          {PESTANAS.map((t) => (
            <button key={t.id} role="tab" aria-selected={pestana === t.id} onClick={() => setPestana(t.id)}
              className={`px-3 py-1.5 text-[11px] font-semibold border-b-2 -mb-px ${pestana === t.id ? "border-[#1b4332] text-[#1b4332]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {t.texto}
            </button>
          ))}
        </div>

        {(pestana === "COCINA" || pestana === "BAR") && (
          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 flex items-start gap-1.5">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Los pedidos de cocina y bar se hacen mejor por <button onClick={onIrAComandas} className="font-semibold underline">Comandas</button>:
              se preparan, se entregan y quedan con seguimiento. Cárgalos aquí solo si ya se consumieron.
            </span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {visibles.length === 0 ? (
            <p className="col-span-2 text-center text-slate-400 text-xs py-4">Ningún producto coincide.</p>
          ) : visibles.map((p) => (
            <button key={p.idProducto} onClick={() => agregar(p)}
              className="text-left border border-slate-200 rounded-lg p-2.5 hover:bg-slate-50 hover:border-emerald-300 flex items-center justify-between gap-2">
              <span>
                <span className="block text-xs font-semibold text-slate-800">{p.nombre}</span>
                <span className="block text-[10px] text-slate-400">{p.categoria === "DIRECTO" ? "Servicio" : p.categoria === "COCINA" ? "Cocina" : "Bar"}</span>
              </span>
              <span className="text-xs font-bold text-slate-900 whitespace-nowrap">{soles(p.precioVenta)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <ShoppingCart size={13} className="text-emerald-700" /> Por cargar al folio
          {unidades > 0 && <span className="ml-auto text-[10px] text-slate-500">{unidades} unidad(es)</span>}
        </h3>
        {carrito.length === 0 ? (
          <p className="text-[11px] text-slate-400 py-4 text-center">Elige productos o servicios de la izquierda.</p>
        ) : (
          <ul className="space-y-1.5" aria-label="Carrito de consumos">
            {carrito.map((l) => (
              <li key={l.producto.idProducto} className="flex items-center gap-2 text-xs">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-800 truncate">{l.producto.nombre}</span>
                  <span className="block text-[10px] text-slate-400">{soles(l.producto.precioVenta)} c/u</span>
                </span>
                <button onClick={() => cambiar(l.producto.idProducto, -1)} aria-label={`Quitar una unidad de ${l.producto.nombre}`}
                  className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Minus size={11} /></button>
                <span className="w-6 text-center font-bold">{l.cantidad}</span>
                <button onClick={() => cambiar(l.producto.idProducto, 1)} aria-label={`Agregar una unidad de ${l.producto.nombre}`}
                  className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Plus size={11} /></button>
                <span className="w-16 text-right font-bold text-slate-900">{soles(l.producto.precioVenta * l.cantidad)}</span>
                <button onClick={() => quitar(l.producto.idProducto)} aria-label={`Quitar ${l.producto.nombre} del carrito`}
                  className="text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
          <span className="text-slate-500">Total a cargar</span>
          <strong className="text-sm text-slate-900">{soles(total)}</strong>
        </div>
        {llevaComida && carrito.length > 0 && (
          <p className="text-[10px] text-slate-500">Incluye comida o bebida: descuenta insumos del inventario al registrar.</p>
        )}
        <Button onClick={onRegistrar} loading={registrando} disabled={carrito.length === 0}>
          Registrar {carrito.length > 1 ? `${carrito.length} consumos` : "consumo"}
        </Button>
      </div>
    </div>
  );
}
