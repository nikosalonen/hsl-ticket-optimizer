# HSL Ticket Optimizer

Find the most cost‑effective HSL public transport ticket based on your zones, trips per week, and municipality. The app fetches prices from HSL and compares Single, Series (10/20), Season (30d), and Continuous (saver subscription) options.

## Tech stack
- Vite + TypeScript
- Chart.js for charts
- Tailwind CSS v4 + daisyUI for UI
- Vitest + jsdom for tests

## Getting started
```bash
# Install deps
npm install

# Start dev server
npm run dev

# Run unit tests
npm test

# Type-check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage
1. Select zones (AB/ABC/ABCD/BCD/CD/D), your home municipality, and trips per week.
2. Submit the form to see:
   - Comparison cards for each option with monthly/annual costs
   - Monthly cost comparison bar chart
   - Cost vs. trips per week line chart
3. Hover charts to see tooltips; colors match the series for readability.

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
- If Stylelint flags Tailwind/Daisy at‑rules, either disable the rule for the file or configure Stylelint to ignore `tailwind`, `apply`, `variants`, `responsive`, `screen`, and `plugin`.
- If charts overlap on re‑render, existing instances are destroyed before creating new ones.
