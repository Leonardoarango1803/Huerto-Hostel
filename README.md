# El Huerto Hostel — Sistema de gestión hotelera (PMS)

Sistema web de gestión interna de **El Huerto Hostel** (Ica, Perú). Es el proyecto Integrador II de la UTP. Reúne en un
solo lugar lo que antes se llevaba a mano y por separado:

- reservas y disponibilidad;
- check-in, check-out y folio de cada estadía;
- comandas de cocina y bar, con inventario por recetas;
- limpieza e incidencias;
- pagos y caja por turnos;
- reportes;
- un portal web para el huésped.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

## Qué hace

| Área | Funcionalidad |
|---|---|
| **Reservas** | Registrar reservas presenciales y web y **modificarlas antes del check-in** (huésped, habitación, fechas). Calendario de disponibilidad habitación × noche. Adelanto, cancelación y liberación automática de las reservas que no llegan. |
| **Recepción** | Check-in (incluido el ingreso directo), folio de la estadía, consumos y servicios, y check-out con pre-cuenta y comprobante. Al salir se puede devolver un saldo a favor o salir con deuda, solo con autorización del administrador. |
| **Huéspedes** | Ficha con consulta de DNI/RUC. **Historial de estadías, consumos y pagos.** Acceso al portal. |
| **Habitaciones** | Estado operativo en tiempo real. El administrador crea, **edita y da de baja** habitaciones; las tarifas se definen por tipo. |
| **Cocina y bar** | Comandas en tablero (KDS) cargadas al folio. Descuento automático de insumos por receta y merma al cancelar. |
| **Inventario** | Insumos, recetas, proveedores, movimientos y conteos físicos. |
| **Limpieza e incidencias** | Tareas de limpieza automáticas tras el check-out. Incidencias que pueden bloquear la habitación. |
| **Pagos y caja** | Una caja única para el hotel, con apertura, arqueo ciego, cierre guiado y bitácora de relevo. Métodos: efectivo, **Yape/Plin**, tarjeta POS, pasarela en línea y transferencia. |
| **Portal del huésped** | Reservar desde la web, ver la cuenta y los consumos, pedir servicios y **pagar en línea** (pasarela de demostración con tarjeta o Yape/Plin). |
| **Administración** | Usuarios y roles, turnos, auditoría, dashboard por rol y reportes (ocupación, ADR, RevPAR, ingresos por área y método de pago, caja, operación) con exportación a CSV y PDF. |

**Roles:** Administrador, Recepcionista, Cajero, Cocina, Bar, Housekeeping y Cliente/Huésped. El backend controla
el acceso a cada endpoint con `@PreAuthorize` (ver `backend/.../security/Roles.java`). La prueba `MatrizPermisosTest`
falla si algún endpoint gana o pierde un rol sin que se decida.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router, Axios y Recharts.
- **Backend:** Java 21 con Spring Boot 3.3:
  - Spring Security con JWT y BCrypt;
  - Spring Data JPA;
  - Flyway;
  - Caffeine (caché en memoria).
- **Base de datos:** PostgreSQL. Las migraciones están en `backend/src/main/resources/db/migration`.
- **Despliegue:**
  - backend en Render, con Docker;
  - frontend en Vercel, como dos sitios del mismo repositorio: la web pública con el portal del huésped (`VITE_SITIO=web`) y el portal administrativo (`VITE_SITIO=admin`).
- **Servicios externos:**
  - Google Identity (inicio de sesión del huésped);
  - Cloudflare Turnstile (captcha);
  - Decolecta (consulta de DNI/RUC).

## Estructura

```
├── src/                     Frontend (React)
│   ├── api/                 Clientes de la API (Axios) y tipos
│   ├── auth/permisos.ts     Matriz rol → módulos y acciones (menú, rutas y botones)
│   ├── components/          Componentes compartidos y kit de UI
│   ├── views/               Pantallas del personal y, en views/web, la web pública y el portal
│   └── utils/               Fechas, CSV
├── backend/                 API REST (Spring Boot)
│   └── src/main/java/pe/edu/utp/huertohostel/
│       ├── controller/  service/  repository/  entity/  dto/
│       ├── security/        JWT, roles, captcha, Google
│       └── exception/       Errores de negocio → 409/400/402/404
├── .github/workflows/ci.yml Integración continua
└── SEgundo AVANCE/          Documento del proyecto y evidencias
```

## Desarrollo local

**Requisitos:**

- JDK 21 o superior;
- Maven 3.9;
- Node 22 o superior;
- una base PostgreSQL. Flyway crea el esquema al arrancar.

### Backend

1. Copia `backend/.env.example` como `backend/.env` y completa los valores. Ese archivo no se sube al repositorio.
2. Arranca el backend:

   ```bash
   cd backend
   mvn spring-boot:run
   ```

   La API queda en `http://localhost:8091`.

El inicio de sesión del personal pide captcha. En local puedes usar las claves de prueba de Cloudflare (ver `CONTEXTO_PROYECTO.md`).

### Frontend

1. Crea `.env.development.local` (lo ignora git) con `VITE_API_BASE_URL=http://localhost:8091`. Sin ese archivo, el
   frontend local llama al backend de Render y el navegador lo bloquea por CORS.
2. Instala las dependencias y arranca el servidor de desarrollo:

   ```bash
   npm install --legacy-peer-deps
   npm run dev
   ```

El servidor sirve en `http://localhost:5173`, con la web y el portal administrativo juntos.

Para ver un solo sitio, como quedará publicado:

- `npm run dev:web` (puerto 5175);
- `npm run dev:admin` (puerto 5174).

## Pruebas

```bash
cd backend
mvn test
```

```bash
npm test
```

```bash
npm run lint
```

- **Backend:** pruebas unitarias con JUnit 5 y Mockito, sin base de datos. Cubren las reglas de negocio:
  - reservas, edición y cruce de fechas;
  - caja y pagos (incluido el pago desde el portal);
  - check-out, inventario, limpieza e incidencias;
  - reportes y la matriz de permisos.
- **Frontend:** pruebas con Vitest de:
  - fechas;
  - la regla de disponibilidad;
  - la matriz de permisos;
  - los mensajes de error.

El [CI](.github/workflows/ci.yml) ejecuta las pruebas en cada push y pull request. También ejecuta el lint y compila los dos sitios.

## Reglas de negocio clave

- **Saldo del folio** = alojamiento + consumos − pagos + devoluciones.
- **Dos reservas no se cruzan:** el código bloquea la fila de la habitación y la base lo respalda con la restricción
  `EXCLUDE` de la migración V29. Se puede llegar el mismo día en que otro huésped sale.
- **Caja abierta:** el personal necesita la caja abierta para registrar adelantos, hacer check-in, cobrar y hacer un
  check-out con saldo. Crear una reserva no la necesita. Los pagos del huésped desde la web no pasan por la caja.
- **Hora de Lima:** las fechas se calculan en `America/Lima`, aunque el servidor corra en UTC.

## Despliegue

Los pasos detallados están en `CONTEXTO_PROYECTO.md`, sección «Despliegue en producción»:

- variables de Render;
- los dos proyectos de Vercel;
- los dominios de Turnstile y Google.

Flyway aplica las migraciones pendientes al arrancar el backend.
