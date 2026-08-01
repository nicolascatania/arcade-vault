# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por puntaje (README.md). Currently a fresh `create-next-app` scaffold; no game logic implemented yet.

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

- App Router under `app/`: `app/layout.tsx` (root layout, Geist fonts, global `<body class="min-h-full flex flex-col">`), `app/page.tsx` (home page), `app/globals.css`.
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss` (see `postcss.config.mjs`), dark mode handled with Tailwind `dark:` classes.
- TypeScript path alias: `@/*` maps to the repo root (`tsconfig.json`).
- No routing beyond the root page exists yet — this is pre-feature-work scaffold state.

## Spec-driven workflow

This repo follows a spec-driven development flow via two custom skills in `.agents/skills/` (installed from `Klerith/fernando-skills`, tracked in `skills-lock.json`):

- **`/spec`** — guided spec designer. Clarifies requirements through Q&A, then writes the spec section-by-section into `specs/NN-slug.md` (template: `.agents/skills/spec/template.md`). Never writes code. New specs are saved in `Draft` state.
- **`/spec-impl NN-slug`** — implements an **Approved** spec only. Reads `specs/NN-slug.md`, refuses to proceed unless the state field says "Approved" (or equivalent in another language) — the human must flip that manually. On approval, creates/switches to branch `spec-NN-slug` (governed by `AutoCreateBranch` in `specs/.spec-config.yml`, default `true`), then implements the plan step-by-step pausing for review after each step.

`specs/` does not exist yet in this repo — it is created by the first `/spec` run.

When asked to implement a feature that has an approved spec, use `/spec-impl` rather than improvising an implementation plan. When asked to plan a new feature, prefer `/spec` over writing code directly.
