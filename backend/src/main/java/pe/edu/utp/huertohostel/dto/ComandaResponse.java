package pe.edu.utp.huertohostel.dto;

import pe.edu.utp.huertohostel.entity.AreaDestino;
import pe.edu.utp.huertohostel.entity.Comanda;
import pe.edu.utp.huertohostel.entity.DetalleComanda;
import pe.edu.utp.huertohostel.entity.EstadoComanda;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Vista plana de una comanda para el tablero KDS, sin arrastrar
 * el grafo completo de estadia -> reserva -> cliente.
 */
public class ComandaResponse {

    private Integer idComanda;
    private Integer idEstadia;
    private String numeroHabitacion;
    private AreaDestino areaDestino;
    private EstadoComanda estadoComanda;
    private String observaciones;
    private LocalDateTime fechaRegistro;
    private BigDecimal total;
    private List<ItemResponse> items;

    public static ComandaResponse de(Comanda comanda, List<DetalleComanda> detalles) {
        ComandaResponse r = new ComandaResponse();
        r.idComanda = comanda.getIdComanda();
        if (comanda.getEstadia() != null) {
            r.idEstadia = comanda.getEstadia().getIdEstadia();
            if (comanda.getEstadia().getHabitacion() != null) {
                r.numeroHabitacion = comanda.getEstadia().getHabitacion().getNumero();
            }
        }
        r.areaDestino = comanda.getAreaDestino();
        r.estadoComanda = comanda.getEstadoComanda();
        r.observaciones = comanda.getObservaciones();
        r.fechaRegistro = comanda.getFechaRegistro();
        r.items = detalles.stream().map(ItemResponse::de).toList();
        r.total = detalles.stream()
                .map(DetalleComanda::getSubtotal)
                .filter(s -> s != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return r;
    }

    public Integer getIdComanda() { return idComanda; }
    public Integer getIdEstadia() { return idEstadia; }
    public String getNumeroHabitacion() { return numeroHabitacion; }
    public AreaDestino getAreaDestino() { return areaDestino; }
    public EstadoComanda getEstadoComanda() { return estadoComanda; }
    public String getObservaciones() { return observaciones; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public BigDecimal getTotal() { return total; }
    public List<ItemResponse> getItems() { return items; }

    public static class ItemResponse {
        private Integer idDetalle;
        private Integer idProducto;
        private String nombreProducto;
        private Short cantidad;
        private BigDecimal precioUnitario;
        private BigDecimal subtotal;
        private String notas;

        static ItemResponse de(DetalleComanda d) {
            ItemResponse i = new ItemResponse();
            i.idDetalle = d.getIdDetalle();
            if (d.getProducto() != null) {
                i.idProducto = d.getProducto().getIdProducto();
                i.nombreProducto = d.getProducto().getNombre();
            }
            i.cantidad = d.getCantidad();
            i.precioUnitario = d.getPrecioUnitario();
            i.subtotal = d.getSubtotal();
            i.notas = d.getNotas();
            return i;
        }

        public Integer getIdDetalle() { return idDetalle; }
        public Integer getIdProducto() { return idProducto; }
        public String getNombreProducto() { return nombreProducto; }
        public Short getCantidad() { return cantidad; }
        public BigDecimal getPrecioUnitario() { return precioUnitario; }
        public BigDecimal getSubtotal() { return subtotal; }
        public String getNotas() { return notas; }
    }
}
