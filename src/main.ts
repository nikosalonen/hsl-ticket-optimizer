// Main application entry point

import Chart from "chart.js/auto";
import type { Locale } from "./i18n/index.js";
import { getLocale, initI18n, setLocale, t } from "./i18n/index.js";
import { PriceService, priceService } from "./services/PriceService.js";

// --------------- i18n bootstrap ---------------

initI18n();

function translateStaticDOM() {
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n-aria]")) {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute("aria-label", t(key));
  }
  updateMeta();
}

function updateMeta() {
  document.title = t("meta.title");

  const descEl = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  if (descEl) descEl.content = t("meta.description");

  const ogTitle = document.querySelector<HTMLMetaElement>(
    'meta[property="og:title"]',
  );
  if (ogTitle) ogTitle.content = t("meta.title");

  const ogDesc = document.querySelector<HTMLMetaElement>(
    'meta[property="og:description"]',
  );
  if (ogDesc) ogDesc.content = t("meta.description");

  const ogLocale = document.querySelector<HTMLMetaElement>(
    'meta[property="og:locale"]',
  );
  if (ogLocale) {
    const localeMap: Record<Locale, string> = {
      fi: "fi_FI",
      sv: "sv_SE",
      en: "en_US",
    };
    ogLocale.content = localeMap[getLocale()];
  }
}

// Set language selector to saved locale and wire change handler
const langSelect = document.querySelector<HTMLSelectElement>("#lang-select");
if (langSelect) {
  langSelect.value = getLocale();
  langSelect.addEventListener("change", () => {
    setLocale(langSelect.value as Locale);
  });
}

// Listen for locale changes to re-translate and re-calculate
document.addEventListener("locale-change", () => {
  translateStaticDOM();
  // Re-calculate if results are already visible
  const resultsWrap = document.getElementById("results");
  if (resultsWrap && !resultsWrap.classList.contains("hidden")) {
    void calculate();
  }
});

// Run initial translation
translateStaticDOM();

// --------------- Theme toggle ---------------

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  // Show the opposite icon so the user can switch
  document
    .querySelector(".theme-icon-light")
    ?.classList.toggle("hidden", theme === "light");
  document
    .querySelector(".theme-icon-dark")
    ?.classList.toggle("hidden", theme === "dark");
}

function initTheme() {
  const saved = localStorage.getItem("theme") as "light" | "dark" | null;
  applyTheme(saved ?? getSystemTheme());

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") ?? getSystemTheme();
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
  });

  // Follow system changes when no explicit preference is saved
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (!localStorage.getItem("theme")) {
        applyTheme(getSystemTheme());
      }
    });
}

initTheme();

// Heroicons SVG icons for ticket types
const ICONS = {
  ticket: `<svg class="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"/></svg>`,
  calendar: `<svg class="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>`,
  refresh: `<svg class="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183"/></svg>`,
  stack: `<svg class="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-1.243 1.007-2.25 2.25-2.25h13.5"/></svg>`,
  star: `<svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clip-rule="evenodd"/></svg>`,
} as const;

function getThemeColor(cssVar: string, alpha?: number): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  if (alpha != null) {
    // Insert alpha before the closing paren: oklch(45% 0.24 277 / 0.2)
    return raw.replace(")", ` / ${alpha})`);
  }
  return raw;
}

// Keep references to charts so we can destroy and re-create them safely
let costComparisonChart: Chart | null = null;
let tripsCostChart: Chart | null = null;

type CostView = "monthly" | "annual";
let costView: CostView = "monthly";

interface AppState {
  isLoading: boolean;
  error: string | null;
  results: unknown | null;
}

const appState: AppState = {
  isLoading: false,
  error: null,
  results: null,
};

function setLoading(isLoading: boolean) {
  appState.isLoading = isLoading;
  const loadingEl = document.getElementById("loading");
  if (!loadingEl) return;
  if (isLoading) loadingEl.classList.remove("hidden");
  else loadingEl.classList.add("hidden");
}

function showError(message: string) {
  appState.error = message;
  const errorWrap = document.getElementById("error");
  const msgEl = document.querySelector("#error .error-message");
  if (errorWrap) errorWrap.classList.remove("hidden");
  if (msgEl) msgEl.textContent = message;
}

function hideError() {
  appState.error = null;
  const errorWrap = document.getElementById("error");
  if (errorWrap) errorWrap.classList.add("hidden");
}

function showResults(html: string) {
  const resultsWrap = document.getElementById("results");
  const content = document.getElementById("results-content");
  // Content is internally generated HTML from renderComparison(), not user input
  if (content) content.innerHTML = html;
  if (resultsWrap) {
    const wasHidden = resultsWrap.classList.contains("hidden");
    resultsWrap.classList.remove("hidden");
    if (wasHidden) resultsWrap.classList.add("animate-in");
  }
}

function hideResults() {
  const resultsWrap = document.getElementById("results");
  const content = document.getElementById("results-content");
  if (content) content.innerHTML = "";
  if (resultsWrap) {
    resultsWrap.classList.add("hidden");
    resultsWrap.classList.remove("animate-in");
  }
}

function normalizeZonesInput(rawValue: string): string {
  // Accept zone letters from UI and convert to API zone code via helper
  const letters = rawValue.trim();
  if (/^[A-D]+$/i.test(letters)) {
    return PriceService.getZoneCode(letters.toUpperCase());
  }
  return letters;
}

type OptimalResult = ReturnType<typeof priceService.findOptimalOption>;

function renderComparison(result: OptimalResult, summerVacation: boolean = false) {
  type RowKey =
    | "single"
    | "series10"
    | "series20"
    | "season"
    | "continuousMonthly";

  const rows: Array<{
    label: string;
    key: RowKey;
    cost: number;
    annualCost: number;
    calc: string;
    description: string;
    icon: string;
    wasteWarning?: string | undefined;
  }> = [
    {
      label: t("ticket.single.label"),
      key: "single",
      cost: result.single.monthlyCost,
      annualCost: result.single.annualCost,
      calc: result.single.calculation,
      description: t("ticket.single.description"),
      icon: ICONS.ticket,
    },
    {
      label: t("ticket.season.label"),
      key: "season",
      cost: result.season.monthlyCost,
      annualCost: result.season.annualCost,
      calc: result.season.calculation,
      description: t("ticket.season.description"),
      icon: ICONS.calendar,
    },
    {
      label: t("ticket.continuousMonthly.label"),
      key: "continuousMonthly",
      cost: result.continuousMonthly.monthlyCost,
      annualCost: result.continuousMonthly.annualCost,
      calc: result.continuousMonthly.calculation,
      description: t("ticket.continuousMonthly.description"),
      icon: ICONS.refresh,
    },
  ];

  // Add series tickets only if they are available
  if (result.series10) {
    rows.push({
      label: t("ticket.series10.label"),
      key: "series10",
      cost: result.series10.monthlyCost,
      annualCost: result.series10.annualCost,
      calc: result.series10.calculation,
      description: t("ticket.series10.description"),
      icon: ICONS.stack,
      wasteWarning: result.series10.wasteWarning,
    });
  }

  if (result.series20) {
    rows.push({
      label: t("ticket.series20.label"),
      key: "series20",
      cost: result.series20.monthlyCost,
      annualCost: result.series20.annualCost,
      calc: result.series20.calculation,
      description: t("ticket.series20.description"),
      icon: ICONS.stack,
      wasteWarning: result.series20.wasteWarning,
    });
  }

  // Sort by selected cost view for better visual hierarchy
  const isAnnual = costView === "annual";
  const getCost = (r: (typeof rows)[number]) => isAnnual ? r.annualCost : r.cost;
  const sortedRows = [...rows].sort((a, b) => getCost(a) - getCost(b));
  const optimalRow = sortedRows[0];

  const list = sortedRows
    .map((r) => {
      const isOptimal = r === optimalRow;
      const worstCost = getCost(sortedRows[sortedRows.length - 1]!) || 0;
      const savingsVsWorst = worstCost - getCost(r);
      const savingsKey = isAnnual ? "results.savingsPerYear" : "results.savingsPerMonth";

      // All template content is internally generated (ticket labels, numbers, SVG icons)
      return `
				<div class="card bg-base-100 shadow-md border-2 hover:shadow-lg transition-shadow ${isOptimal ? "border-primary" : "border-transparent"}">
					<div class="card-body gap-3 p-4 sm:p-6">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2.5 min-w-0">
								<span class="text-primary">${r.icon}</span>
								<div class="min-w-0">
									<h3 class="font-semibold leading-tight truncate">${r.label}</h3>
									<p class="text-sm text-base-content/50">${r.description}</p>
								</div>
							</div>
							${isOptimal ? `<span class="badge badge-primary badge-sm gap-1 shrink-0">${ICONS.star} ${t("results.best")}</span>` : ""}
						</div>

						<div class="grid grid-cols-2 gap-3 p-3 rounded-box bg-base-200/60">
							<div>
								<span class="text-xs uppercase tracking-wider text-base-content/40 font-semibold">${t("results.monthly")}</span>
								<div class="font-bold text-lg tabular-nums">\u20AC${r.cost.toFixed(2)}</div>
							</div>
							<div>
								<span class="text-xs uppercase tracking-wider text-base-content/40 font-semibold">${t("results.annual")}</span>
								<div class="font-bold text-lg tabular-nums">\u20AC${r.annualCost.toFixed(2)}</div>
							</div>
						</div>

						${
              r.wasteWarning
                ? `<div class="alert alert-warning text-sm py-2">
									<svg xmlns="http://www.w3.org/2000/svg" class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
									<span>${r.wasteWarning}</span>
								</div>`
                : ""
            }

						${
              savingsVsWorst > 0
                ? `<p class="text-sm text-success font-medium">${t(savingsKey, { amount: savingsVsWorst.toFixed(2) })}</p>`
                : ""
            }

						<details class="collapse collapse-arrow bg-base-200/60 rounded-box">
							<summary class="collapse-title text-sm font-medium min-h-0 py-2 px-3">${t("results.howCalculated")}</summary>
							<div class="collapse-content px-3"><p class="text-sm text-base-content/60">${r.calc}</p></div>
						</details>
					</div>
				</div>
			`;
    })
    .join("");

  const worstCost = getCost(sortedRows[sortedRows.length - 1]!) || 0;
  const optimalSavings = optimalRow
    ? worstCost - getCost(optimalRow)
    : 0;
  const heroValue = optimalRow ? getCost(optimalRow) : 0;
  const heroSuffix = isAnnual ? t("results.perYear") : t("results.perMonth");
  const savingsSuffix = isAnnual
    ? t("results.savingsPerYear", { amount: optimalSavings.toFixed(2) })
    : t("results.savingsTotal", { amount: (optimalSavings).toFixed(2), annualAmount: (optimalSavings * (summerVacation ? 11 : 12)).toFixed(2) });

  // All template content is internally generated (labels, numbers, SVG icons)
  return `
		<div class="stats bg-primary text-primary-content shadow-lg w-full mb-6">
			<div class="stat place-items-center gap-0">
				<div class="stat-title text-primary-content/50">${t("results.bestOption")}</div>
				<div class="stat-value tabular-nums text-3xl sm:text-4xl">\u20AC${heroValue.toFixed(2)}<span class="text-base font-medium text-primary-content/50">${heroSuffix}</span></div>
				<div class="stat-desc text-primary-content/60 text-base">${optimalRow?.label || result.optimal}</div>
				${
          optimalSavings > 0
            ? `<div class="stat-desc text-primary-content/70 mt-1">${savingsSuffix}</div>`
            : ""
        }
			</div>
		</div>

		<div>
			<h3 class="text-sm font-semibold text-base-content/40 uppercase tracking-widest mb-4">${t("results.allOptions")}</h3>
			<div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				${list}
			</div>
		</div>
	`;
}

function renderCostComparisonChart(result: OptimalResult) {
  const ctx = document.getElementById(
    "cost-comparison-chart",
  ) as HTMLCanvasElement | null;
  if (!ctx) return;

  // Destroy previous chart instance if it exists
  if (costComparisonChart) {
    costComparisonChart.destroy();
    costComparisonChart = null;
  }

  const labels: string[] = [
    t("chart.single"),
    t("chart.season"),
    t("chart.continuous"),
  ];
  const continuousMonthlyValue = Number.isFinite(
    result.continuousMonthly?.monthlyCost,
  )
    ? result.continuousMonthly.monthlyCost
    : 0;
  const data: number[] = [
    Number(result.single.monthlyCost) || 0,
    Number(result.season.monthlyCost) || 0,
    continuousMonthlyValue,
  ];
  if (result.series10) {
    labels.push(t("chart.series10"));
    data.push(result.series10.monthlyCost);
  }
  if (result.series20) {
    labels.push(t("chart.series20"));
    data.push(result.series20.monthlyCost);
  }

  costComparisonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: t("chart.monthlyCostLabel"),
          data,
          backgroundColor: getThemeColor("--color-primary", 0.2),
          borderColor: getThemeColor("--color-primary"),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: window.innerWidth < 640 ? 1.3 : 2.5,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: t("chart.euroPerMonth") },
        },
      },
    },
  });
}

async function renderTripsCostChart(
  baseTripsPerWeek: number,
  baseOptions: {
    single: number;
    season: number;
    continuousMonthly?: number;
    series10?: { price: number; journeys: number; validityDays: number };
    series20?: { price: number; journeys: number; validityDays: number };
  },
  summerVacation: boolean = false,
) {
  const ctx = document.getElementById(
    "trips-cost-chart",
  ) as HTMLCanvasElement | null;
  if (!ctx) return;

  // Destroy previous chart instance if it exists
  if (tripsCostChart) {
    tripsCostChart.destroy();
    tripsCostChart = null;
  }

  const tripsRange: number[] = [];
  for (
    let i = Math.max(1, baseTripsPerWeek - 10);
    i <= baseTripsPerWeek + 10;
    i++
  ) {
    tripsRange.push(i);
  }

  const singleCosts: number[] = [];
  const seasonCosts: number[] = [];
  const contMonthlyCosts: number[] = [];
  const series10Costs: number[] = [];
  const series20Costs: number[] = [];

  for (const trips of tripsRange) {
    const comparison = priceService.findOptimalOption(trips, baseOptions, summerVacation);
    singleCosts.push(comparison.single.monthlyCost);
    seasonCosts.push(comparison.season.monthlyCost);
    contMonthlyCosts.push(comparison.continuousMonthly.monthlyCost);
    if (comparison.series10)
      series10Costs.push(comparison.series10.monthlyCost);
    if (comparison.series20)
      series20Costs.push(comparison.series20.monthlyCost);
  }

  const lineColors = [
    getThemeColor("--color-primary"),
    getThemeColor("--color-secondary"),
    getThemeColor("--color-accent"),
    getThemeColor("--color-info"),
    getThemeColor("--color-warning"),
  ];

  const datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }> = [
    {
      label: t("chart.single"),
      data: singleCosts,
      borderColor: lineColors[0] ?? "#888",
      backgroundColor: lineColors[0] ?? "#888",
    },
    {
      label: t("chart.season"),
      data: seasonCosts,
      borderColor: lineColors[1] ?? "#888",
      backgroundColor: lineColors[1] ?? "#888",
    },
    {
      label: t("chart.continuous"),
      data: contMonthlyCosts,
      borderColor: lineColors[2] ?? "#888",
      backgroundColor: lineColors[2] ?? "#888",
    },
  ];
  if (series10Costs.length)
    datasets.push({
      label: t("chart.series10"),
      data: series10Costs,
      borderColor: lineColors[3] ?? "#888",
      backgroundColor: lineColors[3] ?? "#888",
    });
  if (series20Costs.length)
    datasets.push({
      label: t("chart.series20"),
      data: series20Costs,
      borderColor: lineColors[4] ?? "#888",
      backgroundColor: lineColors[4] ?? "#888",
    });

  tripsCostChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: tripsRange.map((trips) => `${trips}`),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: window.innerWidth < 640 ? 1.3 : 2.5,
      plugins: {
        legend: { position: "top" as const },
        tooltip: {
          usePointStyle: true,
          callbacks: {
            labelColor: (tooltipCtx) => {
              const ds = tooltipCtx.dataset as unknown as {
                borderColor?: string;
              };
              const color =
                typeof ds?.borderColor === "string" ? ds.borderColor : "#666";
              return {
                borderColor: color,
                backgroundColor: color,
              } as unknown as {
                borderColor: string;
                backgroundColor: string;
              };
            },
          },
        },
      },
      interaction: { intersect: false, mode: "index" as const },
      scales: {
        x: { title: { display: true, text: t("chart.tripsPerWeek") } },
        y: {
          beginAtZero: true,
          title: { display: true, text: t("chart.euroPerMonthAxis") },
        },
      },
    },
  });
}

function debounce(fn: () => void, ms: number) {
  let id: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(id);
    id = setTimeout(fn, ms);
  };
}

async function calculate() {
  const zonesSelect = document.querySelector<HTMLSelectElement>("#zones");
  const tripsInput = document.querySelector<HTMLInputElement>("#tripsPerWeek");
  const municipalitySelect =
    document.querySelector<HTMLSelectElement>("#homemunicipality");

  const rawZones = zonesSelect?.value || "";
  const zones = normalizeZonesInput(rawZones);

  // Skip silently if zones aren't selected yet
  if (!zones) {
    hideResults();
    return;
  }

  const tripsPerWeek = Number(tripsInput?.value || "10");
  const summerVacation =
    document.querySelector<HTMLInputElement>("#summerVacation")?.checked ?? false;
  const homemunicipality = (
    municipalitySelect?.value || "helsinki"
  ).toLowerCase();

  // Don't flash loading spinner when updating already-visible results
  const resultsVisible = !document
    .getElementById("results")
    ?.classList.contains("hidden");
  hideError();
  if (!resultsVisible) setLoading(true);

  try {
    const pricesResult = await priceService.fetchFilteredTicketPrices(
      zones,
      1,
      homemunicipality,
      tripsPerWeek,
    );

    const comparisonOptions: {
      single: number;
      series10?: { price: number; journeys: number; validityDays: number };
      series20?: { price: number; journeys: number; validityDays: number };
      season: number;
      continuousMonthly?: number;
    } = {
      single: pricesResult.single,
      season: pricesResult.season.price,
      continuousMonthly: pricesResult.continuousMonthly,
    };

    // Only add series tickets if they are available
    if (pricesResult.availableSeriesTickets.series10) {
      comparisonOptions.series10 = pricesResult.availableSeriesTickets.series10;
    }
    if (pricesResult.availableSeriesTickets.series20) {
      comparisonOptions.series20 = pricesResult.availableSeriesTickets.series20;
    }

    const comparison = priceService.findOptimalOption(
      tripsPerWeek,
      comparisonOptions,
      summerVacation,
    );

    const html = renderComparison(comparison, summerVacation);
    showResults(html);
    renderCostComparisonChart(comparison);
    void renderTripsCostChart(tripsPerWeek, comparisonOptions, summerVacation);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : t("error.unexpected");
    showError(message);
  } finally {
    setLoading(false);
  }
}

// Wire up reactive listeners
const formEl = document.getElementById("ticket-form");
const zonesEl = document.querySelector<HTMLSelectElement>("#zones");
const municipalityEl =
  document.querySelector<HTMLSelectElement>("#homemunicipality");
const sliderEl = document.querySelector<HTMLInputElement>("#tripsPerWeek");
const sliderValueEl = document.getElementById("tripsPerWeekValue");

const debouncedCalculate = debounce(() => void calculate(), 150);

if (sliderEl) {
  sliderEl.addEventListener("input", () => {
    if (sliderValueEl) sliderValueEl.textContent = sliderEl.value;
    debouncedCalculate();
  });
}

if (zonesEl) {
  zonesEl.addEventListener("change", () => void calculate());
}

if (municipalityEl) {
  municipalityEl.addEventListener("change", () => void calculate());
}

const vacationEl =
  document.querySelector<HTMLInputElement>("#summerVacation");
if (vacationEl) {
  vacationEl.addEventListener("change", () => void calculate());
}

if (formEl) {
  formEl.addEventListener("submit", (evt) => {
    evt.preventDefault();
    void calculate();
  });
}

// Cost view toggle (monthly / annual)
function updateCostViewToggle() {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(
    "#cost-view-toggle [data-cost-view]",
  )) {
    const isActive = btn.dataset.costView === costView;
    btn.classList.toggle("btn-active", isActive);
  }
}

for (const btn of document.querySelectorAll<HTMLButtonElement>(
  "#cost-view-toggle [data-cost-view]",
)) {
  btn.addEventListener("click", () => {
    const view = btn.dataset.costView as CostView | undefined;
    if (view && view !== costView) {
      costView = view;
      updateCostViewToggle();
      void calculate();
    }
  });
}

export { appState };
