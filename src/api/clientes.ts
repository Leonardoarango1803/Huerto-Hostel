import api from "./axiosConfig";
import type { Cliente, EstadisticasClientes, NuevoClienteRequest } from "./types";

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
};
