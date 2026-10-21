# AGENTS.MD — Guía de entrada para agentes de IA

Este archivo es el **punto de entrada obligatorio** para cualquier agente de IA (o desarrollador nuevo) que trabaje en este repositorio. Leélo completo antes de tocar código.

## ¿Qué es resto-huma?

**resto-huma** es un sistema de gestión para un restaurante de comida regional del **norte argentino**. Su objetivo es:

- Administrar **ventas** del local.
- Gestionar el **menú/carta** (producto principal: **empanadas**, extensible a otras comidas regionales como humitas, tamales y locro).
- Facilitar la **atención a clientes por parte de los mozos** (mesas, comandas).
- Agilizar la **toma de pedidos** tanto de forma **presencial** como **virtual** (online/delivery).
- **Promocionar** el local en redes sociales.
- Gestionar los **ingresos y egresos económicos** (finanzas, caja) y los **insumos/recursos** utilizados (stock, inventario).

Para entender la terminología del negocio (mozo, comanda, insumo, cierre de caja, etc.), consultá **[GLOSARIO.MD](./GLOSARIO.MD)**.

## Mapa del repositorio

```
resto-huma/
├── apps/
│   ├── backend/          # API REST con NestJS (TypeScript)
│   └── frontend/         # Web app con Next.js (App Router + TypeScript + Tailwind)
├── packages/             # Código compartido (tipos, DTOs, utilidades)
├── specs/                # Specs de features (generadas por /to-spec, numeradas)
├── .devin/
│   ├── skills/           # Skills invocables: /grill-me, /grill-with-docs, /to-spec, /via-antigravity
│   └── agents/           # Perfiles: worker-sonnet/codex/gemini/antigravity + debater-claude/gpt
├── pnpm-workspace.yaml   # Definición de workspaces (apps/*, packages/*)
├── package.json          # Scripts raíz que delegan a cada app
├── AGENTS.MD             # ← Este archivo
├── RULES.MD              # Reglas obligatorias de trabajo
├── DOCUMENTATION.MD      # Documentación viva: objetivo, arquitectura, registro de cambios
├── MODELO.MD             # DER + casos de uso del dominio (Mermaid)
└── GLOSARIO.MD           # Terminología del dominio del negocio
```

## Mapa de documentos (orden de lectura)

| Archivo | Propósito | ¿Cuándo leerlo? |
|---|---|---|
| `AGENTS.MD` | Contexto general y workflow | Siempre, primero |
| `RULES.MD` | Reglas obligatorias (código, git, docs) | Siempre, antes de escribir código |
| `GLOSARIO.MD` | Términos del dominio | Al trabajar en lógica de negocio |
| `MODELO.MD` | DER + casos de uso (entidades, relaciones, actores, supuestos) | Antes de modelar datos o módulos |
| `DOCUMENTATION.MD` | Arquitectura, módulos y **registro de tareas/cambios** | Antes de planificar y **al terminar cada tarea** |

## Skills del proyecto (`.devin/skills/`)

| Skill | Uso |
|---|---|
| `/grill-me <idea>` | Interroga al usuario para extraer requisitos antes de planificar |
| `/grill-with-docs <spec\|tema>` | Desafía una spec/plan cruzándola en paralelo contra los docs y el código |
| `/to-spec <tema>` | Genera una spec en `specs/` y despacha sus tareas en paralelo a workers con distintos modelos |
| `/via-antigravity <tarea>` | Delega una tarea a los modelos Gemini de Google (cuenta del usuario) via opencode CLI |
| `/debate <tema\|archivo>` | Enfrenta 2 modelos (Claude vs GPT por defecto) en rondas de debate sobre docs o implementación para hallar la opción óptima |

Flujo típico: `/grill-me` → `/to-spec` → (si hace falta) `/grill-with-docs` → ejecución en paralelo.
Los workers (`worker-sonnet`, `worker-codex`, `worker-gemini`, `worker-antigravity` en `.devin/agents/`) ejecutan cada tarea en un modelo distinto; el agente principal integra y registra los cambios. Los perfiles `debater-claude`/`debater-gpt` son debatientes de solo-lectura usados por `/debate`.

### Modelos externos (Antigravity/Google)

Además de los modelos nativos de Devin, las tareas pueden delegarse a los modelos Gemini de la cuenta Google del usuario vía **opencode CLI** (`opencode run --model google/<id>`):

- Prerequisito: `opencode` instalado + `opencode auth` con Google (ya configurado en esta máquina).
- Modelo por defecto: `google/gemini-flash-latest` (free tier verificado). ⚠️ Los modelos Pro (`google/gemini-4-argon`, `google/gemini-pro-latest`) devuelven quota 0 con API key de AI Studio — requieren billing habilitado.
- Consume la quota de Google del usuario, **no** créditos Devin.
- Caveat: es un proceso externo que edita el working tree sin contexto de Devin — siempre revisar el diff resultante (el skill `/via-antigravity` y `worker-antigravity` lo hacen por contrato).

## Workflow obligatorio

1. **Leer** este archivo y `RULES.MD` completo.
2. **Consultar** `DOCUMENTATION.MD` para ver el estado actual, módulos existentes y cambios recientes.
3. **Consultar** `GLOSARIO.MD` si la tarea involucra conceptos del negocio.
4. **Planificar** la tarea identificando qué app/módulo toca (`apps/backend`, `apps/frontend`, `packages`).
5. **Implementar** siguiendo las reglas de `RULES.MD`.
6. **Registrar** la tarea y los cambios en la tabla *"Registro de tareas y cambios"* de `DOCUMENTATION.MD`. **Este paso no es opcional.**

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces (Node 24, ver `.nvmrc`) |
| Backend | NestJS + TypeScript (DB por definir, ver DOCUMENTATION.MD) |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Compartido | `packages/` para tipos/DTOs compartidos entre front y back |

## Comandos raíz

```bash
pnpm install          # instalar dependencias de todo el workspace
pnpm dev:backend      # levantar API NestJS (apps/backend)
pnpm dev:frontend     # levantar Next.js (apps/frontend)
pnpm build            # build de todos los paquetes
pnpm lint             # lint de todos los paquetes
pnpm test             # tests de todos los paquetes
```

> Nota: las apps ya están scaffoldeadas (NestJS 12 + Next.js 16). El frontend tiene su propio `apps/frontend/AGENTS.md` con reglas de Next 16 — leerlo antes de tocar código de frontend.
