package pe.edu.utp.huertohostel.dto;

import java.time.LocalDate;

/**
 * Reserva hecha por el huesped desde la web publica (o desde su portal, ya con sesion).
 * Los datos personales y la contrasena solo se usan en la web publica; con sesion se ignoran.
 *
 * <p>No viaja ningun dato real de tarjeta: la pasarela es simulada y el frontend solo indica
 * el metodo y, para probar el rechazo, {@code simularRechazo}.
 */
public class ReservaWebRequest {

    private Integer idTipoHabitacion;
    private LocalDate llegada;
    private LocalDate salida;
    private Integer huespedes;

    private String tipoDocumento;
    private String numeroDocumento;
    private String nombres;
    private String apellidos;
    private String correo;
    private String telefono;
    private String password;
    /** Token del captcha (Cloudflare Turnstile): se exige al reservar sin sesion, cuando esta configurado. */
    private String captcha;

    public String getCaptcha() { return captcha; }
    public void setCaptcha(String captcha) { this.captcha = captcha; }

    private String horaLlegada;
    /** TARJETA o YAPE. */
    private String metodoPago;
    /** Codigo que muestra la app de Yape/Plin (obligatorio con YAPE). */
    private String codigoOperacion;
    private boolean simularRechazo;

    public Integer getIdTipoHabitacion() { return idTipoHabitacion; }
    public void setIdTipoHabitacion(Integer idTipoHabitacion) { this.idTipoHabitacion = idTipoHabitacion; }

    public LocalDate getLlegada() { return llegada; }
    public void setLlegada(LocalDate llegada) { this.llegada = llegada; }

    public LocalDate getSalida() { return salida; }
    public void setSalida(LocalDate salida) { this.salida = salida; }

    public Integer getHuespedes() { return huespedes; }
    public void setHuespedes(Integer huespedes) { this.huespedes = huespedes; }

    public String getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(String tipoDocumento) { this.tipoDocumento = tipoDocumento; }

    public String getNumeroDocumento() { return numeroDocumento; }
    public void setNumeroDocumento(String numeroDocumento) { this.numeroDocumento = numeroDocumento; }

    public String getNombres() { return nombres; }
    public void setNombres(String nombres) { this.nombres = nombres; }

    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getHoraLlegada() { return horaLlegada; }
    public void setHoraLlegada(String horaLlegada) { this.horaLlegada = horaLlegada; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public String getCodigoOperacion() { return codigoOperacion; }
    public void setCodigoOperacion(String codigoOperacion) { this.codigoOperacion = codigoOperacion; }

    public boolean isSimularRechazo() { return simularRechazo; }
    public void setSimularRechazo(boolean simularRechazo) { this.simularRechazo = simularRechazo; }
}
