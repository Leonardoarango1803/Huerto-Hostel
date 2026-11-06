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
  /** Salio con saldo pendiente autorizado por el administrador (motivo y monto que quedo debiendo). */
  salidaForzada?: boolean;
  motivoSalidaForzada?: string | null;
  saldoAlSalir?: number | null;
}

export interface PagoReserva {
  idPago: number;
  monto: number;
  metodoPago: string;
  concepto: string;
  fechaPago: string;
  numTransaccionComprobante?: string | null;
  empleadoRegistra?: { nombres: string; apellidos: string } | null;
  /** Ligados a la reserva o a la estadia (segun quien cobro), con el huesped y la habitacion. */
  reserva?: { cliente?: { nombres: string; apellidos: string }; habitacion?: { numero: string } } | null;
  estadia?: { habitacion?: { numero: string }; reserva?: { cliente?: { nombres: string; apellidos: string } } } | null;
}

export interface SaldoResponse {
  idEstadia: number;
  totalAlojamiento: number;
  totalConsumos: number;
  totalPagos: number;
  /** Efectivo ya devuelto al huesped (saldo a favor entregado al salir). */
  totalDevuelto: number;
  saldoPendiente: number;
  /** Noches reservadas, noches que de verdad lleva y cuanto cambiaria el alojamiento si se ajustan. */
  noches: number;
  nochesReales: number;
  tarifaPorNoche: number;
  ajusteNoches: number;
  salidaPrevista: string | null;
  /** Negativo: se va antes de su salida prevista; positivo: ya paso su dia de salida. */
  diasDeDiferencia: number;
  comandasActivas: number;
  solicitudesPendientes: number;
  solicitudesCobrablesPendientes: number;
}

export interface ResumenCheckout {
  salidaHoy: number;
  pendienteCobro: number;
  liquidadoHoy: number;
  aCuartoLimpieza: number;
  /** Estadias en curso que ya pasaron su dia de salida. */
  vencidas: number;
  /** Salidas autorizadas con saldo pendiente y lo que quedo debiendo. */
  salidasConDeuda: number;
  deudaSalidasForzadas: number;
  /** Saldo de cada estadia en curso (idEstadia -> saldo). */
  saldos: Record<string, number>;
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

export type TipoMovInventario = "ENTRADA" | "SALIDA_CONSUMO" | "AJUSTE_MERMA" | "AJUSTE_INGRESO" | "DEVOLUCION_CONSUMO";

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
export type OrigenTareaLimpieza = "CHECK_OUT" | "SOLICITUD_HUESPED" | "PROGRAMADO" | "POST_MANTENIMIENTO";

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

export type EstadoIncidencia = "PENDIENTE" | "EN_REPARACION" | "RESUELTO" | "DUPLICADA" | "NO_PROCEDE";
export type TipoIncidencia =
  | "GRIFERIA_DUCHA"
  | "AIRE_ACONDICIONADO"
  | "ELECTRICO_FOCO"
  | "CERRADURA_VENTANA"
  | "OTRO"
  | "PLOMERIA"
  | "MOBILIARIO"
  | "CAMA_COLCHON"
  | "TV_ELECTRONICA"
  | "WIFI_INTERNET"
  | "PINTURA_PAREDES"
  | "PLAGAS";

/** A donde va la habitacion al resolver una incidencia. */
export type DestinoHabitacion = "DISPONIBLE" | "LIMPIEZA";

export interface ResultadoIncidencia {
  incidencia: IncidenciaMantenimiento;
  estadoHabitacion: string | null;
  idTareaLimpieza: number | null;
  /** Texto listo para mostrar: dice lo que de verdad paso con la habitacion. */
  mensaje: string;
}

export interface IncidenciaMantenimiento {
  idIncidencia: number;
  habitacion?: Habitacion;
  tipoIncidencia: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  observaciones?: string;
  empleadoReporta?: { nombres: string; apellidos: string } | null;
  empleadoResponsable?: { nombres: string; apellidos: string } | null;
  fechaReporte: string;
  fechaResolucion?: string;
  /** true si la averia impide usar la habitacion: mientras este abierta, no se vende. */
  bloqueaHabitacion?: boolean;
  fechaInicioReparacion?: string | null;
  vecesReabierta?: number;
}

/** Incidencias abiertas de una habitacion, para avisar en Habitaciones y Reservas. */
export interface IncidenciaDeHabitacion {
  idHabitacion: number;
  numero: string;
  cantidad: number;
  bloquea: boolean;
  detalle: string[];
}

export type EstadoTurno = "ABIERTO" | "CERRADO" | "AUDITADO";

/** Estado publico de la caja del hotel: es unica y la ven igual recepcion, cajero y administrador. */
export interface EstadoCaja {
  abierta: boolean;
  idTurnoCaja?: number;
  abiertaPor?: string;
  fechaApertura?: string;
  /** Horas que lleva abierto el turno y el limite a partir del cual se avisa que se olvido cerrar. */
  horasAbierta?: number;
  limiteHoras?: number;
  excedeLimite?: boolean;
}

/** Conteo de efectivo a mitad de turno. Lo esperado y la diferencia solo llegan al administrador (o con el turno cerrado). */
export interface ArqueoParcial {
  idArqueo: number;
  fechaHora: string;
  empleado: string;
  efectivoContado: number;
  resultado: "CUADRA" | "FALTA" | "SOBRA";
  efectivoEsperado?: number;
  diferencia?: number;
}

export interface ResultadoArqueo {
  cuadra: boolean;
  resultado: "CUADRA" | "FALTA" | "SOBRA";
  mensaje: string;
  efectivoEsperado?: number;
  diferencia?: number;
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
  /** Veces que el conteo no cuadro al verificar antes de cerrar. */
  reconteosCierre?: number;
  /** true si tras fallar el conteo se le mostro al cajero lo que esperaba el sistema. */
  esperadoRevelado?: boolean;
  motivoDiferencia?: string | null;
  /** Billetes y monedas contados al cerrar, como texto JSON {"100":2,"0.5":3}. */
  desgloseCierre?: string | null;
  /** Lo que dejo el turno anterior y como se recibio la caja respecto a eso. */
  efectivoAperturaEsperado?: number | null;
  diferenciaApertura?: number | null;
  motivoDiferenciaApertura?: string | null;
}

export interface BitacoraTurno {
  idBitacora: number;
  prioridad: string;
  categoria: string;
  mensaje: string;
  resuelto: boolean;
  fechaHora: string;
  /** Monto de la diferencia (negativo = faltante) en las notas de DESCUADRE y APERTURA. */
  monto?: number | null;
  empleadoResolvio?: { nombres: string; apellidos: string } | null;
  fechaResolucion?: string | null;
  comentarioResolucion?: string | null;
  /** El turno en que se escribio la nota (el backend lo envia con la nota). */
  turnoCaja?: {
    idTurnoCaja: number;
    estado?: string;
    fechaApertura?: string;
    empleado?: { nombres: string; apellidos: string };
  };
}

/** Retiro a custodia o gasto menor en efectivo: sale de la caja y baja el efectivo que espera el sistema. */
export interface MovimientoCaja {
  idMovimientoCaja: number;
  tipo: "RETIRO" | "GASTO" | "DEVOLUCION";
  monto: number;
  motivo: string;
  empleado?: { nombres: string; apellidos: string } | null;
  fechaHora: string;
}

/** Resumen de turno. `efectivoEsperado` solo llega con el turno cerrado o tras fallar el conteo (arqueo ciego). */
export interface ResumenTurno {
  turno: TurnoCaja;
  pagos: PagoReserva[];
  totalPorMetodo: Record<string, number>;
  totalCobrado: number;
  cantidadTransacciones: number;
  cierreCiego: boolean;
  efectivoEsperado?: number;
  movimientos?: MovimientoCaja[];
  totalMovimientos?: number;
  notas?: BitacoraTurno[];
  /** Alerta sin monto: hay tanto efectivo que conviene retirar a custodia. */
  superaTope?: boolean;
  topeEfectivo?: number;
  arqueos?: ArqueoParcial[];
  maximoArqueos?: number;
  miTurno?: AvisoTurno | null;
}

/** Resultado de comprobar el conteo antes de cerrar (no cierra el turno). */
export interface VerificacionCierre {
  cuadra: boolean;
  mensaje: string;
  recomendacion?: string;
  direccion?: "FALTA" | "SOBRA";
  intento?: number;
  reconteos?: number;
  /** true desde la segunda vez que no cuadra: ya se muestra lo que espera el sistema. */
  revelado?: boolean;
  efectivoEsperado?: number;
  diferencia?: number;
}

/** Lo que ve quien va a abrir la caja: con cuanto efectivo quedo y que diferencias siguen pendientes. */
/** Turno laboral de quien opera, para avisar si esta fuera de su horario. null para el administrador. */
export interface AvisoTurno {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  enCurso: boolean;
}

export interface InfoApertura {
  ultimoCierre?: {
    idTurnoCaja: number;
    efectivoDeclarado: number;
    diferencia: number | null;
    cerroPor: string;
    fechaCierre: string;
  };
  diferenciasPendientes: BitacoraTurno[];
  miTurno?: AvisoTurno | null;
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
