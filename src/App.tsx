import { lazy, Suspense, useCallback, type ComponentType, type LazyExoticComponent } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { CajaBanner } from "./components/CajaBanner";
import { CajaProvider } from "./context/CajaContext";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RUTA, rolesDelModulo, rutaDeInicio, type Modulo } from "./auth/permisos";
import { LoginView } from "./views/LoginView";
import { CambiarPasswordModal } from "./components/CambiarPasswordModal";
import { useCierrePorInactividad } from "./hooks/useCierrePorInactividad";

type Pantalla = LazyExoticComponent<ComponentType>;

/** Cada pantalla se descarga cuando se abre por primera vez. */
function pantalla(importar: () => Promise<Record<string, unknown>>, nombre: string): Pantalla {
  return lazy(() => importar().then((m) => ({ default: m[nombre] as ComponentType })));
}

/*
 * Que entra en cada sitio (ver sitio.ts). Las condiciones comparan import.meta.env directamente: al compilar Vite
 * las convierte en true/false y el codigo del otro sitio no llega al paquete.
 */

/** Modulos del personal: solo en el portal administrativo. */
const MODULOS_PERSONAL: Partial<Record<Modulo, Pantalla>> =
  import.meta.env.VITE_SITIO === "web"
    ? {}
    : {
        dashboard: pantalla(() => import("./views/DashboardView"), "DashboardView"),
        reservas: pantalla(() => import("./views/ReservasView"), "ReservasView"),
        huespedes: pantalla(() => import("./views/HuespedesView"), "HuespedesView"),
        habitaciones: pantalla(() => import("./views/HabitacionesView"), "HabitacionesView"),
        checkin: pantalla(() => import("./views/CheckInView"), "CheckInView"),
        consumos: pantalla(() => import("./views/ConsumosView"), "ConsumosView"),
        pagos: pantalla(() => import("./views/PagosView"), "PagosView"),
        checkout: pantalla(() => import("./views/CheckoutView"), "CheckoutView"),
        comandas: pantalla(() => import("./views/ComandasView"), "ComandasView"),
        limpieza: pantalla(() => import("./views/LimpiezaView"), "LimpiezaView"),
        incidencias: pantalla(() => import("./views/IncidenciasView"), "IncidenciasView"),
        solicitudes: pantalla(() => import("./views/SolicitudesView"), "SolicitudesView"),
        caja: pantalla(() => import("./views/CajaView"), "CajaView"),
        servicios: pantalla(() => import("./views/ServiciosView"), "ServiciosView"),
        inventario: pantalla(() => import("./views/InventarioView"), "InventarioView"),
        usuarios: pantalla(() => import("./views/UsuariosView"), "UsuariosView"),
        turnos: pantalla(() => import("./views/TurnosView"), "TurnosView"),
        reportes: pantalla(() => import("./views/ReportesView"), "ReportesView"),
        configuracion: pantalla(() => import("./views/ConfiguracionView"), "ConfiguracionView"),
      };

/** Portal del huesped: vive en la web publica. */
const MODULOS_HUESPED: Partial<Record<Modulo, Pantalla>> =
  import.meta.env.VITE_SITIO === "admin" ? {} : { portal: pantalla(() => import("./views/PortalView"), "PortalView") };

const VISTAS: Partial<Record<Modulo, Pantalla>> = { ...MODULOS_PERSONAL, ...MODULOS_HUESPED };

/** Paginas de la web publica (sin sesion). */
const WEB =
  import.meta.env.VITE_SITIO === "admin"
    ? null
    : {
        Inicio: pantalla(() => import("./views/web/InicioWeb"), "InicioWeb"),
        Hospedaje: pantalla(() => import("./views/web/HospedajeWeb"), "HospedajeWeb"),
        Detalle: pantalla(() => import("./views/web/DetalleWeb"), "DetalleWeb"),
        Reservar: pantalla(() => import("./views/web/ReservarWeb"), "ReservarWeb"),
      };

/** Cocina y bar dejan su tablero de comandas a la vista sin tocarlo: a ellos no se les cierra por inactividad. */
const SIN_CIERRE_POR_INACTIVIDAD = ["CLIENTE", "COCINA", "BAR"];

function Cargando() {
  return (
    <div role="status" className="min-h-[40vh] flex items-center justify-center text-sm text-slate-600">
      Cargando…
    </div>
  );
}

function InicioSegunRol() {
  const { user } = useAuth();
  return <Navigate to={rutaDeInicio(user?.role)} replace />;
}

/** En el portal administrativo "/" no es la web: lleva al inicio de cada rol, o al login. */
function InicioAdmin() {
  const { user } = useAuth();
  return <Navigate to={user ? rutaDeInicio(user.role) : "/login"} replace />;
}

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const cerrarPorInactividad = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);
  useCierrePorInactividad(!!user && !SIN_CIERRE_POR_INACTIVIDAD.includes(user.role), cerrarPorInactividad);

  // Con una clave temporal (recien creada o restablecida) solo se puede elegir la propia: nada mas hasta hacerlo.
  if (user?.debeCambiarPassword) {
    return <CambiarPasswordModal obligatorio />;
  }
  return (
    <CajaProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-arena font-sans">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-8 overflow-y-auto">
          <CajaBanner />
          <Suspense fallback={<Cargando />}>
            <Routes>
              {/* "/inicio" lleva a cada rol a su pantalla de inicio. */}
              <Route path="/inicio" element={<InicioSegunRol />} />
              {(Object.keys(VISTAS) as Modulo[]).map((modulo) => {
                const Vista = VISTAS[modulo]!;
                return (
                  <Route key={modulo} element={<ProtectedRoute allowedRoles={rolesDelModulo(modulo)} />}>
                    <Route path={RUTA[modulo]} element={<Vista />} />
                  </Route>
                );
              })}
              <Route path="*" element={<InicioSegunRol />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </CajaProvider>
  );
}

export function App() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        {WEB ? (
          <>
            {/* Web publica. "/habitaciones" queda para el modulo interno: la web usa "/hospedaje". */}
            <Route path="/" element={<WEB.Inicio />} />
            <Route path="/hospedaje" element={<WEB.Hospedaje />} />
            <Route path="/hospedaje/:idTipo" element={<WEB.Detalle />} />
            <Route path="/reservar" element={<WEB.Reservar />} />
          </>
        ) : (
          <Route path="/" element={<InicioAdmin />} />
        )}
        <Route path="/login" element={<LoginView />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<AppLayout />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
