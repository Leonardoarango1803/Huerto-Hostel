package pe.edu.utp.huertohostel.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/** Rango de fechas de un reporte, ambas inclusive. */
public record Periodo(LocalDate desde, LocalDate hasta) {

    /** Un reporte de mas de un anio no aporta y obliga a la base a recorrer de mas. */
    static final int MAXIMO_DIAS = 366;
    static final int DIAS_POR_DEFECTO = 30;

    public Periodo {
        if (desde == null || hasta == null) {
            throw new IllegalArgumentException("El periodo necesita fecha inicial y final.");
        }
        if (desde.isAfter(hasta)) {
            throw new IllegalArgumentException("La fecha inicial es posterior a la final.");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) + 1 > MAXIMO_DIAS) {
            throw new IllegalArgumentException("El periodo no puede pasar de " + MAXIMO_DIAS + " dias.");
        }
    }

    /** Sin fechas: los ultimos 30 dias contando hoy. */
    public static Periodo de(LocalDate desde, LocalDate hasta, LocalDate hoy) {
        LocalDate fin = hasta != null ? hasta : hoy;
        LocalDate inicio = desde != null ? desde : fin.minusDays(DIAS_POR_DEFECTO - 1L);
        return new Periodo(inicio, fin);
    }

    public int dias() {
        return (int) ChronoUnit.DAYS.between(desde, hasta) + 1;
    }

    /** El mismo numero de dias, inmediatamente antes: contra eso se compara. */
    public Periodo anterior() {
        return new Periodo(desde.minusDays(dias()), desde.minusDays(1));
    }

    /** Limite inferior inclusivo para columnas de fecha y hora. */
    public LocalDateTime inicio() {
        return desde.atStartOfDay();
    }

    /** Limite superior exclusivo: el primer instante del dia siguiente. */
    public LocalDateTime fin() {
        return hasta.plusDays(1).atStartOfDay();
    }

    String clave() {
        return desde + "_" + hasta;
    }
}
