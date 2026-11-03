import api from "./axiosConfig";
import type { EstadoTareaLimpieza, OrigenTareaLimpieza, TareaLimpieza } from "./types";

export const limpiezaApi = {
  /** Sin estado devuelve las tareas abiertas (pendientes y en proceso). */
  listar: (estado?: EstadoTareaLimpieza) =>
    api
      .get<TareaLimpieza[]>(
        `/api/v1/tareas-limpieza${estado ? `?estado=${estado}` : ""}`
      )
      .then((r) => r.data),

  crear: (data: {
    idHabitacion: number;
    origen?: OrigenTareaLimpieza;
    observaciones?: string;
  }) => api.post<TareaLimpieza>("/api/v1/tareas-limpieza", data).then((r) => r.data),

  cambiarEstado: (id: number, estado: EstadoTareaLimpieza) =>
    api
      .patch<TareaLimpieza>(`/api/v1/tareas-limpieza/${id}/estado`, { estado })
      .then((r) => r.data),
};
