package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.entity.TipoHabitacion;
import pe.edu.utp.huertohostel.repository.ConsumoEstadiaRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/** El comprobante de la estadia: pre-cuenta mientras esta en curso, comprobante al cerrarla, con los totales correctos. */
@ExtendWith(MockitoExtension.class)
class ComprobanteServiceTest {

    @Mock EstadiaRepository estadiaRepository;
    @Mock ConsumoEstadiaRepository consumoRepository;
    @Mock PagoRepository pagoRepository;
    @Mock pe.edu.utp.huertohostel.repository.MovimientoCajaRepository movimientoCajaRepository;
    @Mock UsuarioActualService usuarioActualService;

    private ComprobanteService servicio(String ruc) {
        return new ComprobanteService(estadiaRepository, consumoRepository, pagoRepository, movimientoCajaRepository, usuarioActualService,
                "El Huerto Hostel", ruc, "", "", "", "Gracias por su visita");
    }

    private Estadia estadia(EstadoEstadia estado) {
        Cliente cliente = new Cliente();
        cliente.setNombres("Mia Valentina");
        cliente.setApellidos("Gutierrez Rojas");
        cliente.setTipoDocumento("DNI");
        cliente.setNumeroDocumento("78985456");
        TipoHabitacion tipo = new TipoHabitacion();
        tipo.setNombre("Habitacion Individual");
        Habitacion hab = new Habitacion();
        hab.setNumero("203");
        hab.setTipoHabitacion(tipo);
        Reserva reserva = new Reserva();
        reserva.setIdReserva(10);
        reserva.setCliente(cliente);
        reserva.setNumNoches((short) 3);
        reserva.setMontoAlojamientoTotal(new BigDecimal("165.00"));
        reserva.setFechaCheckoutPrevisto(LocalDate.of(2026, 11, 7));
        Estadia e = new Estadia();
        e.setIdEstadia(44);
        e.setReserva(reserva);
        e.setHabitacion(hab);
        e.setEstadoEstadia(estado);
        e.setFechaCheckinReal(LocalDateTime.of(2026, 11, 6, 14, 0));
        e.setFechaCheckoutReal(estado == EstadoEstadia.FINALIZADA ? LocalDateTime.of(2026, 11, 7, 11, 30) : null);
        when(estadiaRepository.findById(44)).thenReturn(Optional.of(e));
        return e;
    }

    private ConsumoEstadia consumo(String nombre, int cantidad, String precio) {
        Producto p = new Producto();
        p.setNombre(nombre);
        ConsumoEstadia c = new ConsumoEstadia();
        c.setProducto(p);
        c.setCantidad((short) cantidad);
        c.setPrecioUnitario(new BigDecimal(precio));
        c.setTotalConsumo(new BigDecimal(precio).multiply(BigDecimal.valueOf(cantidad)));
        c.setFechaRegistro(LocalDateTime.of(2026, 11, 6, 20, cantidad));
        return c;
    }

    private Pago pago(String monto, ConceptoPago concepto, Empleado quien) {
        Pago p = new Pago();
        p.setMonto(new BigDecimal(monto));
        p.setConcepto(concepto);
        p.setMetodoPago(MetodoPago.EFECTIVO);
        p.setFechaPago(LocalDateTime.of(2026, 11, 6, 13, 0));
        p.setEmpleadoRegistra(quien);
        return p;
    }

    private Empleado empleado(String nombres) {
        Empleado e = new Empleado();
        e.setNombres(nombres);
        e.setApellidos("Perez");
        return e;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> mapa(Object o) {
        return (Map<String, Object>) o;
    }

    @Test
    void conLaEstadiaEnCursoEsUnaPreCuentaConElSaldoPorCobrar() {
        estadia(EstadoEstadia.EN_CURSO);
        when(consumoRepository.findByEstadiaIdEstadia(44)).thenReturn(List.of(consumo("Toalla extra", 2, "5.00")));
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of(pago("20.00", ConceptoPago.ADELANTO_RESERVA, empleado("Maria"))));

        Map<String, Object> r = servicio("").de(44);

        assertEquals("PRE_CUENTA", r.get("tipo"));
        assertEquals("CE-000044", r.get("numero"));
        assertNull(r.get("checkout"), "todavia no salio");
        assertEquals(new BigDecimal("175.00"), r.get("total"));
        assertEquals(new BigDecimal("155.00"), r.get("saldoPendiente"));
        assertEquals(BigDecimal.ZERO, r.get("saldoAFavor"));
    }

    @Test
    void conLaEstadiaFinalizadaEsElComprobanteDelPagoConSalidaYSaldoCero() {
        estadia(EstadoEstadia.FINALIZADA);
        when(consumoRepository.findByEstadiaIdEstadia(44)).thenReturn(List.of(consumo("Toalla extra", 2, "5.00"), consumo("Late check-out", 1, "20.00")));
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of(
                pago("20.00", ConceptoPago.ADELANTO_RESERVA, empleado("Maria")),
                pago("175.00", ConceptoPago.LIQUIDACION_CHECKOUT, empleado("Carlos"))));

        Map<String, Object> r = servicio("").de(44);

        assertEquals("COMPROBANTE", r.get("tipo"));
        assertEquals(LocalDateTime.of(2026, 11, 7, 11, 30), r.get("checkout"));
        assertEquals(new BigDecimal("30.00"), r.get("totalConsumos"));
        assertEquals(new BigDecimal("195.00"), r.get("total"));
        assertEquals(new BigDecimal("195.00"), r.get("totalPagado"));
        assertEquals(new BigDecimal("0.00"), ((BigDecimal) r.get("saldoPendiente")).setScale(2));
        assertEquals("Carlos Perez", r.get("atendidoPor"), "quien cobro por ultima vez");
        assertEquals(2, ((List<?>) r.get("pagos")).size());
        assertEquals(2, ((List<?>) r.get("consumos")).size());
    }

    @Test
    void elAlojamientoMuestraLasNochesYLaTarifaPorNoche() {
        estadia(EstadoEstadia.EN_CURSO);
        when(consumoRepository.findByEstadiaIdEstadia(44)).thenReturn(List.of());
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of());

        Map<String, Object> aloj = mapa(servicio("").de(44).get("alojamiento"));

        assertEquals(3, aloj.get("noches"));
        assertEquals(new BigDecimal("55.00"), aloj.get("tarifaPorNoche"));
        assertEquals(new BigDecimal("165.00"), aloj.get("total"));
    }

    @Test
    void siSePagoDeMasQuedaUnSaldoAFavorEnVezDeUnSaldoNegativo() {
        estadia(EstadoEstadia.FINALIZADA);
        when(consumoRepository.findByEstadiaIdEstadia(44)).thenReturn(List.of());
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of(pago("200.00", ConceptoPago.ADELANTO_RESERVA, null)));
        lenient().when(usuarioActualService.empleadoOpcional()).thenReturn(empleado("Admin"));

        Map<String, Object> r = servicio("").de(44);

        assertEquals(new BigDecimal("35.00"), r.get("saldoAFavor"));
        assertEquals(BigDecimal.ZERO, r.get("saldoPendiente"));
        assertEquals("Admin Perez", r.get("atendidoPor"), "sin cobros guardados, quien emite el documento");
    }

    @Test
    void unaDevolucionEnEfectivoCierraElSaldoAFavorYSeMuestraEnElComprobante() {
        estadia(EstadoEstadia.FINALIZADA);
        when(consumoRepository.findByEstadiaIdEstadia(44)).thenReturn(List.of());
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of(pago("200.00", ConceptoPago.ADELANTO_RESERVA, null)));
        pe.edu.utp.huertohostel.entity.MovimientoCaja devolucion = new pe.edu.utp.huertohostel.entity.MovimientoCaja();
        devolucion.setMonto(new BigDecimal("35.00"));
        devolucion.setMotivo("Devolucion de saldo a favor al salir (estadia #44)");
        devolucion.setFechaHora(LocalDateTime.of(2026, 11, 7, 11, 30));
        when(movimientoCajaRepository.findByIdEstadiaAndTipoOrderByFechaHoraAsc(44, "DEVOLUCION")).thenReturn(List.of(devolucion));
        lenient().when(usuarioActualService.empleadoOpcional()).thenReturn(empleado("Admin"));

        Map<String, Object> r = servicio("").de(44);

        assertEquals(BigDecimal.ZERO, r.get("saldoAFavor"), "lo devuelto cierra el saldo a favor");
        assertEquals(new BigDecimal("35.00"), r.get("totalDevuelto"));
        assertEquals(1, ((List<?>) r.get("devoluciones")).size());
    }

    @Test
    void losDatosDelHotelVaciosNoSeImprimenYElHuespedViajaConSuDocumento() {
        estadia(EstadoEstadia.EN_CURSO);
        when(consumoRepository.findByEstadiaIdEstadia(44)).thenReturn(List.of());
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(List.of());

        Map<String, Object> sinRuc = servicio("").de(44);
        Map<String, Object> conRuc = servicio("20123456789").de(44);

        assertNull(mapa(sinRuc.get("hotel")).get("ruc"));
        assertEquals("20123456789", mapa(conRuc.get("hotel")).get("ruc"));
        assertEquals("El Huerto Hostel", mapa(conRuc.get("hotel")).get("nombre"));
        assertEquals("Mia Valentina Gutierrez Rojas", mapa(conRuc.get("huesped")).get("nombre"));
        assertEquals("78985456", mapa(conRuc.get("huesped")).get("numeroDocumento"));
        assertTrue(((String) conRuc.get("aviso")).contains("No es una boleta"), "deja claro que no es tributario");
    }

    @Test
    void unaEstadiaQueNoExisteDa404() {
        when(estadiaRepository.findById(99)).thenReturn(Optional.empty());
        assertThrows(jakarta.persistence.EntityNotFoundException.class, () -> servicio("").de(99));
    }
}
