package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Cada persona cambia SU clave: pide la actual, cumple la politica, cierra las sesiones anteriores y quita la bandera temporal. */
@ExtendWith(MockitoExtension.class)
class CuentaServiceTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock CacheManager cacheManager;

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);

    private CuentaService servicio() {
        return new CuentaService(usuarioRepository, encoder, cacheManager);
    }

    private Usuario usuarioConTemporal() {
        Usuario u = new Usuario();
        u.setIdUsuario(5);
        u.setUsername("kflores");
        u.setPasswordHash(encoder.encode("Temporal123"));
        u.setDebeCambiarPassword(true);
        return u;
    }

    @Test
    void cambiarLaClaveGuardaElHashNuevoQuitaLaBanderaYMarcaElSello() {
        Usuario u = usuarioConTemporal();
        when(usuarioRepository.findByUsername("kflores")).thenReturn(Optional.of(u));
        when(usuarioRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Usuario r = servicio().cambiarPasswordPropia("kflores", "Temporal123", "MiClave2026");

        assertTrue(encoder.matches("MiClave2026", r.getPasswordHash()));
        assertFalse(r.getDebeCambiarPassword());
        assertNotNull(r.getPasswordActualizada(), "el sello cierra las sesiones con la clave anterior");
    }

    @Test
    void conLaClaveActualEquivocadaNoCambiaNada() {
        Usuario u = usuarioConTemporal();
        String hash = u.getPasswordHash();
        when(usuarioRepository.findByUsername("kflores")).thenReturn(Optional.of(u));

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().cambiarPasswordPropia("kflores", "otra", "MiClave2026"));

        assertTrue(e.getMessage().contains("actual no es correcta"), e.getMessage());
        assertEquals(hash, u.getPasswordHash());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void laClaveNuevaDebeCumplirLaPoliticaYSerDistintaDeLaActual() {
        Usuario u = usuarioConTemporal();
        when(usuarioRepository.findByUsername("kflores")).thenReturn(Optional.of(u));

        assertThrows(IllegalStateException.class, () -> servicio().cambiarPasswordPropia("kflores", "Temporal123", "corta1"));
        assertThrows(IllegalStateException.class, () -> servicio().cambiarPasswordPropia("kflores", "Temporal123", "soloLetrasAqui"));
        IllegalStateException igual = assertThrows(IllegalStateException.class,
                () -> servicio().cambiarPasswordPropia("kflores", "Temporal123", "Temporal123"));
        assertTrue(igual.getMessage().contains("distinta"), igual.getMessage());
        verify(usuarioRepository, never()).save(any());
    }
}
