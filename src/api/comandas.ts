import api from "./axiosConfig";
import type {
  AreaDestino,
  Comanda,
  EstadoComanda,
  NuevaComandaRequest,
} from "./types";

export const comandasApi = {
  /** Sin filtros devuelve las comandas activas del tablero KDS. */
  listar: (area?: AreaDestino, estado?: EstadoComanda) => {
    const params = new URLSearchParams();
    if (area) params.append("area", area);
    if (estado) params.append("estado", estado);
    const qs = params.toString();
    return api
      .get<Comanda[]>(`/api/v1/comandas${qs ? `?${qs}` : ""}`)
      .then((r) => r.data);
  },

  estadiasActivas: () =>
    api
      .get<{ idEstadia: number; numeroHabitacion?: string | null }[]>("/api/v1/comandas/estadias-activas")
      .then((r) => r.data),

  obtener: (id: number) =>
    api.get<Comanda>(`/api/v1/comandas/${id}`).then((r) => r.data),

  listarPorEstadia: (idEstadia: number) =>
    api.get<Comanda[]>(`/api/v1/comandas/estadia/${idEstadia}`).then((r) => r.data),

  crear: (data: NuevaComandaRequest) =>
    api.post<Comanda>("/api/v1/comandas", data).then((r) => r.data),

  cambiarEstado: (id: number, estadoComanda: EstadoComanda) =>
    api
      .patch<Comanda>(`/api/v1/comandas/${id}/estado`, { estadoComanda })
      .then((r) => r.data),
};
