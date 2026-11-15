import { useCallback, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { rutaDeInicio } from "../auth/permisos";
import { Eye, EyeOff } from "lucide-react";
import { LogoHuerto } from "../components/layout/LogoHuerto";
import { MINUTOS_INACTIVIDAD, hayAvisoDeInactividad } from "../hooks/useCierrePorInactividad";
import { SITIO, URL_WEB } from "../sitio";
import fotoTerraza from "../assets/huerto-terraza.jpg";
import { Captcha, captchaDisponible } from "../components/acceso/Captcha";
import { GoogleBoton, googleDisponible } from "../components/acceso/GoogleBoton";

/** Captcha en todo inicio de sesion con contrasena (el backend lo exige a todos). */
const PIDE_CAPTCHA = captchaDisponible;
/** Google es solo para huespedes: en el portal administrativo no aparece. */
const OFRECE_GOOGLE = googleDisponible && SITIO !== "admin";

/** Textos del login segun el sitio: el personal entra por el admin y los huespedes por la web. */
const TEXTOS = {
  admin: {
    subtituloLogo: "Portal administrativo",
    tituloFoto: "Todo el hostel, en un solo lugar",
    textoFoto: "Reservas, habitaciones, caja y servicios. Cada persona ve solo lo que necesita para su turno.",
    titulo: "Iniciar sesión",
    bajada: "Acceso solo para el personal del hostel.",
    etiquetaUsuario: "Usuario",
    placeholderUsuario: "Tu usuario",
    ayuda: ["¿Olvidaste tu contraseña? Pídele al administrador que la restablezca."],
  },
  web: {
    subtituloLogo: "Mi cuenta",
    tituloFoto: "Tu estadía en El Huerto",
    textoFoto: "Revisa tus reservas, lo que llevas consumido y pide servicios a tu habitación.",
    titulo: "Mi cuenta",
    bajada: "Para huéspedes con reserva.",
    etiquetaUsuario: "Correo o usuario",
    placeholderUsuario: "El correo con el que reservaste",
    ayuda: [
      "Entra con el correo que usaste al reservar o con el usuario que te dio recepción.",
      "¿Olvidaste tu contraseña? Pídela en recepción, o entra con Google si reservaste con ese correo.",
      "¿Primera vez? Tu cuenta se crea con tu primera reserva.",
    ],
  },
  completo: {
    subtituloLogo: "Sistema de gestión",
    tituloFoto: "Todo el hostel, en un solo lugar",
    textoFoto: "Reservas, habitaciones, caja y servicios. Cada persona ve solo lo que necesita para su turno.",
    titulo: "Iniciar sesión",
    bajada: "Personal del hostel y huéspedes con reserva.",
    etiquetaUsuario: "Usuario o correo",
    placeholderUsuario: "Tu usuario",
    ayuda: [
      "¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.",
      "¿Eres huésped? Entra con el correo que usaste al reservar o con el usuario que te dio recepción.",
    ],
  },
}[SITIO];

/** Que decirle a la persona segun lo que respondio el backend. */
function motivoDelRechazo(error: unknown): string {
  const respuesta = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (!respuesta) return "No pudimos conectar con el sistema. Revisa tu conexión e inténtalo de nuevo.";
  const mensaje = typeof respuesta.data?.message === "string" ? respuesta.data.message : "";
  // 429: bloqueo por intentos fallidos; 403: cuenta de otro sitio; 400: falta el captcha. Traen el motivo exacto.
  if ((respuesta.status === 429 || respuesta.status === 403 || respuesta.status === 400) && mensaje) return mensaje;
  return "Usuario o contraseña incorrectos.";
}

export function LoginView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginConGoogle } = useAuth();
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [reinicioCaptcha, setReinicioCaptcha] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  // El aviso se borra al volver a entrar (AuthContext.login), no al mostrarlo: asi resiste una recarga de la pagina.
  const [porInactividad] = useState(hayAvisoDeInactividad);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const usuario = await login(username, password, captcha);
      // Cada rol entra directo a su pantalla de inicio.
      navigate(rutaDeInicio(usuario.role));
    } catch (err) {
      setError(motivoDelRechazo(err));
      // El token del captcha es de un solo uso: tras un intento fallido hay que volver a marcarlo.
      if (PIDE_CAPTCHA) {
        setCaptcha(null);
        setReinicioCaptcha((n) => n + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const conGoogle = useCallback(async (credencial: string) => {
    setError("");
    setLoading(true);
    try {
      const u = await loginConGoogle(credencial);
      navigate(rutaDeInicio(u.role));
    } catch (err) {
      const datos = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
      setError(typeof datos?.message === "string" ? datos.message : "No pudimos entrar con Google. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [loginConGoogle, navigate]);

  // Con la sesion abierta, volver a /login lleva a su pantalla de inicio (no pide entrar otra vez).
  if (user && !user.debeCambiarPassword) {
    return <Navigate to={rutaDeInicio(user.role)} replace />;
  }

  // En el admin el logo no lleva a la web (salvo que se configure su direccion); en la web vuelve al inicio.
  const logo = <LogoHuerto tono="claro" subtitulo={TEXTOS.subtituloLogo} />;

  return (
    <div className="min-h-screen flex flex-wrap bg-arena font-sans text-tinta">
      {/* Foto y mensaje */}
      <section
        aria-label="El Huerto Hostel"
        className="relative flex-[1_1_420px] min-h-[300px] flex flex-col justify-between gap-8 px-6 sm:px-12 py-10 text-white bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(18,34,15,.55), rgba(18,34,15,.86)), url(${fotoTerraza})`,
        }}
      >
        {SITIO === "admin" ? (
          <span className="self-start">{logo}</span>
        ) : (
          <Link to="/" aria-label="Ir a la web de El Huerto" className="self-start">
            {logo}
          </Link>
        )}
        <div className="max-w-md flex flex-col gap-3">
          <h2 className="font-display text-4xl lg:text-5xl font-semibold leading-[1.08]">{TEXTOS.tituloFoto}</h2>
          <p className="text-base leading-relaxed text-emerald-50/90">{TEXTOS.textoFoto}</p>
        </div>
        <span className="text-sm text-emerald-50/80">Subtanjalla · Valle de Ica</span>
      </section>

      {/* Formulario */}
      <section className="flex-[1_1_480px] flex items-center justify-center px-6 sm:px-16 py-12">
        <form onSubmit={handleSubmit} aria-labelledby="titulo-acceso" className="w-full max-w-[420px] flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 id="titulo-acceso" className="font-display text-[34px] font-semibold">{TEXTOS.titulo}</h1>
            <p className="text-[15px] text-slate-600">{TEXTOS.bajada}</p>
          </div>

          {porInactividad && !error && (
            <div role="status" className="bg-amber-100 text-amber-900 text-sm font-semibold rounded-xl px-4 py-3">
              Cerramos tu sesión porque pasaron {MINUTOS_INACTIVIDAD} minutos sin actividad. Vuelve a entrar para seguir.
            </div>
          )}

          {error && (
            <div role="alert" className="bg-red-100 text-red-800 text-sm font-semibold rounded-xl px-4 py-3">
              {error}
            </div>
          )}


          <label htmlFor="username" className="flex flex-col gap-1.5 text-sm font-semibold">
            {TEXTOS.etiquetaUsuario}
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="min-h-[50px] bg-white border border-slate-300 rounded-xl px-3.5 text-base font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto"
              placeholder={TEXTOS.placeholderUsuario}
              autoComplete="username"
              required
            />
          </label>

          <label htmlFor="password" className="flex flex-col gap-1.5 text-sm font-semibold">
            Contraseña
            <span className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[50px] bg-white border border-slate-300 rounded-xl pl-3.5 pr-12 text-base font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto"
                placeholder="Tu contraseña"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {PIDE_CAPTCHA && <Captcha onToken={setCaptcha} reinicio={reinicioCaptcha} />}

          <button
            type="submit"
            disabled={loading || (PIDE_CAPTCHA && !captcha)}
            className="min-h-[52px] bg-huerto hover:bg-huerto-oscuro disabled:opacity-60 text-white rounded-xl font-bold text-base transition-colors"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>

          {OFRECE_GOOGLE && (
            <div className="flex flex-col gap-3" aria-label="Entrar con Google">
              <div className="flex items-center gap-3 text-[13px] text-slate-500">
                <span className="h-px flex-1 bg-slate-300" /> o <span className="h-px flex-1 bg-slate-300" />
              </div>
              <GoogleBoton onCredencial={conGoogle} texto="continue_with" ancho={360} />
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-slate-600 bg-arena-2 rounded-xl px-4 py-3">
            {TEXTOS.ayuda.map((linea) => (
              <span key={linea}>{linea}</span>
            ))}
          </div>
          {SITIO !== "admin" ? (
            <Link to="/" className="text-sm font-bold text-huerto hover:text-huerto-oscuro self-start min-h-[40px] flex items-center">
              ← Volver a la web
            </Link>
          ) : (
            URL_WEB && (
              <a href={URL_WEB} className="text-sm font-bold text-huerto hover:text-huerto-oscuro self-start min-h-[40px] flex items-center">
                ← Ir a la web del hotel
              </a>
            )
          )}
        </form>
      </section>
    </div>
  );
}
