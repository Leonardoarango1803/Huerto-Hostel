import { useMemo, useState } from "react";
import { ArrowDownUp, History, Pencil, Plus } from "lucide-react";
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

  const [editando, setEditando] = useState<Insumo | "nuevo" | null>(null);
  const [formInsumo, setFormInsumo] = useState({ ...VACIO_INSUMO });
  const [errorInsumo, setErrorInsumo] = useState<string | null>(null);

  const [moviendo, setMoviendo] = useState(false);
  const [formMov, setFormMov] = useState({ ...VACIO_MOV });
  const [errorMov, setErrorMov] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return insumos.filter((i) => {
      if (q && !i.nombre.toLowerCase().includes(q)) return false;
      if (area && i.area !== area) return false;
      if (soloReponer && !["reponer", "agotado"].includes(estadoStock(i))) return false;
      return true;
    });
  }, [insumos, busqueda, area, soloReponer]);

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
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
        <input
          type="text"
          placeholder="Buscar insumo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
        />
        {verFiltroArea && (
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label="Filtrar por area"
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
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
                  <td className="p-3 font-semibold text-slate-800">{i.nombre}</td>
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
                        className="px-2 py-1 rounded border border-slate-200 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                      >
                        + Entrada
                      </button>
                      <button
                        title="Conteo fisico"
                        onClick={() => abrirMovimiento("CONTEO", i)}
                        className="px-2 py-1 rounded border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
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
          {errorInsumo && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{errorInsumo}</p>}
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
          {errorMov && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{errorMov}</p>}
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
                className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md ${
                  formMov.modo === modo ? "bg-white shadow-sm text-[#1b4332]" : "text-slate-500"
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
