package pe.edu.utp.huertohostel.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** La regla de la base contra reservas cruzadas (V29) llega al usuario como un conflicto claro, no como un 500. */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void unaReservaCruzadaRechazadaPorLaBaseEsUn409ConMensajeClaro() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("insert reserva",
                new RuntimeException("envoltorio de Hibernate", new SQLException("conflicting key value violates exclusion constraint", "23P01")));

        var respuesta = handler.handleDataIntegrity(ex);

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertTrue(String.valueOf(respuesta.getBody().get("message")).contains("ya tiene una reserva en esas fechas"));
    }

    @Test
    void otrasViolacionesSiguenSiendoErrorInterno() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("fk",
                new SQLException("violates foreign key constraint", "23503"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, handler.handleDataIntegrity(ex).getStatusCode());
    }

    @Test
    void unaRutaQueNoExisteEsUn404YNoUn500() {
        var ex = new org.springframework.web.servlet.resource.NoResourceFoundException(org.springframework.http.HttpMethod.GET, "api/v1/portal/no-existe");

        var respuesta = handler.handleNoResource(ex);

        assertEquals(HttpStatus.NOT_FOUND, respuesta.getStatusCode());
        assertTrue(String.valueOf(respuesta.getBody().get("message")).contains("api/v1/portal/no-existe"));
    }
}
