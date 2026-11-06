-- Al resolver una incidencia el administrador puede mandar la habitacion a limpieza: esa tarea nace con este origen.
ALTER TYPE origen_tarea_limpieza_enum ADD VALUE IF NOT EXISTS 'POST_MANTENIMIENTO';
