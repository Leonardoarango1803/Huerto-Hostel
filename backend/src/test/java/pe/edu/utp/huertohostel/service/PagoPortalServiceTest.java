package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;
import pe.edu.utp.huertohostel.dto.PagoPortalRequest;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.exception.PagoRechazadoException;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PagoPortalServiceTest {

    @Mock UsuarioActualService usuarioActual;
    @Mock EstadiaRepository estadiaRepository;
    @Mock ReservaRepository reservaRepository;
    @Mock PagoRepository pagoRepository;
    @Mock EstadiaService estadiaService;
    @Mock PagoService pagoService;

    private PagoPortalService servicio;
    private final Cliente yo = cliente(1);

    private static Cliente cliente(int id) {
        Cliente c = new Cliente();
        c.setIdCliente(id);
        return c;
    }

    private static Reserva reserva(int id, Cliente c, EstadoReserva estado, String total) {
        Reserva r = new Reserva();
        r.setIdReserva(id);
        r.setCliente(c);
        r.setEstadoReserva(estado);
        r.setMontoAlojamientoTotal(new BigDecimal(total));
        return r;
    }

    private static Pago pago(String monto) {
        Pago p = new Pago();
        p.setMonto(new BigDecimal(monto));
        return p;
    }

    private static PagoPortalRequest req(Integer idReserva, String monto, String metodo) {
        PagoPortalRequest r = new PagoPortalRequest();
        r.setIdReserva(idReserva);
        r.setMonto(monto == null ? null : new BigDecimal(monto));
        r.setMetodo(metodo);
        return r;
    }

    @BeforeEach
    void preparar() {
        servicio = new PagoPortalService(usuarioActual, estadiaRepository, reservaRepository, pagoRepository,
                estadiaService, pagoService);
        when(usuarioActual.obtenerCliente()).thenReturn(yo);
        when(pagoService.registrar(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void sinMontoPagaTodoElSaldoDeLaEstadiaEnCurso() {
        Reserva r = reserva(10, yo, EstadoReserva.EN_CURSO, "300");
        Estadia e = new Estadia();
        e.setIdEstadia(5);
        e.setReserva(r);
        e.setEstadoEstadia(EstadoEstadia.EN_CURSO);
        when(estadiaRepository.findByClienteAndEstado(1, EstadoEstadia.EN_CURSO)).thenReturn(List.of(e));
        when(reservaRepository.findByIdParaActualizar(10)).thenReturn(Optional.of(r));
        when(estadiaService.calcularSaldo(5)).thenReturn(new BigDecimal("145.50"));

        Map<String, Object> res = servicio.pagar(req(null, null, "TARJETA"));

        ArgumentCaptor<Pago> captor = ArgumentCaptor.forClass(Pago.class);
        verify(pagoService).registrar(captor.capture());
        Pago p = captor.getValue();
        assertEquals(new BigDecimal("145.50"), p.getMonto());
        assertEquals(MetodoPago.PASARELA_ONLINE, p.getMetodoPago());
        assertEquals(ConceptoPago.PAGO_PARCIAL_ESTADIA, p.getConcepto());
        assertEquals(e, p.getEstadia());
        assertEquals(new BigDecimal("0.00"), res.get("pendienteRestante"));
    }

    @Test
    void yapeGuardaElMetodoPropioYElCodigoDeOperacion() {
        Reserva r = reserva(10, yo, EstadoReserva.PENDIENTE_ADELANTO, "200");
        when(reservaRepository.findByIdParaActualizar(10)).thenReturn(Optional.of(r));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of());

        PagoPortalRequest q = req(10, "60", "YAPE");
        q.setCodigoOperacion("123456");
        Map<String, Object> res = servicio.pagar(q);

        ArgumentCaptor<Pago> captor = ArgumentCaptor.forClass(Pago.class);
        verify(pagoService).registrar(captor.capture());
        assertEquals(MetodoPago.YAPE_PLIN, captor.getValue().getMetodoPago());
        assertEquals("YAPE-123456", captor.getValue().getNumTransaccionComprobante());
        assertEquals(ConceptoPago.ADELANTO_RESERVA, captor.getValue().getConcepto());
        assertEquals(EstadoReserva.CONFIRMADA, r.getEstadoReserva(), "pagar una pendiente la confirma");
        assertEquals(true, res.get("reservaConfirmada"));
    }

    @Test
    void noSeCobraMasDeLoPendiente() {
        Reserva r = reserva(10, yo, EstadoReserva.CONFIRMADA, "200");
        when(reservaRepository.findByIdParaActualizar(10)).thenReturn(Optional.of(r));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of(pago("150")));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> servicio.pagar(req(10, "60", "TARJETA")));
        assertTrue(ex.getMessage().contains("50.00"), ex.getMessage());
        verify(pagoService, never()).registrar(any());
    }

    @Test
    void noSePagaLaReservaDeOtroHuesped() {
        Reserva ajena = reserva(11, cliente(2), EstadoReserva.CONFIRMADA, "200");
        when(reservaRepository.findByIdParaActualizar(11)).thenReturn(Optional.of(ajena));
        assertThrows(AccessDeniedException.class, () -> servicio.pagar(req(11, null, "TARJETA")));
        verify(pagoService, never()).registrar(any());
    }

    @Test
    void sinSaldoPendienteNoHayNadaQuePagar() {
        Reserva r = reserva(10, yo, EstadoReserva.CONFIRMADA, "200");
        when(reservaRepository.findByIdParaActualizar(10)).thenReturn(Optional.of(r));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of(pago("200")));
        assertThrows(IllegalStateException.class, () -> servicio.pagar(req(10, null, "TARJETA")));
    }

    @Test
    void elRechazoDeLaPasarelaNoRegistraNada() {
        Reserva r = reserva(10, yo, EstadoReserva.PENDIENTE_ADELANTO, "200");
        when(reservaRepository.findByIdParaActualizar(10)).thenReturn(Optional.of(r));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of());

        PagoPortalRequest q = req(10, null, "TARJETA");
        q.setSimularRechazo(true);
        assertThrows(PagoRechazadoException.class, () -> servicio.pagar(q));
        verify(pagoService, never()).registrar(any());
        assertEquals(EstadoReserva.PENDIENTE_ADELANTO, r.getEstadoReserva());
    }

    @Test
    void yapeSinCodigoYMetodoDesconocidoSeRechazan() {
        assertThrows(IllegalArgumentException.class, () -> servicio.pagar(req(10, null, "YAPE")));
        assertThrows(IllegalArgumentException.class, () -> servicio.pagar(req(10, null, "BITCOIN")));
        verify(pagoService, never()).registrar(any());
    }

    @Test
    void sinEstadiaEnCursoNoHaySaldoQuePagar() {
        when(estadiaRepository.findByClienteAndEstado(1, EstadoEstadia.EN_CURSO)).thenReturn(List.of());
        assertThrows(IllegalStateException.class, () -> servicio.pagar(req(null, null, "TARJETA")));
    }
}
