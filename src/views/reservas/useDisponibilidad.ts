import { useEffect, useState } from "react";
import { ocupadasEnRango, reservasApi, type HabitacionCalendario, type ReservaCalendario } from "../../api/reservas";

export interface Disponibilidad {
  cargando: boolean;
  /** Todas las habitaciones activas (null hasta que haya fechas validas y respuesta del servidor). */
  habitaciones: HabitacionCalendario[] | null;
  /** idHabitacion -> reserva que la ocupa en esas noches. */
  ocupadas: Map<number, ReservaCalendario>;
  error: string | null;
}

interface Respuesta {
  clave: string;
  habitaciones: HabitacionCalendario[] | null;
  ocupadas: Map<number, ReservaCalendario>;
  error: string | null;
}

const VACIA = new Map<number, ReservaCalendario>();

/**
 * Que habitaciones estan libres en las noches [checkin, checkout). Usa el calendario del servidor, asi una
 * habitacion ocupada HOY se puede reservar para la semana que viene (antes el formulario solo ofrecia las
 * DISPONIBLE del momento). `excepto` es la reserva que se esta editando: no choca consigo misma.
 */
export function useDisponibilidad(checkin: string, checkout: string, excepto?: number): Disponibilidad {
  const valido = !!checkin && !!checkout && checkout > checkin;
  const clave = valido ? `${checkin}|${checkout}|${excepto ?? ""}` : "";
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

  useEffect(() => {
    if (!clave) return;
    let vigente = true;
    reservasApi
      .calendario(checkin, checkout)
      .then((cal) => {
        if (vigente) setRespuesta({ clave, habitaciones: cal.habitaciones, ocupadas: ocupadasEnRango(cal, checkin, checkout, excepto), error: null });
      })
      .catch(() => {
        // Estadias de mas de 62 noches o sin conexion: el servidor igual revisa el cruce al guardar.
        if (vigente) setRespuesta({ clave, habitaciones: null, ocupadas: VACIA, error: "No se pudo revisar la disponibilidad de esas fechas; se verificará al guardar." });
      });
    return () => {
      vigente = false;
    };
  }, [clave, checkin, checkout, excepto]);

  if (!clave) return { cargando: false, habitaciones: null, ocupadas: VACIA, error: null };
  if (!respuesta || respuesta.clave !== clave) {
    // Mientras llega la respuesta nueva se muestran las habitaciones anteriores (sin marcar ocupadas viejas).
    return { cargando: true, habitaciones: respuesta?.habitaciones ?? null, ocupadas: VACIA, error: null };
  }
  return { cargando: false, habitaciones: respuesta.habitaciones, ocupadas: respuesta.ocupadas, error: respuesta.error };
}
