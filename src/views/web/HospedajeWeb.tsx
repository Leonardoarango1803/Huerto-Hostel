import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Clock, Lock, Users } from "lucide-react";
import { publicoApi, type Disponibilidad, type TipoDisponible } from "../../api/publico";
import { mensajeDeError } from "../../api/errores";
import { WebLayout } from "./WebLayout";
import { BuscadorFechas } from "./BuscadorFechas";
import { PasosReserva } from "./PasosReserva";
import { aParams, fechaCorta, fotoDeTipo, leerBusqueda, soles } from "./utils";

/** Paso 1: que tipos tienen habitaciones libres en las fechas elegidas. */
export function HospedajeWeb() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const busqueda = useMemo(() => leerBusqueda(params), [params]);
  const clave = aParams(busqueda);
  // Respuesta de la ultima consulta, marcada con la busqueda que la pidio: si no coincide, se esta cargando.
  const [res, setRes] = useState<{ clave: string; datos?: Disponibilidad; error?: string } | null>(null);
  const [elegido, setElegido] = useState<number | null>(() => Number(params.get("tipo")) || null);

  useEffect(() => {
    let vigente = true;
    publicoApi
      .disponibilidad(busqueda.llegada, busqueda.salida, busqueda.huespedes)
      .then((d) => vigente && setRes({ clave, datos: d }))
      .catch((e) => vigente && setRes({ clave, error: mensajeDeError(e, "No pudimos consultar la disponibilidad. Intenta de nuevo.") }));
    return () => {
      vigente = false;
    };
  }, [busqueda, clave]);

  const cargando = res?.clave !== clave;
  const datos = !cargando ? res?.datos ?? null : null;
  const error = !cargando ? res?.error ?? null : null;
  // Primero lo que se puede reservar (por precio); al final lo agotado o lo que no alcanza para el grupo.
  const tipos = [...(datos?.tipos ?? [])].sort(
    (a, b) => Number(b.disponibles > 0 && b.cabe) - Number(a.disponibles > 0 && a.cabe)
  );
  const reservables = tipos.filter((t) => t.disponibles > 0 && t.cabe);
  const sinNada = !cargando && !error && datos !== null && reservables.length === 0;
  const seleccion: TipoDisponible | undefined =
    reservables.find((t) => t.idTipoHabitacion === elegido) ?? reservables[0];

  const continuar = () => {
    if (!seleccion) return;
    navigate(`/reservar?${aParams(busqueda, { tipo: seleccion.idTipoHabitacion })}`);
  };

  return (
    <WebLayout>
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-9 pb-20 flex flex-col gap-6">
        <PasosReserva actual={1} />
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display font-semibold text-[clamp(32px,4vw,46px)] leading-[1.1]">
            {sinNada ? "No quedan habitaciones en esas fechas" : "Habitaciones disponibles"}
          </h1>
          <p className="m-0 text-base text-slate-600">
            {sinNada
              ? "Prueba con otras fechas o con menos personas por habitación."
              : "Solo mostramos lo que está libre en tus fechas. Todas incluyen desayuno y acceso a la piscina."}
          </p>
        </div>

        <BuscadorFechas key={aParams(busqueda)} inicial={busqueda} textoBoton="Actualizar" onBuscar={(b) => navigate(`/hospedaje?${aParams(b)}`)} />

        {error && (
          <div role="alert" className="rounded-2xl bg-red-100 text-red-900 px-5 py-4 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-6 items-start">
          <section aria-label="Tipos de habitación" className="flex-[999_1_560px] min-w-0 flex flex-col gap-4">
            {cargando && [0, 1, 2].map((i) => <div key={i} className="h-[240px] rounded-[22px] bg-slate-100 animate-pulse" />)}
            {!cargando &&
              tipos.map((t) => {
                const libre = t.disponibles > 0 && t.cabe;
                const activo = libre && seleccion?.idTipoHabitacion === t.idTipoHabitacion;
                return (
                  <article
                    key={t.idTipoHabitacion}
                    className={`bg-white rounded-[22px] overflow-hidden flex flex-wrap ${
                      activo ? "border-2 border-huerto shadow-[0_10px_30px_rgba(45,90,39,.14)]" : "border border-[#EFE6D6]"
                    } ${libre ? "" : "opacity-70"}`}
                  >
                    <img src={fotoDeTipo(t.nombre)} alt={`Habitación ${t.nombre}`} className="flex-[1_1_260px] min-w-0 h-[240px] object-cover" />
                    <div className="flex-[999_1_320px] min-w-0 p-5 sm:p-6 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.08em] uppercase text-slate-600">
                          <Users size={14} /> Hasta {t.capacidad ?? "—"} {t.capacidad === 1 ? "persona" : "personas"}
                        </span>
                        {libre && t.disponibles <= 2 && (
                          <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-amber-100 text-amber-800">
                            {t.disponibles === 1 ? "Queda 1" : `Quedan ${t.disponibles}`}
                          </span>
                        )}
                        {!t.cabe && <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-slate-200 text-slate-700">No entran {busqueda.huespedes} personas</span>}
                        {t.cabe && t.disponibles === 0 && <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-slate-200 text-slate-700">Agotada en esas fechas</span>}
                      </div>
                      <h2 className="m-0 font-display font-semibold text-[26px] leading-tight">{t.nombre}</h2>
                      {t.descripcion && <p className="m-0 text-[15px] leading-relaxed text-slate-600">{t.descripcion}</p>}
                      <div className="mt-auto pt-3.5 border-t border-[#F1EADD] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-[13px] text-slate-600">{soles(t.precioNoche, 0)} / noche</span>
                          <strong className="text-[22px]">
                            {soles(t.total, 0)} <span className="text-[13px] font-medium text-slate-600">por {datos?.noches} {datos?.noches === 1 ? "noche" : "noches"}</span>
                          </strong>
                        </div>
                        <span className="flex gap-3.5 items-center">
                          <Link to={`/hospedaje/${t.idTipoHabitacion}?${aParams(busqueda)}`} className="text-sm font-bold min-h-[44px] inline-flex items-center text-huerto hover:text-huerto-oscuro">
                            Ver detalles
                          </Link>
                          <button
                            type="button"
                            disabled={!libre}
                            aria-pressed={activo}
                            onClick={() => setElegido(t.idTipoHabitacion)}
                            className={`min-h-[48px] px-6 rounded-full text-[15px] font-bold border transition-colors disabled:cursor-not-allowed ${
                              activo
                                ? "bg-huerto-suave text-emerald-800 border-huerto"
                                : libre
                                  ? "bg-huerto text-white border-huerto hover:bg-huerto-oscuro"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {activo ? "Elegida" : libre ? "Elegir" : "No disponible"}
                          </button>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
          </section>

          <aside aria-label="Resumen de tu reserva" className="flex-[1_1_320px] min-w-0 bg-white border border-[#EFE6D6] rounded-[22px] p-6 flex flex-col gap-4 lg:sticky lg:top-6">
            <span className="text-[12px] font-bold tracking-[0.1em] uppercase text-huerto">Tu reserva</span>
            {seleccion && datos ? (
              <>
                <div className="flex gap-3.5 items-center">
                  <img src={fotoDeTipo(seleccion.nombre)} alt="" className="w-[72px] h-[72px] rounded-2xl object-cover" />
                  <div className="flex flex-col gap-0.5">
                    <strong className="font-display text-xl font-semibold">{seleccion.nombre}</strong>
                    <span className="text-[13px] text-slate-600">
                      {busqueda.huespedes} {busqueda.huespedes === 1 ? "persona" : "personas"}
                    </span>
                  </div>
                </div>
                <div className="bg-arena rounded-2xl p-3.5 grid grid-cols-2 gap-1.5 text-sm">
                  <span className="text-slate-600">Llegada</span>
                  <span className="text-slate-600">Salida</span>
                  <strong className="capitalize">{fechaCorta(busqueda.llegada)}</strong>
                  <strong className="capitalize">{fechaCorta(busqueda.salida)}</strong>
                </div>
                <dl className="m-0 grid grid-cols-[1fr_auto] gap-2.5 text-[15px]">
                  <dt className="text-slate-600">
                    {soles(seleccion.precioNoche, 0)} × {datos.noches} {datos.noches === 1 ? "noche" : "noches"}
                  </dt>
                  <dd className="m-0 font-semibold">{soles(seleccion.total)}</dd>
                  <dt className="text-slate-600">Desayuno</dt>
                  <dd className="m-0 font-semibold text-huerto">Incluido</dd>
                  <dt className="pt-2.5 border-t border-[#F1EADD] font-bold">Total de la estadía</dt>
                  <dd className="m-0 pt-2.5 border-t border-[#F1EADD] font-bold text-xl">{soles(seleccion.total)}</dd>
                </dl>
                <div className="bg-terracota-suave rounded-2xl p-3.5 flex flex-col gap-1.5">
                  <div className="flex justify-between text-[15px] font-bold text-terracota-oscuro">
                    <span>Adelanto para confirmar ({datos.adelantoPorcentaje}%)</span>
                    <span>{soles(seleccion.adelanto)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Saldo al llegar</span>
                    <span>{soles(seleccion.saldo)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={continuar}
                  className="min-h-[52px] rounded-full bg-terracota hover:bg-terracota-oscuro text-white font-bold text-base flex items-center justify-center gap-2"
                >
                  Continuar con mis datos <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <p className="m-0 text-sm text-slate-600">{cargando ? "Buscando habitaciones libres…" : "Elige fechas con disponibilidad para continuar."}</p>
            )}
            <ul className="m-0 p-0 list-none flex flex-col gap-2 text-[13px] text-slate-600">
              <li className="flex gap-2 items-center"><Lock size={15} className="text-huerto" /> Pago de demostración con tarjeta o Yape</li>
              <li className="flex gap-2 items-center"><Clock size={15} className="text-huerto" /> Confirmas al instante al pagar el adelanto</li>
            </ul>
          </aside>
        </div>
      </main>
    </WebLayout>
  );
}
