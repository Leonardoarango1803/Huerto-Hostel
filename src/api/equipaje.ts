import api from "./axiosConfig";

export type TipoEquipaje = "SUBIDA" | "BAJADA" | "CUSTODIA";
export type EstadoEquipaje = "PENDIENTE" | "ASIGNADA" | "EN_ATENCION" | "ATENDIDA" | "CANCELADA";

export interface SolicitudEquipaje {
  idSolicitud: number;
  /** EQ-00012: el que se le da al huesped para recoger su equipaje en custodia. */
  codigo: string;
  tipo: TipoEquipaje;
  descripcion: string | null;
  /** En custodia: EN_ATENCION = guardado, ATENDIDA = entregado. */
  estado: EstadoEquipaje;
  fechaSolicitud: string;
  fechaAtencion: string | null;
  idEstadia: number;
  estadoEstadia: "EN_CURSO" | "FINALIZADA";
  habitacion: string | null;
  huesped: string | null;
  responsable: string | null;
}

export interface EstadiaParaEquipaje {
  idEstadia: number;
  habitacion: string | null;
  huesped: string | null;
  estado: "EN_CURSO" | "FINALIZADA";
  fechaCheckoutReal: string | null;
}

export const equipajeApi = {
  /** Abiertas (por atender y en custodia) o, con historial, las ultimas 60. */
  listar: (historial = false) =>
    api.get<SolicitudEquipaje[]>("/api/v1/equipaje", { params: { historial } }).then((r) => r.data),

  estadias: () => api.get<EstadiaParaEquipaje[]>("/api/v1/equipaje/estadias").then((r) => r.data),

  registrar: (data: { idEstadia: number; tipo: TipoEquipaje; bultos?: number; descripcion?: string }) =>
    api.post<SolicitudEquipaje>("/api/v1/equipaje", data).then((r) => r.data),

  cambiarEstado: (id: number, estado: EstadoEquipaje) =>
    api.patch<SolicitudEquipaje>(`/api/v1/equipaje/${id}/estado`, { estado }).then((r) => r.data),

  // Portal del huesped
  mio: () => api.get<SolicitudEquipaje[]>("/api/v1/portal/equipaje").then((r) => r.data),

  pedir: (tipo: "SUBIDA" | "BAJADA", descripcion?: string) =>
    api.post<SolicitudEquipaje>("/api/v1/portal/equipaje", { tipo, descripcion }).then((r) => r.data),
};

/** Texto del estado segun el tipo: en custodia "guardado/entregado" se entiende mejor que "en atencion/atendida". */
export function estadoEquipajeTexto(s: Pick<SolicitudEquipaje, "tipo" | "estado">): string {
  if (s.tipo === "CUSTODIA") {
    return s.estado === "EN_ATENCION" ? "En custodia" : s.estado === "ATENDIDA" ? "Entregado" : s.estado === "CANCELADA" ? "Anulado" : s.estado;
  }
  return { PENDIENTE: "Pendiente", ASIGNADA: "Asignada", EN_ATENCION: "En camino", ATENDIDA: "Hecho", CANCELADA: "Cancelada" }[s.estado];
}

export const TIPO_EQUIPAJE: Record<TipoEquipaje, string> = {
  SUBIDA: "Subir equipaje",
  BAJADA: "Bajar equipaje",
  CUSTODIA: "Custodia",
};
