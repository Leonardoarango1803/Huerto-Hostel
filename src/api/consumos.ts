import api from "./axiosConfig";

export type OrigenConsumo = "COMANDA" | "DIRECTO" | "SOLICITUD";

export interface Persona {
  nombres: string;
  apellidos: string;
}

export interface ProductoCatalogo {
  idProducto: number;
  nombre: string;
  descripcion?: string;
  categoria: "COCINA" | "BAR" | "DIRECTO" | string;
  precioVenta: number;
  estado: boolean;
}

export interface ConsumoEstadia {
  idConsumo: number;
  cantidad: number;
  precioUnitario: number;
  totalConsumo: number;
  fechaRegistro: string;
  origen: OrigenConsumo;
  comanda?: { idComanda: number } | null;
  empleadoRegistra?: Persona | null;
  producto?: { nombre: string; categoria: string };
}

export interface ConsumoAnulado {
  idAnulacion: number;
  idConsumoOriginal: number;
  cantidad: number;
  totalConsumo: number;
  origen: OrigenConsumo;
  motivo: string;
  fechaAnulacion: string;
  fechaRegistroOriginal?: string | null;
  empleadoRegistra?: Persona | null;
  empleadoAnula?: Persona | null;
  producto?: { nombre: string };
}

export interface ResultadoConsumos {
  consumos: ConsumoEstadia[];
  /** Avisos de stock: la venta se registro igual, pero quien vende debe saber que algun insumo no alcanzo. */
  advertencias: string[];
}

export interface EstadoDeCuenta {
  totalAlojamiento: number;
  totalConsumos: number;
  totalPagos: number;
  saldoPendiente: number;
}

export const consumosApi = {
  listar: (idEstadia: number) =>
    api.get<ConsumoEstadia[]>(`/api/v1/estadias/${idEstadia}/consumos`).then((r) => r.data),

  anulados: (idEstadia: number) =>
    api.get<ConsumoAnulado[]>(`/api/v1/estadias/${idEstadia}/consumos/anulados`).then((r) => r.data),

  estadoDeCuenta: (idEstadia: number) =>
    api.get<EstadoDeCuenta>(`/api/v1/estadias/${idEstadia}/saldo`).then((r) => r.data),

  /** Carga varios consumos de una vez. El precio lo pone el servidor desde el catalogo. */
  registrar: (idEstadia: number, items: { idProducto: number; cantidad: number }[]) =>
    api.post<ResultadoConsumos>(`/api/v1/estadias/${idEstadia}/consumos`, { items }).then((r) => r.data),

  anular: (idEstadia: number, idConsumo: number, motivo: string) =>
    api.post<ConsumoAnulado>(`/api/v1/estadias/${idEstadia}/consumos/${idConsumo}/anular`, { motivo }).then((r) => r.data),

  frecuentes: () => api.get<number[]>("/api/v1/estadias/consumos/frecuentes").then((r) => r.data),

  catalogo: () => api.get<ProductoCatalogo[]>("/api/v1/productos").then((r) => r.data),
};
