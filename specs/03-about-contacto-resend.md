# Spec 03 — Página About y contacto vía Resend

**Estado:** implementado
**Dependencias:** Spec 01 (mvp-pantallas-visuales) — reutiliza `Nav`, tema CSS en `globals.css`. Spec 02 (home-page-and-games-route) — `Nav` ya apunta `/home`→Inicio, `/games`→Biblioteca; este spec agrega el link "Acerca de".
**Fecha:** 2026-08-02

**Objetivo:** Portar la vista `/about` de `references/templates/home-about/about.jsx` (hero + formulario de contacto con estética terminal) y conectar el formulario a un envío de mail real vía Resend a través de una API route server-side, con la API key en variable de entorno nunca expuesta al cliente.

## Scope

**Incluye:**
- Ruta `app/about/page.tsx` — porta `about.jsx`: hero con kicker "▸ ACERCA DE", título, misión, fila de 3 highlights con `HighlightIcon` (HEART/BROWSER/PLANT), divider animado, sección de contacto con intro + tips y formulario (nombre/email/mensaje).
- `components/About.tsx` (client component) — porta la lógica de `about.jsx`: estado del form, animación `reveal` on-scroll (mismo hook `useReveal` ya usado en `components/Home`), validación de campos vacíos con `shake`.
- `app/api/contact/route.ts` — API route server-side: recibe `POST { name, email, msg }`, valida server-side (campos no vacíos tras trim + formato de email básico), llama a Resend (`to: devcatania@gmail.com`, `replyTo: <email del form>`, `from: onboarding@resend.dev`), devuelve `200` en éxito o `500` con mensaje de error genérico en fallo.
- Estado de envío en el formulario: `idle` → `loading` (fetch en curso) → `success` (bloque terminal verde, igual al template) → `error` (mismo bloque terminal, líneas en rojo, botón para reintentar sin perder lo escrito).
- Variable de entorno `RESEND_API_KEY` en `.env` (raíz del proyecto), leída solo en `app/api/contact/route.ts` (server-side, nunca en un client component).
- `.env.example` con `RESEND_API_KEY=` vacío, para documentar la variable sin exponer el valor real — se commitea.
- Dependencia `resend` agregada a `package.json`.
- `components/Nav.tsx` — agregar link "Acerca de" → `/about` en desktop y mobile, actualizar `isActive` para resaltarlo en `/about`.
- Verificar que `.env` está cubierto por `.gitignore` (ya lo está vía el patrón `.env*` existente — no requiere cambios).

**No incluye:**
- Persistencia de mensajes enviados (no hay base de datos, no hay log de contactos).
- Rate limiting o protección anti-spam (captcha, honeypot) — fuera de alcance, se puede pedir como spec futuro si se vuelve necesario.
- Dominio propio verificado en Resend — se usa el dominio de pruebas `onboarding@resend.dev` como remitente.
- Envío de confirmación/autorespuesta al usuario que llena el formulario — solo el equipo (`devcatania@gmail.com`) recibe el mensaje.
- Cambios en el resto de rutas ya portadas (`/home`, `/games`, `/juego/[id]`, `/jugar/[id]`, `/salon`, `/auth`).
- Tests automatizados.

## Data model

No se introduce modelo de datos persistente. La única "estructura" nueva es el contrato del body que viaja entre el form y la API route:

```ts
// app/api/contact/route.ts
interface ContactRequestBody {
  name: string;
  email: string;
  msg: string;
}
```

Sin tipos compartidos en `data.ts` — este contrato vive solo dentro de `route.ts` y `About.tsx`, no se persiste en ningún lado.

## Implementation plan

1. **`npm install resend`** — agrega la dependencia al `package.json`.
2. **`.env`** — crear con `RESEND_API_KEY=<valor real, no commiteado>`. **No se commitea** (ya cubierto por `.env*` en `.gitignore`).
3. **`.env.example`** — crear con `RESEND_API_KEY=` (vacío), se commitea como documentación de la variable requerida.
4. **`app/api/contact/route.ts`** — API route `POST`: parsea el body, valida (`name`/`msg` no vacíos tras `trim()`, `email` con regex básica), instancia `Resend(process.env.RESEND_API_KEY)`, envía el mail (`to: devcatania@gmail.com`, `from: "onboarding@resend.dev"`, `replyTo: <email del form>`, `subject` y `text`/`html` con nombre+mensaje), devuelve `Response.json({ ok: true })` en éxito o `Response.json({ ok: false }, { status: 500 })` en fallo (validación fallida → `400`).
5. **`components/About.tsx`** — crear client component: porta hero + highlights + divider + intro/tips de contacto tal cual `about.jsx`; formulario con estado `status: "idle" | "loading" | "success" | "error"`; `onSubmit` valida campos vacíos (shake si falta algo), si pasa hace `fetch("/api/contact", { method: "POST", body: ... })`, actualiza `status` según la respuesta; bloque terminal reutilizado para `success` (verde, texto original) y `error` (rojo, mensaje de fallo + botón "REINTENTAR" que vuelve a `idle` sin borrar lo escrito).
6. **`app/about/page.tsx`** — Server Component simple que renderiza `<About />`.
7. **`components/Nav.tsx`** — agregar `<Link href="/about">Acerca de</Link>` en el bloque desktop y en el mobile, actualizar `isActive` para que `/about` resalte "Acerca de".
8. **`npm run lint`** — verificar que pasa sin errores de TypeScript/ESLint.

Cada paso deja la app funcional. El usuario prueba el envío real de mail manualmente al final (requiere que la key de Resend esté activa).

## Acceptance criteria

- [x] `npm run lint` pasa sin errores.
- [x] `/about` muestra: hero con kicker/título/misión, fila de 3 highlights (HEART/BROWSER/PLANT), divider animado, sección de contacto con intro+tips y formulario (nombre/email/mensaje).
- [x] Las secciones con clase `reveal` aparecen animadas al hacer scroll, igual que en `/home`.
- [x] Enviar el formulario con algún campo vacío dispara el `shake` y no llama a la API.
- [x] Enviar el formulario completo muestra el bloque terminal de éxito ("MENSAJE RECIBIDO...") solo después de que la API route responde `200`, no antes.
- [x] El mail llega efectivamente vía Resend, con el email ingresado en el form como `reply-to`. **Desviación:** `to` es `nicolas20032401@gmail.com` en vez de `devcatania@gmail.com` — la cuenta Resend está en modo sandbox y solo permite enviar a la dirección verificada del owner. Migrar a `devcatania@gmail.com` requiere verificar un dominio propio en Resend (fuera de alcance, ver Riesgos).
- [x] Si la API route falla (ej. `RESEND_API_KEY` inválida), el formulario muestra el bloque terminal en modo error, con botón "REINTENTAR" que no borra lo escrito.
- [x] `RESEND_API_KEY` no aparece en ningún archivo commiteado ni en el bundle del cliente (solo se usa dentro de `app/api/contact/route.ts`).
- [x] `.env` no aparece en `git status` como archivo trackeable (verificar con `git check-ignore .env`).
- [x] `.env.example` sí está commiteado, con la variable vacía. Requirió agregar `!.env.example` a `.gitignore`, ya que el patrón `.env*` lo ignoraba también a él.
- [x] Nav muestra "Acerca de" resaltado en `/about`, en desktop y mobile.

## Decisiones tomadas y descartadas

- **API route server-side (`app/api/contact/route.ts`) en vez de llamar a Resend desde el cliente** — la API key de Resend nunca puede viajar al bundle del cliente; es un requisito de seguridad no negociable, no una preferencia de arquitectura.
- **`.env` + `.env.example`** en vez de solo `.env` — permite documentar qué variable requiere el proyecto sin exponer el valor real; patrón estándar para repos con secretos.
- **Dominio de pruebas `onboarding@resend.dev`** en vez de exigir un dominio verificado — evita bloquear el spec por un paso de configuración externo a Resend; se puede migrar a dominio propio en un spec futuro sin tocar el resto del flujo.
- **`to` fijo (`devcatania@gmail.com`), `email` del form como `replyTo`** — patrón estándar de formulario de contacto: el equipo recibe todo en una bandeja, y puede responder directo al usuario. Descartado enviar confirmación al usuario porque no fue pedido y duplicaría el envío sin necesidad.
- **Mismo estilo terminal para error que para éxito** (en vez de un `alert()` genérico) — mantiene consistencia visual con el resto de la app; el usuario ya lo prefirió así en la Fase 2.
- **Sin rate limiting ni captcha** — fuera de alcance explícito; el proyecto no tiene tráfico real todavía y agregar protección anti-spam sin necesidad sería trabajo muerto.
- **Validación server-side mínima** (no vacío + regex de email) en vez de una librería de validación (zod, etc.) — consistente con el resto del repo, que no usa librerías de validación; evita una dependencia nueva para un caso simple.

## Riesgos identificados

- **Exposición accidental de la API key** — si alguien hace `git add -A` sin revisar, `.env` podría colarse pese al `.gitignore`. Mitigado por el patrón `.env*` ya existente y por el acceptance criteria que verifica `git check-ignore .env`.
- **Restricción del dominio de pruebas de Resend** — con `onboarding@resend.dev`, Resend en modo sandbox solo permite enviar a la dirección verificada del dueño de la cuenta (`devcatania@gmail.com` en este caso); si más adelante se quiere recibir en otra casilla, va a requerir verificar un dominio propio.
- **`useReveal` (IntersectionObserver)** — mismo riesgo ya documentado en spec 02: debe ejecutarse solo client-side; si el componente se arma mal, las secciones quedan invisibles en SSR/primer render.
