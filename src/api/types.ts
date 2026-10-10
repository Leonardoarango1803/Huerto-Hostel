export interface Cliente {
  idCliente: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correo?: string;
  telefono?: string;
  nacionalidad?: string;
  fechaNacimiento?: string;
  estado?: boolean;
  fechaRegistro?: string;
}

export interface TipoHabitacion {
  idTipoHabitacion: number;
  nombre: string;
  descripcion?: string;
  capacidadPersonas?: number;
  precioNoche: number;
  estado?: boolean;
}

export interface Habitacion {
  idHabitacion: number;
  numero: string;
  piso?: number;
  estadoOperativo: string;
  tipoHabitacion: TipoHabitacion;
}

export interface Reserva {
  idReserva: number;
  cliente: Cliente;
  habitacion: Habitacion;
  fechaCheckinPrevisto: string;
  fechaCheckoutPrevisto: string;
  numNoches: number;
  montoAlojamientoTotal: number;
  canalReserva: "ONLINE" | "PRESENCIAL";
  estadoReserva: "PENDIENTE_ADELANTO" | "CONFIRMADA" | "EN_CURSO" | "CANCELADA" | "COMPLETADA";
  observaciones?: string;
  fechaRegistro: string;
}

export interface Estadia {
  idEstadia: number;
  reserva: Reserva;
  habitacion: Habitacion;
  fechaCheckinReal: string;
  fechaCheckoutReal?: string;
  estadoEstadia: "EN_CURSO" | "FINALIZADA";
}

export interface PagoReserva {
  idPago: number;
  monto: number;
  metodoPago: string;
  concepto: string;
  fechaPago: string;
}

export interface SaldoResponse {
  idEstadia: number;
  totalAlojamiento: number;
  totalConsumos: number;
  totalPagos: number;
  saldoPendiente: number;
}

export interface ResumenCheckout {
  salidaHoy: number;
  pendienteCobro: number;
  liquidadoHoy: number;
  aCuartoLimpieza: number;
}

export interface EstadisticasClientes {
  totalClientes: number;
  enCasaHoy: number;
  frecuentes: number;
}

export interface NuevaReservaRequest {
  idCliente: number;
  idHabitacion: number;
  fechaCheckinPrevisto: string;
  fechaCheckoutPrevisto: string;
  canalReserva: "ONLINE" | "PRESENCIAL";
  observaciones?: string;
}

export interface NuevoClienteRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  correo?: string;
  telefono?: string;
  nacionalidad?: string;
  fechaNacimiento?: string;
}
