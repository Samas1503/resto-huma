---
name: grill-with-docs
description: Desafía una spec, plan o propuesta cruzándola en paralelo contra los docs del proyecto y el código real
argument-hint: "[spec-file o tema a desafiar]"
triggers:
  - user
allowed-tools:
  - read
  - grep
  - glob
  - exec
  - run_subagent
  - read_subagent
---

# /grill-with-docs — Interrogatorio contra la documentación

El usuario te dio una spec, plan o propuesta. Tu trabajo es **atacarla**: encontrar contradicciones, supuestos falsos, huecos y riesgos usando como evidencia la documentación del proyecto y el estado real del código. No se trata de validar — se trata de encontrar dónde se rompe.

## Procedimiento

1. **Identificá el objetivo del grill**: si el usuario pasó un archivo (ej.: `specs/...`), leélo; si pasó un tema o idea, reconstruí la propuesta desde la conversación.
2. **Lanzá subagentes de exploración en paralelo** (profile `subagent_explore`, `is_background: true`), uno por frente:

   - **Subagente "docs"**: leé `AGENTS.MD`, `RULES.MD`, `DOCUMENTATION.MD`, `GLOSARIO.MD` completos. Reportá: módulos/estado real del sistema, decisiones técnicas tomadas y pendientes, reglas que la propuesta podría violar, términos de dominio mal usados o faltantes.
   - **Subagente "código"**: inspeccioná el estado real del repo (estructura, código existente en `apps/`, `packages/`, configs). Reportá qué existe vs. qué la propuesta asume que existe; convenciones reales que la propuesta ignora.
   - **Subagente "dominio"** (opcional si la propuesta toca lógica de negocio): verificá contra `GLOSARIO.MD` que los flujos propuestos respetan la semántica del negocio (mozo, comanda, caja, insumos, pedido presencial/virtual).

   Promptá cada subagente con la propuesta textual completa (o la ruta del spec file) — los subagentes no ven esta conversación.

3. **Sintetizá** los reportes en una lista de **cuestionamientos**, ordenados por gravedad:

```markdown
## Resultado del grill: <tema>

### Bloqueantes (la propuesta se rompe si esto es cierto)
1. ...

### Contradicciones con docs/decisiones
1. ...

### Supuestos no verificados
1. ...

### Huecos (lo que la propuesta no contempla)
1. ...

### Preguntas que la spec debe responder antes de implementarse
1. ...
```

4. **Presentá el resultado al usuario** y, si hay bloqueantes o preguntas abiertas, preguntá cómo resolverlas (usá `ask_user_question` cuando haya opciones claras). Si la propuesta sobrevive, sugerí `/to-spec` (si era una idea) o la corrección del spec file.

## Reglas

- Todo en **español**.
- Sé escéptico: reportá solo cuestionamientos con evidencia (archivo/sección concreta del doc o del código). Sin inventar problemas.
- No modifiques archivos — este skill solo lee y reporta.
- Si la propuesta contradice `RULES.MD` (ej.: toca montos con floats, no registra changelog), marcalo como bloqueante.
