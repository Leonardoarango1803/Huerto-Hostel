import api from "./axiosConfig";
import type {
  AccesoPortal,
  Cliente,
  EstadisticasClientes,
  NuevoClienteRequest,
} from "./types";

export const clientesApi = {
  listar: () => api.get<Cliente[]>("/api/v1/clientes").then((r) => r.data),

  obtener: (id: number) => api.get<Cliente>(`/api/v1/clientes/${id}`).then((r) => r.data),

  buscarPorDocumento: (documento: string) =>
    api.get<Cliente>(`/api/v1/clientes/buscar?documento=${documento}`).then((r) => r.data),

  crear: (data: NuevoClienteRequest) =>
    api.post<Cliente>("/api/v1/clientes", data).then((r) => r.data),

  actualizar: (id: number, data: Partial<NuevoClienteRequest>) =>
    api.put<Cliente>(`/api/v1/clientes/${id}`, data).then((r) => r.data),

  estadisticas: () =>
    api.get<EstadisticasClientes>("/api/v1/clientes/estadisticas").then((r) => r.data),

  // --- Acceso al Portal del Huesped ---

  consultarAcceso: (idCliente: number) =>
    api.get<AccesoPortal>(`/api/v1/clientes/${idCliente}/acceso`).then((r) => r.data),

  /** Sin datos, el backend propone el usuario y devuelve una clave temporal una sola vez. */
  crearAcceso: (idCliente: number, data?: { username?: string; password?: string }) =>
    api
      .post<AccesoPortal>(`/api/v1/clientes/${idCliente}/acceso`, data ?? {})
      .then((r) => r.data),

  cambiarEstadoAcceso: (idCliente: number, activo: boolean) =>
    api
      .patch<AccesoPortal>(`/api/v1/clientes/${idCliente}/acceso`, { activo })
      .then((r) => r.data),

  restablecerPassword: (idCliente: number, password?: string) =>
    api
      .post<AccesoPortal>(`/api/v1/clientes/${idCliente}/acceso/password`, { password })
      .then((r) => r.data),
};
