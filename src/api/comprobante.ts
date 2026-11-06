import api from "./axiosConfig";

export interface ComprobanteEstadia {
  /** PRE_CUENTA mientras la estadia esta en curso; COMPROBANTE cuando ya salio. */
  tipo: "PRE_CUENTA" | "COMPROBANTE";
  numero: string;
  emitidoEn: string;
  atendidoPor: string | null;
  hotel: {
    nombre: string;
    ruc: string | null;
    direccion: string | null;
    telefono: string | null;
    correo: string | null;
    mensajePie: string | null;
  };
  huesped: { nombre: string; tipoDocumento: string | null; numeroDocumento: string | null };
  habitacion: { numero: string | null; tipo: string | null };
  checkin: string | null;
  checkout: string | null;
  salidaPrevista: string | null;
  alojamiento: { noches: number; tarifaPorNoche: number; total: number };
  consumos: { fecha: string | null; descripcion: string; cantidad: number; precioUnitario: number; total: number }[];
  totalConsumos: number;
  pagos: { fecha: string | null; concepto: string | null; metodo: string | null; monto: number; referencia: string | null }[];
  totalPagado: number;
  /** Efectivo devuelto al huesped al salir (un saldo a su favor). */
  devoluciones: { fecha: string | null; monto: number; motivo: string | null }[];
  totalDevuelto: number;
  /** Salio con saldo pendiente autorizado por el administrador. */
  salidaConDeuda: boolean;
  total: number;
  saldoPendiente: number;
  saldoAFavor: number;
  aviso: string;
}

export const comprobanteApi = {
  de: (idEstadia: number) => api.get<ComprobanteEstadia>(`/api/v1/estadias/${idEstadia}/comprobante`).then((r) => r.data),
};
