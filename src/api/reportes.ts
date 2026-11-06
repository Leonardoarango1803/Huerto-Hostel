import api from "./axiosConfig";

// ---------- Formas de respuesta (espejo de ReportesService y DashboardService) ----------

export interface Comparado {
  actual: number;
  anterior: number;
  variacionPct: number | null;
}

export interface Dato {
  clave: string;
  monto: number;
  cantidad: number;
}

export interface PuntoSimple {
  fecha: string;
  valor: number;
}

export interface ReporteIngresos {
  generadoEn: string;
  desde: string;
  hasta: string;
  dias: number;
  cobrado: Comparado;
  cantidadCobros: number;
  facturado: number;
  porCobrarAhora: number;
  serie: { fecha: string; cobrado: number; alojamiento: number; consumos: number }[];
  porMetodo: Dato[];
  porConcepto: Dato[];
  porCanal: Dato[];
  porArea: Dato[];
}

export interface ReporteOcupacion {
  generadoEn: string;
  desde: string;
  hasta: string;
  dias: number;
  habitaciones: number;
  ocupacionPct: Comparado;
  adr: Comparado;
  revpar: Comparado;
  nochesOcupadas: number;
  nochesDisponibles: number;
  ingresoAlojamiento: number;
  estadiaPromedioNoches: number;
  llegadas: number;
  salidas: number;
  serie: { fecha: string; ocupadas: number; ocupacionPct: number; ingreso: number }[];
  porTipo: { tipo: string; habitaciones: number; noches: number; ocupacionPct: number; ingreso: number }[];
  estadoActual: Dato[];
}

export interface ReporteReservas {
  generadoEn: string;
  desde: string;
  hasta: string;
  registradas: Comparado;
  canceladas: number;
  tasaCancelacionPct: number;
  liberadasAutomaticamente: number;
  pendientesAdelanto: number;
  antelacionPromedioDias: number;
  porEstado: Dato[];
  porCanal: Dato[];
  serie: PuntoSimple[];
  huespedes: { nuevos: number; repetidos: number; conEstadia: number };
  porNacionalidad: Dato[];
}

export interface ProductoVendido {
  idProducto: number;
  nombre: string;
  categoria: string;
  unidades: number;
  venta: number;
  costoUnitario: number;
  margen: number | null;
  margenPct: number | null;
  conReceta: boolean;
}

export interface ReporteConsumos {
  generadoEn: string;
  desde: string;
  hasta: string;
  venta: Comparado;
  unidades: number;
  mermaPorCancelaciones: number;
  porCategoria: Dato[];
  serie: PuntoSimple[];
  topProductos: ProductoVendido[];
  comandas: {
    total: number;
    entregadas: number;
    canceladas: number;
    activas: number;
    minutosPreparacion: number;
    minutosEntrega: number;
    porArea: Dato[];
  };
}

export interface ReporteCaja {
  generadoEn: string;
  desde: string;
  hasta: string;
  turnos: number;
  turnosCerrados: number;
  diferenciaNeta: number;
  sobrantes: number;
  faltantes: number;
  cobradoTotal: number;
  porMetodo: Dato[];
  porEmpleado: Dato[];
  detalle: {
    id: number;
    apertura: string;
    cierre: string | null;
    abrio: string;
    cerro: string | null;
    fondo: number;
    esperado: number | null;
    declarado: number | null;
    diferencia: number | null;
    estado: string;
    observaciones: string | null;
    reconteos: number;
    revelado: boolean;
    motivo: string | null;
    cobrado: number;
  }[];
  bitacorasPendientes: number;
  bitacoras: { id: number; turno: number; prioridad: string; categoria: string | null; mensaje: string; fecha: string }[];
  /** Diferencias de dinero (faltante o sobrante) que nadie ha resuelto todavia. */
  diferenciasPendientes: number;
  faltantePendiente: number;
  sobrantePendiente: number;
  retiros: number;
  gastos: number;
  /** Quien cierra la caja responde por su cuadre: cierres, cierres con diferencia y de cuanto. */
  descuadresPorCajero: {
    cajero: string;
    cierres: number;
    con_diferencia: number;
    faltante: number;
    sobrante: number;
    neto: number;
    reconteos: number;
  }[];
}

export interface ReporteOperacion {
  generadoEn: string;
  desde: string;
  hasta: string;
  limpieza: {
    tareas: number;
    completadas: number;
    pendientes: number;
    enProceso: number;
    minutosPromedio: number;
    porOrigen: Dato[];
    porEmpleado: Dato[];
  };
  incidencias: {
    reportadas: number;
    abiertas: number;
    resueltas: number;
    horasResolucionPromedio: number;
    horasRespuestaPromedio: number;
    reabiertas: number;
    descartadas: number;
    porTipo: Dato[];
    porEstado: Dato[];
    habitacionesRecurrentes: Dato[];
  };
  solicitudes: {
    total: number;
    pendientes: number;
    atendidas: number;
    canceladas: number;
    minutosAtencionPromedio: number;
    cobrables: number;
    montoCobrable: number;
    porEstado: Dato[];
  };
}

export interface ReporteResumen {
  generadoEn: string;
  desde: string;
  hasta: string;
  cobrado: Comparado;
  ocupacionPct: Comparado;
  adr: Comparado;
  revpar: Comparado;
  reservas: Comparado;
  tasaCancelacionPct: number;
  ventaConsumos: Comparado;
  diferenciaCaja: number;
  porCobrarAhora: number;
  llegadas: number;
  salidas: number;
  serie: { fecha: string; cobrado: number; ocupacionPct: number }[];
  porArea: Dato[];
  porMetodo: Dato[];
  topProductos: ProductoVendido[];
  inventario: { insumosStockBajo: number; insumosAgotados: number; faltantesUltimos7Dias: number };
}

export interface Periodo {
  desde: string;
  hasta: string;
}

// ---------- Memoria del navegador ----------

/**
 * Cambiar de pestana o volver a un rango ya visto no tiene por que ir al servidor: se guarda lo ultimo recibido
 * por un rato corto. "Actualizar" la salta y pide al servidor recalcular (limpia tambien su memoria).
 */
const VIDA_MS = 60_000;
const memoria = new Map<string, { vence: number; datos: unknown }>();
const versionesRefrescadas = new Set<number>();

export function limpiarMemoriaDeReportes() {
  memoria.clear();
}

/** El primer pedido de cada "Actualizar" va con refrescar=true; los demas ya encuentran el servidor al dia. */
function debeRefrescar(version: number): boolean {
  if (version <= 0 || versionesRefrescadas.has(version)) return false;
  versionesRefrescadas.add(version);
  return true;
}

export interface MapaReportes {
  resumen: ReporteResumen;
  ingresos: ReporteIngresos;
  ocupacion: ReporteOcupacion;
  reservas: ReporteReservas;
  consumos: ReporteConsumos;
  caja: ReporteCaja;
  operacion: ReporteOperacion;
}

export type RutaReporte = keyof MapaReportes;

function claveDe(ruta: string, p: Periodo, version: number): string {
  return `${ruta}:${p.desde}:${p.hasta}:${version}`;
}

/**
 * Lo ultimo recibido para esa consulta, aunque ya este vencido. Sirve para pintar la pantalla al instante con lo que
 * se vio hace poco mientras llega lo nuevo (la pantalla lo muestra atenuado hasta que se actualiza).
 */
export function enMemoria<K extends RutaReporte>(ruta: K, p: Periodo, version: number): MapaReportes[K] | null {
  return (memoria.get(claveDe(ruta, p, version))?.datos as MapaReportes[K] | undefined) ?? null;
}

export async function pedirReporte<K extends RutaReporte>(ruta: K, p: Periodo, version = 0): Promise<MapaReportes[K]> {
  const refrescar = debeRefrescar(version);
  const clave = claveDe(ruta, p, version);
  const guardado = memoria.get(clave);
  if (guardado && guardado.vence > Date.now() && !refrescar) {
    return guardado.datos as MapaReportes[K];
  }
  const r = await api.get<MapaReportes[K]>(`/api/v1/reportes/${ruta}`, {
    params: { desde: p.desde, hasta: p.hasta, refrescar: refrescar || undefined },
  });
  memoria.set(clave, { vence: Date.now() + VIDA_MS, datos: r.data });
  return r.data;
}

// ---------- Panel del dashboard ----------

export interface Kpi {
  id: string;
  titulo: string;
  valor: number | null;
  formato: "numero" | "soles" | "porcentaje" | "minutos" | "texto";
  texto: string | null;
  detalle: string | null;
  tono: "verde" | "ambar" | "rojo" | "azul" | "gris";
  ruta: string | null;
  variacionPct: number | null;
}

export interface Aviso {
  tipo: "alerta" | "aviso" | "ok";
  titulo: string;
  detalle: string | null;
  ruta: string | null;
}

export interface Grafico {
  id: string;
  titulo: string;
  tipo: "barras" | "lineas" | "torta";
  formato: "soles" | "numero" | "porcentaje";
  puntos: { nombre: string; valor: number }[];
}

export interface Lista {
  id: string;
  titulo: string;
  vacio: string;
  ruta: string | null;
  columnas: string[];
  filas: string[][];
}

export interface Panel {
  generadoEn: string;
  rol: string;
  titulo: string;
  subtitulo: string;
  kpis: Kpi[];
  avisos: Aviso[];
  habitaciones: Dato[];
  graficos: Grafico[];
  listas: Lista[];
}

/** Ultimo panel recibido por rol: al volver al inicio se pinta al instante y se actualiza por detras. */
const ultimoPanel = new Map<string, Panel>();

export const panelApi = {
  enMemoria: (rol: string | undefined): Panel | null => (rol ? ultimoPanel.get(rol) ?? null : null),
  obtener: (refrescar = false) =>
    api.get<Panel>("/api/v1/dashboard/panel", { params: { refrescar: refrescar || undefined } }).then((r) => {
      ultimoPanel.set(r.data.rol, r.data);
      return r.data;
    }),
};
