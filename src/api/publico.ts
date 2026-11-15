import api from "./axiosConfig";

/** Tipo de habitacion tal como lo ve un visitante de la web (sin numeros de habitacion). */
export interface TipoPublico {
  idTipoHabitacion: number;
  nombre: string;
  descripcion: string | null;
  capacidad: number | null;
  precioNoche: number;
  habitaciones?: number;
}

export interface TipoDisponible extends TipoPublico {
  disponibles: number;
  cabe: boolean;
  total: number;
  adelanto: number;
  saldo: number;
}

export interface Disponibilidad {
  llegada: string;
  salida: string;
  noches: number;
  huespedes: number;
  adelantoPorcentaje: number;
  tipos: TipoDisponible[];
}

export interface ReservaWebPedido {
  idTipoHabitacion: number;
  llegada: string;
  salida: string;
  huespedes: number;
  tipoDocumento?: string;
  numeroDocumento?: string;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
  password?: string;
  /** Token del captcha (Cloudflare Turnstile): se pide al reservar sin sesion. */
  captcha?: string;
  horaLlegada?: string;
  metodoPago: "TARJETA" | "YAPE";
  codigoOperacion?: string;
  simularRechazo?: boolean;
}

export interface ReservaWebHecha {
  /** Reserva sin sesion: la cuenta recien creada ya entra con esta sesion. */
  sesion?: { token: string; username: string; role: string; userId: number; debeCambiarPassword?: boolean };
  idReserva: number;
  codigo: string;
  estado: string;
  tipo: string;
  habitacion: string;
  llegada: string;
  salida: string;
  noches: number;
  total: number;
  adelanto: number;
  saldo: number;
  codigoOperacion: string;
  correo: string | null;
  usuario?: string;
}

export interface MiReserva {
  idReserva: number;
  codigo: string;
  estado: "PENDIENTE_ADELANTO" | "CONFIRMADA" | "EN_CURSO" | "COMPLETADA" | "CANCELADA";
  canal: "ONLINE" | "PRESENCIAL" | null;
  llegada: string;
  salida: string;
  noches: number | null;
  habitacion: string | null;
  tipo: string | null;
  total: number;
  pagado: number;
  saldo: number;
  /** Para "Ver detalles": el tipo de habitacion, sus datos y los pagos de la reserva. */
  idTipoHabitacion?: number | null;
  descripcion?: string | null;
  capacidad?: number | null;
  precioNoche?: number | null;
  observaciones?: string | null;
  pagos?: { fecha: string | null; monto: number; metodo: string | null; concepto: string | null }[];
}

/** Web publica (sin sesion). */
export const publicoApi = {
  tipos: () => api.get<TipoPublico[]>("/api/v1/publico/tipos-habitacion").then((r) => r.data),
  disponibilidad: (llegada: string, salida: string, huespedes: number) =>
    api
      .get<Disponibilidad>("/api/v1/publico/disponibilidad", { params: { llegada, salida, huespedes } })
      .then((r) => r.data),
  /** Huesped nuevo: crea su cuenta, la reserva y paga el adelanto en un solo paso (todo o nada). */
  reservar: (pedido: ReservaWebPedido) =>
    api.post<ReservaWebHecha>("/api/v1/publico/reservas", pedido).then((r) => r.data),
};

/** Huesped con sesion (rol CLIENTE). */
export const misReservasApi = {
  listar: () => api.get<MiReserva[]>("/api/v1/portal/reservas").then((r) => r.data),
  reservar: (pedido: ReservaWebPedido) =>
    api.post<ReservaWebHecha>("/api/v1/portal/reservas", pedido).then((r) => r.data),
};

/** true si el error es el rechazo de la pasarela (402): la web muestra la pantalla de pago rechazado. */
export function esPagoRechazado(e: unknown): boolean {
  const r = (e as { response?: { status?: number; data?: { codigo?: string } } })?.response;
  return r?.status === 402 || r?.data?.codigo === "PAGO_RECHAZADO";
}
