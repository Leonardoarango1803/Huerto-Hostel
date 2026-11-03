package pe.edu.utp.huertohostel.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pe.edu.utp.huertohostel.service.LiberacionReservasService;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Reloj del hotel. Los servicios que deciden por "el dia de hoy" lo reciben inyectado en vez de
 * llamar a LocalDate.now(): asi usan la hora de Lima aunque el servidor corra en UTC, y los tests
 * pueden fijar la fecha.
 */
@Configuration
public class RelojConfig {

    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of(LiberacionReservasService.ZONA));
    }
}
