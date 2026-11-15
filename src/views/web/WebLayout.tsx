import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { irASeccion } from "./utils";
import { LogOut, UserRound } from "lucide-react";
import { LogoHuerto } from "../../components/layout/LogoHuerto";
import { useAuth } from "../../context/AuthContext";
import { rutaDeInicio } from "../../auth/permisos";
import { SITIO } from "../../sitio";

/** Cabecera y pie de la web publica. */
export function WebLayout({ children, minima = false }: { children: ReactNode; minima?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Los enlaces a secciones del inicio se deslizan hasta ellas; desde otra pagina, primero se va al inicio.
  const seccion = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/" || id === "contacto") irASeccion(id);
    else navigate("/#" + id);
  };
  // Un huesped con sesion va a su portal; el personal, a su panel; sin sesion, a "Mi cuenta".
  const destinoCuenta = user ? rutaDeInicio(user.role) : "/ingresar";
  const textoCuenta = user ? (user.role === "CLIENTE" ? "Mi portal" : "Ir al sistema") : "Mi reserva";
  const salir = () => {
    logout();
    navigate("/");
  };

  const enlace = ({ isActive }: { isActive: boolean }) =>
    `py-2.5 border-b-2 transition-colors ${isActive ? "text-huerto font-bold border-huerto" : "text-tinta border-transparent hover:text-huerto"}`;

  return (
    <div className="min-h-screen flex flex-col bg-arena text-tinta font-sans">
      <header className="bg-arena border-b border-slate-200 relative z-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <Link to="/" aria-label="El Huerto Hostel, inicio">
            <LogoHuerto />
          </Link>
          {!minima && (
            <nav aria-label="Principal" className="flex flex-wrap items-center gap-x-7 gap-y-1 text-[15px] font-medium order-3 sm:order-none w-full sm:w-auto">
              <NavLink to="/hospedaje" className={enlace}>Habitaciones</NavLink>
              <a href="/#experiencias" onClick={seccion("experiencias")} className="py-2.5 hover:text-huerto">Experiencias</a>
              <a href="/#ubicacion" onClick={seccion("ubicacion")} className="py-2.5 hover:text-huerto">Ubicación</a>
              <a href="#contacto" onClick={seccion("contacto")} className="py-2.5 hover:text-huerto">Contacto</a>
            </nav>
          )}
          <div className="flex items-center gap-2.5">
            <Link
              to={destinoCuenta}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-slate-300 text-sm font-semibold hover:border-slate-400 bg-transparent"
            >
              <UserRound size={18} /> {textoCuenta}
            </Link>
            {user && (
              <button
                type="button"
                onClick={salir}
                title={`Cerrar la sesión de ${user.username}`}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-slate-300 text-sm font-semibold hover:border-slate-400"
              >
                <LogOut size={17} /> Cerrar sesión
              </button>
            )}
            {!minima && (
              <Link
                to="/hospedaje"
                className="inline-flex items-center min-h-[44px] px-5 rounded-full bg-terracota hover:bg-terracota-oscuro text-white text-sm font-bold"
              >
                Reservar
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer id="contacto" className="bg-arena-2 border-t border-slate-200 px-4 sm:px-6 pt-12 pb-8">
        <div className="max-w-[1180px] mx-auto flex flex-col gap-8">
          <div className="grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            <div className="flex flex-col gap-2.5">
              <span className="font-display text-2xl font-semibold">El Huerto Hostel</span>
              <span className="text-sm leading-relaxed text-slate-600">Hospedaje campestre en el valle de Ica.</span>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <strong className="text-[13px] tracking-[0.1em] uppercase text-slate-600">Contacto</strong>
              <span>Subtanjalla · Ica, Perú</span>
              <span>Check-in desde las 14:00 · Check-out hasta las 12:00</span>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <strong className="text-[13px] tracking-[0.1em] uppercase text-slate-600">Huéspedes</strong>
              <Link to="/hospedaje" className="text-huerto hover:underline">Reservar</Link>
              <Link to={user?.role === "CLIENTE" ? "/portal" : "/ingresar"} className="text-huerto hover:underline">Mi reserva</Link>
            </div>
            {/* En la web publicada el personal no entra por aqui: tiene su propia direccion (portal administrativo). */}
            {SITIO === "completo" && (
              <div className="flex flex-col gap-2 text-sm">
                <strong className="text-[13px] tracking-[0.1em] uppercase text-slate-600">Equipo</strong>
                <Link to="/login" className="text-huerto hover:underline">Acceso del personal</Link>
              </div>
            )}
          </div>
          <div className="border-t border-slate-300/70 pt-5 flex flex-wrap justify-between gap-2 text-[13px] text-slate-600">
            <span>© {new Date().getFullYear()} El Huerto Hostel</span>
            <span>Pagos en línea de demostración: no se realizan cobros reales.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
