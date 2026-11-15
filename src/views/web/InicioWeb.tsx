import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Coffee, MapPin, Waves, Wifi, Car, Sprout, Mountain, Wine, Flame } from "lucide-react";
import { publicoApi, type TipoPublico } from "../../api/publico";
import { WebLayout } from "./WebLayout";
import { BuscadorFechas } from "./BuscadorFechas";
import { FOTOS, aParams, busquedaPorDefecto, fotoDeTipo, irASeccion, soles } from "./utils";

const INCLUYE = [
  { icono: Coffee, titulo: "Desayuno de campo", texto: "Fruta del huerto, pan y café cada mañana." },
  { icono: Waves, titulo: "Piscina entre palmeras", texto: "Para refrescarte después de las dunas." },
  { icono: Wifi, titulo: "Wi-Fi en todo el hostel", texto: "También en jardines y terrazas." },
  { icono: Car, titulo: "Estacionamiento", texto: "Dentro del hostel, sin costo extra." },
];

const EXPERIENCIAS = [
  { icono: Sprout, titulo: "Paseos por el huerto", texto: "Parras, higueras y frutales." },
  { icono: Mountain, titulo: "Tours a las dunas", texto: "Te ayudamos a coordinarlos." },
  { icono: Wine, titulo: "Bodegas de pisco", texto: "Visitas y catas en el valle." },
  { icono: Flame, titulo: "Noches de fogata", texto: "Bajo el cielo despejado de Ica." },
];

const eyebrow = "text-[13px] font-bold tracking-[0.14em] uppercase text-huerto";
const tituloSeccion = "font-display font-semibold text-[clamp(30px,4vw,44px)] leading-[1.12] m-0";

export function InicioWeb() {
  const navigate = useNavigate();
  const [tipos, setTipos] = useState<TipoPublico[] | null>(null);
  const { hash } = useLocation();

  // Si llega desde otra pagina con #experiencias o #ubicacion, se desliza hasta esa seccion al cargar.
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => irASeccion(hash.slice(1)), 120);
    return () => window.clearTimeout(t);
  }, [hash]);

  useEffect(() => {
    publicoApi.tipos().then(setTipos).catch(() => setTipos([]));
  }, []);

  return (
    <WebLayout>
      {/* Portada */}
      <section
        className="relative px-4 sm:px-6 pt-24 sm:pt-28 pb-48 bg-cover bg-[center_40%] text-white"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(20,28,16,.28) 0%, rgba(20,28,16,.15) 35%, rgba(20,28,16,.74) 100%), url(${FOTOS.hero})`,
        }}
      >
        <div className="max-w-[1280px] mx-auto flex flex-col gap-5">
          <span className="self-start inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/15 border border-white/35 text-[13px] font-semibold tracking-[0.06em] uppercase">
            <MapPin size={15} /> Subtanjalla · Valle de Ica
          </span>
          <h1 className="m-0 max-w-[820px] font-display font-semibold text-[clamp(40px,6vw,72px)] leading-[1.04] tracking-tight">
            Tu refugio campestre entre viñedos y dunas
          </h1>
          <p className="m-0 max-w-[600px] text-lg leading-relaxed text-white/90">
            Habitaciones rústicas rodeadas de huerto, piscina y sol todo el año. Reserva directo con nosotros y asegura tu estadía con un adelanto.
          </p>
        </div>
      </section>

      {/* Buscador */}
      <section className="relative z-10 px-4 sm:px-6 -mt-32">
        <div className="max-w-[1180px] mx-auto">
          <BuscadorFechas variante="flotante" inicial={busquedaPorDefecto()} onBuscar={(b) => navigate(`/hospedaje?${aParams(b)}`)} />
          <ul className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 list-none p-0">
            {["Precio directo, sin comisiones", "Confirmas con un adelanto, el resto al llegar", "Desayuno de campo incluido"].map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <Check size={16} strokeWidth={2.4} className="text-huerto" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Lo que incluye */}
      <section className="px-4 sm:px-6 pt-20 pb-10">
        <div className="max-w-[1180px] mx-auto grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {INCLUYE.map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="bg-white border border-[#EFE6D6] rounded-2xl p-6 flex gap-4 items-start">
              <span className="shrink-0 w-12 h-12 rounded-xl bg-huerto-suave flex items-center justify-center text-huerto">
                <Icono size={24} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col gap-1">
                <strong className="text-base">{titulo}</strong>
                <span className="text-sm leading-relaxed text-slate-600">{texto}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Habitaciones */}
      <section className="px-4 sm:px-6 py-14">
        <div className="max-w-[1180px] mx-auto flex flex-col gap-8">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-2.5 max-w-[640px]">
              <span className={eyebrow}>Nuestras habitaciones</span>
              <h2 className={tituloSeccion}>Espacios pensados para descansar con la brisa del huerto</h2>
            </div>
            <Link to="/hospedaje" className="inline-flex items-center gap-2 min-h-[44px] font-bold text-[15px] text-huerto hover:text-huerto-oscuro">
              Ver todas y su disponibilidad <ArrowRight size={18} />
            </Link>
          </div>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {tipos === null &&
              [0, 1, 2, 3].map((i) => <div key={i} className="h-[380px] rounded-[22px] bg-slate-100 animate-pulse" />)}
            {tipos?.length === 0 && (
              <p className="text-slate-600">Pronto publicaremos nuestras habitaciones. Escríbenos para reservar.</p>
            )}
            {tipos?.map((t) => (
              <article key={t.idTipoHabitacion} className="bg-white border border-[#EFE6D6] rounded-[22px] overflow-hidden flex flex-col">
                <img src={fotoDeTipo(t.nombre)} alt={`Habitación ${t.nombre}`} className="w-full h-[200px] object-cover" />
                <div className="p-5 flex flex-col gap-2.5 flex-1">
                  <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-slate-600">
                    Hasta {t.capacidad ?? 2} {t.capacidad === 1 ? "huésped" : "huéspedes"}
                  </span>
                  <h3 className="m-0 font-display font-semibold text-[22px] leading-tight">{t.nombre}</h3>
                  {t.descripcion && <p className="m-0 text-sm leading-relaxed text-slate-600">{t.descripcion}</p>}
                  <div className="mt-auto pt-3.5 border-t border-[#F1EADD] flex items-baseline justify-between gap-2">
                    <span className="text-[13px] text-slate-600">
                      desde <strong className="text-[22px] text-tinta">{soles(t.precioNoche, 0)}</strong> / noche
                    </span>
                    <Link to={`/hospedaje/${t.idTipoHabitacion}`} className="text-sm font-bold min-h-[44px] inline-flex items-center text-huerto hover:text-huerto-oscuro">
                      Ver detalles
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Experiencias */}
      <section id="experiencias" className="px-4 sm:px-6 py-14 scroll-mt-6">
        <div className="max-w-[1180px] mx-auto flex flex-wrap gap-10 items-center">
          <div className="flex-[1_1_420px] flex flex-col gap-4">
            <span className={eyebrow}>Vivir el valle</span>
            <h2 className={tituloSeccion}>Más que un hospedaje: un respiro donde el tiempo va más lento</h2>
            <p className="m-0 text-[17px] leading-relaxed text-slate-600">
              Nacimos como un huerto familiar. Hoy combinamos la calma del campo con la cercanía a Huacachina y a las bodegas de pisco del valle.
            </p>
            <ul className="mt-2 p-0 list-none grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {EXPERIENCIAS.map(({ icono: Icono, titulo, texto }) => (
                <li key={titulo} className="flex gap-3 items-start">
                  <span className="shrink-0 w-9 h-9 rounded-[10px] bg-arena-2 flex items-center justify-center text-huerto">
                    <Icono size={18} strokeWidth={1.9} />
                  </span>
                  <span className="text-[15px] leading-normal">
                    <strong>{titulo}</strong>
                    <br />
                    <span className="text-slate-600">{texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-[1_1_460px] grid grid-cols-2 gap-3.5">
            <img src={FOTOS.piscina} alt="Piscina rodeada de palmeras y terraza de piedra" className="col-span-2 w-full h-[260px] object-cover rounded-[22px]" />
            <img src={FOTOS.bodega} alt="Bodega artesanal con botijas de barro" className="w-full h-[200px] object-cover rounded-[22px]" />
            <img src={FOTOS.fogata} alt="Patio con fogata al atardecer entre viñedos" className="w-full h-[200px] object-cover rounded-[22px]" />
          </div>
        </div>
      </section>

      {/* Cómo reservar */}
      <section className="px-4 sm:px-6 py-14">
        <div className="max-w-[1180px] mx-auto bg-arena-2 rounded-[28px] px-5 sm:px-14 py-12 flex flex-col gap-8">
          <div className="flex flex-col gap-2.5 max-w-[640px]">
            <span className={eyebrow}>Reserva en 3 pasos</span>
            <h2 className="font-display font-semibold text-[clamp(28px,3.4vw,38px)] leading-[1.15] m-0">Sin llamadas ni intermediarios</h2>
          </div>
          <ol className="m-0 p-0 list-none grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {[
              ["Elige fechas y habitación", "Ves solo lo que está libre en tus fechas, con el precio total."],
              ["Paga el adelanto", "Con tarjeta o Yape. Tu reserva queda confirmada al instante."],
              ["Llega y disfruta", "Desde tu portal ves tu cuenta y pides servicios durante la estadía."],
            ].map(([t, d], i) => (
              <li key={t} className="bg-white rounded-2xl p-6 flex flex-col gap-2.5">
                <span className="w-9 h-9 rounded-full bg-huerto text-white font-bold flex items-center justify-center">{i + 1}</span>
                <strong className="text-[17px]">{t}</strong>
                <span className="text-sm leading-relaxed text-slate-600">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Ubicación */}
      <section id="ubicacion" className="px-4 sm:px-6 py-14 scroll-mt-6">
        <div className="max-w-[1180px] mx-auto flex flex-wrap gap-8 items-stretch">
          <div className="flex-[1_1_380px] flex flex-col gap-4">
            <span className={eyebrow}>Cómo llegar</span>
            <h2 className="font-display font-semibold text-[clamp(28px,3.4vw,38px)] leading-[1.15] m-0">En el corazón del valle de Ica</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-[15px]">
              <dt className="text-slate-600">Zona</dt>
              <dd className="m-0 font-semibold">Subtanjalla, Ica</dd>
              <dt className="text-slate-600">Check-in</dt>
              <dd className="m-0 font-semibold">desde las 14:00</dd>
              <dt className="text-slate-600">Check-out</dt>
              <dd className="m-0 font-semibold">hasta las 12:00</dd>
            </dl>
          </div>
          <img src={FOTOS.terraza} alt="Terraza del hostel con vista a los viñedos" className="flex-[1_1_480px] min-h-[280px] max-h-[360px] w-full object-cover rounded-3xl" />
        </div>
      </section>

      {/* Llamado final */}
      <section className="px-4 sm:px-6 pt-14 pb-24">
        <div className="max-w-[1180px] mx-auto bg-huerto-oscuro text-white rounded-[28px] px-6 sm:px-16 py-14 flex flex-wrap items-center justify-between gap-7">
          <div className="flex flex-col gap-3 max-w-[620px]">
            <h2 className="m-0 font-display font-semibold text-[clamp(28px,3.6vw,42px)] leading-[1.12]">Reserva directo y vive el valle de Ica</h2>
            <p className="m-0 text-base leading-relaxed text-emerald-100">
              ¿Ya tienes una reserva? Entra a tu portal con tu correo para ver tu estadía, tu cuenta y pedir servicios.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/hospedaje" className="inline-flex items-center min-h-[52px] px-6 rounded-full bg-terracota hover:bg-terracota-oscuro font-bold">
              Reservar mi habitación
            </Link>
            <Link to="/ingresar" className="inline-flex items-center min-h-[52px] px-6 rounded-full border border-white/50 hover:bg-white/10 font-bold">
              Entrar a mi portal
            </Link>
          </div>
        </div>
      </section>
    </WebLayout>
  );
}
