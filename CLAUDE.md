# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HSL Ticket Optimizer — a client-side web app that fetches real ticket prices from the HSL CMS API and calculates the most cost-effective public transport ticket option (single, series 10/20, season 30-day, continuous monthly, saver subscription) based on user-selected zones, home municipality, and trips per week. Deployed to GitHub Pages.

## Commands

- `pnpm run dev` — Start Vite dev server (port 3000, auto-opens browser)
- `pnpm run build` — Type-check with `tsc` then build with Vite to `dist/`
- `pnpm test` — Run all Vitest tests once (`vitest --run`)
- `pnpm run test:watch` — Run Vitest in watch mode
- `pnpm run type-check` — TypeScript type-check only (`tsc --noEmit`)
- `pnpm run lint` — Run Biome linter (`biome check .`)
- `pnpm run lint:fix` — Auto-fix lint issues (`biome check --write .`)
- `pnpm run format` — Format with Biome (`biome format --write .`)
- `pnpm run format:check` — Check formatting without writing

## Architecture

Single-page vanilla TypeScript app (no framework). Vite bundles everything; no SSR.

### Key files

- `index.html` — Entry point with form UI (zones, municipality, trips/week). Uses daisyUI components with system theme (light/dark).
- `src/main.ts` — App entry: form handling, DOM manipulation, Chart.js rendering (bar chart + line chart). Manages chart lifecycle (destroy before re-create).
- `src/services/PriceService.ts` — Core business logic. Fetches prices from `https://cms.hsl.fi/api/v1/tickets/{type}` endpoints (single, day, season). Contains all cost calculation methods (`calculateSingleTicketCost`, `calculateSeriesTicketCost`, `findOptimalOption`, etc.). Series ticket prices are hardcoded per zone. Exported as singleton `priceService`.
- `src/models/types.ts` — All TypeScript interfaces and the `APIError` class.
- `src/utils/CacheManager.ts` — localStorage-based cache with TTL. Exported as singleton `cacheManager`.
- `src/i18n/index.ts` — i18n system: `t()` translation function, `setLanguage()`, `getCurrentLanguage()`. Supports `fi`, `en`, `sv`.
- `src/i18n/locales/{fi,en,sv}.ts` — Translation strings per language.
- `vite.config.ts` — Vite + Vitest config (renamed from `vite.config.js`).

### Data flow

1. User submits form with zone letters (AB/ABC/ABCD/BCD/CD/D)
2. `normalizeZonesInput()` converts letters to API zone codes (AB→11, ABC→12, etc.) via `PriceService.getZoneCode()`
3. `PriceService.fetchFilteredTicketPrices()` fetches single + daily + season prices in parallel, applies series ticket filtering by trip frequency
4. `PriceService.findOptimalOption()` calculates monthly/annual costs for each ticket type, determines cheapest
5. Results rendered as comparison cards + Chart.js charts

### HSL API

- Base URL: `https://cms.hsl.fi/api/v1/tickets`
- Endpoints: `/single`, `/day`, `/season` (with `homemunicipality` and `ownership=personal`)
- Zone codes: AB=11, ABC=12, ABCD=13, BC=21, BCD=22, CD=31, D=40
- Customer groups: 1=Adult (default), 2=Child, 4=Senior, 5=Mobility impaired, 6=70+
- Responses cached in localStorage for 1 hour

## Linting & Formatting

Biome (not ESLint/Prettier). Config in `biome.json`. Double quotes, space indentation. CI runs `pnpm run lint` before tests.

## CI/CD

GitHub Actions (`.github/workflows/static.yml`): on push to `main` → pnpm install → lint → test → build → deploy to GitHub Pages. Node version from `.nvmrc` (24).

## i18n

Simple key-based translation system in `src/i18n/`. Three languages: Finnish (default), English, Swedish. Add new strings to all three locale files in `src/i18n/locales/`. Use `t("key")` in code.

## Testing

- Vitest with jsdom environment, globals enabled
- Config in `vite.config.ts` under `test` key
- Tests mock `fetch` globally and mock `CacheManager`
- Run a single test file: `pnpm vitest --run tests/PriceService.test.ts`

## TypeScript

Strict mode with additional checks: `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`. Target ES2020, bundler module resolution.

## Styling

Tailwind CSS v4 with `@tailwindcss/vite` plugin + daisyUI v5. Styles in `src/styles/main.css`. Uses system theme: `light` by default, `dark` via `prefers-color-scheme`. Chart colors use daisyUI CSS custom properties (`--color-primary`, etc.).
