# El Huerto Hostel — PMS

**Sistema de gestión hotelera académico** — Integrador II, Universidad Tecnológica del Perú (UTP)

Propósito: administrar el ciclo operativo completo de un hostel — reservas, check-in, estadías, consumos de productos, pagos parciales y check-out — con control de acceso por rol (ADMINISTRADOR / RECEPCIONISTA).

---

## Stack técnico

### Backend
| Componente | Tecnología |
|---|---|
| Framework | Spring Boot 3.3.5 |
| Lenguaje | Java 25 (configurado en pom.xml) |
| Build | Maven 3 |
| ORM | Spring Data JPA / Hibernate 6 |
| Seguridad | Spring Security 6 + JWT (jjwt 0.12.6) |
| Hashing | BCrypt factor 12 |
| Migraciones | Flyway (flyway-core + flyway-database-postgresql) |
| Documentación API | springdoc-openapi 2.6.0 (Swagger UI) |
| Driver BD | org.postgresql |

### Frontend
| Componente | Tecnología |
|---|---|
| Framework | React 19 |
| Lenguaje | TypeScript |
| Bundler | Vite |
| Estilos | Tailwind CSS |
| Router | React Router DOM 7 |
| HTTP | Axios con interceptores JWT |

### Base de datos
| Item | Valor |
|---|---|
| Motor | PostgreSQL 17.11 |
| Host | Supabase (pooler) |
| Endpoint | `aws-1-sa-east-1.pooler.supabase.com:5432` |
| Base de datos | `postgres` |
| Usuario | `postgres.iyojtryjtmnwrgmoohbi` |

### Arquitectura de capas

```
[React SPA — Vite/TS]
       |
   Axios + interceptor JWT (Bearer token)
       |
[Spring Boot REST API — puerto 8091]
   └── SecurityConfig (STATELESS, CORS)
   └── JwtAuthFilter (OncePerRequestFilter)
   └── @RestController → @Service → JpaRepository
       |
[PostgreSQL — Supabase]
   └── Esquema aplicado por Flyway (V1-V7)
```

---

## Estructura del repositorio

```
Huerto-Hostel/          ← raíz del monorepo (frontend)
├── src/                ← código fuente React
│   ├── api/            ← axiosConfig.ts (interceptores JWT)
│   ├── context/        ← AuthContext.tsx (JWT state global)
│   ├── components/
│   │   └── ProtectedRoute.tsx
│   └── views/          ← LoginView, DashboardView, HabitacionesView, ...
├── backend/            ← proyecto Spring Boot (Maven)
│   ├── pom.xml
│   └── src/main/
│       ├── java/pe/edu/utp/huertohostel/
│       │   ├── config/        ← SecurityConfig, CorsConfig, OpenApiConfig
│       │   ├── security/      ← JwtService, JwtAuthFilter, UserDetailsServiceImpl
│       │   ├── entity/        ← 17 @Entity + 12 enums + RecetaDetalleId
│       │   ├── repository/    ← 14 JpaRepository
│       │   ├── service/       ← ClienteService, EstadiaService, HabitacionService, PagoService, ReservaService
│       │   ├── controller/    ← 8 @RestController
│       │   ├── dto/           ← LoginRequest, LoginResponse
│       │   └── exception/     ← GlobalExceptionHandler
│       └── resources/
│           ├── application.yml
│           └── db/migration/  ← V1__create_enums.sql … V7__fix_seeds.sql
├── CONTEXTO_PROYECTO.md
├── vercel.json         ← SPA routing para Vercel
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Esquema de base de datos — 17 tablas

### ENUMs PostgreSQL nativos (V1__create_enums.sql)

| Tipo | Valores |
|---|---|
| `tipo_usuario_enum` | EMPLEADO, CLIENTE |
| `estado_operativo_hab_enum` | DISPONIBLE, OCUPADA, PENDIENTE_LIMPIEZA, EN_LIMPIEZA, MANTENIMIENTO |
| `canal_reserva_enum` | ONLINE, PRESENCIAL |
| `estado_reserva_enum` | PENDIENTE_ADELANTO, CONFIRMADA, CANCELADA, COMPLETADA |
| `estado_estadia_enum` | EN_CURSO, FINALIZADA |
| `unidad_medida_enum` | GR, ML, UND |
| `categoria_producto_enum` | COCINA, BAR, DIRECTO |
| `area_destino_enum` | COCINA, BAR |
| `estado_comanda_enum` | PENDIENTE, EN_PREPARACION, PREPARADA, ENTREGADA, CANCELADA |
| `metodo_pago_enum` | EFECTIVO, TARJETA_POS, PASARELA_ONLINE, TRANSFERENCIA |
| `concepto_pago_enum` | ADELANTO_RESERVA, PAGO_PARCIAL_ESTADIA, LIQUIDACION_CHECKOUT |
| `estado_equipaje_enum` | PENDIENTE, ASIGNADA, EN_ATENCION, ATENDIDA, CANCELADA |

### Tablas por grupo de dependencia (V2__create_schema.sql)

```
Grupo A — Sin dependencias:
  rol, area, turno, cliente, tipo_habitacion

Grupo B — Dependen de A:
  empleado (→ rol, area, turno)
  habitacion (→ tipo_habitacion)
  insumo, producto

Grupo C — Dependen de B:
  usuario (→ empleado | cliente, constraint exclusivo)
  receta_detalle (→ producto, insumo, PK compuesta)
  reserva (→ cliente, habitacion)

Grupo D — Dependen de C:
  estadia (→ reserva 1:1 UNIQUE, habitacion)

Grupo E — Dependen de D:
  comanda (→ estadia, empleado)
  solicitud_equipaje (→ estadia, empleado)
  consumo_estadia (→ estadia, comanda, producto)
  pago (→ reserva?, estadia?, empleado — al menos uno de los dos)
```

**Nota clave sobre `usuario`:** el sistema soporta dos tipos de usuario con constraint exclusivo:
- `EMPLEADO`: `id_empleado IS NOT NULL AND id_cliente IS NULL`
- `CLIENTE`: `id_cliente IS NOT NULL AND id_empleado IS NULL`

**Nota clave sobre `pago`:** es inmutable. Solo se insertan pagos; errores se corrigen con un pago de ajuste. Puede referenciar `id_reserva` (adelantos pre check-in) y/o `id_estadia` (pagos durante estadía o al checkout).

---

## Migraciones Flyway

| Script | Descripción |
|---|---|
| `V1__create_enums.sql` | 12 tipos ENUM nativos de PostgreSQL |
| `V2__create_schema.sql` | 17 tablas con FKs, constraints y checks |
| `V3__seed_catalogos.sql` | Roles (ADMINISTRADOR, RECEPCIONISTA), áreas, turnos (Mañana/Tarde/Noche) |
| `V4__seed_admin.sql` | Empleado administrador + usuario `admin` con hash BCrypt |
| `V5__seed_habitaciones.sql` | Tipos de habitación + habitaciones de ejemplo por piso |
| `V6__seed_productos.sql` | Catálogo: productos de cocina, bar y venta directa |
| `V7__fix_seeds.sql` | Corrige hash BCrypt del admin + inserta usuario `recep1` (con guardas NOT EXISTS) |

> Las migraciones aplicadas **no deben modificarse**. Si se requieren cambios, crear un nuevo script `V8__...`.

---

## Endpoints API

Base URL local: `http://localhost:8091/api/v1`

Swagger UI: `http://localhost:8091/swagger-ui/index.html`

### Autenticación

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Público | Retorna JWT. Body: `{"username":"...","password":"..."}` |

**Respuesta login:**
```json
{
  "token": "eyJ...",
  "username": "admin",
  "rol": "ADMINISTRADOR",
  "idUsuario": 1
}
```

### Habitaciones

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/habitaciones` | ADMIN, RECEP, CLIENTE | Lista todas las habitaciones |
| GET | `/habitaciones/{id}` | ADMIN, RECEP, CLIENTE | Detalle de una habitación |
| PATCH | `/habitaciones/{id}/estado` | ADMIN, RECEP | Cambia estado operativo. Body: `{"estado":"DISPONIBLE"}` |
| GET | `/habitaciones/resumen` | ADMIN, RECEP | Conteo por estado operativo |

### Clientes (Huéspedes)

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/clientes` | ADMIN, RECEP | Lista todos los clientes |
| GET | `/clientes/{id}` | ADMIN, RECEP | Detalle de un cliente |
| GET | `/clientes/buscar?documento=X` | ADMIN, RECEP | Busca cliente por número de documento |
| POST | `/clientes` | ADMIN, RECEP | Registra nuevo cliente |
| PUT | `/clientes/{id}` | ADMIN, RECEP | Actualiza datos del cliente |

### Reservas

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/reservas` | ADMIN, RECEP | Lista todas las reservas |
| GET | `/reservas/{id}` | ADMIN, RECEP | Detalle de una reserva |
| POST | `/reservas` | ADMIN, RECEP | Registra nueva reserva |
| POST | `/reservas/{id}/checkin` | RECEP | Realiza check-in → crea estadia EN_CURSO |
| GET | `/reservas/{id}/pagos` | ADMIN, RECEP | Lista pagos asociados a una reserva |

### Estadías

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/estadias` | ADMIN, RECEP | Lista estadías (filtrable: `?estado=EN_CURSO`) |
| GET | `/estadias/{id}` | ADMIN, RECEP | Detalle de una estadía |
| GET | `/estadias/{id}/consumos` | ADMIN, RECEP | Lista consumos de la estadía |
| POST | `/estadias/{id}/consumos` | RECEP | Registra consumo de producto |
| GET | `/estadias/{id}/saldo` | ADMIN, RECEP | Calcula saldo pendiente |
| POST | `/estadias/{id}/checkout` | RECEP | Realiza check-out (body opcional: pago de liquidación) |

**Fórmula de saldo:**
```
saldo = monto_alojamiento_total + SUM(consumos) − SUM(pagos vinculados a reserva o estadía)
```

### Pagos

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/pagos` | RECEP | Registra pago presencial |

**Body ejemplo:**
```json
{
  "idReserva": 1,
  "idEstadia": 1,
  "monto": 150.00,
  "metodoPago": "EFECTIVO",
  "concepto": "PAGO_PARCIAL_ESTADIA",
  "numTransaccionComprobante": ""
}
```

### Productos

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/productos` | ADMIN, RECEP, CLIENTE | Lista todos los productos activos |
| GET | `/productos/{id}` | ADMIN, RECEP, CLIENTE | Detalle de un producto |

### Dashboard

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/dashboard/resumen` | ADMIN | KPIs: habitaciones por estado, total reservas, total clientes |

---

## Rutas del frontend

| Ruta | Vista | Rol requerido | API que consume |
|---|---|---|---|
| `/login` | LoginView | Público | POST `/auth/login` |
| `/dashboard` | DashboardView | Cualquiera autenticado | GET `/dashboard/resumen` |
| `/habitaciones` | HabitacionesView | Cualquiera autenticado | GET `/habitaciones`, PATCH `/{id}/estado` |
| `/reservas` | ReservasView | Cualquiera autenticado | GET `/reservas` *(pendiente conexión real)* |
| `/huespedes` | HuespedesView | Cualquiera autenticado | GET `/clientes` *(pendiente conexión real)* |
| `/checkin` | CheckInView | Cualquiera autenticado | GET `/reservas`, POST `/{id}/checkin` |
| `/consumos` | ConsumosView | Cualquiera autenticado | GET `/estadias?estado=EN_CURSO`, GET `/productos`, POST `/{id}/consumos` |
| `/pagos` | PagosView | Cualquiera autenticado | GET `/estadias?estado=EN_CURSO`, GET `/{id}/saldo`, POST `/pagos` |
| `/checkout` | CheckoutView | Cualquiera autenticado | *(pendiente conexión real)* |

La autorización por rol es responsabilidad del backend (`@PreAuthorize`). El frontend filtra el menú del Sidebar según el claim `rol` del JWT.

---

## Seguridad JWT

| Parámetro | Valor |
|---|---|
| Algoritmo | HS256 |
| Expiración | 8 horas (28 800 000 ms) |
| Claims | `sub` (username), `rol`, `id_usuario` |
| Almacenamiento FE | `localStorage` |
| Header HTTP | `Authorization: Bearer <token>` |

El `JwtAuthFilter` valida el token en cada request, carga el `SecurityContext` y permite que `@PreAuthorize` evalúe el rol. Si el token expira o es inválido, Spring Security retorna 401 y el interceptor de Axios redirige a `/login`.

---

## Guía de desarrollo local

### Requisitos
- Java 21+ (o 25 si disponible)
- Maven 3.9+
- Node.js 20+
- npm

### Iniciar el backend

```bash
cd backend
mvn spring-boot:run
```

El backend arranca en `http://localhost:8091`. En el primer inicio, Flyway ejecuta V1-V7 automáticamente.

### Iniciar el frontend

```bash
npm install
npm run dev
```

El frontend arranca en `http://localhost:5173`.

### Variables de entorno

El backend usa `${VAR:default}` — en desarrollo local los defaults ya apuntan a Supabase:

| Variable | Default (desarrollo) | Requerida en prod |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://aws-1-sa-east-1.pooler.supabase.com:5432/postgres` | Sí |
| `DATABASE_USERNAME` | `postgres.iyojtryjtmnwrgmoohbi` | Sí |
| `DATABASE_PASSWORD` | `p7vtOsdEsXL0NMGH` | Sí |
| `JWT_SECRET` | `clave-secreta-desarrollo-local-min-256-bits-...` | Sí (cambiar) |
| `FRONTEND_URL` | `http://localhost:5173` | Sí (URL de Vercel) |
| `PORT` | `8091` | Sí (Render lo asigna) |

El frontend usa:

| Variable | Default |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8091` (configurable en `.env.local`) |

---

## Usuarios de prueba

| Username | Password | Rol |
|---|---|---|
| `admin` | `admin123` | ADMINISTRADOR |
| `recep1` | `recep123` | RECEPCIONISTA |

Los hashes BCrypt (factor 12) están en V4 y V7. **No modificar las migraciones ya aplicadas.**

---

## Despliegue en producción

### Backend → Render

1. Crear "Web Service" en Render, conectar repo, directorio raíz: `backend`
2. Runtime: Java, versión 21
3. Build command: `mvn clean package -DskipTests`
4. Start command: `java -jar target/huerto-hostel-0.0.1-SNAPSHOT.jar`
5. Variables de entorno (reemplazar defaults por valores reales):
   - `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
   - `JWT_SECRET` (generar 256-bit aleatorio)
   - `FRONTEND_URL` (URL de Vercel, ej: `https://huerto-hostel.vercel.app`)

### Frontend → Vercel

1. Importar repo en Vercel, framework: Vite
2. Variable de entorno: `VITE_API_BASE_URL=https://<nombre>.onrender.com`
3. El archivo `vercel.json` ya está configurado para SPA routing:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
   ```

### Flyway en producción

Las migraciones V1-V7 se ejecutan automáticamente al iniciar Spring Boot. Verifica en los logs:
```
Successfully applied 7 migrations to schema "public"
```

---

## Componentes reutilizables (`src/components/ui/`)

Librería completa creada en 2026-10-07:

| Componente | Propósito |
|---|---|
| `Button.tsx` | Botones con variants (primary/secondary/danger/ghost/success), tamaños, loading |
| `Badge.tsx` | Badges de estado + helpers `estadoReservaToVariant`, `estadoHabToVariant`, `estadoEstadiaToVariant` |
| `SearchBar.tsx` | Input de búsqueda con ícono y botón limpiar |
| `FilterPills.tsx` | Pills de filtro activo/inactivo |
| `KpiCard.tsx` | Tarjetas de métricas con ícono y color |
| `LoadingState.tsx` | Skeleton loader animado |
| `EmptyState.tsx` | Estado vacío con acción opcional |
| `AlertBanner.tsx` | Mensajes success/error/warning/info descartables |
| `ConfirmModal.tsx` | Modal de confirmación para acciones destructivas |
| `FormModal.tsx` | Modal base con header/body/footer reutilizable |
| `FormField.tsx` | Label + Input/Select/Textarea con manejo de errores |
| `SaldoPanel.tsx` | Panel alojamiento + consumos − pagos = saldo |
| `index.ts` | Barrel export de todos los componentes |

## Módulos de API (`src/api/`)

| Archivo | Endpoints que encapsula |
|---|---|
| `axiosConfig.ts` | Instancia Axios + interceptores JWT |
| `types.ts` | Interfaces TypeScript: Cliente, Reserva, Estadia, Habitacion, etc. |
| `reservas.ts` | listar, obtener, crear, cambiarEstado, listarPagos |
| `clientes.ts` | listar, obtener, buscarPorDocumento, crear, actualizar, estadisticas |
| `estadias.ts` | listar, obtener, saldo, consumos, checkout, resumenCheckout |
| `habitaciones.ts` | listar (con ?estado=), obtener, cambiarEstado, resumen |

## Nuevos endpoints backend añadidos

| Endpoint | Controller | Descripción |
|---|---|---|
| `GET /habitaciones?estado=DISPONIBLE` | HabitacionController | Filtro por `estadoOperativo` param |
| `PATCH /reservas/{id}/estado` | ReservaController | Cambiar `estado_reserva` |
| `GET /clientes/estadisticas` | ClienteController | KPIs: total, enCasaHoy, frecuentes |
| `GET /estadias/resumen-checkout` | EstadiaController | Summary cards CheckoutView |

El endpoint `GET /{id}/saldo` fue mejorado para devolver todos los campos: `idEstadia`, `totalAlojamiento`, `totalConsumos`, `totalPagos`, `saldoPendiente`.

## Trabajo pendiente

| Tarea | Prioridad |
|---|---|
| Deploy backend en Render | Media |
| Deploy frontend en Vercel | Media |
| Mover credenciales de BD a env vars reales (quitar defaults en application.yml) | Media |
| JUnit: SaldoCalculationTest, CheckoutTransactionTest, JwtServiceTest | Media |
| Colección Postman con flujo completo | Baja |
| Módulos admin: UsuariosView, ServiciosView, ReportesView | Baja |
