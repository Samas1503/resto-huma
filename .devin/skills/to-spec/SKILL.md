---
name: to-spec
description: Convierte una idea/requirement en una spec paralelizable en specs/ y opcionalmente despacha las tareas a workers con distintos modelos
argument-hint: "<tema o archivo de spec a ejecutar>"
triggers:
  - user
allowed-tools:
  - read
  - grep
  - glob
  - exec
  - write
  - edit
  - ask_user_question
  - run_subagent
  - read_subagent
---

# /to-spec — De idea a spec ejecutable en paralelo

Convierte un pedido, idea o resumen de `/grill-me` en una **spec formal** en `specs/`, descompuesta en tareas que pueden ejecutarse **en paralelo por subagentes con distintos modelos**. Si el usuario ya aprobó una spec y pide ejecutarla, salteá a la fase de dispatch (paso 5).

## Fase 1 — Contexto

1. Leé `AGENTS.MD`, `RULES.MD`, `DOCUMENTATION.MD` y `GLOSARIO.MD` (reglas y dominio obligatorios).
2. Reuní el input: pedido del usuario, resumen de `/grill-me`, o resultado de `/grill-with-docs`.
3. Si el input es ambiguo en algo que cambie el diseño, preguntá con `ask_user_question` ANTES de escribir la spec — o mejor, sugerí correr `/grill-me` primero.

## Fase 2 — Escribir la spec

Creá `specs/NNN-<slug>.md` (`NNN` = siguiente número secuencial en `specs/`, empezando en `001`), con este formato:

```markdown
# Spec NNN — <título>

> Estado: draft | aprobada | en-ejecución | completada
> Creada: <fecha> — Origen: <grill-me / usuario / issue>

## 1. Objetivo
Qué se construye y por qué, en 2-3 oraciones.

## 2. Contexto y referencias
Links/secciones de AGENTS.MD, DOCUMENTATION.MD, GLOSARIO.MD, specs previas
y archivos de código relevantes.

## 3. Alcance
### Dentro de scope
### Fuera de scope (explícito)

## 4. Diseño
Decisiones técnicas, modelos de datos, endpoints, pantallas.
Respetar RULES.MD (DTOs, montos sin floats, convenciones Nest/Next).

## 5. Descomposición en tareas
| # | Tarea | Scope de archivos | Depende de | Ejecución |
|---|-------|-------------------|------------|-----------|
| T1 | ... | apps/backend/src/x/** | — | PARALELA → worker-sonnet |
| T2 | ... | apps/frontend/src/y/** | — | PARALELA → worker-codex |
| T3 | integración | — | T1, T2 | SECUENCIAL (parent) |

Reglas de descomposición:
- Cada tarea PARALELA debe tener **scope de archivos disjunto** — dos workers
  nunca tocan el mismo archivo.
- Ninguna tarea de worker toca DOCUMENTATION.MD ni specs/: eso lo hace el parent.
- Tareas de integración/wiring van como SECUENCIAL al final.
- Workers disponibles: worker-sonnet (Claude), worker-codex (GPT),
  worker-gemini (Gemini 4 Argon nativo Devin), worker-antigravity
  (delega a Gemini de Google via opencode — quota del usuario, no créditos Devin).
  Distribuí para aprovechar paralelismo y diversidad.

## 6. Criterios de aceptación
Checklist verificable.

## 7. Verificación
Comandos concretos (pnpm lint/build/test por paquete).
```

Presentá la spec al usuario y esperá aprobación antes de ejecutar.

## Fase 3 — Dispatch en paralelo (tras aprobación)

1. Actualizá el estado de la spec a `en-ejecución`.
2. Lanzá un `run_subagent` **por tarea paralela**, con `is_background: true`, profile = el worker asignado (`worker-sonnet`, `worker-codex`, `worker-gemini`), y un prompt autónomo que incluya:
   - La tarea completa y su scope de archivos (copiada de la spec).
   - "Trabajás en el repo resto-huma (sistema de gestión de restaurante, monorepo pnpm). Leé AGENTS.MD, RULES.MD y GLOSARIO.MD antes de codear."
   - "No toques archivos fuera de tu scope. No edites DOCUMENTATION.MD, RULES.MD ni specs/. Reportá al terminar: archivos creados/modificados, decisiones tomadas y qué falta."
   - Criterios de aceptación de la tarea.
3. Mientras corren, ejecutá vos las tareas SECUENCIALES sin dependencias, o esperá.
4. Al completar los workers: revisá sus cambios (`git diff`), corré la verificación de la spec, hacé la integración/wiring final.
5. **Cerrá**: actualizá el estado de la spec a `completada`, registrá la tarea en el *Registro de tareas y cambios* de `DOCUMENTATION.MD` (obligatorio por RULES.MD §1) y si aparecieron términos de dominio nuevos, sumalos a `GLOSARIO.MD`.

## Reglas

- Todo en **español** (spec, reportes, commits).
- La spec es la fuente de verdad: si un worker se desvía del scope, corregilo.
- Nunca dos workers sobre el mismo archivo — si la descomposición lo exige, replanteá las tareas.
- Commiteá trabajo de workers integrado y verificado; no commitees specs en estado draft como si fueran código terminado.
