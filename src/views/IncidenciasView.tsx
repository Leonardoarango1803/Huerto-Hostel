import { useState, useEffect, useCallback, useMemo } from "react";
import { Wrench, Plus, CheckCircle, AlertCircle, RefreshCw, Lock, Unlock, RotateCcw } from "lucide-react";
import { incidenciasApi } from "../api/incidencias";
import { habitacionesApi } from "../api/habitaciones";
import { mensajeDeError } from "../api/errores";
import { FormModal, FormField, Textarea } from "../components/ui";
import { NOMBRE_ESTADO_INCIDENCIA, NOMBRE_TIPO, TIPOS_INCIDENCIA, duracion, esAbierta } from "../utils/incidencias";
import type {
  DestinoHabitacion,
  EstadoIncidencia,
  Habitacion,
  IncidenciaMantenimiento,
  TipoIncidencia,
} from "../api/types";

const BADGE: Record<EstadoIncidencia, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  EN_REPARACION: "bg-blue-100 text-blue-800",
  RESUELTO: "bg-emerald-100 text-emerald-800",
  DUPLICADA: "bg-slate-200 text-slate-700",
  NO_PROCEDE: "bg-slate-200 text-slate-700",
};

type Filtro = "" | "ABIERTAS" | EstadoIncidencia | "DESCARTADAS";

const nombre = (e?: { nombres: string; apellidos: string } | null) => (e ? `${e.nombres} ${e.apellidos}`.trim() : "—");

function Opcion({ marcada, titulo, detalle, onChoose }: { marcada: boolean; titulo: string; detalle: string; onChoose: () => void }) {
  return (
    <label className={`flex items-start gap-2.5 border rounded-lg p-3 cursor-pointer ${marcada ? "border-[#1b4332] bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}>
      <input type="radio" name="opcion" checked={marcada} onChange={onChoose} className="mt-0.5" aria-label={titulo} />
      <span>
        <span className="block text-xs font-semibold text-slate-800">{titulo}</span>
        <span className="block text-[11px] text-slate-500 mt-0.5">{detalle}</span>
      </span>
    </label>
  );
}

/** Al resolver: quien resuelve decide si la habitacion se vende ya o pasa antes por limpieza. */
function ResolverModal({ incidencia, onCerrar, onHecho, onError }: {
  incidencia: IncidenciaMantenimiento;
  onCerrar: () => void;
  onHecho: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}) {
  const estadoHab = incidencia.habitacion?.estadoOperativo;
  const bloqueada = estadoHab === "MANTENIMIENTO";
  const [destino, setDestino] = useState<DestinoHabitacion>("LIMPIEZA");
  const [observaciones, setObservaciones] = useState(incidencia.observaciones ?? "");
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    setGuardando(true);
    try {
      const r = await incidenciasApi.cambiarEstado(incidencia.idIncidencia, "RESUELTO", { observaciones, destino });
      onHecho(r.mensaje);
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo resolver la incidencia."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal open title={`Resolver incidencia — Hab. ${incidencia.habitacion?.numero ?? "—"}`}
      subtitle={incidencia.descripcion} submitLabel="Marcar resuelta" loading={guardando}
      onClose={onCerrar} onSubmit={confirmar} size="md">
      <FormField label="¿Qué se hizo? (opcional)">
        <Textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Ej.: se cambió el compresor del aire" aria-label="Qué se hizo" />
      </FormField>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-700">
          ¿Qué pasa con la habitación{estadoHab ? ` (hoy: ${estadoHab})` : ""}?
        </p>
        <Opcion marcada={destino === "LIMPIEZA"} onChoose={() => setDestino("LIMPIEZA")} titulo="Enviar a limpieza antes de venderla"
          detalle="Pasa a housekeeping, que recibe la tarea. Úsalo si la reparación pudo dejar polvo o suciedad." />
        <Opcion marcada={destino === "DISPONIBLE"} onChoose={() => setDestino("DISPONIBLE")} titulo="Dejarla disponible ahora"
          detalle="Se puede vender de inmediato. Úsalo si quedó limpia o ya se limpió." />
        {!bloqueada && (
          <p className="text-[11px] text-slate-500">
            Esta habitación no estaba bloqueada por mantenimiento: si eliges “disponible” no cambia su estado.
          </p>
        )}
      </div>
    </FormModal>
  );
}

/** Cerrar sin reparar: duplicada o no procede. El motivo es obligatorio para que quede claro por que no se atendio. */
function DescartarModal({ incidencia, onCerrar, onHecho, onError }: {
  incidencia: IncidenciaMantenimiento;
  onCerrar: () => void;
  onHecho: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}) {
  const [tipo, setTipo] = useState<"DUPLICADA" | "NO_PROCEDE">("DUPLICADA");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    if (!motivo.trim()) {
      onError("Explica el motivo para poder cerrar la incidencia.");
      return;
    }
    setGuardando(true);
    try {
      const r = await incidenciasApi.cambiarEstado(incidencia.idIncidencia, tipo, { observaciones: motivo });
      onHecho(r.mensaje);
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo cerrar la incidencia."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal open title={`Cerrar sin reparar — Hab. ${incidencia.habitacion?.numero ?? "—"}`}
      subtitle={incidencia.descripcion} submitLabel="Cerrar incidencia" loading={guardando}
      onClose={onCerrar} onSubmit={confirmar} size="md">
      <div className="space-y-2">
        <Opcion marcada={tipo === "DUPLICADA"} onChoose={() => setTipo("DUPLICADA")} titulo="Es duplicada"
          detalle="Ya existe otra incidencia igual: indica cuál en el motivo." />
        <Opcion marcada={tipo === "NO_PROCEDE"} onChoose={() => setTipo("NO_PROCEDE")} titulo="No procede"
          detalle="No era una avería o no hay nada que hacer (mal uso, falsa alarma)." />
      </div>
      <FormField label="Motivo" required>
        <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo"
          placeholder={tipo === "DUPLICADA" ? "Ej.: es la misma que reportó recepción el lunes" : "Ej.: el huésped no sabía usar el control"} />
      </FormField>
      <p className="text-[11px] text-slate-500">Si esta incidencia bloqueaba la habitación, se libera (salvo que otra la siga bloqueando).</p>
    </FormModal>
  );
}

/** La falla volvio: se reabre una incidencia cerrada contando que paso. */
function ReabrirModal({ incidencia, onCerrar, onHecho, onError }: {
  incidencia: IncidenciaMantenimiento;
  onCerrar: () => void;
  onHecho: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    if (!motivo.trim()) {
      onError("Cuenta qué falló de nuevo para reabrir la incidencia.");
      return;
    }
    setGuardando(true);
    try {
      const r = await incidenciasApi.cambiarEstado(incidencia.idIncidencia, "PENDIENTE", { observaciones: motivo });
      onHecho(r.mensaje);
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo reabrir la incidencia."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal open title={`Reabrir incidencia — Hab. ${incidencia.habitacion?.numero ?? "—"}`}
      subtitle={incidencia.descripcion} submitLabel="Reabrir" loading={guardando}
      onClose={onCerrar} onSubmit={confirmar} size="md">
      <FormField label="¿Qué falló de nuevo?" required>
        <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Qué falló de nuevo"
          placeholder="Ej.: el aire volvió a gotear esta mañana" />
      </FormField>
      <p className="text-[11px] text-slate-500">
        La incidencia vuelve a Pendiente y queda anotado que se reabrió. Si bloqueaba la habitación, la bloquea otra vez.
      </p>
    </FormModal>
  );
}

type Dialogo = { tipo: "resolver" | "descartar" | "reabrir"; incidencia: IncidenciaMantenimiento } | null;

export function IncidenciasView() {
  const [incidencias, setIncidencias] = useState<IncidenciaMantenimiento[]>([]);
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [form, setForm] = useState<{
    idHabitacion: string;
    tipoIncidencia: TipoIncidencia;
    descripcion: string;
    /** null = aun no decidio: la decision es obligatoria. */
    bloquear: boolean | null;
  }>({ idHabitacion: "", tipoIncidencia: "OTRO", descripcion: "", bloquear: null });

  const traer = useCallback(() => incidenciasApi.listar(), []);

  useEffect(() => {
    let vigente = true;
    traer()
      .then((d) => vigente && setIncidencias(d))
      .catch(() => vigente && setMensaje({ tipo: "error", texto: "No se pudieron cargar las incidencias." }))
      .finally(() => vigente && setCargando(false));
    habitacionesApi.listar().then((h) => vigente && setHabitaciones(h)).catch(() => undefined);
    return () => { vigente = false; };
  }, [traer]);

  const cargar = useCallback(() => {
    traer().then(setIncidencias).catch(() => setMensaje({ tipo: "error", texto: "No se pudieron cargar las incidencias." }));
    habitacionesApi.listar().then(setHabitaciones).catch(() => undefined);
  }, [traer]);

  const reportar = async () => {
    if (!form.idHabitacion || !form.descripcion.trim()) {
      setMensaje({ tipo: "error", texto: "Selecciona la habitación y describe el problema." });
      return;
    }
    if (form.bloquear === null) {
      setMensaje({ tipo: "error", texto: "Indica si la avería impide usar la habitación: bloquearla o dejarla disponible." });
      return;
    }
    try {
      const r = await incidenciasApi.reportar({
        idHabitacion: Number(form.idHabitacion),
        tipoIncidencia: form.tipoIncidencia,
        descripcion: form.descripcion,
        bloquearHabitacion: form.bloquear,
      });
      setMensaje({ tipo: "ok", texto: r.mensaje });
      setForm({ idHabitacion: "", tipoIncidencia: "OTRO", descripcion: "", bloquear: null });
      setMostrarForm(false);
      cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e, "No se pudo registrar la incidencia.") });
    }
  };

  const ejecutar = async (accion: () => Promise<{ mensaje: string }>, falla: string) => {
    setMensaje(null);
    try {
      const r = await accion();
      setMensaje({ tipo: "ok", texto: r.mensaje });
      cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e, falla) });
    }
  };

  const terminado = (texto: string) => {
    setDialogo(null);
    setMensaje({ tipo: "ok", texto });
    cargar();
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return incidencias.filter((i) => {
      if (filtro === "ABIERTAS" && !esAbierta(i.estado)) return false;
      if (filtro === "DESCARTADAS" && i.estado !== "DUPLICADA" && i.estado !== "NO_PROCEDE") return false;
      if (filtro && filtro !== "ABIERTAS" && filtro !== "DESCARTADAS" && i.estado !== filtro) return false;
      return !q || `${i.habitacion?.numero ?? ""} ${i.descripcion}`.toLowerCase().includes(q);
    });
  }, [incidencias, filtro, busqueda]);

  const cuenta = (f: Filtro) => incidencias.filter((i) =>
    f === "DESCARTADAS" ? i.estado === "DUPLICADA" || i.estado === "NO_PROCEDE" : i.estado === f).length;

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">
            Operación › Mantenimiento
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Incidencias de Mantenimiento</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Averías reportadas por habitación y su seguimiento hasta la reparación.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar habitación o detalle" aria-label="Buscar incidencia"
            className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as Filtro)}
            aria-label="Filtrar por estado"
            className="border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            <option value="">Todas</option>
            <option value="ABIERTAS">Abiertas (pendientes y en reparación)</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_REPARACION">En reparación</option>
            <option value="RESUELTO">Resueltas</option>
            <option value="DESCARTADAS">Descartadas (duplicadas o no procede)</option>
          </select>
          <button
            onClick={cargar}
            title="Refrescar"
            className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Plus size={13} /> Reportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(["PENDIENTE", "EN_REPARACION", "RESUELTO", "DESCARTADAS"] as Filtro[]).map((e) => (
          <button key={e} onClick={() => setFiltro(filtro === e ? "" : e)}
            className={`text-left bg-white rounded-xl border p-3 hover:bg-slate-50 ${filtro === e ? "border-[#1b4332]" : "border-slate-200"}`}>
            <p className="text-[10px] text-slate-400 uppercase font-bold">
              {e === "DESCARTADAS" ? "Descartadas" : NOMBRE_ESTADO_INCIDENCIA[e as EstadoIncidencia]}
            </p>
            <p className="text-lg font-bold text-slate-900">{cuenta(e)}</p>
          </button>
        ))}
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
          <button onClick={() => setMensaje(null)} className="text-[10px] font-semibold opacity-70 hover:opacity-100">Cerrar</button>
        </div>
      )}

      {mostrarForm && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
            Nueva incidencia
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Habitación
              </label>
              <select
                value={form.idHabitacion}
                onChange={(e) => setForm((f) => ({ ...f, idHabitacion: e.target.value }))}
                aria-label="Habitación"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="">Selecciona...</option>
                {habitaciones.map((h) => (
                  <option key={h.idHabitacion} value={h.idHabitacion}>
                    Hab. {h.numero} — {h.estadoOperativo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Tipo
              </label>
              <select
                value={form.tipoIncidencia}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipoIncidencia: e.target.value as TipoIncidencia }))
                }
                aria-label="Tipo"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                {TIPOS_INCIDENCIA.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Detalle del problema"
                aria-label="Descripción"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div className="space-y-2" role="radiogroup" aria-label="¿Impide usar la habitación?">
            <p className="text-[10px] text-slate-500 font-bold uppercase">¿Impide usar la habitación?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className={`flex items-start gap-2.5 border rounded-lg p-3 cursor-pointer ${form.bloquear === true ? "border-red-400 bg-red-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name="impacto" checked={form.bloquear === true} onChange={() => setForm((f) => ({ ...f, bloquear: true }))}
                  className="mt-0.5" aria-label="Sí, bloquear la habitación" />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">Sí: bloquear la habitación</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Pasa a MANTENIMIENTO y no se vende hasta resolver o liberarla. Para averías graves (sin agua, sin luz, cerradura rota).</span>
                </span>
              </label>
              <label className={`flex items-start gap-2.5 border rounded-lg p-3 cursor-pointer ${form.bloquear === false ? "border-[#1b4332] bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name="impacto" checked={form.bloquear === false} onChange={() => setForm((f) => ({ ...f, bloquear: false }))}
                  className="mt-0.5" aria-label="No, dejarla disponible" />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">No: dejarla disponible</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Sigue a la venta, con la incidencia a la vista en Habitaciones y Reservas. Para detalles menores (foco, control de TV).</span>
                </span>
              </label>
            </div>
          </div>
          <button
            onClick={reportar}
            className="bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            Registrar incidencia
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <p className="p-4 text-center text-slate-400 text-xs">Cargando...</p>
        ) : visibles.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wrench size={30} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">{incidencias.length === 0 ? "No hay incidencias registradas." : "Ninguna incidencia coincide con el filtro."}</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="p-3">Habitación</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Descripción</th>
                <th className="p-3">Reportó / Responsable</th>
                <th className="p-3">Tiempos</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((i) => {
                const abierta = esAbierta(i.estado);
                return (
                  <tr key={i.idIncidencia} className="hover:bg-slate-50 align-top">
                    <td className="p-3 font-semibold text-slate-800">
                      Hab. {i.habitacion?.numero ?? "—"}
                      {i.habitacion?.estadoOperativo && (
                        <div className="text-[10px] font-normal text-slate-400">{i.habitacion.estadoOperativo}</div>
                      )}
                      {abierta && (
                        <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${i.bloqueaHabitacion ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                          {i.bloqueaHabitacion ? <><Lock size={9} /> BLOQUEA</> : "NO BLOQUEA"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{NOMBRE_TIPO(i.tipoIncidencia)}</td>
                    <td className="p-3 text-slate-600 max-w-xs">
                      <div>{i.descripcion}</div>
                      {i.observaciones && (
                        <div className="text-[10px] text-slate-400 mt-0.5 whitespace-pre-line">
                          {i.estado === "RESUELTO" ? "Solución: " : ""}{i.observaciones}
                        </div>
                      )}
                      {(i.vecesReabierta ?? 0) > 0 && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          Reabierta {i.vecesReabierta}×
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      <div>{nombre(i.empleadoReporta)}</div>
                      <div className="text-[10px] text-slate-400">{i.empleadoResponsable ? `Atiende: ${nombre(i.empleadoResponsable)}` : "Sin responsable"}</div>
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      <div className="text-[10px] text-slate-400">{i.fechaReporte ? i.fechaReporte.slice(0, 16).replace("T", " ") : "—"}</div>
                      {abierta ? (
                        <>
                          <div>Abierta hace <strong>{duracion(i.fechaReporte)}</strong></div>
                          <div className="text-[10px]">{i.fechaInicioReparacion ? `Respuesta: ${duracion(i.fechaReporte, i.fechaInicioReparacion)}` : "Sin atender aún"}</div>
                        </>
                      ) : (
                        <div>{i.estado === "RESUELTO" ? "Resuelta en" : "Cerrada en"} <strong>{duracion(i.fechaReporte, i.fechaResolucion)}</strong></div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${BADGE[i.estado]}`}>
                        {NOMBRE_ESTADO_INCIDENCIA[i.estado]}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {abierta && (
                          <>
                            {i.estado === "PENDIENTE" && (
                              <button
                                onClick={() => ejecutar(() => incidenciasApi.cambiarEstado(i.idIncidencia, "EN_REPARACION"), "No se pudo actualizar la incidencia.")}
                                className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                              >
                                Iniciar reparación
                              </button>
                            )}
                            <button
                              onClick={() => setDialogo({ tipo: "resolver", incidencia: i })}
                              aria-label={`Resolver incidencia de la habitación ${i.habitacion?.numero ?? ""}`}
                              className="bg-[#1b4332] hover:bg-[#143427] text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                            >
                              {i.estado === "PENDIENTE" ? "Resolver" : "Marcar resuelta"}
                            </button>
                            <button
                              onClick={() => ejecutar(() => incidenciasApi.cambiarBloqueo(i.idIncidencia, !i.bloqueaHabitacion), "No se pudo cambiar el bloqueo.")}
                              aria-label={`${i.bloqueaHabitacion ? "Liberar" : "Bloquear"} la habitación ${i.habitacion?.numero ?? ""}`}
                              className="border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
                            >
                              {i.bloqueaHabitacion ? <><Unlock size={10} /> Liberar habitación</> : <><Lock size={10} /> Bloquear habitación</>}
                            </button>
                            <button
                              onClick={() => setDialogo({ tipo: "descartar", incidencia: i })}
                              aria-label={`Cerrar sin reparar la incidencia de la habitación ${i.habitacion?.numero ?? ""}`}
                              className="text-slate-500 hover:text-slate-800 text-[10px] font-semibold px-2 py-1"
                            >
                              Duplicada / no procede
                            </button>
                          </>
                        )}
                        {!abierta && (
                          <button
                            onClick={() => setDialogo({ tipo: "reabrir", incidencia: i })}
                            aria-label={`Reabrir la incidencia de la habitación ${i.habitacion?.numero ?? ""}`}
                            className="border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
                          >
                            <RotateCcw size={10} /> Reabrir
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

      {dialogo?.tipo === "resolver" && (
        <ResolverModal incidencia={dialogo.incidencia} onCerrar={() => setDialogo(null)} onHecho={terminado}
          onError={(texto) => setMensaje({ tipo: "error", texto })} />
      )}
      {dialogo?.tipo === "descartar" && (
        <DescartarModal incidencia={dialogo.incidencia} onCerrar={() => setDialogo(null)} onHecho={terminado}
          onError={(texto) => setMensaje({ tipo: "error", texto })} />
      )}
      {dialogo?.tipo === "reabrir" && (
        <ReabrirModal incidencia={dialogo.incidencia} onCerrar={() => setDialogo(null)} onHecho={terminado}
          onError={(texto) => setMensaje({ tipo: "error", texto })} />
      )}
    </div>
  );
}
