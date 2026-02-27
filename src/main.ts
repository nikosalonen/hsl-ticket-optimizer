// Main application entry point

import Chart from "chart.js/auto";
import { PriceService, priceService } from "./services/PriceService.js";

/**
 * Determines the current system color scheme preference.
 *
 * @returns `dark` if the user's system prefers a dark color scheme, `light` otherwise.
 */

function getSystemTheme(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

/**
 * Apply the given UI theme and update the visibility of theme toggle icons.
 *
 * Sets the document's `data-theme` attribute to the provided value and shows the opposite
 * theme icon (so the user can switch), hiding the icon that matches the current theme.
 *
 * @param theme - The theme to apply, either `"light"` or `"dark"`.
 */
function applyTheme(theme: "light" | "dark") {
	document.documentElement.setAttribute("data-theme", theme);
	// Show the opposite icon so the user can switch
	document.querySelector(".theme-icon-light")?.classList.toggle("hidden", theme === "light");
	document.querySelector(".theme-icon-dark")?.classList.toggle("hidden", theme === "dark");
}

/**
 * Initializes and activates theme handling for the page.
 *
 * Applies a saved theme or the system preference, wires the theme toggle to persist and switch themes,
 * and listens for system color-scheme changes to auto-apply when the user has not set an explicit preference.
 */
function initTheme() {
	const saved = localStorage.getItem("theme") as "light" | "dark" | null;
	applyTheme(saved ?? getSystemTheme());

	document.getElementById("theme-toggle")?.addEventListener("click", () => {
		const current = document.documentElement.getAttribute("data-theme") ?? getSystemTheme();
		const next = current === "dark" ? "light" : "dark";
		localStorage.setItem("theme", next);
		applyTheme(next);
	});

	// Follow system changes when no explicit preference is saved
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
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

/**
 * Retrieve a theme color from a root CSS variable and optionally apply an alpha channel.
 *
 * @param cssVar - The CSS variable name to read from the root (for example `"--color-primary"`).
 * @param alpha - Optional alpha value between 0 and 1 to apply to the returned color.
 * @returns The resolved CSS color string; if `alpha` is provided, the color is returned with an inserted alpha component (e.g., `oklch(... / 0.5)`).
 */
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

/**
 * Inserts the provided HTML into the results container and reveals the results panel.
 *
 * Ensures the element with id "results-content" receives `html` as its innerHTML, then removes the "hidden"
 * class from the element with id "results". If the results panel was hidden before, adds the "animate-in"
 * class to trigger the entrance animation.
 *
 * @param html - HTML string to render inside the results content element
 */
function showResults(html: string) {
	const resultsWrap = document.getElementById("results");
	const content = document.getElementById("results-content");
	if (content) content.innerHTML = html;
	if (resultsWrap) {
		const wasHidden = resultsWrap.classList.contains("hidden");
		resultsWrap.classList.remove("hidden");
		if (wasHidden) resultsWrap.classList.add("animate-in");
	}
}

/**
 * Hides the results panel and clears its content.
 *
 * Removes the "animate-in" class and adds "hidden" to the element with id "results",
 * and clears the inner HTML of the element with id "results-content" if present.
 */
function hideResults() {
	const resultsWrap = document.getElementById("results");
	const content = document.getElementById("results-content");
	if (content) content.innerHTML = "";
	if (resultsWrap) {
		resultsWrap.classList.add("hidden");
		resultsWrap.classList.remove("animate-in");
	}
}

/**
 * Normalize a zones input string by converting zone letters to the canonical zone code.
 *
 * Trims whitespace and, if the trimmed value consists solely of letters A–D (case-insensitive),
 * converts them to the corresponding zone code; otherwise returns the trimmed input unchanged.
 *
 * @param rawValue - The raw zones input from the UI
 * @returns The normalized zone code when input is zone letters A–D, or the trimmed input string otherwise
 */
function normalizeZonesInput(rawValue: string): string {
	// Accept zone letters from UI and convert to API zone code via helper
	const letters = rawValue.trim();
	if (/^[A-D]+$/i.test(letters)) {
		return PriceService.getZoneCode(letters.toUpperCase());
	}
	return letters;
}

type OptimalResult = ReturnType<typeof priceService.findOptimalOption>;

/**
 * Build the HTML for the comparison UI that lists ticket options and highlights the optimal choice.
 *
 * Generates a set of option cards (single, season, continuous monthly, and optionally 10-/20-trip series),
 * a top "Best Option" stat block, and expandable calculation details for each option.
 *
 * @param result - The computed comparison result containing costs, calculations, and the key of the optimal option
 * @returns A string of HTML markup for the comparison UI (cards, best-option stat, and calculation details)
 */
function renderComparison(result: OptimalResult) {
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
	}> = [
		{
			label: "Single tickets",
			key: "single",
			cost: result.single.monthlyCost,
			annualCost: result.single.annualCost,
			calc: result.single.calculation,
			description: "Pay per trip",
			icon: ICONS.ticket,
		},
		{
			label: "Season tickets",
			key: "season",
			cost: result.season.monthlyCost,
			annualCost: result.season.annualCost,
			calc: result.season.calculation,
			description: "Annual subscription",
			icon: ICONS.calendar,
		},
		{
			label: "Continuous monthly",
			key: "continuousMonthly",
			cost: result.continuousMonthly.monthlyCost,
			annualCost: result.continuousMonthly.annualCost,
			calc: result.continuousMonthly.calculation,
			description: "Monthly auto-renewal",
			icon: ICONS.refresh,
		},
	];

	// Add series tickets only if they are available
	if (result.series10) {
		rows.push({
			label: "10-trip series",
			key: "series10",
			cost: result.series10.monthlyCost,
			annualCost: result.series10.annualCost,
			calc: result.series10.calculation,
			description: "10 trips, 30-day validity",
			icon: ICONS.stack,
		});
	}

	if (result.series20) {
		rows.push({
			label: "20-trip series",
			key: "series20",
			cost: result.series20.monthlyCost,
			annualCost: result.series20.annualCost,
			calc: result.series20.calculation,
			description: "20 trips, 60-day validity",
			icon: ICONS.stack,
		});
	}

	// Sort by cost for better visual hierarchy
	const sortedRows = [...rows].sort((a, b) => a.cost - b.cost);
	const optimalRow = rows.find((r) => r.key === result.optimal);

	const list = sortedRows
		.map((r) => {
			const isOptimal = r.key === result.optimal;
			const savingsVsWorst =
				(sortedRows[sortedRows.length - 1]?.cost || 0) - r.cost;

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
							${isOptimal ? `<span class="badge badge-primary badge-sm gap-1 shrink-0">${ICONS.star} Best</span>` : ""}
						</div>

						<div class="grid grid-cols-2 gap-3 p-3 rounded-box bg-base-200/60">
							<div>
								<span class="text-xs uppercase tracking-wider text-base-content/40 font-semibold">Monthly</span>
								<div class="font-bold text-lg tabular-nums">\u20AC${r.cost.toFixed(2)}</div>
							</div>
							<div>
								<span class="text-xs uppercase tracking-wider text-base-content/40 font-semibold">Annual</span>
								<div class="font-bold text-lg tabular-nums">\u20AC${r.annualCost.toFixed(2)}</div>
							</div>
						</div>

						${
							savingsVsWorst > 0
								? `<p class="text-sm text-success font-medium">Save \u20AC${savingsVsWorst.toFixed(2)}/mo vs most expensive</p>`
								: ""
						}

						<details class="collapse collapse-arrow bg-base-200/60 rounded-box">
							<summary class="collapse-title text-sm font-medium min-h-0 py-2 px-3">How this is calculated</summary>
							<div class="collapse-content px-3"><p class="text-sm text-base-content/60">${r.calc}</p></div>
						</details>
					</div>
				</div>
			`;
		})
		.join("");

	const optimalSavings = optimalRow
		? (sortedRows[sortedRows.length - 1]?.cost || 0) - optimalRow.cost
		: 0;

	return `
		<div class="stats bg-primary text-primary-content shadow-lg w-full mb-6">
			<div class="stat place-items-center gap-0">
				<div class="stat-title text-primary-content/50">Best Option</div>
				<div class="stat-value tabular-nums text-3xl sm:text-4xl">\u20AC${optimalRow?.cost.toFixed(2) || "0"}<span class="text-base font-medium text-primary-content/50">/mo</span></div>
				<div class="stat-desc text-primary-content/60 text-base">${optimalRow?.label || result.optimal}</div>
				${
					optimalSavings > 0
						? `<div class="stat-desc text-primary-content/70 mt-1">Save \u20AC${optimalSavings.toFixed(2)}/mo (\u20AC${(optimalSavings * 12).toFixed(2)}/yr)</div>`
						: ""
				}
			</div>
		</div>

		<div>
			<h3 class="text-sm font-semibold text-base-content/40 uppercase tracking-widest mb-4">All Options</h3>
			<div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				${list}
			</div>
		</div>
	`;
}

/**
 * Render a bar chart comparing monthly costs for available ticket options.
 *
 * Destroys any existing comparison chart instance, locates the canvas element
 * with id "cost-comparison-chart", and draws a themed Chart.js bar chart using
 * the monthly costs from `result`. Includes "Series 10" and "Series 20" labels
 * when present in the result.
 *
 * @param result - Optimal result containing monthly cost values for each ticket option used to populate the chart
 */
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

	const labels: string[] = ["Single", "Season", "Continuous"];
	const continuousMonthlyValue =
		Number.isFinite(result.continuousMonthly?.monthlyCost)
			? result.continuousMonthly.monthlyCost
			: 0;
	const data: number[] = [
		Number(result.single.monthlyCost) || 0,
		Number(result.season.monthlyCost) || 0,
		continuousMonthlyValue,
	];
	if (result.series10) {
		labels.push("Series 10");
		data.push(result.series10.monthlyCost);
	}
	if (result.series20) {
		labels.push("Series 20");
		data.push(result.series20.monthlyCost);
	}

	costComparisonChart = new Chart(ctx, {
		type: "bar",
		data: {
			labels,
			datasets: [
				{
					label: "Monthly Cost (\u20AC)",
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
					title: { display: true, text: "\u20AC / month" },
				},
			},
		},
	});
}

/**
 * Renders a line chart showing monthly cost per ticket type across a range of trips-per-week values.
 *
 * Builds a range of trips per week centered on `baseTripsPerWeek` (±10, minimum 1), computes monthly costs for each ticket type using the current price service and the provided `baseOptions`, and draws an interactive chart into the canvas with id "trips-cost-chart".
 *
 * @param baseTripsPerWeek - The central trips-per-week value used to construct the range of values plotted.
 * @param baseOptions - Baseline pricing options to use when computing monthly costs. Must include `single` and `season` prices and may include `continuousMonthly`, `series10`, and `series20` details.
 * @remarks
 * If the target canvas is not present the function returns without rendering. Any previously rendered trips cost chart instance is destroyed before drawing a new one. */
async function renderTripsCostChart(
	baseTripsPerWeek: number,
	baseOptions: {
		single: number;
		season: number;
		continuousMonthly?: number;
		series10?: { price: number; journeys: number; validityDays: number };
		series20?: { price: number; journeys: number; validityDays: number };
	},
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
		let t = Math.max(1, baseTripsPerWeek - 10);
		t <= baseTripsPerWeek + 10;
		t++
	) {
		tripsRange.push(t);
	}

	const singleCosts: number[] = [];
	const seasonCosts: number[] = [];
	const contMonthlyCosts: number[] = [];
	const series10Costs: number[] = [];
	const series20Costs: number[] = [];

	for (const t of tripsRange) {
		const comparison = priceService.findOptimalOption(t, baseOptions);
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
			label: "Single",
			data: singleCosts,
			borderColor: lineColors[0] ?? "#888",
			backgroundColor: lineColors[0] ?? "#888",
		},
		{
			label: "Season",
			data: seasonCosts,
			borderColor: lineColors[1] ?? "#888",
			backgroundColor: lineColors[1] ?? "#888",
		},
		{
			label: "Continuous",
			data: contMonthlyCosts,
			borderColor: lineColors[2] ?? "#888",
			backgroundColor: lineColors[2] ?? "#888",
		},
	];
	if (series10Costs.length)
		datasets.push({
			label: "Series 10",
			data: series10Costs,
			borderColor: lineColors[3] ?? "#888",
			backgroundColor: lineColors[3] ?? "#888",
		});
	if (series20Costs.length)
		datasets.push({
			label: "Series 20",
			data: series20Costs,
			borderColor: lineColors[4] ?? "#888",
			backgroundColor: lineColors[4] ?? "#888",
		});

	tripsCostChart = new Chart(ctx, {
		type: "line",
		data: {
			labels: tripsRange.map((t) => `${t}`),
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
						labelColor: (ctx) => {
							const ds = ctx.dataset as unknown as { borderColor?: string };
							const color = typeof ds?.borderColor === "string" ? ds.borderColor : "#666";
							return { borderColor: color, backgroundColor: color } as unknown as {
								borderColor: string;
								backgroundColor: string;
							};
						},
					},
				},
			},
			interaction: { intersect: false, mode: "index" as const },
			scales: {
				x: { title: { display: true, text: "Trips per week" } },
				y: { beginAtZero: true, title: { display: true, text: "\u20AC per month" } },
			},
		},
	});
}

/**
 * Creates a debounced wrapper that delays invoking a function until a quiet period.
 *
 * @param fn - The function to invoke after the debounce delay
 * @param ms - The debounce delay in milliseconds
 * @returns A function that postpones calling `fn` until `ms` milliseconds have elapsed since the last call; subsequent calls reset the delay
 */
function debounce(fn: () => void, ms: number) {
	let id: ReturnType<typeof setTimeout>;
	return () => {
		clearTimeout(id);
		id = setTimeout(fn, ms);
	};
}

/**
 * Read current form inputs, fetch ticket prices, compute the optimal ticket options, and update the UI and charts.
 *
 * Reads zone, trips-per-week, and home municipality values from the form, requests filtered ticket prices,
 * builds comparison options, determines the optimal option, injects the rendered results into the page,
 * and (re)renders the cost comparison and trips cost charts. If zones are not selected the function exits
 * silently. Shows a loading indicator only when results are not already visible and displays a user-facing
 * error message if the price fetch or calculation fails.
 */
async function calculate() {
	const zonesSelect = document.querySelector<HTMLSelectElement>("#zones");
	const tripsInput = document.querySelector<HTMLInputElement>("#tripsPerWeek");
	const municipalitySelect = document.querySelector<HTMLSelectElement>(
		"#homemunicipality",
	);

	const rawZones = zonesSelect?.value || "";
	const zones = normalizeZonesInput(rawZones);

	// Skip silently if zones aren't selected yet
	if (!zones) {
		hideResults();
		return;
	}

	const tripsPerWeek = Number(tripsInput?.value || "10");
	const homemunicipality = (municipalitySelect?.value || "helsinki").toLowerCase();

	// Don't flash loading spinner when updating already-visible results
	const resultsVisible = !document.getElementById("results")?.classList.contains("hidden");
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
		);

		const html = renderComparison(comparison);
		showResults(html);
		renderCostComparisonChart(comparison);
		void renderTripsCostChart(tripsPerWeek, comparisonOptions);
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: "Unexpected error occurred while calculating";
		showError(message);
	} finally {
		setLoading(false);
	}
}

// Wire up reactive listeners
const formEl = document.getElementById("ticket-form");
const zonesEl = document.querySelector<HTMLSelectElement>("#zones");
const municipalityEl = document.querySelector<HTMLSelectElement>("#homemunicipality");
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

if (formEl) {
	formEl.addEventListener("submit", (evt) => {
		evt.preventDefault();
		void calculate();
	});
}

export { appState };
