# Spec 05 — Asteroids ("rocas")

**Estado:** approved
**Dependencias:** Spec 02 (home-page-and-games-route) — usa `GAMES` de `data.ts` y las rutas `/juego/[id]` y `/jugar/[id]` ya existentes. Sin dependencia de Spec 04 (Supabase) — el puntaje es efímero en este spec.
**Fecha:** 2026-08-02

**Objetivo:** Portar el juego Asteroids de `references/started-games/02-asteroids/game.js` a un motor TypeScript embebido en un Client Component de canvas responsive, enchufado a `/jugar/[id]` mediante un registro genérico de juegos por `id` (empezando por `rocas`), con el HUD real (score/vidas/nivel) reflejado tanto dentro del canvas como en el HUD HTML existente.

## Scope

**Incluye:**
- `lib/games/registry.ts` — registro genérico `Record<string, GameComponent>` que mapea `id` de juego (de `data.ts`) a un componente React que implementa el juego. Empieza con una sola entrada: `rocas`.
- `components/games/AsteroidsGame.tsx` — Client Component: monta el `<canvas>`, corre el motor del juego (que dibuja su propio HUD dentro del canvas, igual que el original), y además expone el estado (score/vidas/nivel/estado `playing|dead|gameover`) hacia arriba vía callback/estado de React para que el HUD HTML (`hud-stat`) también refleje los valores reales — **ambos HUD conviven**, no se reemplaza uno por el otro.
- `lib/games/asteroids/engine.ts` (o archivo(s) equivalente) — port a TypeScript de la lógica de `game.js`: clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, loop `update`/`draw` (incluye el dibujado del HUD en canvas: score/nivel/vidas/power-up), spawn de asteroides, niveles, colisiones. Misma mecánica y balance que el original.
- `app/jugar/[id]/page.tsx` — se reescribe: si `id` existe en el registro, renderiza el componente de juego real dentro del `.crt-screen` (reemplaza el `game-arena` mock) y el HUD HTML (`hud-stat`) muestra valores reales sincronizados con el estado del canvas; si `id` no está en el registro, se mantiene el mock actual como fallback (para los otros 7 juegos de `data.ts` sin implementación todavía).
- Botones `PAUSA` y `FIN` del HUD HTML quedan conectados al juego real (`PAUSA` pausa/reanuda el loop; `FIN` termina la partida y dispara el overlay de game over) cuando `id === "rocas"`.
- Canvas responsive: resolución interna fija (800×600, igual que el original, sin tocar la física/constantes de `W`/`H`), escalado por CSS al contenedor `.crt-screen` manteniendo aspect ratio.
- Cleanup correcto de listeners de teclado y `requestAnimationFrame` al desmontar el componente (salir con "SALIR" no debe dejar el loop corriendo en background).
- Reinicio de partida: tecla Espacio en game over reinicia (igual que el original).

**No incluye (para specs futuros):**
- Persistencia de puntaje (Supabase o cualquier storage) — el puntaje se pierde al salir de `/jugar/rocas`.
- Controles táctiles/mobile — solo teclado (flechas + espacio), igual que el original.
- Implementación de los otros 7 juegos de `data.ts` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — quedan con el mock actual.
- Actualizar `game.best`/`game.plays` en `data.ts` con datos reales.
- Corregir el copy "TECLADO / TÁCTIL" en la ficha del juego (`app/juego/[id]/page.tsx`) — queda como está.
- Sonido/música — el original no tiene audio, este spec tampoco agrega.
- Tests automatizados.

## Data model

```ts
// lib/games/registry.ts
export interface GameEngineHandle {
  pause(): void;
  resume(): void;
  end(): void;          // fuerza game over
  destroy(): void;      // cleanup: cancela RAF, remueve listeners de teclado
}

export interface GameSnapshot {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface GameComponentProps {
  onSnapshot: (snapshot: GameSnapshot) => void;
  onReady: (handle: GameEngineHandle) => void;
}

export type GameComponent = React.ComponentType<GameComponentProps>;

export const GAME_REGISTRY: Record<string, GameComponent> = {
  rocas: AsteroidsGame,
};
```

- `AsteroidsGame` (`components/games/AsteroidsGame.tsx`) recibe `onSnapshot`/`onReady`, monta el `<canvas>`, corre el motor de `lib/games/asteroids/engine.ts`, y llama `onSnapshot(...)` en cada frame para que `app/jugar/[id]/page.tsx` actualice el HUD HTML vía `useState`.
- `app/jugar/[id]/page.tsx` pasa a ser un Client Component (hoy es Server Component `async`) para poder usar `useState`/`useRef` con el snapshot y el handle del motor; sigue resolviendo `game` desde `GAMES` igual que ahora.
- El motor interno (`engine.ts`) mantiene su propio estado (`ship`, `bullets`, `asteroids`, etc.) como en el original — no se expone a React, solo el `GameSnapshot` resumido.

## Implementation plan

1. **`lib/games/asteroids/engine.ts`** — port del `game.js` de referencia a TypeScript: clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`), funciones `wrap`/`dist`/`rand`/`randInt`, y una clase `AsteroidsEngine` que encapsula `ctx`, `W`/`H`, el estado del juego y expone `init()`, `update(dt)`, `draw()`, `getSnapshot(): GameSnapshot`, `pause()`, `resume()`, `handleKeydown/handleKeyup`. Sin referencias a `document`/`window` a nivel de módulo (a diferencia del original) — todo recibido por constructor o parámetros, para que sea seguro instanciarlo desde un `useEffect`.
2. **`lib/games/registry.ts`** — define `GameEngineHandle`, `GameSnapshot`, `GameComponentProps`, `GameComponent` y `GAME_REGISTRY` (con `rocas` apuntando a `AsteroidsGame`, que se crea en el paso siguiente).
3. **`components/games/AsteroidsGame.tsx`** — Client Component: `useRef` para el `<canvas>`, `useEffect` que instancia `AsteroidsEngine`, agrega listeners de teclado (`keydown`/`keyup`) scoped al efecto (no `window` global fuera de React), arranca el loop con `requestAnimationFrame`, llama `onSnapshot(engine.getSnapshot())` cada frame, expone `onReady({ pause, resume, end, destroy })`. El `return` del `useEffect` hace `cancelAnimationFrame` + remueve los listeners (cleanup al desmontar). CSS: canvas con `width={800} height={600}` (resolución interna) y `style={{ width: "100%", height: "auto", aspectRatio: "4 / 3" }}` para el escalado responsive.
4. **`app/jugar/[id]/page.tsx`** — convertir a Client Component (`"use client"`, ya no `async`). Buscar `GAME_REGISTRY[id]`: si existe, renderizar `<GameComponent onSnapshot={setSnapshot} onReady={setHandle} />` dentro de `.crt-screen` en lugar del `game-arena` mock, y usar `snapshot` (`score`/`lives`/`level`) para los `hud-stat` en vez de los valores hardcodeados; si no existe, mantener el JSX mock actual sin cambios. Conectar botón `PAUSA` a `handle.pause()/resume()` (toggle) y `FIN` a `handle.end()`.
5. **`app/juego/[id]/page.tsx`** — sin cambios (fuera de scope).
6. **`npm run lint`** — verificar que el port a TS no introduce errores de tipos ni de ESLint.
7. **Verificación manual** — `npm run dev`, entrar a `/juego/rocas` → "JUGAR AHORA" → `/jugar/rocas`: controlar la nave (flechas + espacio), confirmar que el HUD en canvas Y el HUD HTML se actualizan en paralelo con los mismos valores, provocar game over, reiniciar con Espacio, y confirmar que "SALIR" no deja el loop corriendo (sin errores en consola al volver a entrar). Confirmar que otro `id` sin registro (ej. `/jugar/caida`) sigue mostrando el mock intacto.

Cada paso deja la app funcional.

## Acceptance criteria

- [ ] `npm run lint` pasa sin errores.
- [ ] `/juego/rocas` → "JUGAR AHORA" navega a `/jugar/rocas` y muestra el canvas del juego real (no el mock `game-arena`).
- [ ] La nave responde a `←`/`→` (rotar), `↑` (propulsar) y `Espacio` (disparar), igual que el original.
- [ ] Los asteroides grandes se parten en medianos y estos en pequeños al ser destruidos; los puntos otorgados son 100/50/20 según tamaño (pequeño/mediano/grande), igual que el original.
- [ ] El HUD dibujado en el canvas (score/nivel/vidas/power-up) y el HUD HTML (`hud-stat`) muestran los mismos valores en todo momento, actualizados en tiempo real.
- [ ] Perder las 3 vidas dispara el estado de game over (overlay en canvas) y `Espacio` reinicia la partida.
- [ ] Botón `PAUSA` del HUD HTML pausa y reanuda el loop del juego (toggle). Botón `FIN` termina la partida y dispara el game over.
- [ ] Botón `SALIR` navega a `/juego/rocas` y no deja el `requestAnimationFrame` ni los listeners de teclado corriendo en background (verificable: sin errores/duplicados en consola al reentrar a `/jugar/rocas` varias veces).
- [ ] El canvas escala responsivamente al ancho del contenedor `.crt-screen` manteniendo aspect ratio 4:3, sin romper la física interna (sigue calculando sobre 800×600).
- [ ] `/jugar/<id>` con un `id` que no está en `GAME_REGISTRY` (ej. `caida`) sigue mostrando el mock actual sin cambios.
- [ ] El puntaje no persiste entre visitas (se reinicia al recargar o reingresar a la página).

## Decisiones tomadas y descartadas

- **Registro genérico (`GAME_REGISTRY`) en vez de un `if (id === "rocas")` hardcodeado** — decisión explícita del usuario; deja la puerta abierta para el próximo juego sin reescribir `app/jugar/[id]/page.tsx` de nuevo, aunque hoy solo haya una entrada implementada.
- **HUD dual (canvas + HTML) en vez de uno solo** — decisión explícita del usuario: el motor mantiene su HUD propio (fiel al original) y además notifica a React vía snapshot para alimentar el HUD HTML existente. Se descartó eliminar cualquiera de los dos.
- **Resolución interna fija (800×600) con escalado CSS** en vez de reescribir la física para ser responsive — evita tocar `wrap()`/constantes de velocidad/radio que están calibradas para ese tamaño; el original ya usa toroide fijo, cambiar `W`/`H` dinámicamente movería el balance del juego sin necesidad.
- **`app/jugar/[id]/page.tsx` pasa a Client Component** — necesario para `useState`/`useRef` del snapshot y el handle del motor; no había forma de mantenerlo Server Component con esta arquitectura.
- **Puntaje efímero, sin Supabase** — consistente con lo que spec 04 dejó explícitamente pendiente para un spec propio; agregarlo ahora mezclaría dos features en un mismo spec.
- **Sin controles táctiles** — el original es solo teclado; agregarlos ahora es una feature aparte (rediseño de input, UI de botones on-screen) que no fue pedida.
- **Motor sin referencias globales a `window`/`document` a nivel de módulo** (a diferencia del original) — necesario para que sea seguro instanciarlo dentro de un `useEffect` de React sin fugas entre montajes/desmontajes.

## Riesgos identificados

- **Fuga de `requestAnimationFrame` o listeners de teclado entre navegaciones** — si el cleanup del `useEffect` no cancela bien el loop o no remueve los listeners, quedan corriendo en background y afectan el rendimiento o duplican inputs al reentrar. Mitigado por el criterio de aceptación que verifica reentradas múltiples sin duplicados.
- **Desincronización entre el snapshot de React y el HUD del canvas** — si `onSnapshot` no se llama con la frecuencia correcta, el HUD HTML puede mostrar valores viejos mientras el canvas ya cambió. Mitigado llamando `onSnapshot` en cada `update(dt)`.
- **Canvas responsive rompiendo la nitidez/proporción** — escalar 800×600 vía CSS a anchos muy chicos (mobile) puede hacer el HUD del canvas ilegible; no se define un mínimo en este spec, se puede ajustar visualmente en la verificación manual.
