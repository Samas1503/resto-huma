---
name: debate
description: Enfrenta 2 modelos (Claude vs GPT por defecto) en rondas de debate sobre una documentación o implementación para encontrar la opción más óptima
argument-hint: "<tema|archivo|spec> [--a perfil-a] [--b perfil-b]"
triggers:
  - user
allowed-tools:
  - read
  - grep
  - glob
  - exec
  - run_subagent
  - read_subagent
  - ask_user_question
---

# /debate — Duelo de modelos sobre docs o implementación

Dos modelos distintos **debaten** una documentación, spec o implementación para encontrar la mejor opción. Vos (el agente principal) sos el moderador: encuadrás el tema, corré las rondas y sintetizás el veredicto.

## Debatientes

- Por defecto: `debater-claude` (Sonnet) y `debater-gpt` (Codex) en `.devin/agents/`.
- Si el usuario pasa `--a <perfil>` / `--b <perfil>`, usar esos perfiles (`worker-*`, `worker-antigravity`, `subagent_explore` también valen).
- Los dos debatientes deben ser **modelos distintos** — ese es el punto.

## Procedimiento

1. **Encuadre**: identificá el objeto del debate — si es archivo (`MODELO.MD`, `specs/...`, código) leélo; si es tema/pregunta, formulalo como pregunta concreta con opciones posibles ("¿cuál es la mejor forma de X?"). Si el objeto es ambiguo, preguntá con `ask_user_question`.

2. **Ronda 1 — Propuestas** (2 subagentes en paralelo, `is_background: true`): a cada debatiente pasale el objeto completo (los subagentes no ven esta conversación) + instrucción:
   > "Debate sobre: <objeto>. Proponé la opción más óptima técnicamente (costo, complejidad, mantenibilidad, fit con las reglas del repo). Defendela con evidencia y anticipá contraargumentos. Reportá en el formato de tu system prompt."

3. **Ronda 2 — Refutación** (2 subagentes nuevos en paralelo): a cada uno pasale **la posición RIVAL completa** etiquetada neutralmente como "Posición A" / "Posición B" (sin revelar qué modelo la escribió — evita sesgo) + su propia posición, con la instrucción:
   > "Acá está tu posición y la del rival. Refutá sus puntos débiles uno por uno, concedé donde tenga razón, y ajustá tu veredicto si la evidencia lo amerita."

4. **Síntesis del moderador** — producí:

   ```markdown
   ## Resultado del debate: <tema>

   ### Consenso (en lo que ambos modelos coinciden)
   ### Opción ganadora y por qué (con evidencia de las rondas)
   ### Trade-offs que quedan abiertos
   ### Desacuerdos no resueltos (si hay) → decisión del usuario
   ```

5. **Cierre**: si hay desacuerdo no resuelto, presentá las opciones finales con `ask_user_question`. Si el debate fue sobre una doc/implementación existente y hubo ganador claro, ofrecé aplicar los cambios (corrección del archivo, `/to-spec`, etc.). Si el debate generó decisiones nuevas, ofrecé registrarlas en `DOCUMENTATION.MD` §5.

## Reglas

- Todo en **español**.
- No reveles qué modelo escribió cada posición hasta la síntesis final (moderá sin sesgo).
- Un debate no inventa problemas: cada argumento ganador necesita evidencia del repo o razonamiento técnico explícito.
- Máximo 2 rondas por defecto (propuesta + refutación) — si el usuario pide más profundidad, agregá una ronda de cierre.
