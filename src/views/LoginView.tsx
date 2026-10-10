import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, BedDouble, CalendarCheck, BarChart3 } from "lucide-react";
import logoHotel from "../assets/logo-hotel.png";

export function LoginView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch {
      setError("Credenciales incorrectas. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Panel izquierdo: formulario */}
      <div className="flex flex-col px-8 sm:px-14 py-8 bg-slate-50">
        <div className="flex items-center gap-2.5">
          <img src={logoHotel} alt="" className="h-20 w-auto" />
          <span className="text-xl font-bold text-emerald-900">El Huerto Hostel</span>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto">
            <h1 className="text-3xl font-bold text-slate-900">Iniciar sesión</h1>
            <p className="text-sm text-slate-500 mt-2 mb-8">
              Ingrese sus credenciales para acceder al sistema.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                  placeholder="Ingrese su usuario"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-11 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 border-l border-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 accent-emerald-800"
                />
                Recordarme
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-900 hover:bg-emerald-950 disabled:bg-emerald-700/60 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              {/* <p className="text-[11px] text-slate-400 text-center">
                Usuario de prueba: admin / admin123
              </p> */}
            </form>
          </div>
        </div>
      </div>

      {/* Panel derecho: presentación (solo desktop) */}
      <div className="hidden lg:flex relative overflow-hidden bg-emerald-950 items-center justify-center px-12">
        <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-emerald-800/40" />

        <div className="relative w-full max-w-md">
          <div className="bg-slate-50 rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-emerald-900 leading-tight">
              Gestione su hostel
              <br />
              con más control
            </h2>
            <p className="text-sm text-slate-500 mt-3">
              Reservas, habitaciones y huéspedes en un solo lugar, siempre actualizados.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3">
                <BedDouble size={18} className="text-emerald-800" />
                <p className="text-xs text-slate-600 mt-2">Habitaciones</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <CalendarCheck size={18} className="text-emerald-800" />
                <p className="text-xs text-slate-600 mt-2">Reservas</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <BarChart3 size={18} className="text-emerald-800" />
                <p className="text-xs text-slate-600 mt-2">Reportes</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <h3 className="text-2xl font-semibold text-white">Sistema de Gestión Hotelera</h3>
            <p className="text-sm text-emerald-100/70 mt-3 leading-relaxed">
              Tome decisiones con información clara sobre la ocupación, los ingresos y la
              operación diaria de El Huerto Hostel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}