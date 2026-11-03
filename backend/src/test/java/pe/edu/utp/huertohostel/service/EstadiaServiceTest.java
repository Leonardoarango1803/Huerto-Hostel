package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.repository.ConsumoEstadiaRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Check-out: con caja cerrada solo puede salir quien no tiene nada que cobrar. Hay un huesped que
 * se va a las 5 a.m. y ya pago todo: no se le puede dejar esperando a que abra la caja.
 */
@ExtendWith(MockitoExtension.class)
class EstadiaServiceTest {

    @Mock
    EstadiaRepository estadiaRepository;
    @Mock
    ConsumoEstadiaRepository consumoEstadiaRepository;
    @Mock
    PagoRepository pagoRepository;
    @Mock
    HabitacionRepository habitacionRepository;
    @Mock
    ReservaRepository reservaRepository;
    @Mock
    LimpiezaService limpiezaService;
    @Mock
    PagoService pagoService;
    @Mock
    CajaService cajaService;
    @Mock
    InventarioService inventarioService;
    @Mock
    UsuarioActualService usuarioActualService;

    private EstadiaService servicio() {
        return new EstadiaService(estadiaRepository, consumoEstadiaRepository, pagoRepository,
                habitacionRepository, reservaRepository, limpiezaService, pagoService, cajaService,
                inventarioService, usuarioActualService);
    }

    /** Estadia 1 de la reserva 10, alojamiento S/ 100 y sin consumos; {@code pagado} es lo ya cobrado. */
    private Estadia estadiaConSaldo(String pagado) {
        Habitacion habitacion = new Habitacion();
        habitacion.setIdHabitacion(2);
        habitacion.setEstadoOperativo(EstadoOperativoHab.OCUPADA);
        Reserva reserva = new Reserva();
        reserva.setIdReserva(10);
        reserva.setEstadoReserva(EstadoReserva.EN_CURSO);
        reserva.setMontoAlojamientoTotal(new BigDecimal("100"));
        Estadia estadia = new Estadia();
        estadia.setIdEstadia(1);
        estadia.setReserva(reserva);
        estadia.setHabitacion(habitacion);
        estadia.setEstadoEstadia(EstadoEstadia.EN_CURSO);

        when(estadiaRepository.findById(1)).thenReturn(Optional.of(estadia));
        // lenient: con un pago final el servicio exige la caja sin calcular el saldo, asi que no siempre se consultan
        lenient().when(consumoEstadiaRepository.sumTotalByEstadia(1)).thenReturn(BigDecimal.ZERO);
        lenient().when(pagoRepository.sumMontoByReservaOrEstadia(1, 10)).thenReturn(new BigDecimal(pagado));
        return estadia;
    }

    @Test
    void conSaldoCeroYSinPagoFinalSeSaleConLaCajaCerrada() {
        Estadia estadia = estadiaConSaldo("100");

        servicio().realizarCheckout(1, null);

        verify(cajaService, never()).exigirCajaAbiertaSiEsPersonal();
        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
        assertEquals(EstadoReserva.COMPLETADA, estadia.getReserva().getEstadoReserva());
        assertEquals(EstadoOperativoHab.PENDIENTE_LIMPIEZA, estadia.getHabitacion().getEstadoOperativo());
        verify(limpiezaService).crearPara(any(), any(), any());
    }

    @Test
    void conSaldoPendienteLaCajaCerradaImpideElCheckoutAntesDeTocarNada() {
        Estadia estadia = estadiaConSaldo("0"); // debe 100
        doThrow(new IllegalStateException("La caja esta cerrada.")).when(cajaService).exigirCajaAbiertaSiEsPersonal();

        assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, null));

        verify(pagoService, never()).registrar(any());
        verify(estadiaRepository, never()).save(any());
        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
        verify(limpiezaService, never()).crearPara(any(), any(), any());
    }

    @Test
    void unPagoFinalConLaCajaCerradaNoSeGuardaNiCierraLaEstadia() {
        Estadia estadia = estadiaConSaldo("0");
        doThrow(new IllegalStateException("La caja esta cerrada.")).when(cajaService).exigirCajaAbiertaSiEsPersonal();

        assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, pagoFinal("100")));

        verify(pagoService, never()).registrar(any());
        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
    }

    @Test
    void elPagoFinalPasaPorPagoServiceParaEntrarAlTurnoYAlArqueo() {
        Estadia estadia = estadiaConSaldo("100"); // tras registrar el pago final el saldo queda en cero
        Pago pagoFinal = pagoFinal("100");

        servicio().realizarCheckout(1, pagoFinal);

        verify(cajaService).exigirCajaAbiertaSiEsPersonal();
        verify(pagoService).registrar(pagoFinal);
        assertEquals(estadia, pagoFinal.getEstadia());
        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
    }

    @Test
    void unConsumoCargadoDirectoDescuentaElInventarioPorReceta() {
        estadiaConSaldo("0");
        Producto cerveza = new Producto();
        cerveza.setIdProducto(4);
        ConsumoEstadia consumo = new ConsumoEstadia();
        consumo.setProducto(cerveza);
        consumo.setCantidad((short) 2);
        consumo.setPrecioUnitario(new BigDecimal("12"));
        consumo.setIdConsumo(5);
        when(consumoEstadiaRepository.save(consumo)).thenReturn(consumo);

        servicio().registrarConsumo(1, consumo);

        verify(inventarioService).descontarPorReceta(eq(cerveza), eq((short) 2), eq("CONSUMO-5"), any());
    }

    private static Pago pagoFinal(String monto) {
        Pago p = new Pago();
        p.setMonto(new BigDecimal(monto));
        p.setMetodoPago(MetodoPago.EFECTIVO);
        return p;
    }
}
