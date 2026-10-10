import api from "./axiosConfig";
import type { Habitacion } from "./types";

export const habitacionesApi = {
  listar: (estado?: string) => {
    const url = estado ? `/api/v1/habitaciones?estado=${estado}` : "/api/v1/habitaciones";
    return api.get<Habitacion[]>(url).then((r) => r.data);
  },

  obtener: (id: number) => api.get<Habitacion>(`/api/v1/habitaciones/${id}`).then((r) => r.data),

  cambiarEstado: (id: number, estado: string) =>
    api.patch(`/api/v1/habitaciones/${id}/estado`, { estado }).then((r) => r.data),

  resumen: () => api.get("/api/v1/habitaciones/resumen").then((r) => r.data),
};
