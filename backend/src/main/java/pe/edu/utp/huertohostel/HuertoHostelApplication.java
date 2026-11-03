package pe.edu.utp.huertohostel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;
import pe.edu.utp.huertohostel.service.LiberacionReservasService;

import java.util.TimeZone;

@SpringBootApplication
@EnableCaching
@EnableScheduling
public class HuertoHostelApplication {
    public static void main(String[] args) {
        // El servidor (Render) corre en UTC; sin esto los 25 LocalDate/LocalDateTime.now() del sistema
        // y la liberacion de reservas verian el dia siguiente a partir de las 19:00 de Lima.
        TimeZone.setDefault(TimeZone.getTimeZone(LiberacionReservasService.ZONA));
        SpringApplication.run(HuertoHostelApplication.class, args);
    }
}
