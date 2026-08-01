# Spec 01 — MVP visual de pantallas

**Estado:** approved
**Fecha:** 2026-08-01
**Dependencias:** ninguna (primer spec del repo)

**Objetivo:** Portar visualmente las 5 pantallas de `references/templates/` (biblioteca, detalle, player, auth, salón) a rutas reales de Next.js App Router en español, reutilizando el tema CSS ya portado en `globals.css`, con interactividad de UI (búsqueda, filtros, tabs, menú mobile) pero sin lógica de juego, autenticación real ni persistencia.

## Scope

**Incluye:**
- 5 rutas App Router: `/` (biblioteca), `/juego/[id]` (detalle), `/jugar/[id]` (player), `/salon`, `/auth`.
- Componentes compartidos en `components/`: `Nav`, `GameCard`, y los que correspondan a cada pantalla.
- `data.ts` en raíz (o `lib/`) con `GAMES`, `CATS`, `PLAYERS` y `seededScores` tipados, portados de `data.jsx`.
- Interactividad de UI client-side sin persistencia: búsqueda y filtro por categoría en biblioteca, tabs de categoría en salón, tabs iniciar sesión/crear cuenta en auth, menú hamburguesa mobile en Nav, hover/tilt de `GameCard`.
- Nav siempre en estado "Iniciar Sesión" (sin estado de usuario real).
- CSS: completar en `globals.css` cualquier clase de `styles.css` que falte portar.
- Botones de navegación entre pantallas (JUGAR, VOLVER, etc.) funcionando con `next/link` o `useRouter`.

**No incluye (fuera de alcance de este spec):**
- Lógica de ningún juego real (el "arena" de `/jugar/[id]` es 100% CSS decorativo estático, sin `setInterval`, sin HUD dinámico, sin modal de fin de juego).
- Autenticación real: el formulario de `/auth` no persiste usuario, no valida, no llama a ningún backend. Botones navegan pero no cambian estado global.
- Persistencia de puntuaciones (no hay `localStorage`, no hay "Guardar puntuación" funcional).
- Backend, API routes, base de datos.
- Tests automatizados.
- Assets/imágenes reales (se mantienen los covers CSS generados por clases `.cover-*`).

## Data model

Archivo `data.ts` (o `lib/data.ts`), sin backend, solo constantes tipadas para poblar la UI:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;   // clase CSS .cover-*
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export const PLAYERS: string[];
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Contenido de `GAMES`/`PLAYERS` y algoritmo de `seededScores` calcado 1:1 de `references/templates/data.jsx` (mismo generador pseudo-random determinístico, sin cambios de valores).

## Implementation plan

1. **`data.ts`** — portar `GAMES`, `CATS`, `PLAYERS`, `seededScores` desde `data.jsx`, tipado según el modelo de datos.
2. **`globals.css`** — diff contra `styles.css` del template y agregar clases faltantes (si las hay). Sistema sigue compilando.
3. **`components/Nav.tsx`** — portar `nav.jsx` a TSX cliente: logo, links activos por ruta actual (`usePathname`), contador de créditos fijo, botón "Iniciar Sesión" siempre, menú mobile con estado `open` local.
4. **`app/layout.tsx`** — enganchar `Nav` y el footer (ya existen `av-bg`/`av-noise`/`main.av-main`), quitar el `<main>` duplicado si aplica.
5. **`components/GameCard.tsx` + `app/page.tsx`** — portar `biblioteca.jsx`: hero, búsqueda, chips de categoría, grid de `GameCard` con tilt on hover, click navega a `/juego/[id]`.
6. **`app/juego/[id]/page.tsx`** — portar `detalle.jsx`: cover, tags, descripción, stat-strip, leaderboard con `seededScores`, botones "JUGAR AHORA" → `/jugar/[id]` y "VOLVER" → `/`.
7. **`app/jugar/[id]/page.tsx`** — portar `reproductor.jsx` en versión 100% estática: HUD con valores fijos de ejemplo, arena CSS decorativa, sin `setInterval`, sin modal de fin de juego, botones PAUSA/FIN/SALIR sin handler funcional (o SALIR navega a `/juego/[id]`).
8. **`app/auth/page.tsx`** — portar `auth.jsx`: tabs iniciar sesión/crear cuenta, formulario controlado localmente (sin submit real ni `onLogin`), botón invitado navega a `/`.
9. **`app/salon/page.tsx`** — portar `salon.jsx`: tabs por juego, podio top 3, tabla de posiciones con `seededScores`, sin fila "tu mejor marca" (no hay usuario real).
10. **`npm run lint`** — verificar que todo pasa sin errores de TypeScript/ESLint.

Cada paso deja la app corriendo sin romper las pantallas ya portadas. El usuario prueba la app manualmente al final; no se ejecuta `npm run dev` como parte de este flujo.

## Acceptance criteria

- [ ] `npm run lint` pasa sin errores.
- [ ] `/` muestra biblioteca: hero, búsqueda funcional, chips de categoría funcionales, grid de 8 juegos.
- [ ] Click en `GameCard` o botón JUGAR navega a `/juego/[id]` correcto.
- [ ] `/juego/[id]` muestra cover, tags, descripción, stat-strip y leaderboard de 10 filas.
- [ ] Botón "JUGAR AHORA" navega a `/jugar/[id]`; botón "VOLVER" navega a `/`.
- [ ] `/jugar/[id]` muestra HUD y arena decorativa estáticos, sin actualizarse en el tiempo.
- [ ] `/auth` muestra tabs iniciar sesión/crear cuenta funcionales (cambian el form visible) sin persistir nada.
- [ ] `/salon` muestra tabs por juego, podio top 3 y tabla de posiciones, cambiando datos al seleccionar otro juego.
- [ ] Nav muestra siempre "Iniciar Sesión", links activos resaltados según ruta, menú mobile abre/cierra en pantallas chicas.
- [ ] Ninguna pantalla usa `localStorage`, `setInterval`, ni lógica de puntaje real.

## Decisiones tomadas y descartadas

- **Rutas Next.js reales en vez de hash SPA** — el proyecto ya es App Router; hash routing sería remar contra la arquitectura del repo.
- **Slugs en español** (`/juego/[id]`, `/jugar/[id]`, `/salon`, `/auth`) — consistente con el resto de textos de la UI, que está en español.
- **CSS plano reutilizado, no migrado a Tailwind utilities** — `globals.css` ya tiene el tema portado y validado visualmente en el commit `styles`; migrar sería trabajo extra sin beneficio para este spec.
- **UI interactiva sin persistencia** en vez de todo estático — permite validar visualmente los estados (hover, tabs, filtros) sin necesidad de lógica real, cumpliendo "solo visual" sin dejar la demo inerte.
- **Player 100% estático, sin modal ni HUD dinámico** — decisión explícita del usuario: es la pantalla más cercana a "funcionalidad de juego", se descarta cualquier estado ahí para no cruzar el límite de scope.
- **Nav siempre en estado "logueado=no"** — evita simular un sistema de auth que no existe; se descarta mostrar un usuario mock por prolijidad de la demo.
- **Componentes compartidos en `components/` en raíz** — separación estándar de Next.js App Router entre rutas (`app/`) y UI reusable.

## Riesgos identificados

- **TypeScript strict mode** — el template original es JS suelto sin tipos; puede requerir ajustes menores de tipado (props, `Game | undefined` en `.find()`) que no existían en el original.
- **Clases CSS no portadas** — si `globals.css` quedó incompleto respecto a `styles.css`, algunas pantallas pueden verse rotas hasta completar el diff del paso 2.
