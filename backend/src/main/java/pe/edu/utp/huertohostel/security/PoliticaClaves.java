package pe.edu.utp.huertohostel.security;

import java.security.SecureRandom;

/**
 * Reglas de las contrasenas del personal y generador de claves temporales. Un solo lugar para que el cambio propio,
 * el restablecimiento del administrador y el alta de cuentas exijan lo mismo.
 */
public final class PoliticaClaves {

    /** Sin caracteres ambiguos (0/O, 1/l/I) para poder dictarla en persona. */
    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int LARGO_TEMPORAL = 10;
    public static final int MINIMO = 8;
    public static final int MAXIMO = 72; // BCrypt solo usa los primeros 72 bytes
    private static final SecureRandom RANDOM = new SecureRandom();

    private PoliticaClaves() {
    }

    /** Clave temporal con al menos una letra y un numero. */
    public static String generar() {
        while (true) {
            StringBuilder sb = new StringBuilder(LARGO_TEMPORAL);
            for (int i = 0; i < LARGO_TEMPORAL; i++) {
                sb.append(ALFABETO.charAt(RANDOM.nextInt(ALFABETO.length())));
            }
            String clave = sb.toString();
            if (tieneLetraYNumero(clave)) {
                return clave;
            }
        }
    }

    /** Lanza IllegalStateException (409, con el motivo) si la clave no cumple la politica. */
    public static void validar(String clave, String username) {
        if (clave == null || clave.length() < MINIMO) {
            throw new IllegalStateException("La contrasena debe tener al menos " + MINIMO + " caracteres.");
        }
        if (clave.length() > MAXIMO) {
            throw new IllegalStateException("La contrasena no puede pasar de " + MAXIMO + " caracteres.");
        }
        if (!tieneLetraYNumero(clave)) {
            throw new IllegalStateException("La contrasena debe combinar letras y numeros.");
        }
        if (username != null && clave.equalsIgnoreCase(username)) {
            throw new IllegalStateException("La contrasena no puede ser igual al usuario.");
        }
    }

    private static boolean tieneLetraYNumero(String clave) {
        boolean letra = false;
        boolean numero = false;
        for (char c : clave.toCharArray()) {
            if (Character.isLetter(c)) {
                letra = true;
            } else if (Character.isDigit(c)) {
                numero = true;
            }
        }
        return letra && numero;
    }
}
