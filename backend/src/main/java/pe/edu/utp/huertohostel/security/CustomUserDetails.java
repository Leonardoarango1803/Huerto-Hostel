package pe.edu.utp.huertohostel.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import pe.edu.utp.huertohostel.entity.Usuario;

import java.util.Collection;
import java.util.List;

public class CustomUserDetails implements UserDetails {

    private final Integer idUsuario;
    private final String username;
    private final String password;
    private final boolean enabled;
    private final String roleName;
    private final List<GrantedAuthority> authorities;

    public CustomUserDetails(Usuario usuario, String roleName) {
        this.idUsuario = usuario.getIdUsuario();
        this.username = usuario.getUsername();
        this.password = usuario.getPasswordHash();
        this.enabled = Boolean.TRUE.equals(usuario.getEstado());
        this.roleName = roleName;
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + roleName));
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public String getRoleName() {
        return roleName;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
