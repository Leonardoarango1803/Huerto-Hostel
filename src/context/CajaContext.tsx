import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cajaApi } from "../api/caja";
import type { EstadoCaja } from "../api/types";
import { usaCaja } from "../auth/permisos";
import { useAuth } from "./AuthContext";

/**
 * La caja es unica para todo el hotel: lo que abre recepcion lo ve el cajero y viceversa.
 * No hay websockets, asi que el estado se refresca cada 30 s, al volver a la pestana y tras
 * abrir o cerrar la caja. Como maximo un cambio ajeno tarda ese intervalo en verse.
 */
const INTERVALO_MS = 30_000;

interface CajaContextType {
  /** null mientras no se sabe, o si el rol no usa caja. */
  estado: EstadoCaja | null;
  /** true SOLO cuando se sabe que esta cerrada: mientras se carga no se bloquea nada. */
  cajaCerrada: boolean;
  refrescar: () => Promise<void>;
}

const CajaContext = createContext<CajaContextType>({
  estado: null,
  cajaCerrada: false,
  refrescar: async () => undefined,
});

export function CajaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const aplica = usaCaja(user?.role);
  const [estado, setEstado] = useState<EstadoCaja | null>(null);

  const refrescar = useCallback(async () => {
    if (!aplica) return;
    try {
      setEstado(await cajaApi.estado());
    } catch {
      // Sin red o sesion vencida: se conserva el ultimo estado conocido en vez de bloquear la pantalla.
    }
  }, [aplica]);

  useEffect(() => {
    if (!aplica) {
      setEstado(null);
      return;
    }
    refrescar();
    const timer = setInterval(refrescar, INTERVALO_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", refrescar);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", refrescar);
    };
  }, [aplica, refrescar]);

  const valor = useMemo<CajaContextType>(
    () => ({ estado, cajaCerrada: estado !== null && !estado.abierta, refrescar }),
    [estado, refrescar]
  );

  return <CajaContext.Provider value={valor}>{children}</CajaContext.Provider>;
}

export function useCaja() {
  return useContext(CajaContext);
}

/** Texto para los botones deshabilitados por caja cerrada. */
export const AVISO_CAJA_CERRADA = "Abre la caja para continuar";
