import { useEffect, useState } from "react";
import { incidenciasApi } from "../api/incidencias";
import type { IncidenciaDeHabitacion } from "../api/types";
import { puedeEntrar } from "../auth/permisos";
import { useAuth } from "../context/AuthContext";

/**
 * Incidencias abiertas por habitacion (numero de habitacion -> resumen), para avisar en Habitaciones y Reservas que una
 * habitacion tiene una averia. Solo los roles que ven Incidencias la piden; para el resto queda vacio.
 */
export function useIncidenciasPorHabitacion(): Map<number, IncidenciaDeHabitacion> {
  const { user } = useAuth();
  const aplica = puedeEntrar(user?.role, "incidencias");
  const [mapa, setMapa] = useState<Map<number, IncidenciaDeHabitacion>>(new Map());

  useEffect(() => {
    if (!aplica) return;
    let vigente = true;
    incidenciasApi.porHabitacion()
      .then((lista) => vigente && setMapa(new Map(lista.map((i) => [i.idHabitacion, i]))))
      .catch(() => undefined);
    return () => { vigente = false; };
  }, [aplica]);

  return aplica ? mapa : new Map();
}
