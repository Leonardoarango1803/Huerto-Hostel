package pe.edu.utp.huertohostel.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.dto.LoginRequest;
import pe.edu.utp.huertohostel.dto.LoginResponse;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.security.CustomUserDetails;
import pe.edu.utp.huertohostel.security.JwtService;
import pe.edu.utp.huertohostel.service.CuentaService;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CuentaService cuentaService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService,
                          CuentaService cuentaService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.cuentaService = cuentaService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        cuentaService.registrarAcceso(userDetails.getUsername());

        String token = jwtService.generateToken(
                userDetails.getUsername(),
                userDetails.getRoleName(),
                userDetails.getIdUsuario(),
                userDetails.getSello()
        );

        return ResponseEntity.ok(new LoginResponse(
                token,
                userDetails.getUsername(),
                userDetails.getRoleName(),
                userDetails.getIdUsuario(),
                userDetails.isDebeCambiarPassword()
        ));
    }

    /**
     * Cambia la clave de quien esta conectado y devuelve una sesion nueva (la anterior deja de valer). Es lo unico
     * que se puede hacer con una clave temporal. Los errores de la clave actual salen como 409, no 401: un 401 haria
     * que la pantalla cierre la sesion.
     */
    @PostMapping("/cambiar-password")
    public ResponseEntity<LoginResponse> cambiarPassword(@RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Usuario usuario = cuentaService.cambiarPasswordPropia(
                auth.getName(), body.get("passwordActual"), body.get("passwordNueva"));
        String rol = ((CustomUserDetails) auth.getPrincipal()).getRoleName();
        String token = jwtService.generateToken(usuario.getUsername(), rol, usuario.getIdUsuario(),
                CustomUserDetails.selloDe(usuario));
        return ResponseEntity.ok(new LoginResponse(token, usuario.getUsername(), rol, usuario.getIdUsuario(), false));
    }
}
