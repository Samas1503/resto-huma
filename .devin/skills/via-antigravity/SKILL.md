---
name: via-antigravity
description: Delega una tarea a los modelos Gemini de Google (cuenta Antigravity) via opencode CLI y revisa el resultado
argument-hint: "<tarea a delegar> [--model google/<id>]"
triggers:
  - user
allowed-tools:
  - read
  - grep
  - glob
  - exec
  - ask_user_question
---

# /via-antigravity — Delegación a modelos Gemini de Google

Ejecuta una tarea usando los modelos de Google de la cuenta del usuario (Antigravity/AI Studio) a través de **opencode CLI** como puente. Devin orquesta y verifica; el modelo externo implementa.

## Precondiciones (verificar antes de correr)

- `opencode` instalado (`which opencode`) — actualmente v2.0.24 con auth Google `stored`.
- Si la auth falta: `opencode auth` y seguir el flujo de login Google.
- Modelo por defecto: `google/gemini-flash-latest` (free tier verificado). Si el usuario pasa `--model google/<id>`, usar ese.
- ⚠️ Quota verificada 2026-10-20: `google/gemini-4-argon` y `google/gemini-pro-latest` devuelven **quota 0 con la API key de AI Studio** (tier Pro requiere billing). Solo los modelos `flash` responden en free tier. Si el usuario tiene billing habilitado, los Pro/Argon deberían funcionar.

## Procedimiento

1. **Contexto**: leé `AGENTS.MD`, `RULES.MD` y `GLOSARIO.MD` para extraer las reglas que aplican a la tarea (montos, DTOs, idioma, scope de dominio).
2. **Construí un prompt autocontenido** para opencode — el proceso externo NO ve esta conversación ni los docs salvo que se los incluyas o le pidas leerlos:

   ```
   Trabajás en el repo resto-huma (sistema de gestión de restaurante, monorepo pnpm:
   apps/backend NestJS 12, apps/frontend Next.js 16, packages/ compartido).
   Leé primero AGENTS.MD, RULES.MD y GLOSARIO.MD para las reglas del proyecto.

   TAREA: <tarea del usuario, detallada>
   SCOPE: <archivos/directorios que puede tocar — explícito>
   REGLAS CLAVE: docs en español; identificadores en inglés salvo dominio del glosario;
   montos sin floats (Decimal/centavos); DTOs con class-validator en backend;
   no edites DOCUMENTATION.MD, RULES.MD, GLOSARIO.MD, MODELO.MD ni specs/.
   Al terminar listá qué archivos creaste/modificaste y qué falta.
   ```

3. **Ejecutá** desde la raíz del repo:

   ```bash
   opencode run --model google/gemini-flash-latest "<prompt>"
   ```

   (timeout generoso — el agente externo puede tardar; correr en background si la tarea es grande)

4. **Revisá el resultado** — opencode edita el working tree directamente:
   - `git status` + diff de los archivos del scope para auditar los cambios.
   - Verificá que no tocó archivos fuera de scope ni los docs prohibidos.
   - Corré la verificación pertinente (`pnpm --filter <pkg> lint/build/test` si hubo código).
   - Si el resultado es malo o incompleto, revertí lo necesario y reportá — no lo des por bueno.

5. **Cerrá**: registrá la tarea en la tabla *Registro de tareas y cambios* de `DOCUMENTATION.MD` (obligatorio, RULES.MD §1) anotando `via opencode/google-<modelo>` en la columna de autor junto a Devin.

## Advertencias

- **Proceso externo**: opencode corre su propio agente sin tools ni contexto de Devin. Todo lo que necesite saber debe ir en el prompt o ser legible desde el repo.
- **Edición directa**: modifica el working tree sin red de seguridad — la revisión de diff es obligatoria, no opcional.
- **Quota**: consume la cuota de Google del usuario, no créditos de Devin.
- Si la tarea es grande o ambigua, mejor correr `/grill-me` o `/to-spec` primero — este skill es para delegación puntual y bien acotada.
