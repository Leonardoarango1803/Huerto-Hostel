package pe.edu.utp.huertohostel.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import pe.edu.utp.huertohostel.dto.LoginRequest;
import pe.edu.utp.huertohostel.dto.LoginResponse;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.exception.AccesoBloqueadoException;
import pe.edu.utp.huertohostel.exception.SitioIncorrectoException;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;
import pe.edu.utp.huertohostel.security.CustomUserDetails;
import pe.edu.utp.huertohostel.security.JwtService;
import pe.edu.utp.huertohostel.security.ProteccionLoginService;
import pe.edu.utp.huertohostel.service.AuditoriaGestionService;
import pe.edu.utp.huertohostel.service.CuentaService;

import java.time.Clock;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Login: mensaje unico ante clave mala, bloqueo tras intentos fallidos y cada sitio con sus cuentas. */
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock AuthenticationManager authenticationManager;
    @Mock JwtService jwtService;
    @Mock CuentaService cuentaService;
    @Mock UsuarioRepository usuarioRepository;
    @Mock AuditoriaGestionService auditoria;

    private final ProteccionLoginService proteccion = new ProteccionLoginService(Clock.systemUTC());

    private AuthController controller() {
        lenient().when(jwtService.generateToken(anyString(), anyString(), any(), anyLong())).thenReturn("token");
        return new AuthController(authenticationManager, jwtService, cuentaService, proteccion, usuarioRepository, auditoria);
    }

    private static LoginRequest pedido(String usuario, String clave, String sitio) {
        LoginRequest r = new LoginRequest(usuario, clave);
        r.setSitio(sitio);
        return r;
    }

    private static MockHttpServletRequest desde(String ip) {
        MockHttpServletRequest http = new MockHttpServletRequest();
        http.setRemoteAddr(ip);
        return http;
    }

    private void aceptar(String usuario, String rol) {
        Usuario u = new Usuario();
        u.setIdUsuario(7);
        u.setUsername(usuario);
        u.setPasswordHash("x");
        u.setEstado(true);
        CustomUserDetails detalles = new CustomUserDetails(u, rol);
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(detalles, null, detalles.getAuthorities()));
    }

    private void rechazar() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("Bad credentials"));
    }

    @Test
    void claveMalaDevuelveUnMensajeQueNoDelataLaCuenta() {
        rechazar();
        BadCredentialsException e = assertThrows(BadCredentialsException.class,
                () -> controller().login(pedido("ana", "mala", "admin"), desde("1.1.1.1")));
        assertEquals("Usuario o contraseña incorrectos.", e.getMessage());
    }

    @Test
    void cincoFallosBloqueanAunqueLuegoLaClaveSeaCorrecta() {
        AuthController c = controller();
        rechazar();
        Usuario cuenta = new Usuario();
        cuenta.setUsername("ana");
        when(usuarioRepository.findByUsername("ana")).thenReturn(Optional.of(cuenta));
        for (int i = 0; i < 4; i++) {
            assertThrows(BadCredentialsException.class, () -> c.login(pedido("ana", "mala", "admin"), desde("1.1.1.1")));
        }
        assertThrows(AccesoBloqueadoException.class, () -> c.login(pedido("ana", "mala", "admin"), desde("1.1.1.1")));
        verify(auditoria, times(1)).registrar(eq("LOGIN_BLOQUEADO"), any(), anyString());

        // Bloqueada: ni siquiera se revisa la clave.
        assertThrows(AccesoBloqueadoException.class, () -> c.login(pedido("ana", "buena", "admin"), desde("2.2.2.2")));
        verify(authenticationManager, times(5)).authenticate(any());
    }

    @Test
    void elPortalAdministrativoRechazaCuentasDeHuesped() {
        aceptar("cliente@correo.com", "CLIENTE");
        assertThrows(SitioIncorrectoException.class,
                () -> controller().login(pedido("cliente@correo.com", "buena", "admin"), desde("1.1.1.1")));
        verify(cuentaService, never()).registrarAcceso(anyString());
    }

    @Test
    void laWebRechazaCuentasDelPersonal() {
        aceptar("recepcion", "RECEPCIONISTA");
        assertThrows(SitioIncorrectoException.class,
                () -> controller().login(pedido("recepcion", "buena", "web"), desde("1.1.1.1")));
    }

    @Test
    void cadaSitioAceptaSusCuentas() {
        aceptar("recepcion", "RECEPCIONISTA");
        LoginResponse r = controller().login(pedido("recepcion", "buena", "admin"), desde("1.1.1.1")).getBody();
        assertEquals("RECEPCIONISTA", r.getRole());
        verify(cuentaService).registrarAcceso("recepcion");
    }

    @Test
    void sinSitioEntraCualquieraComoAntes() {
        aceptar("cliente@correo.com", "CLIENTE");
        LoginResponse r = controller().login(pedido("cliente@correo.com", "buena", null), desde("1.1.1.1")).getBody();
        assertEquals("CLIENTE", r.getRole());
    }

    @Test
    void sitioDesconocidoEsUnPedidoInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> controller().login(pedido("ana", "x", "otro"), desde("1.1.1.1")));
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void laIpSaleDelProxyCuandoLaHay() {
        MockHttpServletRequest http = desde("10.0.0.1");
        assertEquals("10.0.0.1", AuthController.ipCliente(http));
        http.addHeader("X-Forwarded-For", "181.65.1.2, 10.0.0.5");
        assertEquals("181.65.1.2", AuthController.ipCliente(http));
    }
}
