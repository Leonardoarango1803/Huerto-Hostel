package pe.edu.utp.huertohostel.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.function.Supplier;

/**
 * Memoria de corta vida para lo que se consulta seguido y cambia poco: reportes y paneles.
 * Una pantalla que se refresca cada 30 s por varios usuarios no tiene por que repetir las mismas
 * consultas agregadas contra la base (el pool es de 5 conexiones y el servidor esta lejos).
 *
 * <p>Tres caches con vida distinta: el panel del dashboard vive poco para sentirse "en vivo", los reportes
 * mas, porque comparan rangos de fechas. Hay una tercera para los calculos base que varios reportes comparten
 * (por ejemplo la ocupacion): Caffeine no deja que una funcion de carga consulte la MISMA cache, pero si otra. Si dos peticiones piden lo mismo a la vez, solo una calcula.
 * Es memoria del proceso: se pierde al reiniciar y no se comparte entre instancias, que aqui es lo correcto
 * (el dato se vuelve a calcular y nadie ve nada distinto). Cada respuesta lleva su hora de generacion.
 */
@Component
public class CacheEnMemoria {

    static final Duration VIDA_PANEL = Duration.ofSeconds(20);
    static final Duration VIDA_REPORTES = Duration.ofSeconds(90);

    private final Cache<String, Object> panel;
    private final Cache<String, Object> reportes;
    private final Cache<String, Object> base;

    public CacheEnMemoria() {
        this(VIDA_PANEL, VIDA_REPORTES);
    }

    CacheEnMemoria(Duration vidaPanel, Duration vidaReportes) {
        this.panel = Caffeine.newBuilder().expireAfterWrite(vidaPanel).maximumSize(200).build();
        this.reportes = Caffeine.newBuilder().expireAfterWrite(vidaReportes).maximumSize(500).build();
        this.base = Caffeine.newBuilder().expireAfterWrite(vidaReportes).maximumSize(500).build();
    }

    public <T> T panel(String clave, boolean refrescar, Supplier<T> calculo) {
        return obtener(panel, clave, refrescar, calculo);
    }

    public <T> T reportes(String clave, boolean refrescar, Supplier<T> calculo) {
        return obtener(reportes, clave, refrescar, calculo);
    }

    /** Calculos compartidos entre reportes; se pueden pedir desde dentro de la carga de un reporte. */
    public <T> T base(String clave, Supplier<T> calculo) {
        return obtener(base, clave, false, calculo);
    }

    /** Fuerza que lo siguiente se calcule de nuevo (el boton "Actualizar" de las pantallas). */
    public void limpiar() {
        panel.invalidateAll();
        reportes.invalidateAll();
        base.invalidateAll();
    }

    @SuppressWarnings("unchecked")
    private static <T> T obtener(Cache<String, Object> cache, String clave, boolean refrescar, Supplier<T> calculo) {
        if (refrescar) {
            cache.invalidate(clave);
        }
        return (T) cache.get(clave, k -> calculo.get());
    }
}
