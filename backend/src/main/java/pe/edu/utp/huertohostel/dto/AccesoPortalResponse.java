package pe.edu.utp.huertohostel.dto;

/**
 * Estado del acceso de un huesped al portal.
 * `passwordTemporal` solo viaja cuando el sistema acaba de generarla:
 * se muestra una unica vez en recepcion para entregarsela al huesped.
 */
public class AccesoPortalResponse {

    private boolean existe;
    private String username;
    private Boolean activo;
    private String passwordTemporal;

    public static AccesoPortalResponse sinAcceso() {
        AccesoPortalResponse r = new AccesoPortalResponse();
        r.existe = false;
        return r;
    }

    public static AccesoPortalResponse de(String username, Boolean activo, String passwordTemporal) {
        AccesoPortalResponse r = new AccesoPortalResponse();
        r.existe = true;
        r.username = username;
        r.activo = activo;
        r.passwordTemporal = passwordTemporal;
        return r;
    }

    public boolean isExiste() { return existe; }
    public String getUsername() { return username; }
    public Boolean getActivo() { return activo; }
    public String getPasswordTemporal() { return passwordTemporal; }
}
