# Upstream — plan de implementación

## Objetivo (PRD corto)

Fondo animado WebGL: cientos de rayos finos que nacen de un punto bajo el borde
inferior y se abren en abanico hacia arriba. Cada rayo va de una cola casi
transparente a una cabeza iluminada con un punto brillante. Al pasar el cursor,
los rayos se apartan a su alrededor sin deformarse.

Inspirado en "Connectivity Graph" de OriginKit (componente de pago). **No se usa
su código**: la implementación parte del video de referencia y de la descripción
pública del efecto.

## Stack (y por qué)

| Decisión | Motivo |
|---|---|
| WebGL 1 sin librerías | Igual que la referencia (`dependencies: []`). Mismo resultado que three/ogl, ~0 KB extra y máxima compatibilidad. |
| TypeScript | Tipos para la API pública y DX en editores. |
| Núcleo vanilla + adaptadores | Un motor `createUpstream(canvas, opts)` y encima: componente React y Web Component `<upstream-fx>`. Sirve en React/Next, Framer, Vue, Webflow o HTML plano. |
| Vite (lib + demo) | Build de librería ESM, bundle IIFE para CDN y playground con HMR. |
| Vitest + jsdom + Testing Library | Tests de lógica pura y del ciclo de vida de los adaptadores. |

## Arquitectura

```
src/core/color.ts      parseo de colores → rgba normalizado (puro)
src/core/options.ts    defaults, validación, clamps, merge inmutable (puro)
src/core/shaders.ts    GLSL: simulación entera en GPU
src/core/gl.ts         helpers de compilación/buffers
src/core/engine.ts     ciclo de vida: resize, rAF, puntero, visibilidad, contexto perdido
src/react/Upstream.tsx adaptador React (client component)
src/element/*          Custom Element <upstream-fx> + registro
demo/                  playground con controles y snippet de código
registry.json          fuente del registry shadcn → public/r/upstream.json
examples/cdn.html      uso con <script> en HTML plano
```

Simulación sin estado en CPU: cada rayo tiene atributos estáticos
(semilla, fase, velocidad). El vertex shader calcula la distancia recorrida con
`u_time`, elige ángulo por ciclo con un hash, aplica longitud
`min(max, d·k)`, color por distancia y repulsión rígida en el punto del rayo más cercano al cursor (el muestreo en el punto medio, que describe la referencia, dejaba el hueco desplazado hacia las colas).
Dos draw calls por frame (rayos + puntos).

## Riesgos

- Precisión float con `u_time` muy grande → aceptado: el tiempo solo avanza mientras el efecto es visible, y la precisión se mantiene sub-píxel durante horas de animación continua.
- Pérdida de contexto WebGL → escuchar `webglcontextlost/restored` y reconstruir.
- Sin WebGL → instancia no-op, se ve el color de fondo.
- `prefers-reduced-motion` → un frame estático, sin bucle.
- Coste en segundo plano → pausa con IntersectionObserver y `visibilitychange`.

## Tareas

1. Tests + implementación de `color` y `options` (TDD).
2. Shaders + motor; verificación visual contra el video.
3. Adaptador React + test de ciclo de vida.
4. Web Component + bundle CDN.
5. Playground de demo.
6. Registry shadcn, README con estrategia de distribución.
7. Code review (agente) y verification loop.
