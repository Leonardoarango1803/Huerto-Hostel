package pe.edu.utp.huertohostel.dto;

public class LoginResponse {

    private String token;
    private String username;
    private String role;
    private Integer userId;
    /** true con una clave temporal: el front obliga a elegir una propia antes de seguir. */
    private boolean debeCambiarPassword;

    public LoginResponse(String token, String username, String role, Integer userId) {
        this(token, username, role, userId, false);
    }

    public LoginResponse(String token, String username, String role, Integer userId, boolean debeCambiarPassword) {
        this.token = token;
        this.username = username;
        this.role = role;
        this.userId = userId;
        this.debeCambiarPassword = debeCambiarPassword;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public boolean isDebeCambiarPassword() {
        return debeCambiarPassword;
    }

    public void setDebeCambiarPassword(boolean debeCambiarPassword) {
        this.debeCambiarPassword = debeCambiarPassword;
    }
}
