# Spec 02 — Home page y ruta /games

**Estado:** approved
**Dependencias:** Spec 01 (mvp-pantallas-visuales) — reutiliza `Nav`, `data.ts` (`GAMES`), tema CSS en `globals.css`.
**Fecha:** 2026-08-01

**Objetivo:** Portar la landing de `references/templates/home-about/home.jsx` como ruta `/home` (nueva home real de la app, con `/` haciendo redirect hacia ella), renombrar la ruta actual de biblioteca de `/` a `/games`, y actualizar el `Nav` y todos los enlaces internos que hoy apuntan a `/` para que apunten a `/games`.

## Scope

**Incluye:**
- Ruta `app/home/page.tsx` — porta `home.jsx`: hero con `FloatingSilhouettes` decorativo, sección "¿Por qué Arcade Vault?" (feature grid), sección "Juegos disponibles ahora" (mini-rail con `GAMES.slice(0,6)` reales de `data.ts`, navegando a `/juego/[id]`), sección de stats, sección "Actividad en vivo" (ticker de puntajes + top jugadores, datos mock hardcodeados tal cual el template), sección de precios (estática, sin lógica de pago), CTA final. Animación `reveal` on-scroll vía `IntersectionObserver` portada como client component.
- `app/page.tsx` — se reemplaza por un `redirect("/home")` (Server Component, sin `"use client"`).
- Mover el contenido actual de biblioteca (hoy en `app/page.tsx`) a `app/games/page.tsx`, sin cambios de lógica (mismo `GameCard`, búsqueda, chips).
- `components/Nav.tsx` — agregar link "Inicio" → `/home` (logo también apunta a `/home`); "Biblioteca" pasa a apuntar a `/games`; se mantiene "Salón de la Fama" → `/salon`. Sin "Acerca de" (excluido explícitamente por el usuario).
- Actualizar todos los enlaces internos que hoy navegan a `/` como "volver a biblioteca", para que naveguen a `/games`:
  - `app/salon/page.tsx:70` (botón "VOLVER A LA BIBLIOTECA")
  - `app/auth/page.tsx:15,55` (`router.push("/")` en submit y botón invitado)
  - `app/juego/[id]/page.tsx:49` (botón "VOLVER")
- `globals.css` — ya tiene portadas las clases `.home-*` (verificado en `styles.css:930-1069`); completar solo si falta alguna al portar `home.jsx`.

**No incluye:**
- Página `/about` (`about.jsx` del template) — explícitamente excluida por el usuario.
- Cambios de lógica en `/games`, `/juego/[id]`, `/jugar/[id]`, `/salon`, `/auth` más allá de actualizar el destino de sus enlaces de "volver".
- Datos en vivo reales para el ticker de actividad o top jugadores — quedan hardcodeados como en el template (sin backend, sin `localStorage`).
- Tests automatizados.

## Data model

No se introduce modelo de datos nuevo: el mini-rail reutiliza `GAMES` de `data.ts` (ya existente, spec 01); el ticker de actividad y el top de jugadores quedan como arrays literales inline dentro del componente `Home`, igual que en `home.jsx` (mock estático, no una fuente de datos compartida). Sección omitida.

## Implementation plan

1. **`app/games/page.tsx`** — mover el contenido íntegro de `app/page.tsx` (biblioteca actual) tal cual, sin cambios de lógica.
2. **`app/page.tsx`** — reemplazar por un Server Component que hace `redirect("/home")`.
3. **`components/Home/` (o `components/HomePage.tsx`)** — crear el/los componente(s) cliente que portan `home.jsx`: `FloatingSilhouettes`, `MiniCard`/reutilizo de `GameCard`, `FeatureIcon`, hook `useReveal` (IntersectionObserver), y el resto de secciones (hero, features, mini-rail, stats, actividad, precios, CTA final).
4. **`app/home/page.tsx`** — usa el componente del paso 3, pasando `GAMES.slice(0, 6)` para el mini-rail; navegación con `next/link`/`useRouter` en vez del `navigate()` del template (`/games` para "Explorar juegos"/"Ver todos", `/auth` para "Crear cuenta"/"Empezar gratis", `/juego/[id]` en cada mini-card, `/salon` en "Ver salón").
5. **`components/Nav.tsx`** — agregar link "Inicio" (`/home`), actualizar "Biblioteca" a `/games`, actualizar `isActive` para que `/games`, `/juego`, `/jugar` resalten "Biblioteca" y `/home` resalte "Inicio"; logo apunta a `/home`.
6. **`app/salon/page.tsx`, `app/auth/page.tsx`, `app/juego/[id]/page.tsx`** — actualizar los `href`/`router.push` que hoy apuntan a `/` para que apunten a `/games`.
7. **`globals.css`** — diff puntual contra `styles.css:930-1069` (`.home-*`) solo si algo falta al integrar el componente.
8. **`npm run lint`** — verificar que pasa sin errores de TypeScript/ESLint.

Cada paso deja la app funcional.

## Acceptance criteria

- [ ] `npm run lint` pasa sin errores.
- [ ] Abrir `/` redirige automáticamente a `/home`.
- [ ] `/home` muestra: hero con silhouettes flotantes y CTAs, sección "¿Por qué Arcade Vault?" con 4 feature cards, mini-rail de 6 juegos reales desde `data.ts`, sección de stats, sección "Actividad en vivo" (ticker + top jugadores), sección de precios, CTA final.
- [ ] Las secciones con clase `reveal` aparecen animadas al hacer scroll (fade + translate), no todas visibles de entrada.
- [ ] Click en una mini-card del home navega a `/juego/[id]` correcto.
- [ ] Botones "Explorar juegos" / "Ver todos los juegos" navegan a `/games`; "Crear cuenta" / "Empezar gratis" navegan a `/auth`; "Ver salón" navega a `/salon`.
- [ ] `/games` muestra la biblioteca (hero, búsqueda, chips, grid) igual que antes, en la nueva ruta.
- [ ] Nav muestra "Inicio" resaltado en `/home`, "Biblioteca" resaltado en `/games`, `/juego/*` y `/jugar/*`; logo navega a `/home`.
- [ ] Botones "Volver a biblioteca" en `/salon`, `/auth` (invitado/submit) y `/juego/[id]` navegan a `/games` (ya no a `/`).
- [ ] No existe ninguna ruta `/about`.

## Decisiones tomadas y descartadas

- **Redirect server-side de `/` a `/home`** en vez de duplicar contenido — evita dos URLs sirviendo lo mismo; es el patrón estándar de App Router (`redirect()` en un Server Component).
- **Biblioteca movida a `/games`** en vez de mantenerla en `/` — pedido explícito del usuario: `/home` pasa a ser la entrada por defecto, `/games` aloja el catálogo.
- **Mini-rail con `GAMES` real** en vez de datos de ejemplo fijos — permite que el home enlace a juegos que existen de verdad en `/juego/[id]`, evitando links rotos.
- **Ticker de actividad y top jugadores con mock hardcodeado** (no `data.ts`, no backend) — consistente con la decisión de spec 01 de no introducir persistencia ni lógica de puntaje real; es contenido puramente decorativo de la landing.
- **Sin página `/about`** — exclusión explícita del usuario en el pedido inicial.
- **`/about` del template no se porta ni siquiera parcialmente** — evita trabajo muerto; si se pide en el futuro, será un spec propio.

## Riesgos identificados

- **Enlaces/bookmarks existentes a `/`** — cualquier lugar fuera de este repo que enlace a `/` esperando ver la biblioteca ahora ve el home; asumido aceptable porque el proyecto es un scaffold sin usuarios reales todavía.
- **`useReveal` (IntersectionObserver)** — debe ejecutarse solo client-side (`"use client"` + `useEffect`); si se arma mal el componente, las secciones podrían quedar invisibles en SSR/primer render.
