# Spec 04 — Implementación de Supabase (setup)

**Estado:** implementado
**Dependencias:** ninguna directa. Prepara la base para specs futuros de auth y persistencia de puntajes.
**Fecha:** 2026-08-02

**Objetivo:** Instalar y configurar los clientes de Supabase (`@supabase/supabase-js` + `@supabase/ssr`) contra el proyecto existente `elrzxjeymnyxwpxqgghn`, sin implementar todavía ninguna feature (auth, puntajes, catálogo) que los use.

## Scope

**Incluye:**
- Dependencias `@supabase/supabase-js` y `@supabase/ssr` agregadas a `package.json`.
- `lib/supabase/client.ts` — factory `createClient()` para uso en Client Components (browser), vía `createBrowserClient` de `@supabase/ssr`.
- `lib/supabase/server.ts` — factory `createClient()` async para uso en Server Components/Route Handlers, vía `createServerClient` de `@supabase/ssr` + `cookies()` de `next/headers`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env` (valores reales del proyecto `elrzxjeymnyxwpxqgghn`, ya obtenidos vía MCP), no commiteadas (ya cubierto por `.env*` en `.gitignore`).
- `.env.example` actualizado con esas dos variables vacías, documentando el requisito sin exponer valores.
- Verificación manual de que ambos clientes conectan al proyecto correcto (vía MCP: `list_tables`/`get_project_url`, sin agregar código de prueba a la app).

**No incluye (para specs futuros):**
- Autenticación real (login/signup, sesiones) — hoy `app/auth/page.tsx` sigue siendo mock, sin tocar.
- `middleware.ts` de refresco de sesión — no aplica todavía porque no hay sesiones que refrescar.
- Persistencia de puntajes (reemplazar `seededScores()` en `data.ts`/`app/salon/page.tsx`) — requiere modelo de datos y tablas, spec propio.
- Catálogo de juegos en base de datos (mover `GAMES` de `data.ts` a una tabla) — spec propio.
- Cualquier tabla, migración o esquema en la base — este spec es solo la capa de cliente/conexión, la base sigue vacía (`list_tables` confirmó 0 tablas).
- Row Level Security, políticas, roles — no aplica sin tablas ni auth.

## Data model

No se introduce modelo de datos de dominio (sin tablas, sin tipos de negocio). La única "estructura" nueva es el contrato de configuración que leen los dos clientes:

```ts
// lib/supabase/client.ts y lib/supabase/server.ts
process.env.NEXT_PUBLIC_SUPABASE_URL          // string, URL del proyecto
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  // string, key pública sb_publishable_...
```

Ambas variables llevan el prefijo `NEXT_PUBLIC_` porque la key publishable está pensada para exponerse en el bundle del cliente (no es un secreto, a diferencia de `RESEND_API_KEY` en spec 03).

## Implementation plan

1. **`npm install @supabase/supabase-js @supabase/ssr`** — agrega ambas dependencias a `package.json`.
2. **`.env`** — agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores reales del proyecto `elrzxjeymnyxwpxqgghn` (no se commitea, ya cubierto por `.env*`).
3. **`.env.example`** — agregar las mismas dos variables, vacías, junto a `RESEND_API_KEY=` ya existente.
4. **`lib/supabase/client.ts`** — factory `createClient()` con `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)`, para usar en Client Components.
5. **`lib/supabase/server.ts`** — factory `async createClient()` con `createServerClient(...)`, leyendo/escribiendo cookies vía `cookies()` de `next/headers` (patrón estándar de `@supabase/ssr` para Server Components/Route Handlers).
6. **Verificación manual vía MCP** — correr `list_tables` y `get_project_url` para confirmar que el proyecto apuntado es el correcto (`elrzxjeymnyxwpxqgghn`, 0 tablas). No se agrega código de prueba a la app.
7. **`npm run lint`** — verificar que pasa sin errores de TypeScript/ESLint (los dos archivos nuevos no se importan todavía desde ninguna ruta, así que no debería haber warnings de "unused").

Cada paso deja la app funcional — ningún componente existente cambia de comportamiento en este spec.

## Acceptance criteria

- [x] `npm run lint` pasa sin errores.
- [x] `npm run build` no falla por los nuevos archivos (`lib/supabase/client.ts`, `lib/supabase/server.ts`) — se compilan aunque nadie los importe todavía.
- [x] `.env` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con valores reales; `git check-ignore .env` confirma que no se trackea.
- [x] `.env.example` commiteado con ambas variables vacías, sin ningún valor real.
- [x] Ningún valor de key o URL real aparece en `specs/04-supabase-setup.md`, ni en ningún archivo commiteado fuera de `.env`.
- [x] `list_tables` vía MCP confirma que el proyecto Supabase apuntado sigue con 0 tablas (no se creó ninguna en este spec).
- [x] `app/auth/page.tsx` y `app/salon/page.tsx` no cambian — siguen siendo mock, sin ninguna llamada a Supabase.

## Decisiones tomadas y descartadas

- **`@supabase/ssr` en vez de solo `@supabase/supabase-js`** — es el patrón oficial actual para App Router (cliente browser + cliente server separados); evita migrar más adelante cuando se implemente auth con sesiones SSR.
- **`middleware.ts` de refresco de sesión fuera de alcance** — sin auth implementado todavía, no hay sesión que refrescar; agregarlo ahora sería código muerto. Decisión explícita del usuario.
- **Key `sb_publishable_...` en vez de la `anon` JWT legacy** — es la convención nueva que Supabase recomienda para reemplazar la anon key; el proyecto no tiene código legacy que dependa del formato JWT.
- **Proyecto Supabase existente (`elrzxjeymnyxwpxqgghn`)** reutilizado en vez de crear uno nuevo — ya está vinculado en `.mcp.json` y confirmado vacío (0 tablas), no hay razón para duplicar.
- **Sin tablas ni RLS en este spec** — este spec es solo la capa de cliente/conexión; el modelo de datos (auth, puntajes, catálogo) se define en specs futuros que sí lo necesiten.
- **Ningún valor real de URL/key en el spec ni en el código versionado** — solo vive en `.env` (gitignored); `.env.example` documenta las claves vacías. Requisito explícito del usuario, no negociable.

## Riesgos identificados

- **Variables de entorno faltantes en otro entorno (ej. Vercel)** — los clientes usan `!` (non-null assertion) sobre `process.env.NEXT_PUBLIC_SUPABASE_URL`/`..._PUBLISHABLE_KEY`; si no están seteadas en el deploy, falla en runtime con un error poco claro. Mitigado documentando ambas en `.env.example`.
- **Confusión entre `.env` real y `.env.example`** — mismo riesgo ya identificado en spec 03; mitigado por el patrón `.env*` + `!.env.example` ya existente en `.gitignore`.
