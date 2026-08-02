# Spec 06 — Leaderboard y catálogo de juegos en Supabase

**Estado:** implemented
**Dependencias:** Spec 04 (supabase-setup) — usa los clientes `lib/supabase/client.ts`/`server.ts` ya creados. Spec 05 (asteroids-rocas) — el juego "rocas" es el único que va a insertar scores reales.
**Fecha:** 2026-08-02

**Objetivo:** Migrar el catálogo estático `GAMES` y los puntajes falsos (`seededScores()`) a dos tablas reales de Supabase (`games` y `scores`), con inserción real de puntajes al terminar una partida de "rocas" (único juego implementado) y fallback al `data.ts` estático si Supabase no responde.

## Scope

**Incluye:**
- Tabla `games` en Supabase con los mismos campos que la interface `Game` actual (`id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`), poblada vía migración SQL con un `INSERT` de los 8 juegos actuales de `data.ts`.
- Tabla `scores` en Supabase: `id`, `game_id` (FK a `games.id`), `name` (alias tecleado), `score`, `created_at`.
- RLS en `scores`: `INSERT` público (anónimo), sin `UPDATE`/`DELETE` públicos. RLS en `games`: `SELECT` público, sin escritura pública.
- `app/home/page.tsx`, `app/games/page.tsx`, `app/juego/[id]/page.tsx` pasan a leer `games` desde Supabase (Server Component, fetch sin cache) con fallback a `GAMES` de `data.ts` si la query falla.
- `app/juego/[id]/page.tsx`: el leaderboard lateral muestra los top 10 reales de `scores` para `id === "rocas"`; para el resto, sigue usando `seededScores()` (mock).
- `app/salon/page.tsx`: el tab "ROCAS" muestra datos reales de `scores` (top 12); los otros 7 tabs siguen con `seededScores()`.
- Modal de alias al terminar partida de "rocas": se dispara cuando `snapshot.status === "gameover"` y `snapshot.score > 0`; inserta una fila en `scores` vía cliente browser de Supabase. Si el jugador cancela el modal, no se guarda nada.
- `data.ts`: `GAMES` se mantiene como fallback estático (no se borra); `seededScores()` se mantiene para los 7 juegos sin implementar.

**No incluye (para specs futuros):**
- Auth real / login — el alias es texto libre sin validación de identidad, consistente con `app/auth/page.tsx` mock.
- Persistencia de scores para los otros 7 juegos — no están implementados (spec 05 no los cubrió).
- Derivar `best`/`plays` de `games` a partir de los datos reales de `scores` — quedan como columnas estáticas, iguales a `data.ts` hoy.
- Rate limiting, validación de rango de score, o cualquier anti-abuso sobre `scores` — RLS de insert público queda abierto, documentado como riesgo.
- Editar o borrar scores una vez insertados (ni UI ni RLS lo permite).
- Middleware de sesión — sigue sin aplicar (no hay auth).

## Data model

```sql
-- migración SQL (aplicada vía mcp__supabase__apply_migration en /spec-impl)

create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,       -- "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS"
  cover text not null,
  color text not null,     -- "cyan" | "magenta" | "yellow" | "green"
  best integer not null,
  plays text not null
);

create table scores (
  id bigint generated always as identity primary key,
  game_id text not null references games(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table games enable row level security;
alter table scores enable row level security;

create policy "games are publicly readable" on games
  for select using (true);

create policy "scores are publicly readable" on scores
  for select using (true);

create policy "anyone can insert a score" on scores
  for insert with check (true);

insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('bloque-buster', 'BLOQUE BUSTER', ..., ...),
  -- ... los 8 juegos actuales de GAMES en data.ts, valores idénticos
  ('duelo-pixel', 'DUELO PIXEL', ..., ...);
```

```ts
// data.ts — se agregan tipos compartidos, sin tocar GAMES/seededScores existentes
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

// lib/supabase/games.ts (nuevo) — queries tipadas
export async function getGames(): Promise<Game[]> // fallback a GAMES si falla
export async function getGame(id: string): Promise<Game | null>
export async function getTopScores(gameId: string, limit: number): Promise<ScoreRow[]>
export async function insertScore(gameId: string, name: string, score: number): Promise<void>
```

- `getGames()`/`getGame()`/`getTopScores()` corren en Server Components (usan `lib/supabase/server.ts`), con `try/catch` que cae a `GAMES`/`seededScores()` si la query tira error.
- `insertScore()` corre client-side (usa `lib/supabase/client.ts`) desde el modal de alias en `app/jugar/[id]/page.tsx`.
- `ScoreRow.date` se deriva de `scores.created_at` formateado `DD/MM/YYYY` al leer, no se guarda como columna separada.

## Implementation plan

1. **Migración SQL** (`mcp__supabase__apply_migration`) — crea `games` y `scores`, políticas RLS, y el `INSERT` con los 8 juegos actuales de `data.ts` (copiados tal cual, sin inventar valores).
2. **`lib/supabase/games.ts`** — `getGames()`, `getGame(id)`, `getTopScores(gameId, limit)` (Server, con fallback a `GAMES`/`seededScores()` en `catch`), `insertScore(gameId, name, score)` (client).
3. **`app/home/page.tsx`** — `async`, reemplaza `GAMES.slice(0,6)` por `(await getGames()).slice(0, 6)`.
4. **`app/games/page.tsx`** — se separa en Server Component (`page.tsx`, fetch de `getGames()`) que pasa `games` como prop a un nuevo Client Component (ej. `GamesGrid.tsx`) con la lógica de filtro/búsqueda actual (que hoy vive directo en el page "use client").
5. **`app/juego/[id]/page.tsx`** — reemplaza `GAMES.find(...)` por `getGame(id)`; reemplaza `seededScores(...)` por `id === "rocas" ? await getTopScores("rocas", 10) : seededScores(...)`.
6. **`app/salon/page.tsx`** — se separa en Server Component que hace `getGames()` y pasa `games` a un Client Component (ej. `SalonTabs.tsx`) que mantiene el `useState`/tabs actual; al cambiar de tab, si `tab === "rocas"` hace fetch client-side de `getTopScores("rocas", 12)`, si no usa `seededScores(...)` como hoy.
7. **`components/ScoreModal.tsx`** (nuevo) — modal simple: input de texto (alias, 3–12 caracteres), botones "GUARDAR"/"CANCELAR". Al guardar, llama `insertScore(...)` y cierra.
8. **`app/jugar/[id]/page.tsx`** — agrega `useEffect` que detecta transición a `snapshot.status === "gameover" && snapshot.score > 0` (una sola vez, con flag para no reabrir en rerenders) y abre `ScoreModal`. Se resetea el flag al reiniciar partida (`status` vuelve a `"playing"`).
9. **`npm run lint`** — verifica tipos y estilo.
10. **Verificación manual** — `npm run dev`: `/home`, `/games`, `/salon`, `/juego/rocas` muestran datos reales; jugar una partida de "rocas", morir con score > 0, guardar alias, confirmar que aparece en `/salon` (tab ROCAS) y en `/juego/rocas` (leaderboard lateral) sin recargar manualmente el build; confirmar que `/juego/caida` sigue mostrando `seededScores()` mock.

Cada paso deja la app funcional.

## Acceptance criteria

- [x] `npm run lint` pasa sin errores.
- [x] La migración crea `games` (8 filas, iguales a `GAMES` de `data.ts`) y `scores` (vacía) en el proyecto Supabase del repo.
- [x] RLS: `select` público en ambas tablas; `insert` público solo en `scores`; ninguna política de `update`/`delete` pública.
- [x] `/home`, `/games`, `/juego/[id]` muestran los datos leídos de Supabase (no hardcodeados) en uso normal.
- [x] Si la query a `games` falla (simulable comentando temporalmente la policy de `select` o cambiando la URL), las páginas caen a `GAMES` de `data.ts` sin romperse.
- [x] Jugar una partida de "rocas" hasta game over con score > 0 dispara el modal de alias.
- [x] Morir con score = 0 NO dispara el modal.
- [x] Guardar el alias inserta una fila real en `scores` (verificable vía `list_tables`/`execute_sql` de Supabase MCP).
- [x] Cancelar el modal no inserta ninguna fila.
- [x] `/salon` tab "ROCAS" muestra los scores reales insertados (orden descendente por `score`, top 12).
- [x] `/juego/rocas` (leaderboard lateral) muestra los scores reales insertados (top 10).
- [x] Los otros 7 tabs de `/salon` y los otros 7 `/juego/[id]` siguen mostrando `seededScores()` mock, sin cambios de comportamiento.
- [x] Reiniciar la partida de "rocas" (Espacio en game over) permite que un nuevo game over vuelva a disparar el modal (el flag no queda "pegado").

## Decisiones tomadas y descartadas

- **Un solo spec en vez de dos** (catálogo de juegos + leaderboard) — decisión explícita del usuario, aunque toca dos modelos de datos distintos; se mitiga documentando ambos por separado en Scope/Data model.
- **Migrar `GAMES` completo a Supabase** en vez de solo agregar `best`/`plays` derivados — decisión explícita: la tabla `games` reemplaza el catálogo, no solo los contadores.
- **`GAMES`/`seededScores()` se mantienen en `data.ts` como fallback** en vez de borrarse — decisión explícita del usuario. Contraparte: cada página que lee `games` necesita lógica de `try/catch` con fallback, más código que un corte limpio, pero da resiliencia si Supabase cae.
- **Alias tecleado a mano, sin auth** — consistente con que `app/auth/page.tsx` sigue siendo mock; implementar auth real hubiera expandido mucho el alcance de este spec.
- **`INSERT` público abierto en `scores`, sin anti-abuso** — decisión explícita del usuario; cualquiera puede insertar scores falsos desde el browser. Queda como riesgo conocido, no mitigado en este spec.
- **`best`/`plays` quedan como columnas estáticas**, no derivadas de `scores` — decisión explícita; evita una query de agregación en cada carga de `/games`, a costa de que el "mejor puntaje" mostrado en la card no refleje los scores reales insertados.
- **Fetch sin cache (sin `revalidate`)** — decisión explícita del usuario; prioriza datos frescos sobre performance, aceptable dado que el catálogo es chico (8 juegos).
- **Modal solo si `score > 0`** — decisión explícita del usuario; evita ensuciar la tabla con filas de score 0.
- **Leaderboard real solo para "rocas"** — es el único juego implementado (spec 05); los otros 7 no tienen motor real que produzca un score genuino.

## Riesgos identificados

- **Spam/scores falsos** — sin auth ni rate limiting, cualquiera puede insertar scores absurdos vía `insertScore()` desde devtools. Mitigación futura: rate limiting, captcha, o requerir auth — fuera de alcance acá.
- **Fallback silencioso enmascara errores reales** — si `getGames()` cae a `data.ts` por un error real de configuración (no por caída transitoria), el fallback puede ocultar el problema en vez de alertarlo. Mitigado parcialmente si se agrega un `console.error` en el `catch` (a definir en implementación).
- **Desincronización entre `data.ts` y la tabla `games`** — al mantenerse ambos, un cambio futuro en uno sin el otro genera inconsistencia entre el "modo normal" y el "modo fallback". Riesgo aceptado por la decisión de mantener el fallback.
- **Flag de "modal ya mostrado" mal reseteado** — si el reinicio de partida no limpia bien el flag en `app/jugar/[id]/page.tsx`, el modal podría no reaparecer en un game over posterior. Mitigado por el criterio de aceptación que verifica reinicio + segundo game over.
