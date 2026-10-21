# Spec 001 — Sistema completo resto-huma (base + todos los módulos)

> Estado: completada
> Creada: 2026-10-20 — Origen: usuario (planificación total del sistema)

## 1. Objetivo

Desarrollar el sistema completo de gestión del restaurante: backend NestJS con Prisma/PostgreSQL + Socket.io + JWT, frontend Next.js 16 estilo dashboard (Agorapulse/Eat App), incluyendo **migraciones y seeders** para gestionar la base de datos de forma sencilla. Todo el modelo está definido en `MODELO.MD`.

## 2. Contexto y referencias

- `MODELO.MD`: DER completo (25 entidades), casos de uso, supuestos S1–S14, mapeo entidad→módulo.
- `GLOSARIO.MD`: dominio. `RULES.MD`: DTOs, montos sin float, un módulo por dominio, español en docs.
- `DOCUMENTATION.MD` §4-5: stack decidido (NestJS 12, Next 16, PostgreSQL+Prisma, JWT access+refresh, Socket.io).
- ⚠️ Next 16 breaking changes: leer `apps/frontend/node_modules/next/dist/docs/` antes de codear frontend.
- Montos **duales decididos 2026-10-20**: `precioArs Int` (pesos argentinos enteros) + `precioUsd Decimal(12,2)` en entidades con precio (Producto, Variedad, ItemPedido snapshot, Promocion). Finanzas (Pago, Caja, Egreso, CierreCaja) en ARS entero.
- Postgres **local via Docker** (`docker-compose.yml` en raíz, servicio postgres:16, volumen + credenciales en `.env.example`).

## 3. Alcance

### Dentro de scope
Setup Prisma+migraciones+seeds, auth empleados (JWT+roles) y clientes (Google OAuth), todos los módulos de `MODELO.MD` §5, pantallas de todos los roles, canal virtual de pedidos, realtime cocina, caja/cierre, insumos/stock, reservas, seeders demo, y **abstracción de pasarela de cobro** (puerto + adaptador manual + adaptador HTTP externo configurable).

### Fuera de scope (explícito)
Implementación del servicio externo de pagos (proyecto aparte — solo el contrato y el adaptador acá), facturación AFIP, integración API redes sociales, deploy/producción.

## 4. Diseño

- Migraciones con `prisma migrate dev` + `prisma/seed.ts` (catálogos + datos demo).
- `packages/shared`: enums de estados/canales/roles/medios de pago + tipos DTO como contrato front↔back.
- Backend: módulos por dominio (`auth`, `usuarios`, `menu`, `pedidos`, `salon`, `cocina`, `finanzas`, `insumos`, `reservas`, `reportes`); `@nestjs/websockets` gateway para comandas/estados; guards por rol.
- Frontend: App Router con layout dashboard (sidebar por módulos), vistas por rol, página pública de pedido virtual.

## 5. Descomposición en tareas

### Bloque A — Fundación (secuencial, todo depende de A1 y A2)

| # | Tarea | Scope de archivos | Depende de | Ejecución |
|---|-------|-------------------|------------|-----------|
| A1 | **Prisma + migraciones + seed framework + infra común**: `docker-compose.yml` raíz (postgres:16) + `db:up`/`db:down`; instalar **TODAS** las deps (`prisma`, `@prisma/client`, `@nestjs/config`, `class-validator`, `class-transformer`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `google-auth-library`; frontend: `socket.io-client`, lib de charts); `schema.prisma` 25 entidades + `precioArs Int`/`precioUsd Decimal(12,2)`; `migrate dev --name init`; `prisma/seed.ts` + catálogos; `src/common/` con `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`, `PrismaModule` global; `.env.example` completo (incl. `PAYMENT_PROVIDER=manual`, `PAYMENT_GATEWAY_URL`, `PAYMENT_GATEWAY_KEY`, `PAYMENT_WEBHOOK_SECRET`). **Dueño único de `package.json`, `.env`, `app.module.ts`, `main.ts`** | `docker-compose.yml`, `package.json` raíz, `apps/backend/package.json`, `apps/backend/prisma/**`, `apps/backend/.env*`, `apps/backend/src/prisma/**`, `apps/backend/src/common/**`, `apps/backend/src/main.ts` | — | SECUENCIAL (parent) |
| A2 | **`packages/shared` = contratos congelados**: enums (los 16 del modelo) + **DTOs un archivo por dominio** (`contracts/pedidos.ts`, `menu.ts`, `finanzas.ts`, `salon.ts`, `insumos.ts`, `usuarios.ts`) + eventos WS tipados (`comanda.nueva`, `pedido.estado`) + interfaces de servicios cross-módulo (`descontarPorPedido()`, `marcarPagado()`) + decisión transporte JWT (Bearer vs cookie) + endpoint map por módulo + **puerto `PasarelaPago`** (`iniciarCobro(pedidoId, montoArs) → {referenciaExterna, checkoutUrl?}`, `confirmarCobro(ref) → aprobado|rechazado|pendiente`, `reembolsar(pagoId)`, type `ProveedorPasarela = 'manual'|'externa'`). **Congelado tras A2: workers no lo editan, cambios escalan al parent** | `packages/shared/**`, `apps/*/package.json` (dep `workspace:`) | — | SECUENCIAL (parent) |

### Bloque B — Backend por dominio (paralelo tras A1+A2; dependencias internas marcadas)

| # | Tarea | Scope de archivos | Depende de | Ejecución |
|---|-------|-------------------|------------|-----------|
| B1 | **auth + usuarios**: register/login empleados JWT access+refresh (usa guards de `src/common`), CRUD usuarios (admin); cliente OAuth Google (verify token → upsert Cliente) | `apps/backend/src/auth/**`, `apps/backend/src/usuarios/**`, `apps/backend/src/clientes/**` | A1, A2 | PARALELA → worker-codex |
| B2 | **menú + promociones**: CRUD Producto/Variedad (precio base+override, disponibilidad), categorías, Promocion+PromocionProducto, DescuentoAplicado helpers | `apps/backend/src/menu/**` | A1, A2 | PARALELA → worker-gemini |
| B3 | **salón + reservas + turnos**: CRUD Mesa (estado), Turno (apertura/cierre), MozoMesaTurno (asignación), Reserva CRUD + estados | `apps/backend/src/salon/**`, `apps/backend/src/reservas/**` | A1, A2 | PARALELA → worker-gemini |
| B4 | **pedidos + comandas + WS**: crear pedido (mesa/mostrador/takeaway/delivery), ítems, adiciones→nueva comanda, transiciones `estadoAtencion`/`estadoPago`, descuento de stock al confirmar (contra interfaz `descontarPorPedido()` de A2), bandeja de confirmación, Socket.io gateway | `apps/backend/src/pedidos/**`, `apps/backend/src/realtime/**` | A1, A2 | PARALELA → worker-sonnet |
| B5 | **finanzas/caja + pasarela**: Caja apertura/cierre, Pago (múltiple/mixto, propina, registradoPor), Egreso, CierreCaja conciliación, Anulacion (admin), reporte de ventas del turno; **`PasarelaPagoModule`** provider factory por env `PAYMENT_PROVIDER`: `manual`→`PasarelaManualService` (registra pago local, ref sintética), `externa`→`PasarelaExternaService` (HTTP a `PAYMENT_GATEWAY_URL`+KEY, mapea a `referenciaExterna`); endpoint `POST /pagos/webhook` (firma `PAYMENT_WEBHOOK_SECRET`) que actualiza `estadoPago` + emite WS; `Configuracion` guarda proveedor por canal (presencial=manual, virtual=externa opcional) | `apps/backend/src/finanzas/**`, `apps/backend/src/pagos/**` | A1, A2 | PARALELA → worker-sonnet |
| B6 | **insumos/stock**: CRUD Insumo, RecetaItem (base producto + ajuste variedad), MovimientoStock, implementa `descontarPorPedido()` (interfaz A2), alerta stock bajo | `apps/backend/src/insumos/**` | A1, A2 | PARALELA → worker-codex |
| B7 | **reportes**: ventas por turno/fecha, productos más vendidos, costo de mercadería vs ventas, estado de caja (solo lectura sobre schema) | `apps/backend/src/reportes/**` | A1, A2 | PARALELA → worker-antigravity |

> **Gate post-B (parent)**: registrar los 7 módulos en `app.module.ts` + wiring `Pedidos→Insumos` + `pnpm -r lint/build/test` verde antes de soltar Bloque C con API real.

### Bloque C — Frontend (paralelo; puede iniciar con mock de API o después de B)

| # | Tarea | Scope de archivos | Depende de | Ejecución |
|---|-------|-------------------|------------|-----------|
| C1 | **Shell dashboard + auth UI**: layout sidebar por módulos (estilo Agorapulse), login empleados, guard por rol, fetch client con token, theme Tailwind, `components/ui/**` base | `apps/frontend/src/app/(dashboard)/layout.tsx`, `apps/frontend/src/app/(dashboard)/page.tsx`, `apps/frontend/src/app/login/**`, `apps/frontend/src/lib/**`, `apps/frontend/src/components/ui/**` | A2 | PARALELA → worker-gemini |
| C2 | **Salón/mesas + vista mozo**: mapa de mesas con estados (estilo Eat App), abrir cuenta, tomar pedido/adiciones, pedir cuenta, reservas del día | `apps/frontend/src/app/(dashboard)/salon/**`, `apps/frontend/src/components/salon/**` | C1 | PARALELA → worker-sonnet |
| C3 | **Pantalla cocina realtime**: bandeja comandas por Socket.io, cambiar estado comanda, alerta sonora/visual | `apps/frontend/src/app/(dashboard)/cocina/**`, `apps/frontend/src/components/cocina/**` | C1 | PARALELA → worker-codex |
| C4 | **Caja**: cobro con medios/pago mixto/propina, apertura/cierre, egresos, bandeja de confirmación de pedidos virtuales; si proveedor=externa muestra estado del cobro (`pendiente/aprobado/rechazado`) en vez de pago manual en virtuales | `apps/frontend/src/app/(dashboard)/caja/**`, `apps/frontend/src/components/caja/**` | C1 | PARALELA → worker-sonnet |
| C5 | **Admin: menú + insumos + usuarios + promos + reservas + configuración de canales**: CRUDs con tablas/formularios, gestión stock, recetas | `apps/frontend/src/app/(dashboard)/admin/**`, `apps/frontend/src/components/admin/**` | C1 | PARALELA → worker-gemini |
| C6 | **Portal público cliente**: home carta, carrito, pedido takeaway/delivery con Google OAuth, estado del pedido, reserva de mesa | `apps/frontend/src/app/(public)/**`, `apps/frontend/src/components/public/**` | C1 (OAuth vía contrato A2, mocks) | PARALELA → worker-sonnet |
| C7 | **Reportes**: dashboards ventas/productos/costo | `apps/frontend/src/app/(dashboard)/reportes/**`, `apps/frontend/src/components/reportes/**` | C1 | PARALELA → worker-antigravity |
| C8 | **Bandeja repartidor**: lista pedidos `listo` delivery → marcar `en_reparto` → confirmar `entregado` (vista slim, 3 mutations) | `apps/frontend/src/app/(dashboard)/reparto/**`, `apps/frontend/src/components/reparto/**` | C1 | PARALELA → worker-antigravity |

### Bloque D — Cierre (secuencial, parent)

| # | Tarea | Scope | Depende de | Ejecución |
|---|-------|-------|------------|-----------|
| D1 | **Seed demo completo**: usuarios de cada rol, 8 mesas, 2 turnos, productos (6+ variedades empanadas + 3 regionales + bebidas/postres), recetas con insumos, 5 pedidos de ejemplo en distintos estados, 2 reservas | `apps/backend/prisma/seed.ts`, `apps/backend/prisma/seed-data/**` | A1–B6 | SECUENCIAL (parent) |
| D2 | **Integración + verificación e2e**: wiring final, `pnpm -r lint/build/test`, flujo manual pedido presencial completo + virtual, actualizar docs + changelog | repo entero | todo | SECUENCIAL (parent) |

## 6. Criterios de aceptación

- [ ] `prisma migrate dev` aplica limpio desde cero; `pnpm --filter backend seed` deja datos demo.
- [ ] Mozo abre cuenta en mesa → comanda llega a cocina por WS → cocina la marca lista → cajero cobra (mixto+propina) → cierre de caja concilia.
- [ ] Cliente arma pedido virtual con Google login → aparece en bandeja → cajero confirma → stock descuenta → se entrega/cobra.
- [ ] Reserva creada → mesa ocupada a la hora → pedido vinculado a reserva.
- [ ] `pnpm -r lint build test` en verde; todo registrado en `DOCUMENTATION.MD`.
- [ ] Cambiar `PAYMENT_PROVIDER=externa` + `PAYMENT_GATEWAY_URL` dirige todo el flujo de cobro al servicio externo **sin tocar** `pedidos` ni `finanzas` (inyección por puerto).

## 7. Verificación

```bash
pnpm db:up                                  # levanta Postgres en Docker
pnpm -r lint && pnpm -r build && pnpm -r test
pnpm --filter backend exec prisma migrate dev
pnpm --filter backend exec prisma db seed
pnpm dev:backend & pnpm dev:frontend        # prueba manual de los flujos
```

> Sin pendientes: Postgres via docker-compose ✅ · montos ARS int + USD Decimal(12,2) ✅
