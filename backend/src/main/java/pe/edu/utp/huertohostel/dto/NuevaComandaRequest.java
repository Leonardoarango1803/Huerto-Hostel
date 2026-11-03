package pe.edu.utp.huertohostel.dto;

import pe.edu.utp.huertohostel.entity.AreaDestino;

import java.util.List;

public class NuevaComandaRequest {

    private Integer idEstadia;
    private AreaDestino areaDestino;
    private String observaciones;
    private List<ItemComanda> items;

    public Integer getIdEstadia() { return idEstadia; }
    public void setIdEstadia(Integer idEstadia) { this.idEstadia = idEstadia; }

    public AreaDestino getAreaDestino() { return areaDestino; }
    public void setAreaDestino(AreaDestino areaDestino) { this.areaDestino = areaDestino; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public List<ItemComanda> getItems() { return items; }
    public void setItems(List<ItemComanda> items) { this.items = items; }

    public static class ItemComanda {
        private Integer idProducto;
        private Short cantidad;
        private String notas;

        public Integer getIdProducto() { return idProducto; }
        public void setIdProducto(Integer idProducto) { this.idProducto = idProducto; }

        public Short getCantidad() { return cantidad; }
        public void setCantidad(Short cantidad) { this.cantidad = cantidad; }

        public String getNotas() { return notas; }
        public void setNotas(String notas) { this.notas = notas; }
    }
}
