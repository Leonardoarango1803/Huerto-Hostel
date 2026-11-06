package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Matematica y reglas de los reportes que no necesitan base de datos: periodos, variaciones, memoria. */
class ReportesCalculosTest {

    // ---------- Periodo ----------

    @Test
    void sinFechasSonLosUltimosTreintaDiasContandoHoy() {
        Periodo p = Periodo.de(null, null, LocalDate.of(2026, 11, 5));

        assertEquals(LocalDate.of(2026, 10, 7), p.desde());
        assertEquals(LocalDate.of(2026, 11, 5), p.hasta());
        assertEquals(30, p.dias());
    }

    @Test
    void elPeriodoAnteriorTieneLosMismosDiasYTerminaUnDiaAntes() {
        Periodo p = new Periodo(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 10));

        Periodo anterior = p.anterior();

        assertEquals(LocalDate.of(2026, 10, 22), anterior.desde());
        assertEquals(LocalDate.of(2026, 10, 31), anterior.hasta());
        assertEquals(p.dias(), anterior.dias());
    }

    @Test
    void elFinDelPeriodoEsElInicioDelDiaSiguienteParaNoPerderLasVentasDeLaNoche() {
        Periodo p = new Periodo(LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 5));

        assertEquals(LocalDateTime.of(2026, 11, 5, 0, 0), p.inicio());
        assertEquals(LocalDateTime.of(2026, 11, 6, 0, 0), p.fin());
        assertEquals(1, p.dias());
    }

    @Test
    void unPeriodoInvertidoOMuyLargoSeRechaza() {
        assertThrows(IllegalArgumentException.class,
                () -> new Periodo(LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 1)));
        assertThrows(IllegalArgumentException.class,
                () -> new Periodo(LocalDate.of(2025, 1, 1), LocalDate.of(2026, 11, 1)));
    }

    // ---------- Variaciones y porcentajes ----------

    @Test
    void laVariacionEsRelativaAlPeriodoAnterior() {
        assertEquals(new BigDecimal("25.0"), ReportesService.variacion(new BigDecimal("125"), new BigDecimal("100")));
        assertEquals(new BigDecimal("-50.0"), ReportesService.variacion(new BigDecimal("50"), new BigDecimal("100")));
    }

    @Test
    void sinBaseDeComparacionNoSeInventaUnaVariacion() {
        assertNull(ReportesService.variacion(new BigDecimal("80"), BigDecimal.ZERO));
        assertNull(ReportesService.variacion(new BigDecimal("80"), null));
    }

    @Test
    void elPorcentajeSinBaseEsCeroYNoUnaDivisionPorCero() {
        assertEquals(new BigDecimal("0.0"), ReportesService.porcentaje(5, 0));
        assertEquals(new BigDecimal("33.3"), ReportesService.porcentaje(1, 3));
        assertEquals(new BigDecimal("100.0"), ReportesService.porcentaje(18, 18));
    }

    // ---------- Memoria ----------

    @Test
    void unaSegundaPeticionIgualUsaLaMemoriaYNoRecalcula() {
        CacheEnMemoria cache = new CacheEnMemoria(Duration.ofSeconds(20), Duration.ofSeconds(90));
        AtomicInteger calculos = new AtomicInteger();

        int primero = cache.reportes("ingresos:a", false, calculos::incrementAndGet);
        int segundo = cache.reportes("ingresos:a", false, calculos::incrementAndGet);

        assertEquals(1, primero);
        assertEquals(1, segundo);
        assertEquals(1, calculos.get());
    }

    @Test
    void clavesDistintasNoSeMezclan() {
        CacheEnMemoria cache = new CacheEnMemoria(Duration.ofSeconds(20), Duration.ofSeconds(90));
        AtomicInteger calculos = new AtomicInteger();

        cache.reportes("ingresos:enero", false, calculos::incrementAndGet);
        cache.reportes("ingresos:febrero", false, calculos::incrementAndGet);

        assertEquals(2, calculos.get());
    }

    @Test
    void refrescarObligaAcalcularDeNuevo() {
        CacheEnMemoria cache = new CacheEnMemoria(Duration.ofSeconds(20), Duration.ofSeconds(90));
        AtomicInteger calculos = new AtomicInteger();

        cache.panel("panel:ADMIN", false, calculos::incrementAndGet);
        int tras = cache.panel("panel:ADMIN", true, calculos::incrementAndGet);

        assertEquals(2, tras);
    }

    @Test
    void limpiarVaciaTodasLasMemorias() {
        CacheEnMemoria cache = new CacheEnMemoria(Duration.ofSeconds(20), Duration.ofSeconds(90));
        AtomicInteger calculos = new AtomicInteger();
        cache.panel("p", false, calculos::incrementAndGet);
        cache.reportes("r", false, calculos::incrementAndGet);
        cache.base("b", calculos::incrementAndGet);

        cache.limpiar();
        cache.panel("p", false, calculos::incrementAndGet);
        cache.reportes("r", false, calculos::incrementAndGet);
        cache.base("b", calculos::incrementAndGet);

        assertEquals(6, calculos.get());
    }

    @Test
    void unCalculoBaseSePuedePedirDesdeDentroDeLaCargaDeUnReporte() {
        // Caffeine prohibe consultar la MISMA cache dentro de una carga; la base vive aparte justamente por eso.
        CacheEnMemoria cache = new CacheEnMemoria(Duration.ofSeconds(20), Duration.ofSeconds(90));

        int total = cache.reportes("ingresos", false, () -> cache.base("ocupacion", () -> 7) + 1);

        assertEquals(8, total);
    }

    @Test
    void lasEsperasSeEscribenEnMinutosHorasODias() {
        LocalDateTime ahora = LocalDateTime.of(2026, 11, 5, 12, 0);

        assertEquals("5 min", DashboardService.espera(ahora.minusMinutes(5), ahora));
        assertEquals("2 h 30 min", DashboardService.espera(ahora.minusMinutes(150), ahora));
        assertEquals("3 d", DashboardService.espera(ahora.minusDays(3), ahora));
        assertEquals("0 min", DashboardService.espera(ahora.plusMinutes(2), ahora), "una hora futura no da espera negativa");
    }
}
