import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, History, Pencil, Plus, ShoppingBag } from "lucide-react";
import { inventarioApi } from "../../api/inventario";
import { mensajeDeError } from "../../api/errores";
import type { AreaInsumo, Insumo, Proveedor } from "../../api/types";
import { Badge, Button, EmptyState, FormField, FormModal, Input, LoadingState, Select } from "../../components/ui";
import { AREAS, AREA_LABEL, UNIDADES, estadoStock, num, soles, type Mensaje } from "./comun";

interface Props {
  insumos: Insumo[];
  proveedores: Proveedor[];
  cargando: boolean;
  puedeGestionar: boolean;
  /** Housekeeping solo ve limpieza: el filtro de area no aporta nada. */
  verFiltroArea: boolean;
  onCambio: (mensaje: Mensaje) => void;
  onVerHistorial: (idInsumo: number) => void;
}

type ModoMovimiento = "ENTRADA" | "AJUSTE_MERMA" | "CONTEO";

const VACIO_INSUMO = {
  nombre: "",
  unidadMedida: "GR",
  area: "GENERAL",
  stockActual: "0",
  stockMinimo: "0",
  costoUnitario: "0",
  idProveedor: "",
  estado: true,
};

const VACIO_VENTA = { nombre: "", categoria: "BAR", precioVenta: "", cantidad: "1" };

const VACIO_MOV = {
  idInsumo: "",
  modo: "ENTRADA" as ModoMovimiento,
  cantidad: "",
  costoUnitario: "",
  idProveedor: "",
  motivo: "",
};

export function InsumosTab({
  insumos, proveedores, cargando, puedeGestionar, verFiltroArea, onCambio, onVerHistorial,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [area, setArea] = useState("");
  const [soloReponer, setSoloReponer] = useState(false);
  const [soloSinProducto, setSoloSinProducto] = useState(false);

  // Productos que usan cada insumo (null = aun no se sabe o este rol no lo ve). Los de limpieza son de uso interno.
  const [uso, setUso] = useState<Record<string, string[]> | null>(null);
  const [versionUso, setVersionUso] = useState(0);
  const [vendiendo, setVendiendo] = useState<Insumo | null>(null);
  const [formVenta, setFormVenta] = useState({ ...VACIO_VENTA });
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  const [editando, setEditando] = useState<Insumo | "nuevo" | null>(null);
  const [formInsumo, setFormInsumo] = useState({ ...VACIO_INSUMO });
  const [errorInsumo, setErrorInsumo] = useState<string | null>(null);

  const [moviendo, setMoviendo] = useState(false);
  const [formMov, setFormMov] = useState({ ...VACIO_MOV });
  const [errorMov, setErrorMov] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!verFiltroArea) return; // housekeeping no ve recetas ni productos
    let vigente = true;
    inventarioApi.usoInsumos().then((u) => vigente && setUso(u)).catch(() => undefined);
    return () => { vigente = false; };
  }, [verFiltroArea, versionUso, insumos]);

  /** Activo, no es de limpieza y no esta en ninguna receta: existe en el almacen pero no se puede vender. */
  const sinProducto = (i: Insumo) =>
    uso !== null && i.estado !== false && i.area !== "LIMPIEZA" && !(uso[String(i.idInsumo)]?.length);
  const cuantosSinProducto = useMemo(
    () => (uso === null ? 0 : insumos.filter((i) => i.estado !== false && i.area !== "LIMPIEZA" && !(uso[String(i.idInsumo)]?.length)).length),
    [insumos, uso]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return insumos.filter((i) => {
      if (q && !i.nombre.toLowerCase().includes(q)) return false;
      if (area && i.area !== area) return false;
      if (soloReponer && !["reponer", "agotado"].includes(estadoStock(i))) return false;
      if (soloSinProducto && (uso === null || i.estado === false || i.area === "LIMPIEZA" || uso[String(i.idInsumo)]?.length)) return false;
      return true;
    });
  }, [insumos, busqueda, area, soloReponer, soloSinProducto, uso]);

  const valorTotal = useMemo(
    () =>
      insumos
        .filter((i) => i.estado !== false)
        .reduce((s, i) => s + Number(i.stockActual) * Number(i.costoUnitario ?? 0), 0),
    [insumos]
  );

  const insumoMov = insumos.find((i) => String(i.idInsumo) === formMov.idInsumo);
  const unidadMov = insumoMov?.unidadMedida ?? "";

  // ---------- Alta y edicion ----------

  const abrirInsumo = (i: Insumo | "nuevo") => {
    setErrorInsumo(null);
    setEditando(i);
    setFormInsumo(
      i === "nuevo"
        ? { ...VACIO_INSUMO }
        : {
            nombre: i.nombre,
            unidadMedida: i.unidadMedida,
            area: i.area ?? "GENERAL",
            stockActual: String(i.stockActual),
            stockMinimo: String(i.stockMinimo),
            costoUnitario: String(i.costoUnitario ?? 0),
            idProveedor: i.proveedorHabitual ? String(i.proveedorHabitual.idProveedor) : "",
            estado: i.estado !== false,
          }
    );
  };

  const guardarInsumo = async () => {
    if (!formInsumo.nombre.trim()) {
      setErrorInsumo("El insumo necesita un nombre.");
      return;
    }
    const datos: Partial<Insumo> = {
      nombre: formInsumo.nombre.trim(),
      unidadMedida: formInsumo.unidadMedida as Insumo["unidadMedida"],
      area: formInsumo.area as AreaInsumo,
      stockMinimo: Number(formInsumo.stockMinimo || 0),
      costoUnitario: Number(formInsumo.costoUnitario || 0),
      proveedorHabitual: formInsumo.idProveedor
        ? ({ idProveedor: Number(formInsumo.idProveedor) } as Proveedor)
        : null,
    };
    setGuardando(true);
    setErrorInsumo(null);
    try {
      if (editando === "nuevo") {
        await inventarioApi.crearInsumo({ ...datos, stockActual: Number(formInsumo.stockActual || 0) });
        onCambio({ tipo: "ok", texto: `Insumo "${datos.nombre}" creado.` });
      } else if (editando) {
        await inventarioApi.actualizarInsumo(editando.idInsumo, { ...datos, estado: formInsumo.estado });
        onCambio({ tipo: "ok", texto: `Insumo "${datos.nombre}" actualizado.` });
      }
      setEditando(null);
    } catch (e) {
      setErrorInsumo(mensajeDeError(e, "No se pudo guardar el insumo."));
    } finally {
      setGuardando(false);
    }
  };

  // ---------- Movimientos ----------

  const abrirMovimiento = (modo: ModoMovimiento, insumo?: Insumo) => {
    setErrorMov(null);
    setFormMov({
      ...VACIO_MOV,
      modo,
      idInsumo: insumo ? String(insumo.idInsumo) : "",
      costoUnitario: modo === "ENTRADA" && insumo?.costoUnitario ? String(insumo.costoUnitario) : "",
      idProveedor: modo === "ENTRADA" && insumo?.proveedorHabitual
        ? String(insumo.proveedorHabitual.idProveedor)
        : "",
    });
    setMoviendo(true);
  };

  const guardarMovimiento = async () => {
    if (!formMov.idInsumo || formMov.cantidad === "") {
      setErrorMov("Selecciona el insumo e indica la cantidad.");
      return;
    }
    if (formMov.modo === "AJUSTE_MERMA" && !formMov.motivo.trim()) {
      setErrorMov("Indica el motivo de la merma.");
      return;
    }
    setGuardando(true);
    setErrorMov(null);
    try {
      if (formMov.modo === "CONTEO") {
        const r = await inventarioApi.registrarConteo({
          idInsumo: Number(formMov.idInsumo),
          stockContado: Number(formMov.cantidad),
          motivo: formMov.motivo.trim() || undefined,
        });
        onCambio({
          tipo: "ok",
          texto: r.ajustado
            ? `Conteo registrado: el stock de "${insumoMov?.nombre}" quedo en ${num(formMov.cantidad)} ${unidadMov}.`
            : "El conteo coincide con el sistema; no hubo nada que ajustar.",
        });
      } else {
        await inventarioApi.registrarMovimiento({
          idInsumo: Number(formMov.idInsumo),
          tipoMovimiento: formMov.modo,
          cantidad: Number(formMov.cantidad),
          referenciaOrigen: formMov.motivo.trim() || undefined,
          costoUnitario:
            formMov.modo === "ENTRADA" && formMov.costoUnitario !== ""
              ? Number(formMov.costoUnitario)
              : undefined,
          idProveedor:
            formMov.modo === "ENTRADA" && formMov.idProveedor ? Number(formMov.idProveedor) : undefined,
        });
        onCambio({
          tipo: "ok",
          texto: formMov.modo === "ENTRADA" ? "Entrada registrada." : "Merma registrada.",
        });
      }
      setMoviendo(false);
    } catch (e) {
      setErrorMov(mensajeDeError(e, "No se pudo registrar el movimiento."));
    } finally {
      setGuardando(false);
    }
  };

  const abrirVenta = (i: Insumo) => {
    setErrorVenta(null);
    setFormVenta({
      nombre: i.nombre,
      categoria: i.area === "COCINA" ? "COCINA" : "BAR",
      precioVenta: "",
      cantidad: i.unidadMedida === "UND" ? "1" : "",
    });
    setVendiendo(i);
  };

  const costoVenta = vendiendo ? Number(formVenta.cantidad || 0) * Number(vendiendo.costoUnitario ?? 0) : 0;
  const margenVenta = Number(formVenta.precioVenta || 0) - costoVenta;

  const guardarVenta = async () => {
    if (!vendiendo) return;
    const precio = Number(formVenta.precioVenta);
    const cantidad = Number(formVenta.cantidad);
    if (!formVenta.nombre.trim()) return setErrorVenta("Escribe el nombre con el que se venderá.");
    if (!(precio > 0)) return setErrorVenta("Indica el precio de venta (mayor a cero).");
    if (!(cantidad > 0)) return setErrorVenta("Indica cuánto se descuenta del almacén en cada venta.");
    setGuardando(true);
    setErrorVenta(null);
    try {
      const p = await inventarioApi.venderInsumo(vendiendo.idInsumo, {
        nombre: formVenta.nombre.trim(),
        categoria: formVenta.categoria as "COCINA" | "BAR" | "DIRECTO",
        precioVenta: precio,
        cantidad,
      });
      onCambio({
        tipo: "ok",
        texto: `"${p.nombre}" ya se vende en Productos y servicios (${soles(p.precioVenta)}). Cada venta descuenta ${num(cantidad)} ${vendiendo.unidadMedida} de "${vendiendo.nombre}".`,
      });
      setVendiendo(null);
      setVersionUso((v) => v + 1);
    } catch (e) {
      setErrorVenta(mensajeDeError(e, "No se pudo crear el producto."));
    } finally {
      setGuardando(false);
    }
  };

  const etiquetaEstado = (i: Insumo) => {
    switch (estadoStock(i)) {
      case "inactivo": return <Badge variant="slate" label="Inactivo" />;
      case "agotado": return <Badge variant="red" label="Agotado" />;
      case "reponer": return <Badge variant="amber" label="Reponer" />;
      default: return <Badge variant="emerald" label="OK" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-[#EFE6D6]">
        <input
          type="text"
          placeholder="Buscar insumo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-[#2D5A27]"
        />
        {verFiltroArea && (
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label="Filtrar por area"
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2D5A27]"
          >
            <option value="">Todas las areas</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{AREA_LABEL[a]}</option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={soloReponer} onChange={(e) => setSoloReponer(e.target.checked)} />
          Solo por reponer
        </label>
        {cuantosSinProducto > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={soloSinProducto} onChange={(e) => setSoloSinProducto(e.target.checked)} />
            Solo sin producto ({cuantosSinProducto})
          </label>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<ArrowDownUp size={12} />} onClick={() => abrirMovimiento("ENTRADA")}>
            Registrar movimiento
          </Button>
          {puedeGestionar && (
            <Button size="sm" icon={<Plus size={12} />} onClick={() => abrirInsumo("nuevo")}>
              Nuevo insumo
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EFE6D6] overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex justify-between text-xs">
          <span className="font-bold text-slate-700">
            Insumos en almacen ({visibles.length}{visibles.length !== insumos.length ? ` de ${insumos.length}` : ""})
          </span>
          {puedeGestionar && (
            <span className="text-slate-500">
              Valor del stock: <strong className="text-slate-800">{soles(valorTotal)}</strong>
            </span>
          )}
        </div>
        {cargando ? (
          <LoadingState />
        ) : visibles.length === 0 ? (
          <EmptyState
            title={insumos.length === 0 ? "Aun no hay insumos registrados" : "Ningun insumo coincide con el filtro"}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[12px] text-slate-500 font-bold uppercase">
                <th className="p-3">Insumo</th>
                <th className="p-3">Area</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-right">Minimo</th>
                {puedeGestionar && <th className="p-3 text-right">Costo unit.</th>}
                {puedeGestionar && <th className="p-3 text-right">Valor</th>}
                <th className="p-3">Proveedor</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((i) => (
                <tr key={i.idInsumo} className={`hover:bg-slate-50 ${i.estado === false ? "opacity-60" : ""}`}>
                  <td className="p-3 font-semibold text-slate-800">
                    {i.nombre}
                    {uso && uso[String(i.idInsumo)]?.length ? (
                      <span className="block text-[12px] font-normal text-slate-400">Se vende como: {uso[String(i.idInsumo)].join(", ")}</span>
                    ) : sinProducto(i) ? (
                      <span className="block text-[12px] font-normal text-amber-700">Sin producto: no aparece en Productos y servicios</span>
                    ) : null}
                  </td>
                  <td className="p-3 text-slate-500">{AREA_LABEL[i.area ?? "GENERAL"]}</td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {num(i.stockActual)} <span className="font-normal text-slate-400">{i.unidadMedida}</span>
                  </td>
                  <td className="p-3 text-right text-slate-500">{num(i.stockMinimo)}</td>
                  {puedeGestionar && (
                    <td className="p-3 text-right text-slate-500">{soles(i.costoUnitario)}</td>
                  )}
                  {puedeGestionar && (
                    <td className="p-3 text-right text-slate-700">
                      {soles(Number(i.stockActual) * Number(i.costoUnitario ?? 0))}
                    </td>
                  )}
                  <td className="p-3 text-slate-500">{i.proveedorHabitual?.nombre ?? "—"}</td>
                  <td className="p-3 text-center">{etiquetaEstado(i)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Registrar entrada"
                        onClick={() => abrirMovimiento("ENTRADA", i)}
                        disabled={i.estado === false}
                        className="px-2 py-1 rounded border border-slate-200 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                      >
                        + Entrada
                      </button>
                      <button
                        title="Conteo fisico"
                        onClick={() => abrirMovimiento("CONTEO", i)}
                        className="px-2 py-1 rounded border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Contar
                      </button>
                      <button
                        title="Ver historial"
                        aria-label={`Historial de ${i.nombre}`}
                        onClick={() => onVerHistorial(i.idInsumo)}
                        className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <History size={12} />
                      </button>
                      {puedeGestionar && sinProducto(i) && (
                        <button
                          title="Crear el producto de venta con este insumo"
                          aria-label={`Vender ${i.nombre}`}
                          onClick={() => abrirVenta(i)}
                          className="px-2 py-1 rounded border border-emerald-200 text-[12px] font-semibold text-emerald-800 hover:bg-emerald-50 inline-flex items-center gap-1"
                        >
                          <ShoppingBag size={11} /> Vender
                        </button>
                      )}
                      {puedeGestionar && (
                        <button
                          title="Editar insumo"
                          aria-label={`Editar ${i.nombre}`}
                          onClick={() => abrirInsumo(i)}
                          className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Vender este insumo: crea el producto y su receta */}
      <FormModal
        open={vendiendo !== null}
        title="Vender este insumo"
        subtitle={vendiendo ? `Crea el producto en Productos y servicios con la receta de "${vendiendo.nombre}"` : undefined}
        submitLabel="Crear producto"
        loading={guardando}
        onClose={() => setVendiendo(null)}
        onSubmit={guardarVenta}
        size="sm"
      >
        {errorVenta && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorVenta}</p>}
        <FormField label="Nombre del producto" required>
          <Input value={formVenta.nombre} maxLength={100} aria-label="Nombre del producto"
            onChange={(e) => setFormVenta({ ...formVenta, nombre: e.target.value })} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Categoría" required>
            <Select value={formVenta.categoria} aria-label="Categoría del producto"
              onChange={(e) => setFormVenta({ ...formVenta, categoria: e.target.value })}>
              <option value="BAR">Bar</option>
              <option value="COCINA">Cocina</option>
              <option value="DIRECTO">Directo (recepción)</option>
            </Select>
          </FormField>
          <FormField label="Precio de venta (S/)" required>
            <Input type="number" step="0.01" min="0" value={formVenta.precioVenta} aria-label="Precio de venta"
              onChange={(e) => setFormVenta({ ...formVenta, precioVenta: e.target.value })} placeholder="0.00" />
          </FormField>
        </div>
        <FormField label={`Se descuenta por cada venta (${vendiendo?.unidadMedida ?? ""})`} required>
          <Input type="number" step="any" min="0" value={formVenta.cantidad} aria-label="Cantidad por venta"
            onChange={(e) => setFormVenta({ ...formVenta, cantidad: e.target.value })} />
        </FormField>
        {vendiendo && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-0.5">
            <p>
              Cada vez que se venda 1 «{formVenta.nombre || vendiendo.nombre}», se descontarán{" "}
              <strong>{num(Number(formVenta.cantidad || 0))} {vendiendo.unidadMedida}</strong> de «{vendiendo.nombre}».
            </p>
            {Number(formVenta.precioVenta) > 0 && Number(vendiendo.costoUnitario ?? 0) > 0 && (
              <p>
                Costo {soles(costoVenta)} · margen <strong className={margenVenta < 0 ? "text-red-600" : "text-emerald-700"}>{soles(margenVenta)}</strong>
              </p>
            )}
            {vendiendo.unidadMedida !== "UND" && (
              <p className="text-amber-700">Este insumo se mide en {vendiendo.unidadMedida}: indica cuántos {vendiendo.unidadMedida} lleva cada unidad vendida.</p>
            )}
          </div>
        )}
      </FormModal>

      {/* Alta / edicion de insumo */}
      <FormModal
        open={editando !== null}
        title={editando === "nuevo" ? "Nuevo insumo" : "Editar insumo"}
        subtitle={editando === "nuevo" ? undefined : "El stock cambia solo con movimientos o con un conteo fisico."}
        submitLabel={editando === "nuevo" ? "Crear insumo" : "Guardar cambios"}
        loading={guardando}
        onClose={() => setEditando(null)}
        onSubmit={guardarInsumo}
      >
        <div className="space-y-3">
          {errorInsumo && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{errorInsumo}</p>}
          <FormField label="Nombre" required>
            <Input value={formInsumo.nombre} onChange={(e) => setFormInsumo((f) => ({ ...f, nombre: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Unidad de medida" required>
              <Select value={formInsumo.unidadMedida} onChange={(e) => setFormInsumo((f) => ({ ...f, unidadMedida: e.target.value }))}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </FormField>
            <FormField label="Area">
              <Select value={formInsumo.area} onChange={(e) => setFormInsumo((f) => ({ ...f, area: e.target.value }))}>
                {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
              </Select>
            </FormField>
            <FormField label="Stock minimo" hint="Por debajo se avisa para reponer">
              <Input type="number" min={0} value={formInsumo.stockMinimo} onChange={(e) => setFormInsumo((f) => ({ ...f, stockMinimo: e.target.value }))} />
            </FormField>
            <FormField label="Costo por unidad (S/)" hint="Para valorizar stock y recetas">
              <Input type="number" min={0} step="0.0001" value={formInsumo.costoUnitario} onChange={(e) => setFormInsumo((f) => ({ ...f, costoUnitario: e.target.value }))} />
            </FormField>
            {editando === "nuevo" && (
              <FormField label="Stock inicial" hint="Entra como un movimiento">
                <Input type="number" min={0} step="0.001" value={formInsumo.stockActual} onChange={(e) => setFormInsumo((f) => ({ ...f, stockActual: e.target.value }))} />
              </FormField>
            )}
            <FormField label="Proveedor habitual">
              <Select value={formInsumo.idProveedor} onChange={(e) => setFormInsumo((f) => ({ ...f, idProveedor: e.target.value }))}>
                <option value="">Sin proveedor</option>
                {proveedores.filter((p) => p.estado !== false).map((p) => (
                  <option key={p.idProveedor} value={p.idProveedor}>{p.nombre}</option>
                ))}
              </Select>
            </FormField>
          </div>
          {editando !== "nuevo" && (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={formInsumo.estado} onChange={(e) => setFormInsumo((f) => ({ ...f, estado: e.target.checked }))} />
              Insumo activo (desmarcalo para dejar de usarlo sin perder su historial)
            </label>
          )}
        </div>
      </FormModal>

      {/* Entrada, merma o conteo */}
      <FormModal
        open={moviendo}
        title="Movimiento de almacen"
        submitLabel="Registrar"
        loading={guardando}
        onClose={() => setMoviendo(false)}
        onSubmit={guardarMovimiento}
      >
        <div className="space-y-3">
          {errorMov && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{errorMov}</p>}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {([
              ["ENTRADA", "Entrada (compra)"],
              ["AJUSTE_MERMA", "Merma"],
              ["CONTEO", "Conteo fisico"],
            ] as const).map(([modo, etiqueta]) => (
              <button
                key={modo}
                type="button"
                onClick={() => setFormMov((f) => ({ ...f, modo }))}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md ${
                  formMov.modo === modo ? "bg-white shadow-sm text-[#2D5A27]" : "text-slate-500"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
          <FormField label="Insumo" required>
            <Select value={formMov.idInsumo} onChange={(e) => setFormMov((f) => ({ ...f, idInsumo: e.target.value }))}>
              <option value="">Selecciona...</option>
              {insumos.filter((i) => i.estado !== false).map((i) => (
                <option key={i.idInsumo} value={i.idInsumo}>
                  {i.nombre} ({num(i.stockActual)} {i.unidadMedida})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label={formMov.modo === "CONTEO" ? `Stock contado ${unidadMov ? `(${unidadMov})` : ""}` : `Cantidad ${unidadMov ? `(${unidadMov})` : ""}`}
            required
            hint={formMov.modo === "CONTEO" ? "El stock pasa a ser lo que contaste; la diferencia queda registrada." : undefined}
          >
            <Input type="number" min={0} step="0.001" value={formMov.cantidad} onChange={(e) => setFormMov((f) => ({ ...f, cantidad: e.target.value }))} />
          </FormField>
          {formMov.modo === "ENTRADA" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Costo por unidad (S/)" hint="Actualiza el costo del insumo">
                <Input type="number" min={0} step="0.0001" value={formMov.costoUnitario} onChange={(e) => setFormMov((f) => ({ ...f, costoUnitario: e.target.value }))} />
              </FormField>
              {proveedores.length > 0 && (
                <FormField label="Proveedor">
                  <Select value={formMov.idProveedor} onChange={(e) => setFormMov((f) => ({ ...f, idProveedor: e.target.value }))}>
                    <option value="">Sin proveedor</option>
                    {proveedores.filter((p) => p.estado !== false).map((p) => (
                      <option key={p.idProveedor} value={p.idProveedor}>{p.nombre}</option>
                    ))}
                  </Select>
                </FormField>
              )}
            </div>
          )}
          <FormField
            label={formMov.modo === "AJUSTE_MERMA" ? "Motivo de la merma" : formMov.modo === "CONTEO" ? "Motivo (opcional)" : "Referencia (factura, guia...)"}
            required={formMov.modo === "AJUSTE_MERMA"}
          >
            <Input value={formMov.motivo} onChange={(e) => setFormMov((f) => ({ ...f, motivo: e.target.value }))} />
          </FormField>
        </div>
      </FormModal>
    </div>
  );
}
