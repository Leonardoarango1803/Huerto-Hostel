import { useEffect, useRef, useState } from "react";
import { BedDouble, CalendarDays, Check, Clock, MapPin, Users, Wallet, X } from "lucide-react";
import type { MiReserva } from "../../api/publico";
import { fechaDMA } from "../../utils/fechas";
import { SERVICIOS_INCLUIDOS, fechaLarga, galeriaDeTipo, soles } from "./utils";

const CONCEPTO: Record<string, string> = {
  ADELANTO_RESERVA: "Adelanto",
  PAGO_PARCIAL_ESTADIA: "Pago a cuenta",
  LIQUIDACION_CHECKOUT: "Pago al salir",
};
const METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_POS: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  PASARELA_ONLINE: "Pago en línea",
};

/** Personas de la reserva web ("Reserva web · 2 huéspedes · ..."), si estan anotadas. */
function personasDe(observaciones?: string | null): number | null {
  const m = /(\d+)\s+hu[eé]sped/i.exec(observaciones ?? "");
  return m ? Number(m[1]) : null;
}

/**
 * Detalle de una reserva para el huesped: la habitacion que le toco, lo que incluye, horarios y lo pagado. Se cierra con
 * Esc, con la X o tocando fuera.
 */
export function DetalleReservaModal({ reserva: r, onCerrar }: { reserva: MiReserva; onCerrar: () => void }) {
  const fotos = galeriaDeTipo(r.tipo);
  const [foto, setFoto] = useState(0);
  const cerrar = useRef<HTMLButtonElement>(null);
  const personas = personasDe(r.observaciones);

  useEffect(() => {
    cerrar.current?.focus();
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alPulsar);
    const desplazamiento = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = desplazamiento;
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-reserva">
      <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
      <div className="relative bg-arena w-full sm:max-w-[760px] max-h-[94vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] shadow-xl">
        <div className="relative">
          <img src={fotos[foto].src} alt={fotos[foto].alt} className="w-full h-[220px] sm:h-[280px] object-cover" />
          <button ref={cerrar} type="button" onClick={onCerrar} aria-label="Cerrar detalle"
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-tinta shadow">
            <X size={20} />
          </button>
          <div className="absolute bottom-3 left-3 flex gap-2">
            {fotos.map((f, i) => (
              <button key={f.src + i} type="button" onClick={() => setFoto(i)} aria-label={`Ver foto ${i + 1}: ${f.alt}`} aria-pressed={foto === i}
                className={`w-14 h-10 rounded-lg overflow-hidden border-2 ${foto === i ? "border-white" : "border-transparent opacity-80"}`}>
                <img src={f.src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-slate-600">Reserva {r.codigo}</span>
            <h2 id="titulo-detalle-reserva" className="m-0 font-display font-semibold text-[clamp(26px,3.6vw,34px)] leading-[1.1]">
              {r.tipo ?? "Tu habitación"}{r.habitacion ? ` · Habitación ${r.habitacion}` : ""}
            </h2>
            {r.descripcion && <p className="m-0 mt-1 text-[15px] leading-relaxed text-slate-700">{r.descripcion}</p>}
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            <div className="bg-white border border-[#EFE6D6] rounded-2xl p-4 flex gap-3">
              <CalendarDays size={20} className="text-huerto shrink-0 mt-0.5" />
              <div className="flex flex-col text-sm">
                <span className="text-slate-600">Llegada</span>
                <strong className="first-letter:uppercase">{fechaLarga(r.llegada)}</strong>
                <span className="text-slate-600 inline-flex items-center gap-1"><Clock size={13} /> desde las 14:00</span>
              </div>
            </div>
            <div className="bg-white border border-[#EFE6D6] rounded-2xl p-4 flex gap-3">
              <CalendarDays size={20} className="text-huerto shrink-0 mt-0.5" />
              <div className="flex flex-col text-sm">
                <span className="text-slate-600">Salida</span>
                <strong className="first-letter:uppercase">{fechaLarga(r.salida)}</strong>
                <span className="text-slate-600 inline-flex items-center gap-1"><Clock size={13} /> hasta las 12:00</span>
              </div>
            </div>
            <div className="bg-white border border-[#EFE6D6] rounded-2xl p-4 flex gap-3">
              <BedDouble size={20} className="text-huerto shrink-0 mt-0.5" />
              <div className="flex flex-col text-sm">
                <span className="text-slate-600">Estadía</span>
                <strong>{r.noches ?? "—"} {r.noches === 1 ? "noche" : "noches"}</strong>
                <span className="text-slate-600 inline-flex items-center gap-1">
                  <Users size={13} /> {personas ? `${personas} ${personas === 1 ? "persona" : "personas"}` : r.capacidad ? `hasta ${r.capacidad} personas` : "—"}
                </span>
              </div>
            </div>
          </div>

          <section aria-labelledby="h-incluye-reserva" className="flex flex-col gap-3">
            <h3 id="h-incluye-reserva" className="m-0 text-base font-bold">Incluido en tu estadía</h3>
            <ul className="m-0 p-0 list-none grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {[...SERVICIOS_INCLUIDOS, "Estacionamiento dentro del hostel"].map((s) => (
                <li key={s} className="flex items-center gap-2 text-[15px]"><Check size={17} className="text-huerto shrink-0" /> {s}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-pagos-reserva" className="bg-white border border-[#EFE6D6] rounded-2xl p-5 flex flex-col gap-3">
            <h3 id="h-pagos-reserva" className="m-0 text-base font-bold inline-flex items-center gap-2"><Wallet size={18} className="text-huerto" /> Tu cuenta</h3>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-2 text-[15px]">
              <dt className="text-slate-600">{r.precioNoche ? `${soles(r.precioNoche, 0)} × ${r.noches ?? "—"} ${r.noches === 1 ? "noche" : "noches"}` : "Alojamiento"}</dt>
              <dd className="m-0 font-semibold">{soles(r.total)}</dd>
              {(r.pagos ?? []).map((p, i) => (
                <div key={i} className="contents">
                  <dt className="text-emerald-800">{CONCEPTO[p.concepto ?? ""] ?? "Pago"} · {METODO[p.metodo ?? ""] ?? p.metodo} {p.fecha ? `· ${fechaDMA(p.fecha.slice(0, 10))}` : ""}</dt>
                  <dd className="m-0 font-semibold text-emerald-800">− {soles(p.monto)}</dd>
                </div>
              ))}
              {r.estado !== "CANCELADA" && (
                <>
                  <dt className="pt-2 border-t border-[#F1EADD] font-bold">Saldo al llegar</dt>
                  <dd className="m-0 pt-2 border-t border-[#F1EADD] font-bold">{soles(r.saldo)}</dd>
                </>
              )}
            </dl>
            {r.estado !== "CANCELADA" && Number(r.saldo) > 0 && (
              <p className="m-0 text-[13px] text-slate-600">El saldo se paga en recepción, en efectivo, tarjeta o Yape.</p>
            )}
          </section>

          <p className="m-0 text-[13px] text-slate-600 inline-flex items-start gap-2">
            <MapPin size={15} className="shrink-0 mt-0.5" /> El Huerto Hostel · Subtanjalla, valle de Ica. Si llegas después de las 22:00, avísanos desde tu portal.
          </p>
        </div>
      </div>
    </div>
  );
}
