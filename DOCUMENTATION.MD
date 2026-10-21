# DOCUMENTATION.MD — Documentación viva del sistema

Documento central y **vivo** de resto-huma. Contiene el objetivo del sistema, la arquitectura, los módulos funcionales, las decisiones técnicas y el **registro de todas las tareas y cambios** realizados durante el desarrollo.

> ⚠️ **Obligatorio**: toda tarea completada debe agregar una fila en [Registro de tareas y cambios](#registro-de-tareas-y-cambios). Ver `RULES.MD`.

---

## 1. Objetivo del sistema

Sistema de gestión integral para un restaurante de **comida regional del norte argentino** cuyo producto principal son las **empanadas** (con apertura a otras comidas regionales: humitas, tamales, locro, etc.).

El sistema busca:

- **Administrar las ventas** del local.
- **Gestionar el menú/carta** y sus precios.
- **Facilitar la atención a clientes por parte de los mozos** (mesas, comandas, estado de pedidos).
- **Agilizar la toma de pedidos** tanto de forma **presencial** (en el local) como **virtual** (online / para llevar / delivery).
- **Promocionar el local en redes sociales** (difusión de menú, promos, novedades).
- **Gestionar ingresos y egresos económicos** del local (caja, gastos, cierres) contemplando los **insumos y recursos** utilizados (stock, inventario, costo de mercadería).

## 2. Módulos funcionales

| Módulo | Descripción | Estado |
|---|---|---|
| **Ventas** | Registro y administración de ventas del local | 🕐 Pendiente |
| **Menú / Carta** | CRUD de productos (empanadas y comidas regionales), variedades, precios, disponibilidad | 🕐 Pendiente |
| **Pedidos** | Toma de pedidos presencial (mozo en mesa) y virtual (cliente online) | 🕐 Pendiente |
| **Reservas** | Reservas de mesa por clientes (estilo Eat App): fecha/hora, personas, estado, mesa asignada | 🕐 Pendiente |
| **Atención / Mozos** | Asignación de mesas, comandas a cocina, seguimiento del estado de pedidos | 🕐 Pendiente |
| **Cocina (comandas)** | Recepción y gestión de comandas, estados de preparación | 🕐 Pendiente |
| **Finanzas / Caja** | Ingresos, egresos, cierre de caja, costos por insumos | 🕐 Pendiente |
| **Insumos / Stock** | Inventario de insumos y recursos, consumo por producto, alertas de stock | 🕐 Pendiente |
| **Promociones / Redes** | Publicación/difusión de menú y promociones en redes sociales | 🕐 Pendiente |
| **Usuarios y roles** | Admin, mozo, cocina, cajero, repartidor | 🕐 Pendiente |

> Los términos del negocio están definidos en `GLOSARIO.MD`.

## 3. Arquitectura

Monorepo con **pnpm workspaces**:

```
apps/backend    → API REST — NestJS + TypeScript
apps/frontend   → Web app — Next.js (App Router) + TypeScript + Tailwind CSS
packages/       → Tipos, DTOs, enums y utilidades compartidas entre front y back
specs/          → Specs numeradas de features (generadas por el skill /to-spec)
.devin/skills/  → Skills de Devin CLI: /grill-me, /grill-with-docs, /to-spec
.devin/agents/  → Perfiles de subagente con modelos pinneados (worker-*)
```

- El **backend** expone una API REST consumida por el frontend (y eventualmente por otros clientes).
- El **frontend** es la interfaz para mozos, caja, cocina y administración; los pedidos virtuales pueden resolverse en una vista pública.
- Los **contratos API** (DTOs de request/response) viven en `packages/` para evitar drift entre front y back.
- El **modelo de dominio** (DER + casos de uso) está en `MODELO.MD`.

### Stack

| Capa | Tecnología | Versión / nota |
|---|---|---|
| Runtime | Node.js | 24 (`.nvmrc`) |
| Package manager | pnpm | 12.9.1 (`packageManager` en root `package.json`) |
| Backend | NestJS + TypeScript | Nest CLI 12, Vitest + oxlint |
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Next 16 + React 19 + Tailwind 4, Turbopack |
| Base de datos | PostgreSQL + Prisma | pendiente de instalar/configurar |
| Autenticación | JWT access + refresh (roles) | pendiente de implementar |
| Realtime | Socket.io (WebSockets) | pendiente de implementar |

## 4. Estado de las apps (scaffolding realizado 2026-10-20)

- **`apps/backend`**: NestJS 12 scaffold (Nest CLI 12, `--strict`) — TypeScript ESM, Vitest + oxlint, scripts `start:dev`/`build`/`test`/`lint`. Paquete: `backend`.
- **`apps/frontend`**: Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript, App Router, `src/`, import alias `@/*`, Turbopack, ESLint flat config. Paquete: `frontend`.
- **⚠️ Next 16 tiene breaking changes** respecto a versiones previas: `apps/frontend/AGENTS.md` exige leer `apps/frontend/node_modules/next/dist/docs/` antes de escribir código de frontend.
- Workspace: `pnpm-workspace.yaml` raíz incluye `onlyBuiltDependencies`/`ignoredBuiltDependencies` para `unrs-resolver` (dep de oxlint con build script no crítico) y `strictDepBuilds: false`.
- ⚠️ Si create-next-app regenera `pnpm-workspace.yaml`/`pnpm-lock.yaml` dentro de `apps/frontend/`, **eliminarlos**: rompen el workspace raíz.

> Los scripts raíz (`dev:backend`, `dev:frontend`) filtran por el campo `name` de cada `package.json`; mantener los nombres `backend` y `frontend`.

## 5. Decisiones técnicas

### Tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-20 | Monorepo con pnpm workspaces (`apps/*`, `packages/*`) | Front y back separados pero con código compartido |
| 2026-10-20 | Backend: NestJS + TypeScript | Estructura modular acorde a dominios de negocio |
| 2026-10-20 | Frontend: Next.js App Router + TypeScript + Tailwind | SSR/SSG para vistas públicas (pedidos virtuales, promos) |
| 2026-10-20 | Documentación viva en español | Equipo y dominio de negocio en español |
| 2026-10-20 | DB: **PostgreSQL + Prisma** | Tipado end-to-end, migraciones declarativas |
| 2026-10-20 | Auth: **JWT access + refresh** con roles (admin, mozo, cocina, cajero, repartidor) | Guards por rol en transiciones de estado |
| 2026-10-20 | Realtime: **WebSockets (Socket.io)** | Pantalla de cocina y estados de pedido en vivo |
| 2026-10-20 | Cobro de pedido virtual: **configurable** (online anticipado y/o al retirar-contra entrega) | Flexibilidad por canal del local |
| 2026-10-20 | Modelo presencial: **cuenta por mesa** (pedido acumulable con adiciones/N comandas hasta pedir la cuenta) + **mostrador sin mesa** | Refleja operación real de salón |
| 2026-10-20 | Descuento de stock: **al confirmar el pedido** | Reserva inmediata; cancelaciones evalúan reposición según avance |
| 2026-10-20 | Ciclo de pedido separado en **atención** (`pendiente→confirmado→en preparación→listo→entregado`, +`en reparto` en delivery) y **pago** (`pendiente de cobro→cobrado`) | El cobro puede ocurrir antes, durante o después de la entrega según canal |
| 2026-10-20 | **Dirección de UI**: dashboard SaaS estilo **Agorapulse** (sidebar de módulos, inbox unificado, cards, informes) + gestión de salón estilo **Eat App** (vista de mesas/piso, reservas, CRM de clientes) | Referencias dadas por el usuario para el diseño del frontend |
| 2026-10-20 | Receta/ficha técnica: **mixta** (insumos base por producto + ajustes por variedad) | Empanadas comparten masa pero cada variedad consume insumos distintos |
| 2026-10-20 | **Reservas en scope**: módulo `Reserva` (cliente, mesa, fecha/hora, estado) | Referencia Eat App confirmada como funcionalidad, no solo estilo |
| 2026-10-20 | Cliente virtual: **cuenta registrada con Google OAuth** | Registro sin fricción; guarda teléfono y direcciones |
| 2026-10-20 | Confirmación de pedidos virtuales: **Cajero/Admin vía bandeja** de pedidos entrantes | Alguien del local acepta antes de mandar a cocina |
| 2026-10-20 | `Venta` = pedido cobrado (vista) · `Cuenta` = proyección del pedido abierto (vista) · `Caja` = sesión con apertura/cierre · `MovimientoStock` = auditoría | Cierre del modelo DER — ver MODELO.MD §3 para supuestos restantes |
| 2026-10-20 | **Modelos externos**: delegación a Gemini de Google via `opencode run`; default `google/gemini-flash-latest` (Pro/Argon tienen quota 0 en free tier de AI Studio, requieren billing); `worker-gemini` nativo a `gemini-4-argon-high` | Usar quota de Google en vez de créditos Devin para tareas delegadas |
| 2026-10-20 | Postgres **local via Docker** (`docker-compose.yml` + scripts `db:up`/`db:down`) | Infra reproducible sin instalar Postgres en el host |
| 2026-10-20 | Montos: **precios duales `precioArs Int` (entero) + `precioUsd Decimal(12,2)`**; finanzas en ARS entero | Precios en pesos enteros y dólares con 2 decimales (decisión del usuario) |

### Pendientes

- ~~**Pasarela de pago online**~~ → PARCIAL 2026-10-20: puerto `PasarelaPago` + provider `manual`/`externa` (env `PAYMENT_PROVIDER`, `PAYMENT_GATEWAY_URL/KEY`, webhook firmado); el **servicio externo es proyecto aparte futuro**.
- **Impuestos y facturación**: comprobantes, IVA, integración AFIP/ARCA si aplica.
- **Integración redes sociales**: alcance (publicación manual asistida vs. API de Meta/Instagram).
- ~~**Manejo de montos**~~ → RESUELTO 2026-10-20: ARS entero + USD `Decimal(12,2)` (ver §5 Tomadas).

## 6. Registro de tareas y cambios

> Formato: `| Fecha | Tarea | Cambios realizados | Autor |`. Agregar filas **al final**, una por tarea completada.

| Fecha | Tarea | Cambios realizados | Autor |
|---|---|---|---|
| 2026-10-20 | Configuración inicial del monorepo | Estructura `apps/backend`, `apps/frontend`, `packages/`; `pnpm-workspace.yaml`, `package.json` raíz, `.nvmrc` (Node 24), `.gitignore` adaptado a monorepo; creación de `AGENTS.MD`, `RULES.MD`, `DOCUMENTATION.MD`, `GLOSARIO.MD` | Devin |
| 2026-10-20 | Skills de Devin para specs y ejecución paralela | Creación de `.devin/skills/` con `/grill-me` (interrogatorio de requisitos), `/grill-with-docs` (desafío de specs contra docs en paralelo) y `/to-spec` (spec en `specs/` + dispatch a workers); `.devin/agents/` con `worker-sonnet`, `worker-codex`, `worker-gemini` (misma tarea ejecutable en distintos modelos); `specs/` creado; `AGENTS.MD` actualizado | Devin |
| 2026-10-20 | Definición del ciclo de vida pedido/venta (grill con docs) | Resueltas ambigüedades de dominio: cobro virtual configurable, cuenta por mesa + mostrador, stock al confirmar, ciclo atención/pago separados; `GLOSARIO.MD` ampliado con 12+ términos nuevos (cuenta, ítem de pedido, pago, propina, descuento aplicado, anulación, cliente, repartidor, en reparto, estado de mesa, mostrador, confirmación de pedido); decisiones registradas en §5 | Devin |
| 2026-10-20 | Scaffold de apps + decisiones de infra | `apps/backend` NestJS 12 (Vitest, oxlint) y `apps/frontend` Next.js 16 + Tailwind 4 generados e instalados; fix de workspace (eliminados pnpm-workspace.yaml/pnpm-lock.yaml anidados del scaffold, `onlyBuiltDependencies`/`strictDepBuilds` para unrs-resolver); DB PostgreSQL+Prisma, auth JWT access+refresh, realtime Socket.io decididos; dirección UI Agorapulse+Eat App registrada | Devin |
| 2026-10-20 | DER + casos de uso (grill con docs) | Creación de `MODELO.MD`: DER Mermaid con 25 entidades en 8 dominios, diagrama de casos de uso por actor (6 actores + sistema), 14 supuestos documentados, mapeo entidad→módulo NestJS; decisiones nuevas en §5 (receta mixta, reservas, Google OAuth, bandeja de confirmación, Venta/Cuenta como vistas); `GLOSARIO.MD` ampliado (venta, reserva, dirección, movimiento de stock, estado de comanda, presentación, apertura de caja); fix drift docs (NestJS 12, 5 roles) | Devin |
| 2026-10-20 | Integración de modelos Antigravity/Google en Devin | `.devin/skills/via-antigravity/` (delegación de tareas a Gemini de Google via `opencode run`, default `google/gemini-flash-latest` — Pro/Argon quota 0 en free tier); `.devin/agents/worker-antigravity.md`; `worker-gemini` a `gemini-4-argon-high`; `to-spec`, `AGENTS.MD` y §5 actualizados | Devin |
| 2026-10-20 | Skill /debate para duelo de modelos | `.devin/skills/debate/` (rondas propuesta→refutación→síntesis con 2 modelos distintos, posiciones anonimizadas, moderador = agente principal); perfiles `.devin/agents/debater-claude.md` (sonnet) y `debater-gpt.md` (codex) solo-lectura; `AGENTS.MD` actualizado | Devin |
| 2026-10-20 | Spec 001 — sistema completo (draft) | `specs/001-sistema-completo.md`: planificación total en 4 bloques (A fundación Prisma+migraciones+seed, B backend 7 dominios paralelo, C frontend 7 vistas paralelo, D seed demo+verificación); tareas asignadas a worker-sonnet/codex/gemini/antigravity; sin implementación aún | Devin |
| 2026-10-20 | Optimización spec 001 vía /debate | Debate 2 modelos (SWE-2 vs router) sobre descomposición: spec actualizada con contract-first (A2 = DTOs/eventos WS/interfaces/transporte JWT congelados), `src/common` guards en A1, deps completas en A1 (platform-socket.io, passport, google-auth-library, socket.io-client), scopes C corregidos (C1 reducido, components/<mod>/), gate build post-B, nueva C8 repartidor, B4→sonnet (núcleo fuera de antigravity), antigravity solo verificable (B7/C7/C8), B7 sin dep B5; fix drift 24→25 entidades | Devin |
| 2026-10-20 | Abstracción de pasarela de cobros | Spec 001 ampliada: puerto `PasarelaPago` en contratos A2 + `PasarelaManualService`/`PasarelaExternaService` por env `PAYMENT_PROVIDER` + webhook `/pagos/webhook` firmado + `Configuracion` proveedor por canal; deja hook listo para el proyecto de pagos externo futuro; `MODELO.MD` §4 y §5 actualizados | Devin |
| 2026-10-20 | Spec 001 → ejecución: Bloque A parcial | Spec aprobada → `en-ejecución`. **Hecho**: `docker-compose.yml` (postgres:16, contenedor corriendo), `schema.prisma` 25 entidades + enums + montos duales ARS/USD, deps backend instaladas (prisma 8, jwt, passport, websockets, google-auth, class-validator...), `.env`/`.env.example`, `PrismaModule` global registrado en `app.module`, `src/common/` (JwtAuthGuard+RolesGuard+@Roles+@CurrentUser+@Auth), `packages/shared` con 19 enums + contratos por dominio + eventos WS + puerto `PasarelaPago`, `prisma/seed.ts` catálogos, scripts `db:up/down/migrate/seed`. **Pendiente**: migración inicial — prisma 8 renombró el comando (`migrate dev` ya no existe; usar `prisma migration new`/revisar CLI) | Devin |
| 2026-10-20 | Bloque C frontend completo (9/9) + Bloque D + spec cerrada | Frontend por workers paralelos: **C1** shell dashboard Agorapulse (sidebar por rol, login, api client JWT refresh single-flight, RoleGuard, primitivas UI); **C2** salón/mesas estilo Eat App (mapa por zona, vista mozo, reservas del día); **C3** cocina realtime (WS + beep + semáforo tiempo); **C4** caja (pago mixto+propina, bandeja virtuales, egresos, estado cobro pasarela); **C5** admin CRUDs 6 secciones; **C6** portal público (carta, carrito, checkout invitado/Google OAuth, seguimiento, reserva); **C7** reportes recharts 4 subrutas; **C8** repartidor; **C9** bandeja pedidos staff. **Gaps backend cerrados**: `POST /pedidos/publico`+`GET /pedidos/mios`+`POST /reservas/publica`, `GET/PUT /configuracion`, filtro `estadoPago`+`clienteId` en pedidos, `descuentos`+`cliente` en payload, anulación de comandas al cancelar pedido, mesas legibles por cocina, Reserva.mesaId nullable (migración 3). **D**: seed demo completo (5 usuarios rol, 8 mesas, turno, insumos+receta empanada, 6 variedades+3 regionales+bebida+postre, 4 pedidos estados variados, 2 reservas, caja abierta). **Verificación final**: `pnpm -r lint build` verde (27 rutas prerenderizadas), backend 77/77 tests, spec 001 → `completada` | Devin |
| 2026-10-20 | Cierre de pendientes spec 001 | **Backend**: `GET /pedidos/:id/seguimiento` público (tracking invitado sin login, cuid como token, sin datos staff/pagos); `reponerPorPedido()` en `InsumosStockService`+interfaz `StockService` (reposicion_cancelacion al cancelar pedido, llamado desde `cambiarEstado→cancelado`); fix warning spread clase en `reservas.service.ts`; `GET/PUT /configuracion` (módulo nuevo, admin-only). **Frontend**: `config-admin` editable en vivo; `.env.example` con `NEXT_PUBLIC_API_URL`+`NEXT_PUBLIC_GOOGLE_CLIENT_ID`; sidebar cajero en Reparto/Reportes. Verificación: tsc 0 errores, 77/77 tests, lint limpio | Devin |
| 2026-10-20 | Bloque B backend completo (7/7 workers) | Todos los dominios implementados en paralelo (subagent_general ×6 + parent): **B1** auth JWT access+refresh+rotación+Google OAuth clientes (5t); **B2** menú+promos con motor de descuentos puro 4 tipos (11t); **B3** salón+reservas+turnos anti-solapamiento (20t); **B4** pedidos+comandas+WS estado derivado de comandas (15t); **B5** finanzas caja+pagos mixtos+pasarela manual/externa+webhook HMAC (10t); **B6** insumos+stock `descontarPorPedido` transaccional **delta-aware** (4t); **B7** reportes agregaciones (11t). **Gate**: 13 módulos wireados en `app.module`, PrismaModule global, Pedidos→Insumos por token `STOCK_SERVICE`, ValidationPipe+CORS en main.ts, shared compilado a dist/ (fix ESM runtime), 2 migraciones (init + nullables), `pnpm db:seed` catálogos OK, **77/77 tests + build + boot OK**. Fixes de drift: Reserva.clienteId/creadaPorId y MovimientoStock.usuarioId opcionales | Devin |
