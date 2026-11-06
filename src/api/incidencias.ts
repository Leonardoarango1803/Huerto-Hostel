import api from "./axiosConfig";
import type {
  DestinoHabitacion,
  EstadoIncidencia,
  IncidenciaDeHabitacion,
  IncidenciaMantenimiento,
  ResultadoIncidencia,
  TipoIncidencia,
} from "./types";

export const incidenciasApi = {
  listar: (estado?: EstadoIncidencia) =>
    api
      .get<IncidenciaMantenimiento[]>(
        `/api/v1/incidencias${estado ? `?estado=${estado}` : ""}`
      )
      .then((r) => r.data),

  /** bloquearHabitacion=true la pone en MANTENIMIENTO (no se vende); false la deja disponible. */
  reportar: (data: {
    idHabitacion: number;
    tipoIncidencia: TipoIncidencia;
    descripcion: string;
    bloquearHabitacion: boolean;
  }) =>
    api
      .post<ResultadoIncidencia>("/api/v1/incidencias", { ...data, bloquearHabitacion: String(data.bloquearHabitacion) })
      .then((r) => r.data),

  /** Cambia la decision de bloquear una incidencia abierta. */
  cambiarBloqueo: (id: number, bloquear: boolean) =>
    api
      .patch<ResultadoIncidencia>(`/api/v1/incidencias/${id}/bloqueo`, { bloquear: String(bloquear) })
      .then((r) => r.data),

  /** Incidencias abiertas agrupadas por habitacion. */
  porHabitacion: () =>
    api.get<IncidenciaDeHabitacion[]>("/api/v1/incidencias/por-habitacion").then((r) => r.data),

  /** Al resolver se puede elegir el destino de la habitacion; la respuesta dice que paso con ella. */
  cambiarEstado: (
    id: number,
    estado: EstadoIncidencia,
    opciones?: { observaciones?: string; destino?: DestinoHabitacion }
  ) =>
    api
      .patch<ResultadoIncidencia>(`/api/v1/incidencias/${id}/estado`, {
        estado,
        observaciones: opciones?.observaciones,
        destino: opciones?.destino,
      })
      .then((r) => r.data),
};
