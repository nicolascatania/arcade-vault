# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por puntaje (README.md). Ya no es scaffold: 4 juegos portados y jugables (`rocas`/Asteroids, `caida`/Tetris, `bloque-buster`/Arkanoid, `serpentina`/Snake), cada uno con motor TS propio, HUD real y leaderboard persistido en Supabase. Catálogo (`games`) y puntajes (`scores`) leen de Supabase con fallback a datos estáticos si la query falla. Quedan 4 juegos del catálogo sin implementar todavía: `gloton`, `invasores`, `ranaria`, `duelo-pixel` (sin referencia en `references/started-games/` aún). Auth (`app/auth/page.tsx`) sigue siendo mock — no hay login real ni sesiones.

## Skills

- **`/frontend-design`** — usar siempre que se escriba HTML/CSS, para asegurar buena UX/UI.
- **`/spec`** / **`/spec-impl NN-slug`** — workflow spec-driven de este repo (ver sección abajo).
- **`nuevo-juego`** (`.claude/skills/nuevo-juego/`, propia del repo, no de fernando-skills) — portar un juego de referencia vanilla-JS-canvas (`references/started-games/<NN-juego>/game.js`) al motor TS + `GAME_REGISTRY` + leaderboard Supabase, siguiendo el patrón fijado por specs 05 y 06. Se dispara cuando piden agregar/portar/integrar un juego nuevo a la plataforma. No reemplaza `/spec` si el juego implica decisiones de producto nuevas — es solo para el caso mecánico de portar una referencia ya existente. Siempre crea rama `juego-<id>` antes de tocar archivos, nunca implementa sobre `main`.

## Commands

```bash
npm run dev      # start dev server (Next.js, App Router)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

No test runner is configured yet.

## ⚠️ Non-standard Next.js version

`package.json` pins `next@16.2.12` — newer than this model's training data and not the Next.js you know. **Before writing any Next.js code (routing, data fetching, config, API routes, etc.), read the relevant guide under `node_modules/next/dist/docs/`** (e.g. `01-app/` for App Router, `03-architecture/` for build/runtime behavior) rather than relying on prior knowledge. Watch for deprecation notices in those docs.

## Architecture

- App Router under `app/`: `app/layout.tsx` (root layout, Geist fonts, global `<body class="min-h-full flex flex-col">`), `app/globals.css`.
- Rutas: `/` (`app/page.tsx`), `/home` (catálogo destacado, Server Component vía `getGames()`), `/games` (catálogo completo — Server Component `page.tsx` + `GamesGrid.tsx` client con filtro/búsqueda), `/about` (formulario de contacto vía Resend, spec 03), `/auth` (mock, sin lógica real), `/salon` (leaderboard por tabs — Server `page.tsx` + `SalonTabs.tsx` client, tab "ROCAS" con datos reales), `/juego/[id]` (ficha de juego + leaderboard lateral), `/jugar/[id]` (pantalla de juego real dentro del `.crt-screen`, o mock si el `id` no está en `GAME_REGISTRY`), `app/api/contact/route.ts` (Route Handler que envía el form de `/about` vía Resend).
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss` (see `postcss.config.mjs`), dark mode handled with Tailwind `dark:` classes.
- TypeScript path alias: `@/*` maps to the repo root (`tsconfig.json`).

### Motor de juegos

- `lib/games/registry.ts` — `GAME_REGISTRY`: mapa `id → { component, width, height }`. El `width`/`height` de cada entrada viene de las constantes `W`/`H` exportadas por el `engine.ts` de cada juego (única fuente de verdad para el aspect-ratio del CRT en `/jugar/[id]` — no hay mapa de ratios hardcodeado a mantener aparte).
- Cada juego vive en `lib/games/<id>/engine.ts`: clase `<Nombre>Engine` que recibe el `CanvasRenderingContext2D`, sin referencias a `window`/`document` a nivel de módulo (instanciable dentro de un `useEffect`), expone `init/update/draw/getSnapshot/pause/resume/end/handleKeydown`. `getSnapshot()` devuelve `{ score, lives, level, status: "playing"|"dead"|"gameover" }`.
- `components/games/<Nombre>Game.tsx` monta el `<canvas>`, corre el motor, y expone el snapshot hacia arriba (`onSnapshot`) para que el HUD HTML y el resto de la página reaccionen — el HUD dentro del canvas y el HUD HTML conviven, no se reemplaza uno por el otro.
- Juegos implementados: `rocas` (Asteroids), `caida` (Tetris), `bloque-buster` (Arkanoid), `serpentina` (Snake) — tabla de referencia (id, title, cat, description) en `references/implemented-games.md`. Pendientes: `gloton`, `invasores`, `ranaria`, `duelo-pixel` — usar la skill `nuevo-juego` para portarlos cuando haya una referencia en `references/started-games/`.
- Al terminar una partida de `rocas` con `score > 0`, se dispara `ScoreModal.tsx` (pide alias, texto libre sin validación de identidad) que inserta el score real en Supabase; el motor se congela y el teclado se aísla mientras el modal está abierto.

### Integración con Supabase

- Cliente browser: `lib/supabase/client.ts` (`createBrowserClient`, uso en Client Components/handlers). Cliente server: `lib/supabase/server.ts` (`createServerClient` async + `cookies()` de `next/headers`, uso en Server Components/Route Handlers).
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env` (gitignored; `.env.example` documenta las claves vacías). Llevan `NEXT_PUBLIC_` porque la key `sb_publishable_...` está pensada para exponerse en el bundle del cliente — no es secreta, a diferencia de `RESEND_API_KEY`.
- Proyecto Supabase vinculado: `elrzxjeymnyxwpxqgghn` (vía `.mcp.json`, MCP server `supabase`).
- Tablas (spec 06): `games` (`id, title, short, long, cat, cover, color, best, plays` — espejo de `data.ts:GAMES`, poblada con los 8 juegos del catálogo) y `scores` (`id, game_id → games.id, name, score, created_at`). RLS: `select` público en ambas; `insert` público solo en `scores`; sin `update`/`delete` públicos en ninguna. Sin auth ni rate limiting sobre el insert de scores — riesgo conocido y aceptado (cualquiera puede insertar un score falso desde devtools).
- `lib/supabase/games.ts` — `getGames()`, `getGame(id)`, `getTopScores(gameId, limit)`: corren server-side, `try/catch` con fallback a `GAMES`/`seededScores()` de `data.ts` si la query falla (con `console.error` para no enmascarar errores silenciosamente). `lib/supabase/scores-client.ts` — `insertScore(gameId, name, score)`: corre client-side desde `ScoreModal`.
- Solo `rocas` tiene leaderboard real hoy (`/salon` tab ROCAS, leaderboard lateral de `/juego/rocas`); los otros 7 juegos del catálogo siguen mostrando `seededScores()` mock hasta que se implementen con la skill `nuevo-juego`.
- Antes de tocar el esquema, usar `mcp__supabase__list_tables`/`get_advisors`/`get_logs` para ver el estado real antes de asumir nada.

## Spec-driven workflow

Este repo usa specs para features nuevas o con decisiones de producto, vía dos skills en `.agents/skills/` (instaladas de `Klerith/fernando-skills`, trackeadas en `skills-lock.json`):

- **`/spec`** — spec designer guiado. Aclara requerimientos por Q&A y escribe la spec sección por sección en `specs/NN-slug.md` (template: `.agents/skills/spec/template.md`). Nunca escribe código. Las specs nuevas quedan en estado `Draft`.
- **`/spec-impl NN-slug`** — implementa solo una spec en estado `Approved`/`approved`. Lee `specs/NN-slug.md`, se niega a avanzar si el campo de estado no dice eso — el humano tiene que cambiarlo a mano. Al aprobar, crea/cambia a la rama `spec-NN-slug` (gobernado por `AutoCreateBranch` en `specs/.spec-config.yml`), e implementa el plan paso a paso, pausando para revisión después de cada paso.

Specs existentes en `specs/` (más nuevas al final): `01-mvp-pantallas-visuales` (implemented), `02-home-page-and-games-route` (approved), `03-about-contacto-resend` (implementado — form de contacto vía Resend), `04-supabase-setup` (implementado — clientes Supabase, sin tablas), `05-asteroids-rocas` (implemented — primer juego real portado), `06-leaderboard-y-catalogo-supabase` (implemented — tablas `games`/`scores`, leaderboard real de `rocas`).

Cuando piden implementar una feature con spec aprobada, usar `/spec-impl` en vez de improvisar un plan. Cuando piden planear una feature nueva, preferir `/spec` antes que escribir código directo. Para portar un juego de referencia ya visto en specs 05/06 (mecánica conocida, sin decisiones de producto nuevas), usar la skill `nuevo-juego` en vez de `/spec`.
