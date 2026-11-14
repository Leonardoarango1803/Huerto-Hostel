import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, Check, CreditCard, Lock, Smartphone } from "lucide-react";
import {
  esPagoRechazado,
  misReservasApi,
  publicoApi,
  type Disponibilidad,
  type ReservaWebHecha,
  type ReservaWebPedido,
} from "../../api/publico";
import { mensajeDeError } from "../../api/errores";
import { useAuth } from "../../context/AuthContext";
import { WebLayout } from "./WebLayout";
import { PasosReserva } from "./PasosReserva";
import { aParams, fechaCorta, fechaLarga, fotoDeTipo, leerBusqueda, soles } from "./utils";

type Metodo = "TARJETA" | "YAPE";
/** Tarjeta de prueba que la pasarela simulada rechaza (como en los sandbox de pago). */
const TARJETA_RECHAZO = "4000000000000002";

const etiqueta = "flex flex-col gap-1.5 text-sm font-semibold";
const campo =
  "min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal text-tinta focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto";
const tarjeta = "bg-white border border-[#EFE6D6] rounded-[22px] p-5 sm:p-6 flex flex-col gap-4";

function claveValida(c: string) {
  return c.length >= 8 && /[a-zA-Z]/.test(c) && /\d/.test(c);
}

/** Paso 2 y 3 de la reserva web: datos del huesped, pago del adelanto y confirmacion. */
export function ReservarWeb() {
  const [params] = useSearchParams();
  const busqueda = useMemo(() => leerBusqueda(params), [params]);
  const idTipo = Number(params.get("tipo"));
  const { user, login } = useAuth();
  const esCliente = user?.role === "CLIENTE";
  const esPersonal = !!user && !esCliente;

  const [datos, setDatos] = useState<Disponibilidad | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [form, setForm] = useState({
    tipoDocumento: "DNI",
    numeroDocumento: "",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    horaLlegada: "",
    password: "",
    password2: "",
    tarjeta: "",
    vencimiento: "",
    cvv: "",
    codigoOperacion: "",
    acepta: false,
  });
  const [metodo, setMetodo] = useState<Metodo>("TARJETA");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rechazado, setRechazado] = useState(false);
  const [hecha, setHecha] = useState<ReservaWebHecha | null>(null);
  const [sesionIniciada, setSesionIniciada] = useState(false);

  useEffect(() => {
    let vigente = true;
    publicoApi
      .disponibilidad(busqueda.llegada, busqueda.salida, busqueda.huespedes)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setErrorCarga(mensajeDeError(e, "No pudimos cargar tu selección.")));
    return () => {
      vigente = false;
    };
  }, [busqueda]);

  const tipo = datos?.tipos.find((t) => t.idTipoHabitacion === idTipo);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validar = (): string | null => {
    if (!esCliente) {
      if (!form.numeroDocumento.trim() || !form.nombres.trim() || !form.apellidos.trim()) return "Completa tu documento, nombres y apellidos.";
      if (form.tipoDocumento === "DNI" && !/^\d{8}$/.test(form.numeroDocumento.trim())) return "El DNI debe tener 8 dígitos.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.correo.trim())) return "Ingresa un correo válido: será tu usuario del portal.";
      if (!claveValida(form.password)) return "La contraseña debe tener al menos 8 caracteres, con letras y números.";
      if (form.password !== form.password2) return "Las contraseñas no coinciden.";
    }
    if (metodo === "TARJETA" && form.tarjeta.replace(/\D/g, "").length < 13) return "Revisa el número de tarjeta.";
    if (metodo === "YAPE" && form.codigoOperacion.trim().length < 4) return "Ingresa el código de operación de Yape o Plin.";
    if (!form.acepta) return "Acepta las condiciones de reserva para continuar.";
    return null;
  };

  const pagar = async (e?: FormEvent) => {
    e?.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    if (!tipo) return;
    setError(null);
    setRechazado(false);
    setEnviando(true);
    const pedido: ReservaWebPedido = {
      idTipoHabitacion: tipo.idTipoHabitacion,
      llegada: busqueda.llegada,
      salida: busqueda.salida,
      huespedes: busqueda.huespedes,
      horaLlegada: form.horaLlegada.trim() || undefined,
      metodoPago: metodo,
      codigoOperacion: metodo === "YAPE" ? form.codigoOperacion.trim() : undefined,
      // No viaja ningun dato de la tarjeta: solo si es la tarjeta de prueba que simula el rechazo.
      simularRechazo: metodo === "TARJETA" && form.tarjeta.replace(/\D/g, "") === TARJETA_RECHAZO,
    };
    try {
      let r: ReservaWebHecha;
      if (esCliente) {
        r = await misReservasApi.reservar(pedido);
      } else {
        r = await publicoApi.reservar({
          ...pedido,
          tipoDocumento: form.tipoDocumento,
          numeroDocumento: form.numeroDocumento.trim(),
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          correo: form.correo.trim(),
          telefono: form.telefono.trim() || undefined,
          password: form.password,
        });
        // La cuenta recien creada entra sola para ir directo al portal.
        try {
          await login(r.usuario ?? form.correo.trim().toLowerCase(), form.password);
          setSesionIniciada(true);
        } catch {
          setSesionIniciada(false);
        }
      }
      setForm((f) => ({ ...f, tarjeta: "", vencimiento: "", cvv: "", password: "", password2: "" }));
      setHecha(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (esPagoRechazado(err)) {
        setRechazado(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(mensajeDeError(err, "No pudimos completar la reserva. Intenta de nuevo."));
      }
    } finally {
      setEnviando(false);
    }
  };

  // ------------------------------------------------------------------ Confirmación
  if (hecha) {
    return (
      <WebLayout minima>
        <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-9 pb-20 flex flex-col gap-6">
          <PasosReserva actual={3} />
          <section className="max-w-[760px] w-full mx-auto bg-white border border-[#EFE6D6] rounded-[28px] p-6 sm:p-12 flex flex-col gap-6 items-center text-center">
            <span className="w-[72px] h-[72px] rounded-full bg-huerto-suave flex items-center justify-center text-huerto">
              <Check size={36} strokeWidth={2.4} />
            </span>
            <div className="flex flex-col gap-2">
              <h1 className="m-0 font-display font-semibold text-[clamp(30px,4vw,40px)]">¡Tu reserva está confirmada!</h1>
              <p className="m-0 text-base leading-relaxed text-slate-600">
                Te esperamos el {fechaLarga(hecha.llegada)} desde las 14:00 en la habitación {hecha.habitacion} ({hecha.tipo}).
              </p>
            </div>
            <div className="w-full grid gap-3 text-left [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
              <div className="bg-arena rounded-2xl p-4 flex flex-col gap-1"><span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-slate-600">Código</span><strong className="text-lg">{hecha.codigo}</strong></div>
              <div className="bg-arena rounded-2xl p-4 flex flex-col gap-1"><span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-slate-600">Adelanto pagado</span><strong className="text-lg text-emerald-800">{soles(hecha.adelanto)}</strong></div>
              <div className="bg-arena rounded-2xl p-4 flex flex-col gap-1"><span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-slate-600">Saldo al llegar</span><strong className="text-lg">{soles(hecha.saldo)}</strong></div>
            </div>
            {hecha.usuario && (
              <p className="m-0 text-sm text-slate-600">
                Tu usuario del portal es <strong className="text-tinta">{hecha.usuario}</strong>. Úsalo con tu contraseña para ver tu reserva y tu cuenta.
              </p>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to={sesionIniciada || esCliente ? "/portal" : "/login"}
                className="inline-flex items-center min-h-[52px] px-6 rounded-full bg-huerto hover:bg-huerto-oscuro text-white font-bold"
              >
                {sesionIniciada || esCliente ? "Ir a mi portal" : "Iniciar sesión"}
              </Link>
              <Link to="/" className="inline-flex items-center min-h-[52px] px-6 rounded-full border border-slate-300 font-bold hover:border-slate-400">
                Volver al inicio
              </Link>
            </div>
            <span className="text-[12px] text-slate-500">Operación {hecha.codigoOperacion} · pago de demostración, no se cobró dinero real.</span>
          </section>
        </main>
      </WebLayout>
    );
  }

  // ------------------------------------------------------------------ Sin selección válida
  if (errorCarga || (datos && !tipo) || !idTipo) {
    return (
      <WebLayout>
        <main className="max-w-[760px] mx-auto px-4 sm:px-6 py-20 flex flex-col gap-4">
          <h1 className="m-0 font-display text-4xl font-semibold">Elige primero tu habitación</h1>
          <p className="m-0 text-slate-600">{errorCarga ?? "No encontramos la habitación elegida para esas fechas."}</p>
          <Link to={`/hospedaje?${aParams(busqueda)}`} className="font-bold text-huerto">Ver habitaciones disponibles</Link>
        </main>
      </WebLayout>
    );
  }

  const agotada = !!tipo && (tipo.disponibles === 0 || !tipo.cabe);

  return (
    <WebLayout minima>
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-9 pb-20 flex flex-col gap-6">
        <PasosReserva actual={2} />

        {rechazado && (
          <section role="alert" className="bg-white border border-red-200 rounded-[28px] p-6 sm:p-9 flex flex-col gap-4 max-w-[760px]">
            <span className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-700"><AlertCircle size={28} /></span>
            <h2 className="m-0 font-display font-semibold text-[clamp(26px,3.6vw,34px)]">Tu banco no aprobó el pago</h2>
            <p className="m-0 text-base leading-relaxed text-slate-600">No se cobró nada y tus datos siguen aquí. Prueba con otra tarjeta o paga con Yape.</p>
            <div className="bg-amber-100 rounded-xl px-4 py-3 text-sm text-amber-900">La habitación no queda separada hasta que pagues.</div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { setRechazado(false); setForm((f) => ({ ...f, tarjeta: "" })); }} className="min-h-[48px] px-5 rounded-full bg-terracota hover:bg-terracota-oscuro text-white font-bold">Usar otra tarjeta</button>
              <button type="button" onClick={() => { setRechazado(false); setMetodo("YAPE"); }} className="min-h-[48px] px-5 rounded-full border border-slate-300 font-bold">Pagar con Yape</button>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-6 items-start">
          <form onSubmit={pagar} noValidate className="flex-[999_1_560px] min-w-0 flex flex-col gap-5">
            <h1 className="m-0 font-display font-semibold text-[clamp(30px,4vw,42px)] leading-[1.1]">
              {esCliente ? "Confirma tu reserva" : "Completa tus datos"}
            </h1>

            {esPersonal && (
              <div role="note" className="bg-blue-100 text-blue-900 rounded-2xl px-5 py-4 text-sm">
                Estás con una sesión del personal. Para registrar la reserva de un huésped usa <Link to="/reservas" className="font-bold underline">Reservas</Link> en el sistema; esta página es para que el huésped reserve solo.
              </div>
            )}

            {esCliente ? (
              <section className={tarjeta}>
                <h2 className="m-0 text-lg font-bold">Reservas con tu cuenta</h2>
                <p className="m-0 text-sm text-slate-600">Usaremos los datos que ya tenemos de ti ({user?.username}).</p>
              </section>
            ) : (
              <>
                <section aria-labelledby="h-datos" className={tarjeta}>
                  <h2 id="h-datos" className="m-0 text-lg font-bold">1. Huésped principal</h2>
                  <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                    <label className={etiqueta}>Tipo de documento
                      <select value={form.tipoDocumento} onChange={set("tipoDocumento")} className={campo}>
                        <option value="DNI">DNI</option>
                        <option value="CE">Carné de extranjería</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </label>
                    <label className={etiqueta}>Número de documento
                      <input value={form.numeroDocumento} onChange={set("numeroDocumento")} inputMode={form.tipoDocumento === "DNI" ? "numeric" : "text"} autoComplete="off" className={campo} required />
                    </label>
                    <label className={etiqueta}>Nombres
                      <input value={form.nombres} onChange={set("nombres")} autoComplete="given-name" className={campo} required />
                    </label>
                    <label className={etiqueta}>Apellidos
                      <input value={form.apellidos} onChange={set("apellidos")} autoComplete="family-name" className={campo} required />
                    </label>
                    <label className={etiqueta}>Correo
                      <input type="email" value={form.correo} onChange={set("correo")} autoComplete="email" className={campo} required />
                    </label>
                    <label className={etiqueta}>Celular
                      <input type="tel" value={form.telefono} onChange={set("telefono")} autoComplete="tel" className={campo} />
                    </label>
                  </div>
                  <label className={etiqueta}>Hora estimada de llegada (opcional)
                    <input value={form.horaLlegada} onChange={set("horaLlegada")} placeholder="Ej. alrededor de las 15:30" className={campo} />
                  </label>
                </section>

                <section aria-labelledby="h-cuenta" className={tarjeta}>
                  <h2 id="h-cuenta" className="m-0 text-lg font-bold">2. Tu acceso al portal</h2>
                  <p className="m-0 text-sm leading-relaxed text-slate-600">Con esta contraseña verás tu reserva y tu cuenta, y podrás pedir servicios durante tu estadía. Tu usuario será tu correo.</p>
                  <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                    <label className={etiqueta}>Contraseña
                      <input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" className={campo} required />
                      <span className={`text-[12px] font-medium ${form.password && !claveValida(form.password) ? "text-red-700" : "text-slate-600"}`}>Mínimo 8 caracteres, con letras y números.</span>
                    </label>
                    <label className={etiqueta}>Repite la contraseña
                      <input type="password" value={form.password2} onChange={set("password2")} autoComplete="new-password" className={campo} required />
                    </label>
                  </div>
                  <p className="m-0 text-[13px] text-slate-600">
                    ¿Ya tienes cuenta? <Link to="/login" className="font-bold text-huerto">Inicia sesión</Link> y vuelve a esta página para reservar sin llenar tus datos.
                  </p>
                </section>
              </>
            )}

            <section aria-labelledby="h-pago" className={tarjeta}>
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 id="h-pago" className="m-0 text-lg font-bold">{esCliente ? "Paga el adelanto" : "3. Paga el adelanto"}</h2>
                <strong className="text-lg text-terracota-oscuro">{tipo ? soles(tipo.adelanto) : "—"}</strong>
              </div>
              <div role="group" aria-label="Método de pago" className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                {([["TARJETA", "Tarjeta", CreditCard], ["YAPE", "Yape / Plin", Smartphone]] as const).map(([m, texto, Icono]) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={metodo === m}
                    onClick={() => setMetodo(m)}
                    className={`min-h-[56px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 ${
                      metodo === m ? "bg-huerto-suave text-emerald-800 border-2 border-huerto" : "bg-white border border-slate-300"
                    }`}
                  >
                    <Icono size={20} /> {texto}
                  </button>
                ))}
              </div>
              {metodo === "TARJETA" ? (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                  <label className={`${etiqueta} col-span-full`}>Número de tarjeta
                    <input value={form.tarjeta} onChange={set("tarjeta")} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" className={`${campo} tracking-wider`} />
                  </label>
                  <label className={etiqueta}>Vencimiento
                    <input value={form.vencimiento} onChange={set("vencimiento")} autoComplete="cc-exp" placeholder="MM / AA" className={campo} />
                  </label>
                  <label className={etiqueta}>CVV
                    <input value={form.cvv} onChange={set("cvv")} inputMode="numeric" autoComplete="cc-csc" placeholder="123" className={campo} />
                  </label>
                  <p className="col-span-full m-0 text-[12px] text-slate-600">
                    Pasarela de demostración: los datos de la tarjeta no salen de tu navegador. Para probar un rechazo usa 4000 0000 0000 0002.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-5 items-center bg-arena rounded-2xl p-4">
                  <div role="img" aria-label="Código QR de pago" className="w-[120px] h-[120px] rounded-xl bg-white border border-dashed border-slate-400 flex items-center justify-center text-[13px] font-semibold text-slate-600">QR de pago</div>
                  <div className="flex-[1_1_240px] flex flex-col gap-2 text-sm leading-relaxed">
                    <strong className="text-[15px]">Escanea y paga {tipo ? soles(tipo.adelanto) : ""}</strong>
                    <span className="text-slate-600">Luego escribe el código de operación que te muestra la app.</span>
                    <label className={etiqueta}>Código de operación
                      <input value={form.codigoOperacion} onChange={set("codigoOperacion")} inputMode="numeric" placeholder="Ej. 01234567" className={campo} />
                    </label>
                  </div>
                </div>
              )}
              <label className="flex gap-2.5 items-start text-sm leading-relaxed">
                <input type="checkbox" checked={form.acepta} onChange={(e) => setForm((f) => ({ ...f, acepta: e.target.checked }))} className="w-5 h-5 mt-0.5 accent-[#2D5A27]" />
                Acepto las condiciones de reserva: el adelanto confirma la habitación y el saldo se paga en el hostel.
              </label>
              {error && <div role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm font-semibold">{error} {/inicia sesi/i.test(error) && <Link to="/login" className="underline">Ir a iniciar sesión</Link>}</div>}
              <button
                type="submit"
                disabled={enviando || agotada || esPersonal}
                className="min-h-[54px] rounded-full bg-terracota hover:bg-terracota-oscuro disabled:opacity-60 disabled:cursor-not-allowed text-white text-base font-bold flex items-center justify-center gap-2.5"
              >
                <Lock size={18} /> {enviando ? "Procesando pago…" : agotada ? "Ya no hay habitaciones libres" : "Pagar adelanto y confirmar"}
              </button>
            </section>
          </form>

          <aside aria-label="Resumen de tu reserva" className="flex-[1_1_320px] min-w-0 bg-white border border-[#EFE6D6] rounded-[22px] overflow-hidden flex flex-col lg:sticky lg:top-6">
            {tipo ? (
              <>
                <img src={fotoDeTipo(tipo.nombre)} alt={`Habitación ${tipo.nombre}`} className="w-full h-[180px] object-cover" />
                <div className="p-5 sm:p-6 flex flex-col gap-3.5">
                  <div className="flex flex-col gap-0.5">
                    <strong className="font-display text-[22px] font-semibold">{tipo.nombre}</strong>
                    <span className="text-[13px] text-slate-600">{busqueda.huespedes} {busqueda.huespedes === 1 ? "persona" : "personas"}</span>
                  </div>
                  <div className="bg-arena rounded-2xl p-3.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <span className="text-slate-600">Llegada</span><span className="text-slate-600">Salida</span>
                    <strong className="capitalize">{fechaCorta(busqueda.llegada)} · 14:00</strong><strong className="capitalize">{fechaCorta(busqueda.salida)} · 12:00</strong>
                  </div>
                  <dl className="m-0 grid grid-cols-[1fr_auto] gap-2.5 text-[15px]">
                    <dt className="text-slate-600">{soles(tipo.precioNoche, 0)} × {datos?.noches} {datos?.noches === 1 ? "noche" : "noches"}</dt><dd className="m-0 font-semibold">{soles(tipo.total)}</dd>
                    <dt className="pt-2.5 border-t border-[#F1EADD] font-bold">Total</dt><dd className="m-0 pt-2.5 border-t border-[#F1EADD] font-bold">{soles(tipo.total)}</dd>
                    <dt className="font-bold text-terracota-oscuro">Adelanto hoy ({datos?.adelantoPorcentaje}%)</dt><dd className="m-0 font-bold text-terracota-oscuro">{soles(tipo.adelanto)}</dd>
                    <dt className="text-slate-600">Saldo al llegar</dt><dd className="m-0 font-semibold">{soles(tipo.saldo)}</dd>
                  </dl>
                  <Link to={`/hospedaje?${aParams(busqueda, { tipo: tipo.idTipoHabitacion })}`} className="text-sm font-bold min-h-[44px] inline-flex items-center text-huerto">
                    Cambiar habitación o fechas
                  </Link>
                </div>
              </>
            ) : (
              <div className="p-6 h-[360px] bg-slate-100 animate-pulse" />
            )}
          </aside>
        </div>
      </main>
    </WebLayout>
  );
}
