import api from "./axiosConfig";
import type { Estadia, SaldoResponse, ResumenCheckout } from "./types";

export const estadiasApi = {
  listar: (estado?: string) => {
    const url = estado ? `/api/v1/estadias?estado=${estado}` : "/api/v1/estadias";
    return api.get<Estadia[]>(url).then((r) => r.data);
  },

  obtener: (id: number) => api.get<Estadia>(`/api/v1/estadias/${id}`).then((r) => r.data),

  saldo: (id: number) => api.get<SaldoResponse>(`/api/v1/estadias/${id}/saldo`).then((r) => r.data),

  consumos: (id: number) => api.get(`/api/v1/estadias/${id}/consumos`).then((r) => r.data),

  checkout: (id: number, pago?: object) =>
    api.post(`/api/v1/estadias/${id}/checkout`, pago ?? {}).then((r) => r.data),

  resumenCheckout: () =>
    api.get<ResumenCheckout>("/api/v1/estadias/resumen-checkout").then((r) => r.data),
};
