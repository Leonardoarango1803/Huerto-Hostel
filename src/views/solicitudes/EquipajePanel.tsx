import { useEffect, useMemo, useState } from "react";
import { Luggage, Plus, RefreshCw, Search } from "lucide-react";
import { equipajeApi, estadoEquipajeTexto, TIPO_EQUIPAJE, type EstadiaParaEquipaje, type EstadoEquipaje, type SolicitudEquipaje, type TipoEquipaje } from "../../api/equipaje";
import { mensajeDeError } from "../../api/errores";
import { fechaHora } from "../../utils/fechas";
import { AlertBanner, ConfirmModal, FormField, FormModal, Input, Select } from "../../components/ui";

const BADGE: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  ASIGNADA: "bg-blue-100 text-blue-800",
  EN_ATENCION: "bg-blue-100 text-blue-800",
  ATENDIDA: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-slate-200 text-slate-600",
};

const boton = "text-[12px] font-semibold px-2.5 py-1 rounded-lg";

/**
 * Equipaje del huesped dentro de Solicitudes: pedidos de subir/bajar maletas (los atiende limpieza o recepcion) y
 * maletas en custodia (las recibe y entrega recepcion, con un codigo EQ-xxxxx que se le da al huesped).
 */
export function EquipajePanel({ puedeRecibir }: { puedeRecibir: boolean }) {
  const [lista, setLista] = useState<SolicitudEquipaje[] | null>(null);
  const [historial, setHistorial] = useState(false);
  const [version, setVersion] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [estadias, setEstadias] = useState<EstadiaParaEquipaje[]>([]);
  const [form, setForm] = useState({ idEstadia: "", tipo: "CUSTODIA" as TipoEquipaje, bultos: "1", descripcion: "" });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [entregar, setEntregar] = useState<SolicitudEquipaje | null>(null);

  useEffect(() => {
    let vigente = true;
    equipajeApi
      .listar(historial)
      .then((l) => vigente && setLista(l))
      .catch((e) => vigente && setMensaje({ tipo: "error", texto: mensajeDeError(e, "No se pudo cargar el equipaje.") }));
    return () => {
      vigente = false;
    };
  }, [historial, version]);

  const recargar = () => setVersion((v) => v + 1);

  const filtrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (lista ?? []).filter((s) => !q || [s.codigo, s.habitacion, s.huesped, s.descripcion].some((x) => x?.toLowerCase().includes(q)));
  }, [lista, busqueda]);

  const enCustodia = (lista ?? []).filter((s) => s.tipo === "CUSTODIA" && s.estado === "EN_ATENCION").length;
  const porAtender = (lista ?? []).filter((s) => s.tipo !== "CUSTODIA" && ["PENDIENTE", "ASIGNADA", "EN_ATENCION"].includes(s.estado)).length;

  async function abrirForm() {
    setErrorForm(null);
    setForm({ idEstadia: "", tipo: "CUSTODIA", bultos: "1", descripcion: "" });
    setFormAbierto(true);
    try {
      setEstadias(await equipajeApi.estadias());
    } catch (e) {
      setErrorForm(mensajeDeError(e, "No se pudieron cargar las estadías."));
    }
  }

  async function registrar() {
    if (!form.idEstadia) {
      setErrorForm("Elige la habitación o el huésped.");
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    try {
      const s = await equipajeApi.registrar({
        idEstadia: Number(form.idEstadia),
        tipo: form.tipo,
        bultos: form.tipo === "CUSTODIA" ? Number(form.bultos) : undefined,
        descripcion: form.descripcion.trim() || undefined,
      });
      setFormAbierto(false);
      setMensaje({
        tipo: "success",
        texto: s.tipo === "CUSTODIA"
          ? `Equipaje guardado con el código ${s.codigo}. Entrégale ese código al huésped para recogerlo.`
          : `Pedido ${s.codigo} registrado: ${TIPO_EQUIPAJE[s.tipo].toLowerCase()} de la habitación ${s.habitacion}.`,
      });
      recargar();
    } catch (e) {
      setErrorForm(mensajeDeError(e, "No se pudo registrar."));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiar(s: SolicitudEquipaje, estado: EstadoEquipaje, texto: string) {
    setMensaje(null);
    try {
      await equipajeApi.cambiarEstado(s.idSolicitud, estado);
      setMensaje({ tipo: "success", texto });
      recargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e, "No se pudo actualizar.") });
    }
  }

  const estadiaElegida = estadias.find((e) => String(e.idEstadia) === form.idEstadia);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-[#EFE6D6]">
          <p className="text-[11px] font-bold text-slate-400 uppercase">En custodia</p>
          <p className="text-xl font-bold text-slate-900">{lista ? enCustodia : "—"}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-[#EFE6D6]">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Subir / bajar por atender</p>
          <p className="text-xl font-bold text-amber-700">{lista ? porAtender : "—"}</p>
        </div>
      </div>

      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE6D6] flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-64">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Código EQ-…, habitación o huésped"
            aria-label="Buscar equipaje"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-slate-600">
            <input type="checkbox" checked={historial} onChange={(e) => setHistorial(e.target.checked)} className="accent-[#2D5A27]" />
            Ver historial
          </label>
          <button onClick={recargar} title="Refrescar" className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50">
            <RefreshCw size={13} />
          </button>
          {puedeRecibir && (
            <button onClick={abrirForm} className="bg-[#2D5A27] hover:bg-[#1E3F1A] text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Plus size={14} /> Registrar equipaje
            </button>
          )}
        </div>
      </div>

      {mensaje && <AlertBanner type={mensaje.tipo} message={mensaje.texto} />}

      <div className="bg-white rounded-2xl border border-[#EFE6D6] overflow-hidden">
        {lista === null ? (
          <p className="p-4 text-center text-slate-400">Cargando…</p>
        ) : filtrada.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Luggage size={30} className="mx-auto mb-2 opacity-30" />
            <p>{historial ? "Sin movimientos de equipaje." : "No hay equipaje en custodia ni pedidos por atender."}</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[12px] text-slate-500 font-bold uppercase">
                <th className="p-3">Código</th>
                <th className="p-3">Habitación / huésped</th>
                <th className="p-3">Detalle</th>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrada.map((s) => {
                const abierta = ["PENDIENTE", "ASIGNADA", "EN_ATENCION"].includes(s.estado);
                return (
                  <tr key={s.idSolicitud} className="hover:bg-slate-50 align-top">
                    <td className="p-3 font-mono font-semibold text-slate-700">
                      {s.codigo}
                      <div className="font-sans font-normal text-[11px] text-slate-500">{TIPO_EQUIPAJE[s.tipo]}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">Hab. {s.habitacion ?? "—"}</div>
                      <div className="text-[12px] text-slate-500">{s.huesped}{s.estadoEstadia === "FINALIZADA" ? " · ya salió" : ""}</div>
                    </td>
                    <td className="p-3 text-slate-600">
                      {s.descripcion ?? "—"}
                      {s.responsable && <div className="text-[11px] text-slate-400">{s.tipo === "CUSTODIA" ? "Recibió" : "Atiende"}: {s.responsable}</div>}
                    </td>
                    <td className="p-3 text-slate-500">
                      {fechaHora(s.fechaSolicitud)}
                      {s.fechaAtencion && <div className="text-[11px]">→ {fechaHora(s.fechaAtencion)}</div>}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${BADGE[s.estado] ?? ""}`}>{estadoEquipajeTexto(s)}</span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        {abierta && s.tipo === "CUSTODIA" && puedeRecibir && (
                          <button onClick={() => setEntregar(s)} className={`${boton} bg-[#2D5A27] hover:bg-[#1E3F1A] text-white`}>Entregar</button>
                        )}
                        {abierta && s.tipo !== "CUSTODIA" && s.estado === "PENDIENTE" && (
                          <button onClick={() => cambiar(s, "EN_ATENCION", `${s.codigo}: vas en camino a la habitación ${s.habitacion}.`)} className={`${boton} bg-slate-800 hover:bg-slate-900 text-white`}>
                            Atender
                          </button>
                        )}
                        {abierta && s.tipo !== "CUSTODIA" && s.estado !== "PENDIENTE" && (
                          <button onClick={() => cambiar(s, "ATENDIDA", `${s.codigo} completado.`)} className={`${boton} bg-[#2D5A27] hover:bg-[#1E3F1A] text-white`}>
                            Completar
                          </button>
                        )}
                        {abierta && s.tipo !== "CUSTODIA" && (
                          <button onClick={() => cambiar(s, "CANCELADA", `${s.codigo} cancelado.`)} className={`${boton} border border-slate-300 text-slate-600 hover:bg-slate-50`}>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <FormModal
        open={formAbierto}
        title="Registrar equipaje"
        subtitle="Maletas en custodia o un pedido para subir o bajar equipaje"
        submitLabel={form.tipo === "CUSTODIA" ? "Guardar en custodia" : "Registrar pedido"}
        loading={guardando}
        onClose={() => setFormAbierto(false)}
        onSubmit={registrar}
        size="md"
      >
        {errorForm && <AlertBanner type="error" message={errorForm} dismissible={false} />}
        <FormField label="Tipo" required>
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEquipaje })}>
            <option value="CUSTODIA">Guardar en custodia</option>
            <option value="BAJADA">Bajar equipaje de la habitación</option>
            <option value="SUBIDA">Subir equipaje a la habitación</option>
          </Select>
        </FormField>
        <FormField label="Habitación / huésped" required>
          <Select value={form.idEstadia} onChange={(e) => setForm({ ...form, idEstadia: e.target.value })}>
            <option value="">— Elegir —</option>
            {estadias
              .filter((e) => form.tipo === "CUSTODIA" || e.estado === "EN_CURSO")
              .map((e) => (
                <option key={e.idEstadia} value={e.idEstadia}>
                  Hab. {e.habitacion} — {e.huesped}{e.estado === "FINALIZADA" ? ` (salió ${fechaHora(e.fechaCheckoutReal)})` : ""}
                </option>
              ))}
          </Select>
          {form.tipo === "CUSTODIA" && (
            <p className="text-[12px] text-slate-500 mt-1">Incluye a los huéspedes que salieron en los últimos 2 días (por ejemplo, esperan su bus).</p>
          )}
        </FormField>
        {form.tipo === "CUSTODIA" && (
          <FormField label="Bultos" required>
            <Input type="number" min={1} max={20} value={form.bultos} onChange={(e) => setForm({ ...form, bultos: e.target.value })} />
          </FormField>
        )}
        <FormField label={form.tipo === "CUSTODIA" ? "Descripción (color, tamaño, recoge a las…)" : "Nota (opcional)"}>
          <Input type="text" maxLength={300} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </FormField>
        {estadiaElegida && form.tipo === "CUSTODIA" && (
          <p className="text-[12px] text-slate-600">Al guardar se genera un código EQ-… para que {estadiaElegida.huesped} lo presente al recoger.</p>
        )}
      </FormModal>

      <ConfirmModal
        open={!!entregar}
        title={`Entregar ${entregar?.codigo ?? ""}`}
        message={entregar ? `Confirma que devuelves ${entregar.descripcion ?? "el equipaje"} a ${entregar.huesped} (Hab. ${entregar.habitacion}). Pide el código ${entregar.codigo}.` : ""}
        confirmLabel="Sí, entregado"
        onConfirm={() => {
          if (entregar) cambiar(entregar, "ATENDIDA", `${entregar.codigo} entregado a ${entregar.huesped}.`);
          setEntregar(null);
        }}
        onCancel={() => setEntregar(null)}
      />
    </div>
  );
}
