import api from "./axiosConfig";
import type { Reserva, NuevaReservaRequest } from "./types";

/** Cambios a una reserva antes del check-in. Lo que no se envia queda como estaba. */
export interface EditarReservaRequest {
  idCliente?: number;
  idHabitacion?: number;
  fechaCheckinPrevisto?: string;
  fechaCheckoutPrevisto?: string;
  observaciones?: string;
}

export interface HabitacionCalendario {
  idHabitacion: number;
  numero: string;
  piso?: number | null;
  estadoOperativo: string;
  idTipoHabitacion: number | null;
  tipo: string | null;
  precioNoche: number | null;
}

export interface ReservaCalendario {
  idReserva: number;
  idHabitacion: number;
  huesped: string;
  /** AAAA-MM-DD */
  checkin: string;
  /** AAAA-MM-DD (dia de salida: esa noche ya no se ocupa) */
  checkout: string;
  noches: number;
  estado: Reserva["estadoReserva"];
  canal: Reserva["canalReserva"];
}

export interface Calendario {
  desde: string;
  /** Exclusivo: la ultima noche mostrada es la anterior. */
  hasta: string;
  hoy: string;
  habitaciones: HabitacionCalendario[];
  reservas: ReservaCalendario[];
}

export const reservasApi = {
  listar: () => api.get<Reserva[]>("/api/v1/reservas").then((r) => r.data),

  obtener: (id: number) => api.get<Reserva>(`/api/v1/reservas/${id}`).then((r) => r.data),

  crear: (data: NuevaReservaRequest) =>
    api.post<Reserva>("/api/v1/reservas", data).then((r) => r.data),

  editar: (id: number, data: EditarReservaRequest) =>
    api.put<Reserva>(`/api/v1/reservas/${id}`, data).then((r) => r.data),

  /** Habitaciones activas y reservas (no canceladas) que tocan [desde, hasta). Maximo 62 dias. */
  calendario: (desde: string, hasta: string) =>
    api.get<Calendario>("/api/v1/reservas/calendario", { params: { desde, hasta } }).then((r) => r.data),

  cambiarEstado: (id: number, estadoReserva: string) =>
    api.patch(`/api/v1/reservas/${id}/estado`, { estadoReserva }).then((r) => r.data),

  listarPagos: (id: number) =>
    api.get(`/api/v1/reservas/${id}/pagos`).then((r) => r.data),

  registrarAdelanto: (id: number, data: { monto: number; metodoPago: string }) =>
    api.post(`/api/v1/reservas/${id}/adelanto`, data).then((r) => r.data),

  realizarCheckin: (id: number) =>
    api.post(`/api/v1/reservas/${id}/checkin`).then((r) => r.data),
};

/**
 * Habitaciones ocupadas en las noches [checkin, checkout) segun el calendario, sin contar la reserva `excepto`
 * (la que se esta editando). Misma regla que el servidor: llegar el dia en que otro sale esta permitido.
 */
export function ocupadasEnRango(cal: Calendario, checkin: string, checkout: string, excepto?: number): Map<number, ReservaCalendario> {
  const ocupadas = new Map<number, ReservaCalendario>();
  for (const r of cal.reservas) {
    if (r.idReserva === excepto || r.estado === "COMPLETADA") continue;
    if (r.checkin < checkout && r.checkout > checkin && !ocupadas.has(r.idHabitacion)) {
      ocupadas.set(r.idHabitacion, r);
    }
  }
  return ocupadas;
}
