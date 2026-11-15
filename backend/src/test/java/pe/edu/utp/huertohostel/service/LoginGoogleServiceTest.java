package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.TipoUsuarioEnum;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.exception.SitioIncorrectoException;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;
import pe.edu.utp.huertohostel.security.GoogleIdTokenService;
import pe.edu.utp.huertohostel.security.GoogleIdTokenService.DatosGoogle;
import pe.edu.utp.huertohostel.security.JwtService;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** "Continuar con Google": encuentra o liga la cuenta del huesped, nunca la del personal, y si no hay cuenta pide registrarse. */
@ExtendWith(MockitoExtension.class)
class LoginGoogleServiceTest {

    @Mock GoogleIdTokenService google;
    @Mock UsuarioRepository usuarioRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock AccesoPortalService accesoPortalService;
    @Mock CuentaService cuentaService;
    @Mock JwtService jwtService;

    private LoginGoogleService servicio;
    private static final DatosGoogle ANA = new DatosGoogle("g-1", "ana@gmail.com", "Ana", "Rojas");

    @BeforeEach
    void preparar() {
        servicio = new LoginGoogleService(google, usuarioRepository, clienteRepository, accesoPortalService, cuentaService, jwtService);
        lenient().when(google.verificar("cred")).thenReturn(ANA);
        lenient().when(jwtService.generateToken(anyString(), anyString(), any(), anyLong())).thenReturn("jwt");
        lenient().when(usuarioRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private static Usuario cuenta(String username, TipoUsuarioEnum tipo, String sub) {
        Usuario u = new Usuario();
        u.setIdUsuario(9);
        u.setUsername(username);
        u.setPasswordHash("x");
        u.setTipoUsuario(tipo);
        u.setEstado(true);
        u.setGoogleSub(sub);
        return u;
    }

    @Test
    void unaCuentaYaLigadaEntraDirecto() {
        when(usuarioRepository.findByGoogleSub("g-1")).thenReturn(Optional.of(cuenta("ana@gmail.com", TipoUsuarioEnum.CLIENTE, "g-1")));
        Map<String, Object> r = servicio.entrar("cred");
        assertEquals("jwt", r.get("token"));
        assertEquals("CLIENTE", r.get("role"));
        verify(cuentaService).registrarAcceso("ana@gmail.com");
    }

    @Test
    void laCuentaCreadaEnLaWebConEseCorreoSeLigaAGoogle() {
        Usuario u = cuenta("ana@gmail.com", TipoUsuarioEnum.CLIENTE, null);
        when(usuarioRepository.findByUsername("ana@gmail.com")).thenReturn(Optional.of(u));
        servicio.entrar("cred");
        assertEquals("g-1", u.getGoogleSub());
        verify(usuarioRepository).save(u);
    }

    @Test
    void laCuentaQueDioRecepcionSeEncuentraPorElCorreoDeLaFichaYSeLiga() {
        Cliente c = new Cliente();
        c.setIdCliente(5);
        Usuario u = cuenta("arojas.4762", TipoUsuarioEnum.CLIENTE, null);
        when(clienteRepository.findFirstByCorreoIgnoreCase("ana@gmail.com")).thenReturn(Optional.of(c));
        when(usuarioRepository.findByClienteIdCliente(5)).thenReturn(Optional.of(u));
        assertEquals("arojas.4762", servicio.entrar("cred").get("username"));
        assertEquals("g-1", u.getGoogleSub());
    }

    @Test
    void unaFichaDeRecepcionSinCuentaRecibeSuCuentaConGoogle() {
        Cliente c = new Cliente();
        c.setIdCliente(5);
        when(clienteRepository.findFirstByCorreoIgnoreCase("ana@gmail.com")).thenReturn(Optional.of(c));
        when(accesoPortalService.crearConGoogle(5, "ana@gmail.com", "g-1")).thenReturn(cuenta("ana@gmail.com", TipoUsuarioEnum.CLIENTE, "g-1"));
        assertEquals("jwt", servicio.entrar("cred").get("token"));
    }

    @Test
    void laPrimeraVezCreaLaCuentaSinDocumentoYAbreSesion() {
        when(clienteRepository.save(any())).thenAnswer(i -> {
            Cliente c = i.getArgument(0);
            c.setIdCliente(40);
            return c;
        });
        when(accesoPortalService.crearConGoogle(40, "ana@gmail.com", "g-1")).thenReturn(cuenta("ana@gmail.com", TipoUsuarioEnum.CLIENTE, "g-1"));

        Map<String, Object> r = servicio.entrar("cred");

        assertEquals("jwt", r.get("token"));
        assertNull(r.get("registroPendiente"));
        org.mockito.ArgumentCaptor<Cliente> c = org.mockito.ArgumentCaptor.forClass(Cliente.class);
        verify(clienteRepository).save(c.capture());
        assertEquals(Cliente.ORIGEN_GOOGLE, c.getValue().getOrigen());
        assertEquals("Ana", c.getValue().getNombres());
        assertEquals("Rojas", c.getValue().getApellidos());
        assertNull(c.getValue().getNumeroDocumento(), "el documento se pide en la primera reserva");
        assertNull(c.getValue().getTipoDocumento());
    }

    @Test
    void sinNombreEnGoogleUsaLaParteDelCorreo() {
        when(google.verificar("sin-nombre")).thenReturn(new DatosGoogle("g-2", "luz.mar@gmail.com", null, null));
        when(clienteRepository.save(any())).thenAnswer(i -> {
            Cliente c = i.getArgument(0);
            c.setIdCliente(41);
            return c;
        });
        when(accesoPortalService.crearConGoogle(41, "luz.mar@gmail.com", "g-2")).thenReturn(cuenta("luz.mar@gmail.com", TipoUsuarioEnum.CLIENTE, "g-2"));

        servicio.entrar("sin-nombre");

        org.mockito.ArgumentCaptor<Cliente> c = org.mockito.ArgumentCaptor.forClass(Cliente.class);
        verify(clienteRepository).save(c.capture());
        assertEquals("luz.mar", c.getValue().getNombres());
        assertEquals("", c.getValue().getApellidos());
    }

    @Test
    void elPersonalNuncaEntraConGoogle() {
        when(usuarioRepository.findByUsername("ana@gmail.com")).thenReturn(Optional.of(cuenta("ana@gmail.com", TipoUsuarioEnum.EMPLEADO, null)));
        assertThrows(SitioIncorrectoException.class, () -> servicio.entrar("cred"));
        verify(jwtService, never()).generateToken(anyString(), anyString(), any(), anyLong());
    }

    @Test
    void unaCuentaDesactivadaNoEntra() {
        Usuario u = cuenta("ana@gmail.com", TipoUsuarioEnum.CLIENTE, "g-1");
        u.setEstado(false);
        when(usuarioRepository.findByGoogleSub("g-1")).thenReturn(Optional.of(u));
        assertThrows(BadCredentialsException.class, () -> servicio.entrar("cred"));
    }

    @Test
    void unaCuentaLigadaAOtraCuentaDeGoogleNoSeReemplaza() {
        Usuario u = cuenta("ana@gmail.com", TipoUsuarioEnum.CLIENTE, "g-otro");
        when(usuarioRepository.findByUsername("ana@gmail.com")).thenReturn(Optional.of(u));
        assertThrows(BadCredentialsException.class, () -> servicio.entrar("cred"));
        assertEquals("g-otro", u.getGoogleSub());
    }
}
