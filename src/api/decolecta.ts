import api from "./axiosConfig";

export interface DniResult {
  first_name: string;
  first_last_name: string;
  second_last_name: string;
  full_name: string;
  document_number: string;
}

export async function consultarDni(dni: string): Promise<DniResult> {
  const res = await api.get<DniResult>(`/api/v1/clientes/consultar-dni?dni=${dni}`);
  return res.data;
}

export interface RucResult {
  razon_social: string;
  numero_ruc: string;
  estado: string;
  condicion: string;
  direccion?: string;
}

export async function consultarRuc(ruc: string): Promise<RucResult> {
  const res = await api.get<RucResult>(`/api/v1/clientes/consultar-ruc?ruc=${ruc}`);
  return res.data;
}
