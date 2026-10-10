package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class RecetaDetalleId implements Serializable {

    private Integer idProducto;
    private Integer idInsumo;

    public RecetaDetalleId() {}

    public RecetaDetalleId(Integer idProducto, Integer idInsumo) {
        this.idProducto = idProducto;
        this.idInsumo = idInsumo;
    }

    public Integer getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(Integer idProducto) {
        this.idProducto = idProducto;
    }

    public Integer getIdInsumo() {
        return idInsumo;
    }

    public void setIdInsumo(Integer idInsumo) {
        this.idInsumo = idInsumo;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RecetaDetalleId that = (RecetaDetalleId) o;
        return Objects.equals(idProducto, that.idProducto) &&
               Objects.equals(idInsumo, that.idInsumo);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idProducto, idInsumo);
    }
}
