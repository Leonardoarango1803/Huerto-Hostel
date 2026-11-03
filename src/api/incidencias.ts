import api from "./axiosConfig";
import type {
  EstadoIncidencia,
  IncidenciaMantenimiento,
  TipoIncidencia,
} from "./types";

export const incidenciasApi = {
  listar: (estado?: EstadoIncidencia) =>
    api
      .get<IncidenciaMantenimiento[]>(
        `/api/v1/incidencias${estado ? `?estado=${estado}` : ""}`
      )
      .then((r) => r.data),

  reportar: (data: {
    idHabitacion: number;
    tipoIncidencia: TipoIncidencia;
    descripcion: string;
  }) =>
    api
      .post<IncidenciaMantenimiento>("/api/v1/incidencias", data)
      .then((r) => r.data),

  cambiarEstado: (id: number, estado: EstadoIncidencia, observaciones?: string) =>
    api
      .patch<IncidenciaMantenimiento>(`/api/v1/incidencias/${id}/estado`, {
        estado,
        observaciones,
      })
      .then((r) => r.data),
};
