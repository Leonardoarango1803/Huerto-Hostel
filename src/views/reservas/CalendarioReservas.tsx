import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { reservasApi, type Calendario, type ReservaCalendario } from "../../api/reservas";
import { mensajeDeError } from "../../api/errores";
import { hoyISO, sumarDias } from "../../utils/fechas";
import { AlertBanner, Button, LoadingState } from "../../components/ui";

interface Props {
  /** Clic en una reserva: el padre la muestra en el detalle. */
  onSeleccionar: (idReserva: number) => void;
  /** Clic en una noche libre (desde hoy): el padre abre "Nueva reserva" con habitacion y fecha. Sin permiso, null. */
  onNueva: ((idHabitacion: number, fecha: string) => void) | null;
  /** Cambia para pedir de nuevo (por ejemplo tras crear o modificar una reserva). */
  version: number;
}

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const COLOR: Record<string, string> = {
  PENDIENTE_ADELANTO: "bg-amber-100 border-amber-400 text-amber-900",
  CONFIRMADA: "bg-blue-100 border-blue-400 text-blue-900",
  EN_CURSO: "bg-emerald-100 border-emerald-500 text-emerald-900",
  COMPLETADA: "bg-slate-100 border-slate-300 text-slate-500",
};

const LEYENDA: [string, string][] = [
  ["PENDIENTE_ADELANTO", "Pendiente de adelanto"],
  ["CONFIRMADA", "Confirmada"],
  ["EN_CURSO", "Huésped adentro"],
  ["COMPLETADA", "Completada"],
];

function dias(desde: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => sumarDias(desde, i));
}

function partes(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const fecha = new Date(a, m - 1, d);
  return { dia: d, mes: MESES[m - 1], semana: DIAS_SEMANA[fecha.getDay()], finDeSemana: fecha.getDay() === 0 || fecha.getDay() === 6 };
}

/**
 * Disponibilidad por fechas (RF04): una fila por habitacion y una columna por noche. Cada reserva es una barra desde
 * su noche de llegada hasta la noche anterior a la salida (el dia de salida la habitacion ya se puede volver a
 * reservar, igual que en el servidor). Una sola llamada por rango.
 */
export function CalendarioReservas({ onSeleccionar, onNueva, version }: Props) {
  const [desde, setDesde] = useState(() => sumarDias(hoyISO(), -1));
  const [cantidad, setCantidad] = useState(14);
  const [cal, setCal] = useState<Calendario | null>(null);
  /** Clave de la ultima respuesta (ok o error): si no coincide con la actual, se esta cargando. */
  const [cargada, setCargada] = useState<{ clave: string; error: string | null } | null>(null);
  const [recargas, setRecargas] = useState(0);

  const hasta = sumarDias(desde, cantidad);
  const clave = `${desde}|${hasta}|${version}|${recargas}`;
  const cargando = cargada?.clave !== clave;
  const error = cargada?.clave === clave ? cargada.error : null;
  const cargar = () => setRecargas((n) => n + 1);

  useEffect(() => {
    let vigente = true;
    reservasApi
      .calendario(desde, hasta)
      .then((c) => {
        if (!vigente) return;
        setCal(c);
        setCargada({ clave, error: null });
      })
      .catch((err) => {
        if (vigente) setCargada({ clave, error: mensajeDeError(err, "No se pudo cargar el calendario.") });
      });
    return () => {
      vigente = false;
    };
  }, [clave, desde, hasta]);

  const columnas = useMemo(() => dias(desde, cantidad), [desde, cantidad]);
  const hoy = cal?.hoy ?? hoyISO();

  const porHabitacion = useMemo(() => {
    const m = new Map<number, ReservaCalendario[]>();
    for (const r of cal?.reservas ?? []) {
      const lista = m.get(r.idHabitacion) ?? [];
      lista.push(r);
      m.set(r.idHabitacion, lista);
    }
    return m;
  }, [cal]);

  /** Noches libres en todo el rango, para el resumen de arriba. */
  const libresHoy = useMemo(() => {
    if (!cal) return 0;
    return cal.habitaciones.filter((h) => !(porHabitacion.get(h.idHabitacion) ?? [])
      .some((r) => r.estado !== "COMPLETADA" && r.checkin <= hoy && r.checkout > hoy)).length;
  }, [cal, porHabitacion, hoy]);

  const plantilla = `repeat(${cantidad}, minmax(44px, 1fr))`;
  const inicio = partes(desde);
  const fin = partes(sumarDias(hasta, -1));

  return (
    <div className="bg-white rounded-2xl border border-[#EFE6D6] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" icon={<ChevronLeft size={14} />} onClick={() => setDesde(sumarDias(desde, -7))} title="Semana anterior" />
          <Button size="sm" variant="secondary" onClick={() => setDesde(sumarDias(hoyISO(), -1))}>Hoy</Button>
          <Button size="sm" variant="secondary" icon={<ChevronRight size={14} />} onClick={() => setDesde(sumarDias(desde, 7))} title="Semana siguiente" />
          <span className="ml-2 text-sm font-semibold text-slate-800">
            {inicio.dia} {inicio.mes} – {fin.dia} {fin.mes}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cal && <span className="text-[12px] text-slate-500">{libresHoy} de {cal.habitaciones.length} libres esta noche</span>}
          <select
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            aria-label="Días a mostrar"
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
          >
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
            <option value={30}>30 días</option>
          </select>
          <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={cargar} title="Actualizar" />
        </div>
      </div>

      {error && <div className="p-3"><AlertBanner type="error" message={error} /></div>}

      {cargando && !cal ? (
        <LoadingState />
      ) : cal && (
        <div className={`overflow-x-auto ${cargando ? "opacity-60" : ""}`}>
          <div style={{ minWidth: 150 + cantidad * 44 }}>
            {/* Cabecera de dias */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0">
              <div className="w-[150px] flex-shrink-0 p-2 text-[12px] font-bold text-slate-500 uppercase">Habitación</div>
              <div className="grid flex-1" style={{ gridTemplateColumns: plantilla }}>
                {columnas.map((d) => {
                  const p = partes(d);
                  return (
                    <div key={d} className={`text-center py-1.5 border-l border-slate-200 ${d === hoy ? "bg-huerto text-white" : p.finDeSemana ? "bg-arena-2" : ""}`}>
                      <div className="text-[11px] uppercase">{p.semana}</div>
                      <div className="text-sm font-bold leading-tight">{p.dia}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {cal.habitaciones.length === 0 && <p className="p-6 text-center text-slate-500">No hay habitaciones activas.</p>}

            {cal.habitaciones.map((h) => (
              <div key={h.idHabitacion} className="flex border-b border-slate-100">
                <div className="w-[150px] flex-shrink-0 px-2 py-1.5">
                  <div className="font-semibold text-slate-800">Hab. {h.numero}</div>
                  <div className="text-[12px] text-slate-500 truncate">{h.tipo}</div>
                </div>
                <div className="grid flex-1 relative" style={{ gridTemplateColumns: plantilla, gridTemplateRows: "44px" }}>
                  {columnas.map((d, i) => {
                    const libre = !(porHabitacion.get(h.idHabitacion) ?? []).some((r) => r.estado !== "COMPLETADA" && r.checkin <= d && r.checkout > d);
                    const clicable = libre && onNueva && d >= hoy;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={!clicable}
                        onClick={() => clicable && onNueva(h.idHabitacion, d)}
                        title={clicable ? `Reservar Hab. ${h.numero} desde el ${partes(d).dia} ${partes(d).mes}` : undefined}
                        style={{ gridColumn: i + 1, gridRow: 1 }}
                        className={`border-l border-slate-100 ${d === hoy ? "bg-huerto/5" : ""} ${clicable ? "hover:bg-emerald-50 cursor-pointer" : "cursor-default"}`}
                      />
                    );
                  })}
                  {(porHabitacion.get(h.idHabitacion) ?? []).map((r) => {
                    const ini = Math.max(0, columnas.indexOf(r.checkin < desde ? desde : r.checkin));
                    const finCol = r.checkout >= hasta ? cantidad : columnas.indexOf(r.checkout);
                    if (finCol <= ini) return null;
                    const cortadaIzq = r.checkin < desde;
                    const cortadaDer = r.checkout > hasta;
                    return (
                      <button
                        key={r.idReserva}
                        type="button"
                        onClick={() => onSeleccionar(r.idReserva)}
                        title={`RES-${String(r.idReserva).padStart(3, "0")} · ${r.huesped} · ${r.noches} noche(s)`}
                        style={{ gridColumn: `${ini + 1} / ${finCol + 1}`, gridRow: 1 }}
                        className={`z-10 my-1.5 mx-0.5 border text-left px-2 text-[12px] font-semibold truncate hover:brightness-95 ${COLOR[r.estado] ?? COLOR.COMPLETADA} ${cortadaIzq ? "rounded-l-none border-l-0" : "rounded-l-lg"} ${cortadaDer ? "rounded-r-none border-r-0" : "rounded-r-lg"}`}
                      >
                        {r.huesped || `RES-${r.idReserva}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 p-3 border-t border-slate-100 text-[12px] text-slate-600">
        {LEYENDA.map(([estado, texto]) => (
          <span key={estado} className="flex items-center gap-1.5">
            <span className={`inline-block w-4 h-3 rounded border ${COLOR[estado]}`} /> {texto}
          </span>
        ))}
        {onNueva && <span className="text-slate-500">· Haz clic en una noche libre para reservarla.</span>}
      </div>
    </div>
  );
}
