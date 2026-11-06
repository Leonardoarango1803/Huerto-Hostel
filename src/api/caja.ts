import api from "./axiosConfig";
import type {
  BitacoraTurno,
  EstadoCaja,
  InfoApertura,
  MovimientoCaja,
  ResultadoArqueo,
  ResultadoPasarela,
  ResumenTurno,
  TurnoCaja,
  VerificacionCierre,
} from "./types";

export const cajaApi = {
  /** Estado de la caja del hotel (unica): lo que abre recepcion lo ve el cajero. */
  estado: () => api.get<EstadoCaja>("/api/v1/caja/estado").then((r) => r.data),

  /** null cuando la caja esta cerrada (el backend responde 204). */
  turnoActual: () =>
    api
      .get<ResumenTurno | "">("/api/v1/caja/turno-actual")
      .then((r) => (r.status === 204 || !r.data ? null : (r.data as ResumenTurno))),

  /** Con cuanto efectivo quedo la caja y que diferencias siguen sin resolverse (para recibirla). */
  infoApertura: () => api.get<InfoApertura>("/api/v1/caja/apertura-info").then((r) => r.data),

  abrir: (fondoInicialEfectivo: number, motivoDiferenciaApertura?: string) =>
    api
      .post<TurnoCaja>("/api/v1/caja/abrir", {
        fondoInicialEfectivo: String(fondoInicialEfectivo),
        motivoDiferenciaApertura,
      })
      .then((r) => r.data),

  resumen: (idTurno: number) =>
    api.get<ResumenTurno>(`/api/v1/caja/turnos/${idTurno}`).then((r) => r.data),

  historial: () => api.get<TurnoCaja[]>("/api/v1/caja/turnos").then((r) => r.data),

  /** Comprueba el conteo sin cerrar: cuadra, o recomienda recontar (y al segundo intento muestra lo esperado). */
  verificarCierre: (idTurno: number, efectivoRealDeclarado: number) =>
    api
      .post<VerificacionCierre>(`/api/v1/caja/turnos/${idTurno}/verificar-cierre`, {
        efectivoRealDeclarado: String(efectivoRealDeclarado),
      })
      .then((r) => r.data),

  cerrar: (
    idTurno: number,
    datos: { efectivoRealDeclarado: number; observacionesCierre?: string; motivoDiferencia?: string; desgloseCierre?: string }
  ) =>
    api
      .post<TurnoCaja>(`/api/v1/caja/turnos/${idTurno}/cerrar`, {
        efectivoRealDeclarado: String(datos.efectivoRealDeclarado),
        observacionesCierre: datos.observacionesCierre,
        motivoDiferencia: datos.motivoDiferencia,
        desgloseCierre: datos.desgloseCierre,
      })
      .then((r) => r.data),

  registrarMovimiento: (data: { tipo: "RETIRO" | "GASTO"; monto: number; motivo: string }) =>
    api
      .post<MovimientoCaja>("/api/v1/caja/movimientos", { tipo: data.tipo, monto: String(data.monto), motivo: data.motivo })
      .then((r) => r.data),

  /** Cuenta el efectivo a mitad de turno sin cerrar: quien cuenta solo ve si cuadra, falta o sobra. */
  arqueoParcial: (efectivoContado: number) =>
    api.post<ResultadoArqueo>("/api/v1/caja/arqueos", { efectivoContado: String(efectivoContado) }).then((r) => r.data),

  /** Solo el administrador, y solo si el turno lleva mas horas abierto que el limite. */
  cierreForzado: (idTurno: number, datos: { efectivoRealDeclarado: number; motivo: string }) =>
    api
      .post<TurnoCaja>(`/api/v1/caja/turnos/${idTurno}/cierre-forzado`, {
        efectivoRealDeclarado: String(datos.efectivoRealDeclarado),
        motivo: datos.motivo,
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

  marcarResuelto: (idBitacora: number, resuelto: boolean, comentario?: string) =>
    api
      .patch<BitacoraTurno>(`/api/v1/caja/bitacora/${idBitacora}`, { resuelto, comentario })
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
