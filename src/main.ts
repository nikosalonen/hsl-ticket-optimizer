// Main application entry point

import Chart from "chart.js/auto";
import { PriceService, priceService } from "./services/PriceService.js";

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
									<p class="text-xs text-base-content/50">${r.description}</p>
								</div>
							</div>
							${isOptimal ? `<span class="badge badge-primary badge-sm gap-1 shrink-0">${ICONS.star} Best</span>` : ""}
						</div>

						<div class="grid grid-cols-2 gap-3 p-3 rounded-box bg-base-200/60">
							<div>
								<span class="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold">Monthly</span>
								<div class="font-bold text-lg tabular-nums">\u20AC${r.cost.toFixed(2)}</div>
							</div>
							<div>
								<span class="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold">Annual</span>
								<div class="font-bold text-lg tabular-nums">\u20AC${r.annualCost.toFixed(2)}</div>
							</div>
						</div>

						${
							savingsVsWorst > 0
								? `<p class="text-xs text-success font-medium">Save \u20AC${savingsVsWorst.toFixed(2)}/mo vs most expensive</p>`
								: ""
						}

						<details class="collapse collapse-arrow bg-base-200/60 rounded-box">
							<summary class="collapse-title text-xs font-medium min-h-0 py-2 px-3">How this is calculated</summary>
							<div class="collapse-content px-3"><p class="text-xs text-base-content/60">${r.calc}</p></div>
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
				<div class="stat-desc text-primary-content/60 text-sm">${optimalRow?.label || result.optimal}</div>
				${
					optimalSavings > 0
						? `<div class="stat-desc text-primary-content/70 mt-1">Save \u20AC${optimalSavings.toFixed(2)}/mo (\u20AC${(optimalSavings * 12).toFixed(2)}/yr)</div>`
						: ""
				}
			</div>
		</div>

		<div>
			<h3 class="text-xs font-semibold text-base-content/40 uppercase tracking-widest mb-4">All Options</h3>
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
