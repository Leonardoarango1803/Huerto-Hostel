import api from "./axiosConfig";
import type {
  AccesoPortal,
  Cliente,
  CuentaPortal,
  EstadisticasClientes,
  NuevoClienteRequest,
} from "./types";

/** Una fila del historial: reserva con su estadia (si llego), lo consumido y lo pagado. Nombres tal cual la base. */
export interface ReservaHistorial {
  id_reserva: number;
  estado: string;
  canal: string;
  fecha_checkin_previsto: string;
  fecha_checkout_previsto: string;
  num_noches: number;
  monto_alojamiento_total: number;
  habitacion: string;
  tipo: string | null;
  id_estadia: number | null;
  fecha_checkin_real: string | null;
  fecha_checkout_real: string | null;
  estado_estadia: string | null;
  salida_forzada: boolean | null;
  saldo_al_salir: number | null;
  consumos: number;
  pagado: number;
}

export interface ConsumoHistorial {
  id_consumo: number;
  id_estadia: number;
  fecha_registro: string;
  producto: string;
  categoria: string;
  cantidad: number;
  total_consumo: number;
  habitacion: string;
}

export interface HistorialHuesped {
  idCliente: number;
  resumen: {
    reservas: number;
    visitas: number;
    noches: number;
    canceladas: number;
    totalAlojamiento: number;
    totalConsumos: number;
    totalPagado: number;
    deudaPendiente: number;
    ultimaVisita: string | null;
    favoritos: { producto: string; cantidad: number }[];
  };
  reservas: ReservaHistorial[];
  consumos: ConsumoHistorial[];
  consumosOmitidos: number;
}

export const clientesApi = {
  listar: () => api.get<Cliente[]>("/api/v1/clientes").then((r) => r.data),

  /** Estadias, consumos y pagos del huesped (RF11). */
  historial: (id: number) => api.get<HistorialHuesped>(`/api/v1/clientes/${id}/historial`).then((r) => r.data),

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

  /** Quienes tienen cuenta del portal (una sola consulta para toda la lista). */
  cuentasPortal: () => api.get<CuentaPortal[]>("/api/v1/clientes/cuentas-portal").then((r) => r.data),

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
