import { useEffect, useState } from "react";
import { enMemoria, pedirReporte, type MapaReportes, type Periodo, type RutaReporte } from "../../api/reportes";

// ---------- Formatos y etiquetas ----------

export const PALETA = ["#1b4332", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#64748b"];

export function soles(v: number | null | undefined): string {
  return `S/ ${Number(v ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function entero(v: number | null | undefined): string {
  return Number(v ?? 0).toLocaleString("es-PE", { maximumFractionDigits: 0 });
}

export function decimal(v: number | null | undefined, digitos = 1): string {
  return Number(v ?? 0).toLocaleString("es-PE", { minimumFractionDigits: digitos, maximumFractionDigits: digitos });
}

export function porcentaje(v: number | null | undefined): string {
  return `${decimal(v)} %`;
}

export function minutos(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  if (n === 0) return "—";
  if (n < 1) return `${Math.max(1, Math.round(n * 60))} s`;
  return n >= 60 ? `${decimal(n / 60)} h` : `${decimal(n)} min`;
}

export const ETIQUETA: Record<string, string> = {
  // metodos y conceptos de pago
  EFECTIVO: "Efectivo", TARJETA_POS: "Tarjeta POS", PASARELA_ONLINE: "Pasarela online", TRANSFERENCIA: "Transferencia",
  ADELANTO_RESERVA: "Adelanto de reserva", PAGO_PARCIAL_ESTADIA: "Pago parcial", LIQUIDACION_CHECKOUT: "Liquidacion en check-out",
  // canales y areas
  ONLINE: "Online", PRESENCIAL: "Presencial", SIN_RESERVA: "Sin reserva",
  ALOJAMIENTO: "Alojamiento", COCINA: "Cocina", BAR: "Bar", DIRECTO: "Venta directa", VENTA_DIRECTA: "Venta directa", OTROS: "Otros",
  // reservas
  PENDIENTE_ADELANTO: "Pendiente de adelanto", CONFIRMADA: "Confirmada", EN_CURSO: "En curso", COMPLETADA: "Completada", CANCELADA: "Cancelada",
  // habitaciones
  DISPONIBLE: "Disponible", OCUPADA: "Ocupada", RESERVADO: "Reservada", PENDIENTE_LIMPIEZA: "Por limpiar",
  EN_LIMPIEZA: "En limpieza", MANTENIMIENTO: "Mantenimiento",
  // comandas, limpieza, incidencias y solicitudes
  PENDIENTE: "Pendiente", EN_PREPARACION: "En preparacion", PREPARADA: "Lista", ENTREGADA: "Entregada",
  EN_PROCESO: "En proceso", CHECK_OUT: "Salida del huesped", SOLICITUD_HUESPED: "Pedido del huesped", PROGRAMADO: "Programada",
  EN_REPARACION: "En reparacion", RESUELTO: "Resuelta", ASIGNADA: "Asignada", EN_ATENCION: "En atencion", ATENDIDA: "Atendida",
  GRIFERIA_DUCHA: "Griferia o ducha", AIRE_ACONDICIONADO: "Aire acondicionado", ELECTRICO_FOCO: "Electrico o focos",
  CERRADURA_VENTANA: "Cerradura o ventana", OTRO: "Otro",
  CERRADO: "Cerrado", ABIERTO: "Abierto", AUDITADO: "Auditado",
};

export function etiqueta(clave: string): string {
  return ETIQUETA[clave] ?? clave.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export const COLOR_ESTADO_HAB: Record<string, string> = {
  DISPONIBLE: "#10b981", OCUPADA: "#1e293b", RESERVADO: "#3b82f6", PENDIENTE_LIMPIEZA: "#f59e0b",
  EN_LIMPIEZA: "#06b6d4", MANTENIMIENTO: "#ef4444",
};

// ---------- Carga de un reporte ----------

/**
 * Pide un reporte cada vez que cambia el rango o se pulsa "Actualizar". Mientras llega lo nuevo se sigue
 * mostrando lo anterior, atenuado, en vez de parpadear en blanco.
 */
export function useReporte<K extends RutaReporte>(ruta: K, periodo: Periodo, version: number) {
  type T = MapaReportes[K];
  const clave = `${ruta}|${periodo.desde}|${periodo.hasta}|${version}`;
  const [estado, setEstado] = useState<{ clave: string; datos: T | null; error: string | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    pedirReporte(ruta, periodo, version)
      .then((datos) => vigente && setEstado({ clave, datos, error: null }))
      .catch((e) => {
        if (!vigente) return;
        const mensaje = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setEstado({ clave, datos: null, error: mensaje ?? "No se pudo cargar el reporte." });
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // Si ya se vio esta misma consulta (aunque haya vencido) se pinta al instante y se actualiza por detras.
  const guardado = enMemoria(ruta, periodo, version);
  const actual = estado !== null && estado.clave === clave;
  return {
    datos: actual ? estado.datos : guardado ?? estado?.datos ?? null,
    error: actual ? estado.error : null,
    cargando: !actual,
  };
}
