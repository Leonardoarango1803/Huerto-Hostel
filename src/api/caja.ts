import api from "./axiosConfig";
import type {
  BitacoraTurno,
  EstadoCaja,
  ResultadoPasarela,
  ResumenTurno,
  TurnoCaja,
} from "./types";

export const cajaApi = {
  /** Estado de la caja del hotel (unica): lo que abre recepcion lo ve el cajero. */
  estado: () => api.get<EstadoCaja>("/api/v1/caja/estado").then((r) => r.data),

  /** null cuando la caja esta cerrada (el backend responde 204). */
  turnoActual: () =>
    api
      .get<ResumenTurno | "">("/api/v1/caja/turno-actual")
      .then((r) => (r.status === 204 || !r.data ? null : (r.data as ResumenTurno))),

  abrir: (fondoInicialEfectivo: number) =>
    api
      .post<TurnoCaja>("/api/v1/caja/abrir", {
        fondoInicialEfectivo: String(fondoInicialEfectivo),
      })
      .then((r) => r.data),

  resumen: (idTurno: number) =>
    api.get<ResumenTurno>(`/api/v1/caja/turnos/${idTurno}`).then((r) => r.data),

  historial: () => api.get<TurnoCaja[]>("/api/v1/caja/turnos").then((r) => r.data),

  cerrar: (idTurno: number, efectivoRealDeclarado: number, observacionesCierre?: string) =>
    api
      .post<TurnoCaja>(`/api/v1/caja/turnos/${idTurno}/cerrar`, {
        efectivoRealDeclarado: String(efectivoRealDeclarado),
        observacionesCierre,
      })
      .then((r) => r.data),

  auditar: (idTurno: number) =>
    api.post<TurnoCaja>(`/api/v1/caja/turnos/${idTurno}/auditar`, {}).then((r) => r.data),

  listarBitacora: (idTurno: number) =>
    api.get<BitacoraTurno[]>(`/api/v1/caja/turnos/${idTurno}/bitacora`).then((r) => r.data),

  registrarNota: (
    idTurno: number,
    data: { categoria: string; mensaje: string; prioridad: string }
  ) =>
    api
      .post<BitacoraTurno>(`/api/v1/caja/turnos/${idTurno}/bitacora`, data)
      .then((r) => r.data),

  marcarResuelto: (idBitacora: number, resuelto: boolean) =>
    api
      .patch<BitacoraTurno>(`/api/v1/caja/bitacora/${idBitacora}`, { resuelto })
      .then((r) => r.data),

  pendientesRelevo: () =>
    api.get<BitacoraTurno[]>("/api/v1/caja/bitacora/pendientes").then((r) => r.data),
};

export const pasarelaApi = {
  /** Pasarela simulada (sandbox): no envia datos reales de tarjeta. */
  simular: (data: {
    idEstadia?: number;
    idReserva?: number;
    monto: number;
    concepto?: string;
    simularRechazo?: boolean;
  }) =>
    api
      .post<ResultadoPasarela>("/api/v1/pagos/pasarela/simular", data)
      .then((r) => r.data),
};
