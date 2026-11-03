import api from "./axiosConfig";
import type {
  ConsumoEstadia,
  EstadoSolicitud,
  MiFolio,
  SolicitudServicio,
} from "./types";

/** Autoservicio del huesped: el backend resuelve su estadia activa. */
export const portalApi = {
  miFolio: () => api.get<MiFolio>("/api/v1/portal/folio").then((r) => r.data),

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
