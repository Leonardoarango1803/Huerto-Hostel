package pe.edu.utp.huertohostel.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.dto.LoginRequest;
import pe.edu.utp.huertohostel.dto.LoginResponse;
import pe.edu.utp.huertohostel.security.CustomUserDetails;
import pe.edu.utp.huertohostel.security.JwtService;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        String token = jwtService.generateToken(
                userDetails.getUsername(),
                userDetails.getRoleName(),
                userDetails.getIdUsuario()
        );

        LoginResponse response = new LoginResponse(
                token,
                userDetails.getUsername(),
                userDetails.getRoleName(),
                userDetails.getIdUsuario()
        );

        return ResponseEntity.ok(response);
    }
}
