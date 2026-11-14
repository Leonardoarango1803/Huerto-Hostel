import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { publicoApi, type Disponibilidad } from "../../api/publico";
import { mensajeDeError } from "../../api/errores";
import { hoyISO, sumarDias } from "../../utils/fechas";
import { WebLayout } from "./WebLayout";
import { SERVICIOS_INCLUIDOS, aParams, galeriaDeTipo, leerBusqueda, soles } from "./utils";

/** Detalle de un tipo de habitacion con su precio y disponibilidad en las fechas elegidas. */
export function DetalleWeb() {
  const { idTipo } = useParams();
  const id = Number(idTipo);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState(() => leerBusqueda(params));
  const [datos, setDatos] = useState<Disponibilidad | null>(null);
  // El error queda marcado con la busqueda que lo produjo: al cambiar las fechas deja de mostrarse.
  const [fallo, setFallo] = useState<{ clave: string; texto: string } | null>(null);
  const [foto, setFoto] = useState(0);
  const clave = aParams(busqueda);
  const error = fallo?.clave === clave ? fallo.texto : null;

  useEffect(() => {
    let vigente = true;
    publicoApi
      .disponibilidad(busqueda.llegada, busqueda.salida, busqueda.huespedes)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setFallo({ clave, texto: mensajeDeError(e, "No pudimos consultar la disponibilidad.") }));
    return () => {
      vigente = false;
    };
  }, [busqueda, clave]);

  const tipo = datos?.tipos.find((t) => t.idTipoHabitacion === id);
  const galeria = useMemo(() => galeriaDeTipo(tipo?.nombre), [tipo?.nombre]);
  const libre = !!tipo && tipo.disponibles > 0 && tipo.cabe;

  if (datos && !tipo) {
    return (
      <WebLayout>
        <main className="max-w-[760px] mx-auto px-4 sm:px-6 py-20 flex flex-col gap-4">
          <h1 className="m-0 font-display text-4xl font-semibold">No encontramos esa habitación</h1>
          <Link to="/hospedaje" className="font-bold text-huerto">Ver todas las habitaciones</Link>
        </main>
      </WebLayout>
    );
  }

  return (
    <WebLayout>
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-7 pb-20 flex flex-col gap-6">
        <nav aria-label="Ruta" className="text-sm text-slate-600">
          <Link to={`/hospedaje?${aParams(busqueda)}`} className="text-huerto hover:underline">Habitaciones</Link> / {tipo?.nombre ?? "…"}
        </nav>
        <div className="flex flex-wrap gap-6 items-start">
          <div className="flex-[999_1_580px] min-w-0 flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <img src={galeria[foto].src} alt={galeria[foto].alt} className="w-full h-[clamp(260px,42vw,520px)] object-cover rounded-3xl" />
              <div role="group" aria-label="Fotos" className="grid grid-cols-4 gap-2.5">
                {galeria.map((g, i) => (
                  <button
                    key={g.alt}
                    type="button"
                    onClick={() => setFoto(i)}
                    aria-pressed={i === foto}
                    aria-label={g.alt}
                    className={`p-0 rounded-[14px] border-[3px] ${i === foto ? "border-huerto" : "border-transparent opacity-80 hover:opacity-100"}`}
                  >
                    <img src={g.src} alt="" className="w-full h-[90px] object-cover rounded-xl block" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] font-bold tracking-[0.12em] uppercase text-huerto">
                Hasta {tipo?.capacidad ?? "—"} {tipo?.capacidad === 1 ? "huésped" : "huéspedes"}
              </span>
              <h1 className="m-0 font-display font-semibold text-[clamp(32px,4vw,46px)] leading-[1.1]">{tipo?.nombre ?? "Cargando…"}</h1>
              {tipo?.descripcion && <p className="m-0 text-[17px] leading-relaxed text-slate-600 max-w-[700px]">{tipo.descripcion}</p>}
            </div>
            <section aria-labelledby="h-incluye" className="bg-white border border-[#EFE6D6] rounded-[22px] p-6 flex flex-col gap-4">
              <h2 id="h-incluye" className="m-0 text-lg font-bold">Incluido en tu estadía</h2>
              <ul className="m-0 p-0 list-none grid gap-x-5 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] text-[15px]">
                {SERVICIOS_INCLUIDOS.map((s) => (
                  <li key={s} className="flex gap-2.5 items-center"><Check size={18} strokeWidth={2.2} className="text-huerto" /> {s}</li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="h-saber" className="bg-arena-2 rounded-[22px] p-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <h2 id="h-saber" className="col-span-full m-0 text-lg font-bold">Bueno saber</h2>
              <div className="flex flex-col gap-1"><strong className="text-[15px]">Horarios</strong><span className="text-sm leading-relaxed text-slate-600">Check-in desde las 14:00 y check-out hasta las 12:00.</span></div>
              <div className="flex flex-col gap-1"><strong className="text-[15px]">Adelanto</strong><span className="text-sm leading-relaxed text-slate-600">Confirmas pagando el {datos?.adelantoPorcentaje ?? 30}% en línea; el saldo, al llegar o al salir.</span></div>
              <div className="flex flex-col gap-1"><strong className="text-[15px]">Sin adelanto</strong><span className="text-sm leading-relaxed text-slate-600">Las reservas hechas en recepción sin adelanto se liberan el día de llegada.</span></div>
            </section>
          </div>

          <aside aria-label="Reservar" className="flex-[1_1_340px] min-w-0 bg-white border border-[#EFE6D6] rounded-3xl p-6 flex flex-col gap-4 shadow-[0_16px_40px_rgba(31,27,18,.08)] lg:sticky lg:top-6">
            <div>
              <span className="text-[30px] font-bold">{tipo ? soles(tipo.precioNoche, 0) : "—"}</span> <span className="text-[15px] text-slate-600">por noche</span>
            </div>
            <div className="grid grid-cols-2 border border-slate-300 rounded-2xl overflow-hidden">
              <label className="px-3 py-2.5 flex flex-col gap-0.5 text-[11px] font-bold tracking-[0.08em] uppercase text-slate-600 border-r border-slate-300">
                Llegada
                <input
                  type="date"
                  min={hoyISO()}
                  value={busqueda.llegada}
                  onChange={(e) => {
                    const llegada = e.target.value;
                    setBusqueda((b) => ({ ...b, llegada, salida: b.salida <= llegada ? sumarDias(llegada, 1) : b.salida }));
                  }}
                  className="border-0 p-0 text-[15px] font-semibold text-tinta normal-case tracking-normal bg-transparent focus:outline-none"
                />
              </label>
              <label className="px-3 py-2.5 flex flex-col gap-0.5 text-[11px] font-bold tracking-[0.08em] uppercase text-slate-600">
                Salida
                <input
                  type="date"
                  min={sumarDias(busqueda.llegada, 1)}
                  value={busqueda.salida}
                  onChange={(e) => setBusqueda((b) => ({ ...b, salida: e.target.value }))}
                  className="border-0 p-0 text-[15px] font-semibold text-tinta normal-case tracking-normal bg-transparent focus:outline-none"
                />
              </label>
            </div>
            {error && <div role="alert" className="text-sm font-semibold text-red-800 bg-red-100 rounded-xl px-3 py-2.5">{error}</div>}
            {tipo && (
              <div role="status" className={`flex items-center gap-2 text-sm font-semibold ${libre ? "text-emerald-800" : "text-red-800"}`}>
                <span className={`w-2 h-2 rounded-full ${libre ? "bg-huerto" : "bg-red-600"}`} />
                {libre ? "Disponible en tus fechas" : !tipo.cabe ? `No entran ${busqueda.huespedes} personas` : "Agotada en esas fechas"}
              </div>
            )}
            {tipo && datos && (
              <dl className="m-0 grid grid-cols-[1fr_auto] gap-2 text-[15px]">
                <dt className="text-slate-600">{soles(tipo.precioNoche, 0)} × {datos.noches} {datos.noches === 1 ? "noche" : "noches"}</dt>
                <dd className="m-0 font-semibold">{soles(tipo.total)}</dd>
                <dt className="font-bold pt-2 border-t border-[#F1EADD]">Total</dt>
                <dd className="m-0 font-bold pt-2 border-t border-[#F1EADD]">{soles(tipo.total)}</dd>
                <dt className="font-bold text-terracota-oscuro">Adelanto hoy</dt>
                <dd className="m-0 font-bold text-terracota-oscuro">{soles(tipo.adelanto)}</dd>
              </dl>
            )}
            <button
              type="button"
              disabled={!libre}
              onClick={() => navigate(`/reservar?${aParams(busqueda, { tipo: id })}`)}
              className="min-h-[52px] rounded-full bg-terracota hover:bg-terracota-oscuro disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-base"
            >
              Reservar esta habitación
            </button>
            <Link to={`/hospedaje?${aParams(busqueda)}`} className="text-sm font-bold text-center min-h-[44px] flex items-center justify-center text-huerto">
              Ver otras habitaciones
            </Link>
          </aside>
        </div>
      </main>
    </WebLayout>
  );
}
