package pe.edu.utp.huertohostel.entity;

public enum TipoMovInventario {
    ENTRADA, SALIDA_CONSUMO, AJUSTE_MERMA,
    /** Sobrante encontrado en un conteo fisico (el faltante se registra como AJUSTE_MERMA). */
    AJUSTE_INGRESO,
    /** Insumos que vuelven al almacen porque se anulo un consumo que ya los habia descontado. */
    DEVOLUCION_CONSUMO
}
