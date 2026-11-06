import api from "./axiosConfig";

export interface AccesoEmpleado {
  tieneCuenta: boolean;
  username: string | null;
  activa: boolean;
  /** true mientras la persona no cambie la clave temporal que se le entrego. */
  debeCambiarPassword: boolean;
  ultimoAcceso: string | null;
}

export interface EmpleadoAdmin {
  idEmpleado: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correo: string | null;
  telefono: string | null;
  estado: boolean;
  fechaIngreso: string | null;
  rol: { idRol: number; nombre: string } | null;
  area: { idArea: number; nombre: string } | null;
  turno: { idTurno: number; nombre: string } | null;
  acceso: AccesoEmpleado;
}

/** Datos de alta o edicion. `crearAcceso` y `username` solo cuentan al crear. */
export interface EmpleadoDatos {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correo: string;
  telefono: string;
  fechaIngreso: string | null;
  idRol: number | null;
  idArea: number | null;
  idTurno: number | null;
  crearAcceso?: boolean;
  username?: string;
}

export interface ResultadoCuenta {
  username: string;
  /** Solo llega cuando la genero el sistema, y una sola vez. */
  passwordTemporal: string | null;
  empleado: EmpleadoAdmin;
}

export interface EntradaAuditoria {
  idAuditoria: number;
  fechaHora: string;
  accion: string;
  actorUsername: string | null;
  idEmpleadoObjetivo: number | null;
  objetivo: string | null;
  detalle: string | null;
}

export interface Catalogo {
  id: number;
  nombre: string;
}

export const usuariosApi = {
  listar: () => api.get<EmpleadoAdmin[]>("/api/v1/empleados").then((r) => r.data),

  crear: (datos: EmpleadoDatos) =>
    api
      .post<{ empleado: EmpleadoAdmin; passwordTemporal?: string }>("/api/v1/empleados", datos)
      .then((r) => r.data),

  actualizar: (id: number, datos: EmpleadoDatos) =>
    api.put<EmpleadoAdmin>(`/api/v1/empleados/${id}`, datos).then((r) => r.data),

  cambiarEstado: (id: number, estado: boolean) =>
    api.patch<EmpleadoAdmin>(`/api/v1/empleados/${id}/estado`, { estado }).then((r) => r.data),

  asignarTurno: (id: number, idTurno: number) =>
    api.patch<EmpleadoAdmin>(`/api/v1/empleados/${id}/turno`, { idTurno }).then((r) => r.data),

  crearAcceso: (id: number, datos: { username?: string; password?: string }) =>
    api.post<ResultadoCuenta>(`/api/v1/empleados/${id}/acceso`, datos).then((r) => r.data),

  restablecer: (id: number, datos: { passwordAdmin: string; passwordNueva?: string }) =>
    api.post<ResultadoCuenta>(`/api/v1/empleados/${id}/acceso/restablecer`, datos).then((r) => r.data),

  auditoria: () => api.get<EntradaAuditoria[]>("/api/v1/empleados/auditoria").then((r) => r.data),

  roles: () =>
    api.get<{ idRol: number; nombre: string }[]>("/api/v1/roles").then((r) => r.data.map((x) => ({ id: x.idRol, nombre: x.nombre }))),

  areas: () =>
    api.get<{ idArea: number; nombre: string }[]>("/api/v1/areas").then((r) => r.data.map((x) => ({ id: x.idArea, nombre: x.nombre }))),
};
