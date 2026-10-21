# RULES.MD — Reglas obligatorias de trabajo

Reglas que **todo agente de IA y desarrollador** debe respetar en este repositorio. Si una regla entra en conflicto con una instrucción puntual del usuario, avisar y pedir confirmación antes de violarla.

## 1. Documentación viva

- **Toda tarea o cambio debe registrarse** en la tabla *"Registro de tareas y cambios"* de `DOCUMENTATION.MD` (fecha, tarea, cambios realizados, autor). Sin excepciones.
- Si se agrega un **módulo, entidad o término de dominio nuevo**, actualizar también `GLOSARIO.MD` y/o la sección de módulos de `DOCUMENTATION.MD`.
- Si se toma una **decisión técnica** (librería, patrón, DB, etc.), documentarla en *"Decisiones técnicas"* de `DOCUMENTATION.MD`.
- La documentación se escribe en **español**.

## 2. Idioma y nomenclatura

- **Documentación, comentarios y mensajes de commit**: español.
- **Identificadores de código** (variables, funciones, clases, archivos): inglés, **excepto** términos de dominio definidos en `GLOSARIO.MD`, que pueden mantenerse en español para preservar la semántica del negocio (ej.: `Pedido`, `Mesa`, `Comanda`, `Insumo`).
- **Strings visibles al usuario**: español (el sistema es para un restaurante argentino).

## 3. Monorepo y gestor de paquetes

- Usar **únicamente pnpm** (ver `packageManager` en `package.json` raíz). Prohibido mezclar `npm`/`yarn`: genera lockfiles inconsistentes.
- Las dependencias se instalan desde la raíz: `pnpm install`. Para agregar una dependencia a una app: `pnpm --filter <paquete> add <dep>`.
- Código compartido entre backend y frontend (tipos, DTOs, enums, constantes) va en `packages/`, nunca duplicado.
- Respetar las versiones de Node (`.nvmrc`) y pnpm (`packageManager`).

## 4. Estilo de código

- **Backend (`apps/backend`)**: seguir convenciones de NestJS — módulos, controllers, services, DTOs con validación (`class-validator`), inyección de dependencias. Un módulo por dominio de negocio (ventas, menú, pedidos, mozos, finanzas, insumos).
- **Frontend (`apps/frontend`)**: Next.js **App Router**, TypeScript estricto, Tailwind CSS. Componentes de servidor por defecto; `"use client"` solo cuando sea necesario. **Next 16 tiene breaking changes**: leer `apps/frontend/AGENTS.md` y consultar `apps/frontend/node_modules/next/dist/docs/` antes de escribir código de frontend. Estilo UI de referencia: dashboard tipo Agorapulse + gestión de salón tipo Eat App.
- Tipos compartidos (contratos API, DTOs) definidos en `packages/` y consumidos por ambas apps para evitar drift front/back.
- Código compacto e idiomático; sin `try/catch` innecesarios ni manejo de errores redundante.
- No agregar ni eliminar comentarios de código salvo que la tarea lo requiera.

## 5. Git y commits

- Mensajes de commit con **Conventional Commits** en español: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:` (ej.: `feat(ventas): registrar pedido presencial`).
- **Prohibido commitear** secretos, `.env`, credenciales o tokens. Usar `.env.example` para documentar variables.
- No hacer `push` ni merge salvo que el usuario lo pida explícitamente.
- No commitear `node_modules`, `dist`, `.next`, `coverage` (ya cubiertos por `.gitignore`).

## 6. Testing y verificación

- Features nuevas deben incluir tests (unitarios en backend con Jest; en frontend los que provea el scaffold).
- Antes de dar por terminada una tarea: correr `lint`, `build` y `test` del paquete afectado (o `pnpm -r` desde raíz).
- Nunca commitear código que no compile o rompa el build.

## 7. Seguridad y datos

- Nunca loguear ni exponer secretos, tokens ni datos sensibles.
- Variables de entorno documentadas en `.env.example` de cada app, sin valores reales.
- Validar **toda** entrada de API con DTOs (`class-validator` en NestJS). Nada de `any` implícito en payloads.
- Datos de dinero: usar tipos enteros (centavos) o `Decimal`; **nunca `number` flotante** para montos.

## 8. Autonomía y scope

- No modificar código fuera del alcance de la tarea pedida.
- Ante ambigüedad de negocio (precios, roles, flujo de pedidos, impuestos), **preguntar antes de asumir**.
- Operaciones destructivas (borrar datos, drop de tablas, `rm -rf`, force-push) requieren confirmación explícita del usuario.
