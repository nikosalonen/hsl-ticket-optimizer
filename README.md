# HSL Ticket Optimizer

Find the most cost‑effective HSL public transport ticket based on your zones, trips per week, and municipality. The app fetches prices from HSL and compares Single, Series (10/20), Season (30d), and Continuous (saver subscription) options.

## Tech stack
- Vite + TypeScript
- Chart.js for charts
- Tailwind CSS v4 + daisyUI for UI
- Biome for linting & formatting
- Vitest + jsdom for tests
- i18n support (Finnish, English, Swedish)

## Getting started
```bash
# Install deps
pnpm install

# Start dev server
pnpm run dev

# Run unit tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with UI
pnpm run test:ui

# Type-check
pnpm run type-check

# Lint
pnpm run lint

# Lint and auto-fix
pnpm run lint:fix

# Format
pnpm run format

# Check formatting
pnpm run format:check

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## Usage
1. Select zones (AB/ABC/ABCD/BC/BCD/CD/D), your home municipality, and trips per week.
2. Submit the form to see:
   - Comparison cards for each option with monthly/annual costs
   - Expandable calculation details showing cost formulas per option
   - Waste warnings when series ticket journeys would go unused
   - Monthly cost comparison bar chart
   - Cost vs. trips per week line chart (expandable to full-screen)
3. Additional controls:
   - Language selector (fi/en/sv) — persisted in localStorage, also via `?lang=` URL param
   - Light/dark theme toggle (defaults to system preference)
   - Monthly/annual cost view toggle
   - Summer vacation checkbox (reduces annual costs by 1 month)

## Pricing logic
- Season: 30‑day price from HSL.
- Continuous: prefers saver subscription (12‑month commitment). If unavailable, falls back to regular continuous, otherwise 5% discount from season.
- Series:
  - 10x: validity 30 days
  - 20x: validity 60 days
  - Availability filtered by your trips/week to reduce waste.

## Zones
The UI uses zone letters; the app converts them to HSL API codes internally:
AB→11, ABC→12, ABCD→13, BC→21, BCD→22, CD→31, D→40.

## Troubleshooting
- If charts overlap on re‑render, existing instances are destroyed before creating new ones.
