import { useCallback, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { rutaDeInicio } from "../../auth/permisos";
import { GoogleBoton, googleDisponible } from "../../components/acceso/GoogleBoton";
import { Captcha, captchaDisponible } from "../../components/acceso/Captcha";
import { useAuth } from "../../context/AuthContext";
import { WebLayout } from "./WebLayout";
import fotoTerraza from "../../assets/huerto-terraza.jpg";

const campo =
  "min-h-[50px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base font-normal text-tinta placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto";

/** Que decirle al huesped segun lo que respondio el backend. */
function motivo(error: unknown, porDefecto: string): string {
  const r = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (!r) return "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.";
  const m = typeof r.data?.message === "string" ? r.data.message : "";
  if ((r.status === 429 || r.status === 403 || r.status === 400) && m) return m;
  return porDefecto;
}

/**
 * "Mi cuenta" de la web: el huesped entra sin salir de la pagina del hotel (misma cabecera y pie). Google primero,
 * porque es lo mas rapido; luego correo y contraseña. Sin cuenta, Google lo lleva a crearla.
 */
export function IngresarWeb() {
  const { user, login, loginConGoogle } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  // Verificacion de Cloudflare para entrar con contraseña (Google no la necesita). El token es de un solo uso.
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [reinicioCaptcha, setReinicioCaptcha] = useState(0);

  const conGoogle = useCallback(async (credencial: string) => {
    setError("");
    setCargando(true);
    try {
      const u = await loginConGoogle(credencial);
      navigate(rutaDeInicio(u.role));
    } catch (err) {
      setError(motivo(err, "No pudimos entrar con Google. Inténtalo de nuevo."));
    } finally {
      setCargando(false);
    }
  }, [loginConGoogle, navigate]);

  if (user && !user.debeCambiarPassword) {
    return <Navigate to={rutaDeInicio(user.role)} replace />;
  }

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const u = await login(usuario, clave, captcha);
      navigate(rutaDeInicio(u.role));
    } catch (err) {
      setError(motivo(err, "Correo o contraseña incorrectos."));
      if (captchaDisponible) {
        setCaptcha(null);
        setReinicioCaptcha((n) => n + 1);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <WebLayout>
      <main className="max-w-[1080px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="bg-white border border-[#EFE6D6] rounded-[28px] overflow-hidden flex flex-wrap shadow-sm">
          <div
            className="flex-[1_1_360px] min-h-[260px] p-8 sm:p-10 flex flex-col justify-end gap-3 text-white bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(180deg, rgba(18,34,15,.25), rgba(18,34,15,.85)), url(${fotoTerraza})` }}
          >
            <h2 className="m-0 font-display text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.1]">Tu estadía, a un clic</h2>
            <p className="m-0 text-[15px] leading-relaxed text-emerald-50/90">
              Revisa tus reservas, lo que llevas consumido y pide servicios a tu habitación.
            </p>
          </div>

          <div className="flex-[1_1_420px] p-7 sm:p-10 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h1 className="m-0 font-display text-[clamp(30px,3.6vw,38px)] font-semibold">Mi cuenta</h1>
              <p className="m-0 text-[15px] text-slate-600">Entra para ver tus reservas y tu estadía.</p>
            </div>

            {error && <div role="alert" className="bg-red-100 text-red-800 text-sm font-semibold rounded-xl px-4 py-3">{error}</div>}

            {googleDisponible && (
              <>
                <GoogleBoton onCredencial={conGoogle} texto="continue_with" ancho={360} />
                <div className="flex items-center gap-3 text-[13px] text-slate-500">
                  <span className="h-px flex-1 bg-slate-200" /> o con tu correo <span className="h-px flex-1 bg-slate-200" />
                </div>
              </>
            )}

            <form onSubmit={entrar} className="flex flex-col gap-4" aria-label="Entrar con correo y contraseña">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">Correo o usuario
                <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" placeholder="El correo con el que reservaste" className={campo} required />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">Contraseña
                <span className="relative">
                  <input type={verClave ? "text" : "password"} value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password"
                    placeholder="Tu contraseña" className={`${campo} pr-12`} required />
                  <button type="button" onClick={() => setVerClave((v) => !v)} aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-500 hover:text-slate-800">
                    {verClave ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
              {captchaDisponible && <Captcha onToken={setCaptcha} reinicio={reinicioCaptcha} />}
              <button type="submit" disabled={cargando || (captchaDisponible && !captcha)} className="min-h-[52px] rounded-full bg-huerto hover:bg-huerto-oscuro disabled:opacity-60 text-white font-bold text-base">
                {cargando ? "Entrando…" : "Entrar"}
              </button>
            </form>

            <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-slate-600 bg-arena rounded-2xl px-4 py-3">
              <span><strong className="text-tinta">¿Primera vez?</strong> {googleDisponible ? "Con «Continuar con Google» tu cuenta queda lista al instante. También se crea al " : "Tu cuenta se crea al "}<Link to="/hospedaje" className="font-bold text-huerto">hacer tu primera reserva</Link>.</span>
              <span>¿Olvidaste tu contraseña? Pídela en recepción{googleDisponible ? ", o entra con Google si reservaste con ese correo" : ""}.</span>
            </div>
          </div>
        </div>
      </main>
    </WebLayout>
  );
}
