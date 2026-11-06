package pe.edu.utp.huertohostel.entity;

import java.util.List;

public enum EstadoIncidencia {
    PENDIENTE, EN_REPARACION, RESUELTO,
    /** Cerrada sin reparar: ya existia otra incidencia igual. */
    DUPLICADA,
    /** Cerrada sin reparar: no era una averia o no hay nada que hacer. */
    NO_PROCEDE;

    /** Las que todavia hay que atender. */
    public static final List<EstadoIncidencia> ABIERTAS = List.of(PENDIENTE, EN_REPARACION);

    public boolean abierta() {
        return ABIERTAS.contains(this);
    }
}
