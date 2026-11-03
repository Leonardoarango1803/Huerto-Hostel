import api from "./axiosConfig";
import type {
  Insumo,
  MovimientoInventario,
  Proveedor,
  RecetaDetalle,
  ReporteInventario,
  ResumenReceta,
  TipoMovInventario,
} from "./types";

export interface FiltroMovimientos {
  idInsumo?: number;
  tipo?: TipoMovInventario;
  desde?: string;
  hasta?: string;
  soloFaltantes?: boolean;
  limite?: number;
}

export const inventarioApi = {
  listarInsumos: () =>
    api.get<Insumo[]>("/api/v1/inventario/insumos").then((r) => r.data),

  listarStockBajo: () =>
    api.get<Insumo[]>("/api/v1/inventario/insumos/stock-bajo").then((r) => r.data),

  crearInsumo: (data: Partial<Insumo>) =>
    api.post<Insumo>("/api/v1/inventario/insumos", data).then((r) => r.data),

  actualizarInsumo: (id: number, data: Partial<Insumo>) =>
    api.put<Insumo>(`/api/v1/inventario/insumos/${id}`, data).then((r) => r.data),

  resumenRecetas: () =>
    api.get<ResumenReceta[]>("/api/v1/inventario/recetas").then((r) => r.data),

  listarReceta: (idProducto: number) =>
    api
      .get<RecetaDetalle[]>(`/api/v1/inventario/recetas/${idProducto}`)
      .then((r) => r.data),

  guardarReceta: (idProducto: number, lineas: { insumo: { idInsumo: number }; cantidad: number }[]) =>
    api
      .put<RecetaDetalle[]>(`/api/v1/inventario/recetas/${idProducto}`, lineas)
      .then((r) => r.data),

  listarMovimientos: (filtro: FiltroMovimientos = {}) =>
    api
      .get<MovimientoInventario[]>("/api/v1/inventario/movimientos", {
        params: Object.fromEntries(
          Object.entries(filtro).filter(([, v]) => v !== undefined && v !== "" && v !== false)
        ),
      })
      .then((r) => r.data),

  registrarMovimiento: (data: {
    idInsumo: number;
    tipoMovimiento: "ENTRADA" | "AJUSTE_MERMA";
    cantidad: number;
    referenciaOrigen?: string;
    costoUnitario?: number;
    idProveedor?: number;
  }) =>
    api
      .post<MovimientoInventario>("/api/v1/inventario/movimientos", data)
      .then((r) => r.data),

  registrarConteo: (data: { idInsumo: number; stockContado: number; motivo?: string }) =>
    api
      .post<{ ajustado: boolean; movimiento: MovimientoInventario | null }>(
        "/api/v1/inventario/conteos",
        data
      )
      .then((r) => r.data),

  reporteConsumo: (desde?: string, hasta?: string) =>
    api
      .get<ReporteInventario>("/api/v1/inventario/reportes/consumo", { params: { desde, hasta } })
      .then((r) => r.data),

  listarProveedores: () =>
    api.get<Proveedor[]>("/api/v1/inventario/proveedores").then((r) => r.data),

  crearProveedor: (data: Partial<Proveedor>) =>
    api.post<Proveedor>("/api/v1/inventario/proveedores", data).then((r) => r.data),

  actualizarProveedor: (id: number, data: Partial<Proveedor>) =>
    api.put<Proveedor>(`/api/v1/inventario/proveedores/${id}`, data).then((r) => r.data),
};
