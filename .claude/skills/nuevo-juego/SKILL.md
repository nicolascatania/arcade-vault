---
name: nuevo-juego
description: Porta un juego de referencia (vanilla JS canvas, en references/started-games/) al motor TS + GAME_REGISTRY + leaderboard Supabase de arcade-vault, siguiendo el patrón fijado por specs/05-asteroids-rocas.md y specs/06-leaderboard-y-catalogo-supabase.md. Usar cuando el usuario pida agregar, portar o integrar un nuevo juego a la plataforma (con su leaderboard funcionando).
---

# Nuevo juego — port a arcade-vault

Codifica el patrón que specs 05 y 06 ya probaron con "rocas" (Asteroids), para no repetir el diseño en cada juego nuevo. NO reemplaza `/spec` si el juego necesita decisiones de producto nuevas (mecánica distinta, UI nueva) — es para el caso mecánico: "tengo un `game.js` en `references/started-games/`, quiero que viva en la plataforma con leaderboard real".

## 0. Precondición: mapear a un `id` existente

`GAMES` en `data.ts` y la tabla `games` de Supabase ya tienen 8 entradas fijas (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `rocas`, `duelo-pixel`). El juego de referencia se porta a UNO de esos `id` según su género — no se inventan ids nuevos salvo pedido explícito del usuario:

| id | título | género | referencia típica |
|---|---|---|---|
| `caida` | CAÍDA | puzzle de piezas que caen | `03-tetris` (ya implementado) |
| `bloque-buster` | BLOQUE BUSTER | breakout/arkanoid | `04-arkanoid` |
| `rocas` | ROCAS | shooter espacial | `02-asteroids` (ya implementado) |
| `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel` | — | snake, pacman, space invaders, frogger, pong | (sin referencia aún) |

## 0.5 Rama nueva — SIEMPRE, antes de tocar un solo archivo

Nunca se implementa directo sobre `main` (ni sobre la rama en la que el usuario esté parado si es `main`). Antes del paso 1:

```bash
git status   # confirmar que no hay cambios sin commitear de otro trabajo en curso
git checkout -b juego-<id>   # ej. juego-caida, juego-bloque-buster
```

Si ya hay cambios sin commitear en `main` que no son de este port (trabajo previo del usuario), NO los pises ni los mezcles — avisar y preguntar antes de crear la rama. Si `main` está limpio, `git checkout -b` se lleva cualquier cambio que hagas de acá en más a la rama nueva automáticamente. El nombre sigue el mismo espíritu que `spec-NN-slug` de `/spec-impl`, pero sin número de spec porque esto no nace de un `/spec` — `juego-<id>` alcanza.

Si el `id` correcto no es obvio, preguntá antes de asumir.

## 1. Leer la referencia

Antes de escribir nada, leer completo `references/started-games/<NN-juego>/game.js` (y su `CLAUDE.md` si existe — suele documentar constantes ajustables, estructura de estado y el flujo `init → loop → lockPiece/spawn`). Ese archivo es la fuente de verdad de la mecánica: se porta fiel, no se reinventa balance.

## 2. Motor: `lib/games/<id>/engine.ts`

Port 1:1 de la lógica a TypeScript, sin referencias a `window`/`document` a nivel de módulo (tienen que poder instanciarse dentro de un `useEffect` sin fugas entre montajes). Ver `lib/games/asteroids/engine.ts` como referencia de forma. Encapsular todo en una clase `<Nombre>Engine` que recibe `ctx: CanvasRenderingContext2D` en el constructor y expone:

```ts
init(): void
update(dt: number): void
draw(): void
getSnapshot(): GameSnapshot   // { score, lives, level, status: "playing"|"dead"|"gameover" }
pause(): void
resume(): void
end(): void                    // fuerza game over
handleKeydown(code: string): void
handleKeyup(code: string): void
```

`GameSnapshot`/`GameEngineHandle` están definidos en `lib/games/registry.ts` — no los redefinas, importalos. Si el juego original no tiene "vidas" (ej. tetris no tiene vidas), usar `lives: 0` o el campo que más se acerque semánticamente y dejarlo fijo — no rompas la interfaz compartida por un solo campo que no aplica.

Mantené resolución interna fija (igual que el `index.html` original, ej. 300×600 de tetris) — el escalado responsive se hace por CSS en el componente, no tocando la física interna.

## 3. Componente: `components/games/<Nombre>Game.tsx`

Copiar el patrón exacto de `components/games/AsteroidsGame.tsx`:
- `"use client"`, `useRef<HTMLCanvasElement>`.
- `useEffect` (deps `[]`) que: crea el engine, agrega listeners `keydown`/`keyup` en `window` (scoped al efecto, con `preventDefault` solo para las teclas que el juego usa), arranca loop con `requestAnimationFrame` llamando `engine.update(dt)` → `engine.draw()` → `onSnapshot(engine.getSnapshot())` cada frame, arma el `GameEngineHandle` y lo pasa a `onReady(...)`.
- El `return` del `useEffect` hace `cancelAnimationFrame` + remueve ambos listeners. Esto es crítico — sin este cleanup el loop sigue corriendo en background al salir de `/jugar/<id>`.
- `<canvas>` con `width`/`height` = resolución interna fija, `style={{ width: "100%", height: "auto", aspectRatio: "<W>/<H>", display: "block" }}`.

## 4. Registrar en `lib/games/registry.ts`

`GAME_REGISTRY` guarda el componente **y** la resolución interna real (`width`/`height`, importadas del `engine.ts` del juego) en cada entrada — es la única fuente de verdad que usa `/jugar/[id]/page.tsx` para calcular el aspect-ratio del CRT. Nunca hardcodees un ratio a mano en la página del reproductor: eso fue justo lo que rompió el encuadre de `serpentina` (un mapa por id que nadie actualizó al agregar el juego nuevo, así que cayó a un ratio 4:3 por default y el `overflow:hidden` le recortó el borde inferior).

```ts
import { <Nombre>Game } from "@/components/games/<Nombre>Game";
import { W as ID_W, H as ID_H } from "@/lib/games/<id>/engine";
// ...
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  rocas: { component: AsteroidsGame, width: ROCAS_W, height: ROCAS_H },
  <id>: { component: <Nombre>Game, width: ID_W, height: ID_H },
};
```

No tocar `app/jugar/[id]/page.tsx` para esto — ya lee `GAME_REGISTRY[id].component` y deriva el ratio de `.width`/`.height` genéricamente, sea el canvas ancho, alto o cuadrado.

## 5. Generalizar el leaderboard (hoy hardcodeado a "rocas")

Spec 06 conectó el leaderboard real solo para `id === "rocas"` en dos lugares, con un hardcode explícito porque era el único juego implementado. Ahora que hay un segundo juego, **reemplazar el hardcode por un chequeo contra `GAME_REGISTRY`** (consistente con la decisión ya tomada de "registro genérico" en spec 05) en vez de agregar un tercer `id === "..."` :

- `app/juego/[id]/page.tsx`: la línea `const scores = id === "rocas" ? await getTopScores("rocas", 10) : seededScores(...)` pasa a `const scores = id in GAME_REGISTRY ? await getTopScores(id, 10) : seededScores(...)`.
- `components/SalonTabs.tsx`: los checks `tab !== "rocas"` / `tab === "rocas"` (fetch de scores reales al cambiar de tab) pasan a chequear `tab in GAME_REGISTRY` en vez de comparar contra el string `"rocas"`.

El modal de fin de partida (`components/ScoreModal.tsx`, disparado desde `app/jugar/[id]/page.tsx` cuando `snapshot.status === "gameover" && snapshot.score > 0`) ya es genérico — no requiere cambios, usa `gameId` como prop.

## 6. Verificación

1. `npm run lint` — sin errores de tipos/estilo.
2. `npm run dev` → `/juego/<id>` → "JUGAR AHORA" → `/jugar/<id>`: controles responden igual que el original, HUD canvas y HUD HTML (`hud-stat`) muestran los mismos valores en todo momento. Verificá con captura que se ve el canvas COMPLETO dentro del `.crt-screen` (nada recortado arriba/abajo/costados) — si falta un borde, la resolución no está bien registrada en el paso 4, no toques el layout de `/jugar/[id]/page.tsx`.
3. Perder/game over dispara el overlay; reiniciar (tecla del original) vuelve a jugar.
4. Botones `PAUSA`/`FIN`/`SALIR` del HUD HTML funcionan; reentrar varias veces a `/jugar/<id>` no deja loops ni listeners duplicados (sin errores en consola).
5. Jugar hasta game over con score > 0 dispara `ScoreModal`; guardar alias inserta fila en `scores` (verificable con `mcp__supabase__execute_sql`); cancelar no inserta nada; score = 0 no dispara el modal.
6. `/salon` tab del juego y el leaderboard lateral en `/juego/<id>` muestran los scores reales insertados.
7. Un `id` en `data.ts` que TODAVÍA no está en `GAME_REGISTRY` sigue mostrando el mock (`game-arena` + `seededScores()`) sin cambios — confirma que la generalización del paso 5 no rompió el fallback de los juegos no implementados.

## Decisiones heredadas (no las reabras sin motivo)

- Motor sin `window`/`document` a nivel de módulo — instanciable en `useEffect`.
- HUD dual: el motor dibuja su propio HUD en canvas (fiel al original) Y notifica `onSnapshot` para el HUD HTML — no se elimina ninguno.
- Resolución interna fija + escalado CSS — no se reescribe la física para ser responsive.
- `insert` público en `scores` sin auth ni anti-abuso — riesgo conocido y aceptado (ver spec 06), no lo "arregles" de paso en un port de juego.
- `best`/`plays` de `games` quedan estáticos, no derivados de `scores` real.
