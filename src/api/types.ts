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

export interface Producto {
  idProducto: number;
  nombre: string;
  descripcion?: string;
  categoria: "COCINA" | "BAR" | "DIRECTO";
  precioVenta: number;
  estado?: boolean;
}

export type AreaDestino = "COCINA" | "BAR" | "VENTA_DIRECTA";

export type EstadoComanda =
  | "PENDIENTE"
  | "EN_PREPARACION"
  | "PREPARADA"
  | "ENTREGADA"
  | "CANCELADA";

export interface ItemComanda {
  idDetalle: number;
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  notas?: string;
}

export interface Comanda {
  idComanda: number;
  idEstadia: number;
  numeroHabitacion?: string;
  areaDestino: AreaDestino;
  estadoComanda: EstadoComanda;
  observaciones?: string;
  fechaRegistro: string;
  total: number;
  items: ItemComanda[];
}

export interface NuevaComandaRequest {
  idEstadia: number;
  areaDestino: AreaDestino;
  observaciones?: string;
  items: { idProducto: number; cantidad: number; notas?: string }[];
}

export interface Proveedor {
  idProveedor: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  estado?: boolean;
}

export type AreaInsumo = "GENERAL" | "COCINA" | "BAR" | "LIMPIEZA";

export interface Insumo {
  idInsumo: number;
  nombre: string;
  unidadMedida: "GR" | "ML" | "UND";
  stockActual: number;
  stockMinimo: number;
  estado?: boolean;
  proveedorHabitual?: Proveedor | null;
  area?: AreaInsumo;
  costoUnitario?: number;
}

export type TipoMovInventario = "ENTRADA" | "SALIDA_CONSUMO" | "AJUSTE_MERMA" | "AJUSTE_INGRESO";

export interface MovimientoInventario {
  idMovimiento: number;
  insumo: Insumo;
  tipoMovimiento: TipoMovInventario;
  cantidad: number;
  stockResultante: number;
  cantidadFaltante?: number;
  costoUnitario?: number | null;
  proveedor?: Proveedor | null;
  referenciaOrigen?: string;
  empleado?: { nombres?: string; apellidos?: string } | null;
  fechaHora: string;
}

export interface RecetaDetalle {
  insumo: Insumo;
  cantidad: number;
}

export interface ResumenReceta {
  idProducto: number;
  nombre: string;
  categoria: "COCINA" | "BAR" | "DIRECTO";
  precioVenta: number;
  lineas: number;
  costoReceta: number;
  margen: number | null;
  sinReceta: boolean;
}

export interface FilaReporteInventario {
  idInsumo: number;
  nombre: string;
  unidad: string;
  area: AreaInsumo;
  entradas: number;
  consumido: number;
  merma: number;
  sobrante: number;
  faltante: number;
  costoConsumo: number;
  costoMerma: number;
}

export interface ReporteInventario {
  desde: string;
  hasta: string;
  valorizacionStock: number;
  insumosStockBajo: number;
  insumosAgotados: number;
  costoConsumoTotal: number;
  costoMermaTotal: number;
  filas: FilaReporteInventario[];
}

export type EstadoTareaLimpieza = "PENDIENTE" | "EN_PROCESO" | "COMPLETADA";
export type OrigenTareaLimpieza = "CHECK_OUT" | "SOLICITUD_HUESPED" | "PROGRAMADO";

export interface TareaLimpieza {
  idTarea: number;
  habitacion?: Habitacion;
  empleadoAsignado?: { idEmpleado: number; nombres: string; apellidos: string } | null;
  origen: OrigenTareaLimpieza;
  estado: EstadoTareaLimpieza;
  observaciones?: string;
  fechaCreacion: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export type EstadoIncidencia = "PENDIENTE" | "EN_REPARACION" | "RESUELTO";
export type TipoIncidencia =
  | "GRIFERIA_DUCHA"
  | "AIRE_ACONDICIONADO"
  | "ELECTRICO_FOCO"
  | "CERRADURA_VENTANA"
  | "OTRO";

export interface IncidenciaMantenimiento {
  idIncidencia: number;
  habitacion?: Habitacion;
  tipoIncidencia: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  observaciones?: string;
  fechaReporte: string;
  fechaResolucion?: string;
}

export type EstadoTurno = "ABIERTO" | "CERRADO" | "AUDITADO";

/** Estado publico de la caja del hotel: es unica y la ven igual recepcion, cajero y administrador. */
export interface EstadoCaja {
  abierta: boolean;
  idTurnoCaja?: number;
  abiertaPor?: string;
  fechaApertura?: string;
}

export interface TurnoCaja {
  idTurnoCaja: number;
  empleado?: { idEmpleado: number; nombres: string; apellidos: string };
  empleadoCierre?: { idEmpleado: number; nombres: string; apellidos: string } | null;
  fondoInicialEfectivo: number;
  efectivoSistemaEsperado?: number;
  efectivoRealDeclarado?: number;
  diferenciaCuadre?: number;
  estado: EstadoTurno;
  observacionesCierre?: string;
  fechaApertura: string;
  fechaCierre?: string;
}

export interface BitacoraTurno {
  idBitacora: number;
  prioridad: string;
  categoria: string;
  mensaje: string;
  resuelto: boolean;
  fechaHora: string;
}

/** Resumen de turno. `efectivoEsperado` solo llega con el turno ya cerrado (arqueo ciego). */
export interface ResumenTurno {
  turno: TurnoCaja;
  pagos: PagoReserva[];
  totalPorMetodo: Record<string, number>;
  totalCobrado: number;
  cantidadTransacciones: number;
  cierreCiego: boolean;
  efectivoEsperado?: number;
}

export interface ResultadoPasarela {
  aprobado: boolean;
  codigoOperacion: string;
  mensaje: string;
  pago?: PagoReserva;
}

export type EstadoSolicitud =
  | "PENDIENTE"
  | "ASIGNADA"
  | "EN_ATENCION"
  | "ATENDIDA"
  | "CANCELADA";

export interface SolicitudServicio {
  idSolicitud: number;
  estadia?: { idEstadia: number; habitacion?: { numero: string } };
  producto?: Producto | null;
  descripcion: string;
  cantidad: number;
  esCobrable: boolean;
  montoUnidad: number;
  estado: EstadoSolicitud;
  empleadoAsignado?: { nombres: string; apellidos: string } | null;
  fechaSolicitud: string;
  fechaAtencion?: string;
}

export interface ConsumoEstadia {
  idConsumo: number;
  cantidad: number;
  precioUnitario: number;
  totalConsumo: number;
  fechaRegistro: string;
  producto?: { nombre: string; categoria: string };
}

export interface AccesoPortal {
  existe: boolean;
  username?: string;
  activo?: boolean;
  /** Solo llega cuando el sistema acaba de generarla; mostrarla una vez. */
  passwordTemporal?: string;
}

export interface MiFolio {
  idEstadia: number;
  totalAlojamiento: number;
  totalConsumos: number;
  totalPagos: number;
  saldoPendiente: number;
  habitacion?: string;
  fechaCheckin?: string;
  fechaCheckoutPrevisto?: string;
}
