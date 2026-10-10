import api from "./axiosConfig";
import type { Reserva, NuevaReservaRequest } from "./types";

export const reservasApi = {
  listar: () => api.get<Reserva[]>("/api/v1/reservas").then((r) => r.data),

  obtener: (id: number) => api.get<Reserva>(`/api/v1/reservas/${id}`).then((r) => r.data),

  crear: (data: NuevaReservaRequest) =>
    api.post<Reserva>("/api/v1/reservas", data).then((r) => r.data),

  cambiarEstado: (id: number, estadoReserva: string) =>
    api.patch(`/api/v1/reservas/${id}/estado`, { estadoReserva }).then((r) => r.data),

  listarPagos: (id: number) =>
    api.get(`/api/v1/reservas/${id}/pagos`).then((r) => r.data),

  registrarAdelanto: (id: number, data: { monto: number; metodoPago: string }) =>
    api.post(`/api/v1/reservas/${id}/adelanto`, data).then((r) => r.data),

  realizarCheckin: (id: number) =>
    api.post(`/api/v1/reservas/${id}/checkin`).then((r) => r.data),
};
