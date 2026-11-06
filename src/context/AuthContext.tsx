import { createContext, useContext, useState, type ReactNode } from "react";
import api from "../api/axiosConfig";

interface AuthUser {
  username: string;
  role: string;
  userId: number;
  /** true mientras la persona use una clave temporal: solo puede cambiarla. */
  debeCambiarPassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  /** Cambia la clave propia; la sesion se renueva (la anterior deja de valer). */
  cambiarPassword: (passwordActual: string, passwordNueva: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Lee la sesion guardada de forma SINCRONA. Si se hiciera dentro de un efecto,
 * ProtectedRoute veria isAuthenticated=false en el primer render y ya habria
 * redirigido al login: al recargar la pagina se perderia la sesion.
 */
function leerSesionGuardada(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (!token || !raw) return { user: null, token: null };
    return { user: JSON.parse(raw) as AuthUser, token };
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => leerSesionGuardada().user);
  const [token, setToken] = useState<string | null>(() => leerSesionGuardada().token);

  const guardarSesion = (datos: { token: string; username: string; role: string; userId: number; debeCambiarPassword?: boolean }) => {
    const authUser: AuthUser = {
      username: datos.username,
      role: datos.role,
      userId: datos.userId,
      debeCambiarPassword: datos.debeCambiarPassword === true,
    };
    localStorage.setItem("token", datos.token);
    localStorage.setItem("user", JSON.stringify(authUser));
    setToken(datos.token);
    setUser(authUser);
  };

  const login = async (username: string, password: string) => {
    const response = await api.post("/api/v1/auth/login", { username, password });
    guardarSesion(response.data);
  };

  const cambiarPassword = async (passwordActual: string, passwordNueva: string) => {
    const response = await api.post("/api/v1/auth/cambiar-password", { passwordActual, passwordNueva });
    guardarSesion(response.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, cambiarPassword, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
