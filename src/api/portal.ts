import api from "./axiosConfig";
import type {
  ConsumoEstadia,
  EstadoSolicitud,
  MiFolio,
  SolicitudServicio,
} from "./types";

/** Con quien hablamos en el portal (para saludarlo por su nombre). */
export interface PerfilHuesped {
  nombres: string;
  apellidos: string;
  correo?: string | null;
  usuario: string;
  google: boolean;
  /** false si creo la cuenta con Google y aun no reservo: su primera reserva pide el documento del titular. */
  tieneDocumento: boolean;
}

/** Producto que el huesped puede pedir desde su portal. */
export interface ProductoParaPedir {
  idProducto: number;
  nombre: string;
  categoria: "COCINA" | "BAR" | "DIRECTO";
  precioVenta: number;
}

export interface PagoPortalRequest {
  /** Sin reserva: saldo de la estadia en curso. */
  idReserva?: number;
  monto?: number;
  metodo: "TARJETA" | "YAPE";
  codigoOperacion?: string;
  simularRechazo?: boolean;
}

export interface ResultadoPagoPortal {
  aprobado: boolean;
  idPago: number;
  codigoOperacion: string;
  monto: number;
  metodo: string;
  pendienteRestante: number;
  reservaConfirmada: boolean;
}

/** Autoservicio del huesped: el backend resuelve su estadia activa. */
export const portalApi = {
  perfil: () => api.get<PerfilHuesped>("/api/v1/portal/perfil").then((r) => r.data),

  /** null si el huesped no esta alojado ahora (el backend responde 204): el portal muestra solo sus reservas. */
  miFolio: () =>
    api.get<MiFolio | "">("/api/v1/portal/folio").then((r) => (r.status === 204 || !r.data ? null : r.data)),

  /** Lo que puede pedir a su habitacion (el catalogo /productos es solo del personal). */
  productos: () => api.get<ProductoParaPedir[]>("/api/v1/portal/productos").then((r) => r.data),

  /** Pasarela de demostracion. 402 si "el banco" rechaza: no queda nada registrado. */
  pagar: (data: PagoPortalRequest) =>
    api.post<ResultadoPagoPortal>("/api/v1/portal/pagos", data).then((r) => r.data),

  misConsumos: () =>
    api.get<ConsumoEstadia[]>("/api/v1/portal/consumos").then((r) => r.data),

  misSolicitudes: () =>
    api.get<SolicitudServicio[]>("/api/v1/portal/solicitudes").then((r) => r.data),

  solicitar: (data: { descripcion: string; idProducto?: number; cantidad?: number }) =>
    api.post<SolicitudServicio>("/api/v1/portal/solicitudes", data).then((r) => r.data),
};

/** Bandeja del personal. */
export const solicitudesApi = {
  listar: (estado?: EstadoSolicitud) =>
    api
      .get<SolicitudServicio[]>(
        `/api/v1/solicitudes${estado ? `?estado=${estado}` : ""}`
      )
      .then((r) => r.data),

  cambiarEstado: (id: number, estado: EstadoSolicitud) =>
    api
      .patch<SolicitudServicio>(`/api/v1/solicitudes/${id}/estado`, { estado })
      .then((r) => r.data),

  cargarAlFolio: (id: number) =>
    api.post(`/api/v1/solicitudes/${id}/cargar-folio`, {}).then((r) => r.data),
};
