// Main application entry point

import Chart from "chart.js/auto";
import { PriceService, priceService } from "./services/PriceService.js";

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
	if (resultsWrap) resultsWrap.classList.remove("hidden");
}

function hideResults() {
	const resultsWrap = document.getElementById("results");
	const content = document.getElementById("results-content");
	if (content) content.innerHTML = "";
	if (resultsWrap) resultsWrap.classList.add("hidden");
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
			icon: "🎫",
		},
		{
			label: "Season tickets",
			key: "season",
			cost: result.season.monthlyCost,
			annualCost: result.season.annualCost,
			calc: result.season.calculation,
			description: "Annual subscription",
			icon: "📅",
		},
		{
			label: "Continuous monthly",
			key: "continuousMonthly",
			cost: result.continuousMonthly.monthlyCost,
			annualCost: result.continuousMonthly.annualCost,
			calc: result.continuousMonthly.calculation,
			description: "Monthly auto-renewal",
			icon: "🔄",
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
			icon: "📦",
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
			icon: "📦",
		});
	}

	// Sort by cost for better visual hierarchy
	const sortedRows = [...rows].sort((a, b) => a.cost - b.cost);
	const optimalRow = rows.find((r) => r.key === result.optimal);

	const list = sortedRows
		.map((r, index) => {
			const isOptimal = r.key === result.optimal;
			const savingsVsWorst =
				(sortedRows[sortedRows.length - 1]?.cost || 0) - r.cost;
			const rank = index + 1;

			return `
				<div class="card bg-base-100 shadow ${isOptimal ? "border border-primary" : ""}" data-rank="${rank}">
					<div class="card-body gap-3">
						<div class="flex items-start gap-3">
							<div class="text-2xl">${r.icon}</div>
							<div class="flex-1">
								<h3 class="card-title text-base">${r.label}</h3>
								<p class="text-base-content/70">${r.description}</p>
							</div>
							${isOptimal ? '<div class="badge badge-primary badge-lg">🏆 Best</div>' : ""}
						</div>

						<div class="grid grid-cols-2 gap-3 p-3 rounded-box bg-base-200">
							<div class="text-center">
								<span class="text-xs uppercase text-base-content/70">Monthly</span>
								<div class="font-bold text-lg">€${r.cost.toFixed(2)}</div>
							</div>
							<div class="text-center">
								<span class="text-xs uppercase text-base-content/70">Annual</span>
								<div class="font-bold text-lg">€${r.annualCost.toFixed(2)}</div>
							</div>
						</div>

						${
							savingsVsWorst > 0
								? `<div class="alert alert-success py-2">💰 Save €${savingsVsWorst.toFixed(2)}/month vs most expensive</div>`
								: ""
						}

						<div>
							<details class="collapse collapse-arrow bg-base-200">
								<summary class="collapse-title text-sm font-medium">How this is calculated</summary>
								<div class="collapse-content"><p class="text-sm">${r.calc}</p></div>
							</details>
						</div>
					</div>
				</div>
			`;
		})
		.join("");

	const optimalSavings = optimalRow
		? (sortedRows[sortedRows.length - 1]?.cost || 0) - optimalRow.cost
		: 0;

	return `
		<div class="results-summary">
			<div class="card bg-primary text-primary-content">
				<div class="card-body items-center text-center">
					<h3 class="card-title">🎯 Recommendation</h3>
					<p><strong>${optimalRow?.label || result.optimal}</strong> is your best option</p>
					<p class="text-2xl font-bold">€${optimalRow?.cost.toFixed(2) || "0"} per month</p>
					${
						optimalSavings > 0
							? `<p class="badge badge-success badge-outline">Save €${optimalSavings.toFixed(2)}/month (€${(optimalSavings * 12).toFixed(2)}/year)</p>`
							: ""
					}
				</div>
			</div>
		</div>

		<div class="results-comparison">
			<h3 class="text-xl font-semibold mb-3">📊 All Options Compared</h3>
			<div class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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

	const labels: string[] = ["Single", "Season", "Continuous Monthly"];
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
		labels.push("10-trip series");
		data.push(result.series10.monthlyCost);
	}
	if (result.series20) {
		labels.push("20-trip series");
		data.push(result.series20.monthlyCost);
	}

	costComparisonChart = new Chart(ctx, {
		type: "bar",
		data: {
			labels,
			datasets: [
				{
					label: "Monthly Cost (€)",
					data,
					backgroundColor: getThemeColor("--color-primary", 0.2),
					borderColor: getThemeColor("--color-primary"),
					borderWidth: 1,
				},
			],
		},
		options: {
			responsive: true,
			plugins: { legend: { display: false }, tooltip: { enabled: true } },
			scales: {
				y: {
					beginAtZero: true,
					title: { display: true, text: "€ per month" },
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
			aspectRatio: window.innerWidth < 768 ? 1.5 : 2.5,
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
				y: { beginAtZero: true, title: { display: true, text: "€ per month" } },
			},
		},
	});
}

async function onSubmit(event: SubmitEvent) {
	event.preventDefault();
	hideError();
	hideResults();
	setLoading(true);

	try {
		const form = event.target as HTMLFormElement;
		const zonesSelect = form.querySelector<HTMLSelectElement>("#zones");
		const tripsInput = form.querySelector<HTMLInputElement>("#tripsPerWeek");
		const municipalitySelect = form.querySelector<HTMLSelectElement>(
			"#homemunicipality",
		);

		const rawZones = zonesSelect?.value || "";
		const zones = normalizeZonesInput(rawZones);
		const tripsPerWeek = Number(tripsInput?.value || "0");
		const homemunicipality = (municipalitySelect?.value || "helsinki").toLowerCase();

		if (!zones) {
			showError("Please select travel zones");
			return;
		}
		if (Number.isNaN(tripsPerWeek) || tripsPerWeek < 1) {
			showError("Please enter a valid number of trips per week");
			return;
		}

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

		// Show all available ticket types with the true optimal option
		const html = renderComparison(comparison);
		showResults(html);
		// Render charts
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

// Wire up the form when DOM is ready
const formEl = document.getElementById("ticket-form");
if (formEl) {
	formEl.addEventListener("submit", (evt) => {
		void onSubmit(evt as SubmitEvent);
	});
}

export { appState };
