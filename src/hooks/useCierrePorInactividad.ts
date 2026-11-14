import { useEffect, useRef } from "react";

/** Minutos sin tocar el sistema tras los que se cierra la sesion del personal. */
export const MINUTOS_INACTIVIDAD = 30;

const CLAVE = "ultimaActividad";
const LIMITE_MS = MINUTOS_INACTIVIDAD * 60 * 1000;
const EVENTOS = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"] as const;

function leerUltima(): number | null {
  try {
    const valor = Number(localStorage.getItem(CLAVE));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

/** Anota "ahora" como ultima actividad. AuthContext la llama al iniciar sesion. */
export function marcarActividad(momento = Date.now()) {
  try {
    localStorage.setItem(CLAVE, String(momento));
  } catch {
    // Sin almacenamiento solo se pierde compartir la actividad entre pestanas.
  }
}

const CLAVE_AVISO = "sesionCerradaPorInactividad";

/** El aviso va en sessionStorage (no en el estado del router) para sobrevivir a una recarga de la pagina. */
function avisarCierrePorInactividad() {
  try {
    sessionStorage.setItem(CLAVE_AVISO, "1");
  } catch {
    // sin aviso: igual se cierra la sesion
  }
}

/** true si la ultima sesion se cerro por inactividad (el login lo muestra y luego llama a borrarAvisoDeInactividad). */
export function hayAvisoDeInactividad(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_AVISO) === "1";
  } catch {
    return false;
  }
}

export function borrarAvisoDeInactividad() {
  try {
    sessionStorage.removeItem(CLAVE_AVISO);
  } catch {
    // nada que borrar
  }
}

export function olvidarActividad() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que limpiar
  }
}

/**
 * Cierra la sesion tras {@link MINUTOS_INACTIVIDAD} minutos sin uso: en recepcion la computadora es compartida y
 * una sesion olvidada deja la caja a la mano de cualquiera. La ultima actividad se comparte entre pestanas (usar
 * una pestana mantiene viva la sesion en las otras) y sobrevive a cerrar el navegador: volver horas despues pide
 * iniciar sesion otra vez aunque el token aun no haya vencido.
 */
export function useCierrePorInactividad(activo: boolean, alVencer: () => void) {
  const alVencerRef = useRef(alVencer);
  const vencidaRef = useRef(false);
  useEffect(() => {
    alVencerRef.current = alVencer;
  }, [alVencer]);

  useEffect(() => {
    if (!activo) {
      vencidaRef.current = false;
      return;
    }
    // Ya se cerro (React puede volver a correr el efecto antes de enterarse): no revivir la sesion.
    if (vencidaRef.current) return;
    const vencer = () => {
      vencidaRef.current = true;
      avisarCierrePorInactividad();
      alVencerRef.current();
    };

    const previa = leerUltima();
    if (previa !== null && Date.now() - previa >= LIMITE_MS) {
      vencer();
      return;
    }
    let anotada = Date.now();
    marcarActividad(anotada);

    const alUsar = () => {
      const ahora = Date.now();
      // No escribir en cada movimiento del mouse: basta con anotar cada 15 s.
      if (ahora - anotada > 15_000) {
        anotada = ahora;
        marcarActividad(ahora);
      }
    };
    const revisar = () => {
      if (!vencidaRef.current && Date.now() - Math.max(anotada, leerUltima() ?? 0) >= LIMITE_MS) vencer();
    };

    EVENTOS.forEach((e) => window.addEventListener(e, alUsar, { passive: true }));
    const intervalo = window.setInterval(revisar, 30_000);
    // Al volver a la pestana (o despertar la computadora) se revisa de inmediato.
    document.addEventListener("visibilitychange", revisar);

    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, alUsar));
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", revisar);
    };
  }, [activo]);
}
