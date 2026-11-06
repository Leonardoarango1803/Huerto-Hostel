import api from "./axiosConfig";

export interface EmpleadoDeTurno {
  idEmpleado: number;
  nombres: string;
  apellidos: string;
  rol: string | null;
  area: string | null;
  turno?: string;
}

export interface TurnoLaboral {
  idTurno: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  descripcion: string | null;
  estado: boolean;
  /** true si la hora actual de Lima cae dentro del horario (incluido el que cruza la medianoche). */
  enCurso: boolean;
  cruzaMedianoche: boolean;
  empleados: EmpleadoDeTurno[];
  /** Cuantos empleados activos de cada rol operativo tiene este turno. */
  porRol: Record<string, number>;
}

export interface ResumenTurnos {
  ahora: string;
  turnos: TurnoLaboral[];
  enServicio: EmpleadoDeTurno[];
}

export interface MiTurno {
  asignado: boolean;
  turno?: TurnoLaboral;
  yo?: EmpleadoDeTurno;
  ahora?: string;
}

export interface DatosTurno {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  descripcion: string;
  estado: boolean;
}

export const turnosApi = {
  resumen: () => api.get<ResumenTurnos>("/api/v1/turnos/resumen").then((r) => r.data),
  miTurno: () => api.get<MiTurno>("/api/v1/turnos/mi-turno").then((r) => r.data),
  /** Quien esta de turno ahora, opcionalmente de un solo rol (por ejemplo HOUSEKEEPING). */
  enServicio: (rol?: string) =>
    api.get<EmpleadoDeTurno[]>("/api/v1/turnos/en-servicio", { params: rol ? { rol } : undefined }).then((r) => r.data),
  actualizar: (id: number, datos: DatosTurno) =>
    api.put<TurnoLaboral>(`/api/v1/turnos/${id}`, datos).then((r) => r.data),
};
