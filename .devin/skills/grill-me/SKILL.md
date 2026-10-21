---
name: grill-me
description: Interroga al usuario con preguntas punzantes para extraer requisitos antes de planificar o escribir una spec
argument-hint: "[idea o feature a definir]"
triggers:
  - user
allowed-tools:
  - read
  - grep
  - glob
  - ask_user_question
---

# /grill-me — Interrogatorio de requisitos

El usuario te pidió que lo "grilles": tu trabajo es **interrogarlo** hasta que la idea quede completamente especificada. NO escribas código ni specs todavía — solo preguntá y sintetizá.

## Contexto del proyecto

Este repo es **resto-huma**: sistema de gestión para restaurante de comida regional del norte argentino (producto principal: empanadas). Antes de preguntar, leé `AGENTS.MD`, `DOCUMENTATION.MD` y `GLOSARIO.MD` para no preguntar lo que ya está decidido o definido.

## Procedimiento

1. **Leé los docs del proyecto** (`AGENTS.MD`, `DOCUMENTATION.MD`, `GLOSARIO.MD`) para conocer módulos existentes, decisiones tomadas y pendientes.
2. Analizá la idea/pedido del usuario y listá los **puntos ambiguos o no resueltos**: alcance, usuarios/roles afectados, flujo de negocio, casos borde, datos, integraciones, prioridades.
3. **Preguntá en tandas de 3-5 preguntas**, priorizadas por impacto. Usá `ask_user_question` para preguntas con opciones claras; usá texto libre para las abiertas. Reglas:
   - Preguntas **concretas y punzantes**, no genéricas. Mal: "¿qué queres?" Bien: "¿el pedido virtual se cobra online, al retirar, o ambos?"
   - Cada pregunta debe cambiar una decisión de diseño. Si la respuesta no afecta nada, no la hagas.
   - Si una respuesta abre nuevas ambigüedades, hacé follow-up antes de pasar de tema.
   - Desafiá supuestos del usuario cuando contradigan los docs o el dominio (ej.: un flujo que no cierra con `mozo`/`comanda`).
4. Iterá hasta cubrir: **quién lo usa, qué hace exactamente, qué pasa en los casos borde, qué NO hace (fuera de scope), cómo se verifica que funciona**.
5. **Sintetizá** las respuestas en un resumen estructurado:

```markdown
## Resumen del interrogatorio
- Objetivo: ...
- Usuarios/roles: ...
- Flujo principal: ...
- Casos borde: ...
- Fuera de scope: ...
- Criterios de aceptación: ...
- Decisiones pendientes (si quedaron): ...
```

6. Terminá sugiriendo el siguiente paso: `/to-spec <tema>` para convertir el resumen en spec, o `/grill-with-docs` para desafiarla contra la documentación.

## Reglas

- Todo en **español**.
- No asumas respuestas: si es ambiguo y afecta el diseño, preguntá.
- No escribas archivos ni modifiques nada — este skill solo produce el resumen en la conversación.
