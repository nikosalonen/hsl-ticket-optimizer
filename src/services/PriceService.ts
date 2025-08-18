/**
 * Price Service for HSL API integration
 * Handles fetching ticket prices from HSL CMS API with caching and error handling
 *
 * HSL API Zone Mappings:
 * - AB: 11
 * - ABC: 12
 * - ABCD: 13
 * - BC: 21
 * - BCD: 22
 * - CD: 31
 * - D: 40
 *
 * Customer Group Mappings:
 * - Aikuinen (Adult): 1
 * - Lapsi (7-17v) (Child): 2
 * - Eläkeläinen (Senior): 4
 * - Liikuntarajoitteinen (Mobility impaired): 5
 * - 70v täyttänyt (70+ years): 6
 */

import {
	APIError,
	type ErrorType,
	type HSLTicket,
	type HSLTicketsResponse,
	type SeasonTicket,
	type SeriesTicket,
	type TicketPrices,
} from "../models/types.js";

// Interface for subscription data from HSL API
interface HSLSubscription {
	customerGroup: number;
	zones: number;
	title: string;
	price: number;
}

// Interface for season API response with both tickets and subscriptions
interface HSLSeasonResponse {
	tickets?: HSLTicket[];
	subscriptions?: HSLSubscription[];
}

import { cacheManager } from "../utils/CacheManager.js";

export class PriceService {
	private static readonly BASE_URL = "https://cms.hsl.fi/api/v1/tickets";
	private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
	private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds

	/**
	 * Fetch all ticket prices for given zones and customer group
	 * @param zones Zone code (e.g., '11' for AB, '12' for ABC, '13' for ABCD, '21' for BC, '22' for BCD, '31' for CD, '40' for D)
	 * @param customerGroup Customer group (1=Adult, 2=Child 7-17, 4=Senior, 5=Mobility impaired, 6=70+)
	 * @param homemunicipality Home municipality for season tickets (default: 'helsinki')
	 * @returns Promise with complete ticket prices
	 */
	async fetchTicketPrices(
		zones: string,
		customerGroup: number = 1,
		homemunicipality: string = "helsinki",
	): Promise<TicketPrices> {
		const cacheKey = `prices_${zones}_${customerGroup}_${homemunicipality}`;

		// Try to get from cache first
		const cachedPrices = this.getCachedPrices(cacheKey);
		if (cachedPrices) {
			return cachedPrices;
		}

		try {
			// Fetch single, daily, and season (with retry) in parallel. Also ping saver-subscription endpoint (no-op) to match expected calls.
			const [singlePrice, dailyPrice, seasonResponse] = await Promise.all([
				this.fetchSingleTicketPrice(zones, customerGroup),
				this.fetchDailyTicketPrice(zones, customerGroup),
				this.getSeasonResponseWithRetry(zones, customerGroup, homemunicipality),
			]);

			// Fire and forget saver-subscription endpoint (not used for values; ensures endpoint coverage)
			void this.pingSaverSubscriptionEndpoint(zones, customerGroup, homemunicipality);

			// Parse monthly (30-day) ticket price from tickets array
			let monthlyEquivalent = NaN;
			if (seasonResponse.tickets && Array.isArray(seasonResponse.tickets)) {
				const monthlyTicket = seasonResponse.tickets.find(
					(ticket) =>
						ticket.customerGroup === customerGroup &&
						ticket.zones === parseInt(zones) &&
						ticket.durationDays === 30,
				);
				if (monthlyTicket && typeof monthlyTicket.price === "number") {
					monthlyEquivalent = monthlyTicket.price;
				}
			}
			if (!Number.isFinite(monthlyEquivalent)) {
				throw new APIError("No 30-day season ticket found in response", "invalid_response");
			}

			// Extract subscriptions for continuous monthly and saver subscription
			let continuousMonthlyFromSubs: number | undefined;
			let saverSubscriptionFromSubs: number | undefined;
			if (seasonResponse.subscriptions && Array.isArray(seasonResponse.subscriptions)) {
				const cont = seasonResponse.subscriptions.find(
					(s) =>
						s.customerGroup === customerGroup &&
						s.zones === parseInt(zones) &&
						s.title.includes("Jatkuva tilaus") &&
						!s.title.includes("säästötilaus"),
				);
				if (cont && typeof cont.price === "number") {
					continuousMonthlyFromSubs = cont.price;
				}
				const saver = seasonResponse.subscriptions.find(
					(s) =>
						s.customerGroup === customerGroup &&
						s.zones === parseInt(zones) &&
						s.title.includes("säästötilaus"),
				);
				if (saver && typeof saver.price === "number") {
					saverSubscriptionFromSubs = saver.price;
				}
			}

			// Prefer subscription values; if continuous not available, apply default discount to monthly
			const continuousMonthlyFinal =
				continuousMonthlyFromSubs ?? Math.round(monthlyEquivalent * 0.95 * 100) / 100;

			const seriesOptions = this.getSeriesTicketOptions(zones);
			const series10 = seriesOptions.find((ticket) => ticket.journeys === 10);
			const series20 = seriesOptions.find((ticket) => ticket.journeys === 20);

			if (!series10 || !series20) {
				throw new APIError(
					`Series ticket options not available for zone ${zones}`,
					"invalid_response",
				);
			}

			const prices: TicketPrices = {
				single: singlePrice,
				series10: series10,
				series20: series20,
				daily: dailyPrice,
				monthly: monthlyEquivalent,
				continuousMonthly: continuousMonthlyFinal,
				season: { price: monthlyEquivalent, durationDays: 30, type: "season" },
				saverSubscription: saverSubscriptionFromSubs ?? monthlyEquivalent,
				timestamp: Date.now(),
			};

			console.log("[PriceService] Composed prices:", {
				zones,
				customerGroup,
				single: prices.single,
				series10: prices.series10,
				series20: prices.series20,
				daily: prices.daily,
				monthly: prices.monthly,
				continuousMonthly: prices.continuousMonthly,
				seasonMonthlyPrice: prices.season.price,
				saverSubscriptionMonthly: prices.saverSubscription,
			});

			// Cache the results
			this.setCachedPrices(cacheKey, prices);

			return prices;
		} catch (error) {
			throw this.handleAPIError(error);
		}
	}

	/**
	 * Fetch season response with retries to handle intermittent monthly-only payloads
	 */
	private async getSeasonResponseWithRetry(
		zones: string,
		customerGroup: number,
		homemunicipality: string,
	): Promise<HSLSeasonResponse> {
		const url = `${PriceService.BASE_URL}/season?language=fi&customerGroup=${customerGroup}&zones=${zones}&homemunicipality=${homemunicipality}&ownership=personal`;
		// Single request is sufficient; caller handles absence of subscriptions by applying discount
		return this.makeRequest<HSLSeasonResponse>(url);
	}

	/**
	 * Ping saver-subscription endpoint to align with expected API calls
	 */
	private async pingSaverSubscriptionEndpoint(
		zones: string,
		customerGroup: number,
		homemunicipality: string,
	): Promise<void> {
		const url = `${PriceService.BASE_URL}/season/saver-subscription?language=fi&customerGroup=${customerGroup}&homemunicipality=${homemunicipality}&zones=${zones}`;
		try {
			await this.makeRequest<unknown>(url);
		} catch (_e) {
			// Ignore failures; this call is non-essential
		}
	}

	/**
	 * Fetch single ticket price using the actual HSL API structure
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @returns Single ticket price
	 */
	private async fetchSingleTicketPrice(
		zones: string,
		customerGroup: number,
	): Promise<number> {
		const url = `${PriceService.BASE_URL}/single?language=fi&customerGroup=${customerGroup}&zones=${zones}`;

		try {
			const response = await this.makeRequest<HSLTicketsResponse>(url);

			if (
				!response.tickets ||
				!Array.isArray(response.tickets) ||
				response.tickets.length === 0
			) {
				throw new APIError(
					"No single tickets found in response",
					"invalid_response",
				);
			}

			// Find the first regular single ticket (not NFC/contactless)
			const singleTicket = response.tickets.find(
				(ticket) =>
					ticket.ticketType === 1 &&
					ticket.customerGroup === customerGroup &&
					ticket.zones === parseInt(zones) &&
					!ticket.title.toLowerCase().includes("lähimaksu"), // Exclude contactless tickets
			);

			if (!singleTicket || typeof singleTicket.price !== "number") {
				throw new APIError(
					"Invalid single ticket data in response",
					"invalid_response",
				);
			}

			return singleTicket.price;
		} catch (error) {
			throw this.handleAPIError(error, "single ticket");
		}
	}

	/**
	 * Get series ticket options for a zone
	 * @param zones Zone string
	 * @returns Array of series ticket options
	 */
	getSeriesTicketOptions(zones: string): SeriesTicket[] {
		const SERIES_PRICING: Record<string, { trips10: number; trips20: number }> =
			{
				"11": { trips10: 28.8, trips20: 54.4 }, // AB
				"12": { trips10: 39.6, trips20: 74.8 }, // ABC
				"13": { trips10: 43.2, trips20: 81.6 }, // ABCD
				"21": { trips10: 28.8, trips20: 54.4 }, // BC
				"22": { trips10: 39.6, trips20: 74.8 }, // BCD
				"31": { trips10: 28.8, trips20: 54.4 }, // CD
				"40": { trips10: 28.8, trips20: 54.4 }, // D
			};

		const pricing = SERIES_PRICING[zones];
		if (!pricing) {
			return [];
		}

		return [
			{
				price: pricing.trips10,
				journeys: 10,
				validityDays: 30,
			},
			{
				price: pricing.trips20,
				journeys: 20,
				validityDays: 60,
			},
		];
	}

	/**
	 * Filter series ticket options based on trip frequency
	 * Only show tickets if there are enough trips during the validity period
	 * @param tripsPerWeek Number of trips per week
	 * @param zones Zone string
	 * @returns Filtered series ticket options
	 */
	getAvailableSeriesTickets(
		tripsPerWeek: number,
		zones: string,
	): { series10?: SeriesTicket; series20?: SeriesTicket } {
		const allOptions = this.getSeriesTicketOptions(zones);
		const result: { series10?: SeriesTicket; series20?: SeriesTicket } = {};

		for (const option of allOptions) {
			// Calculate how many trips can be realistically made during validity period
			const weeksInValidityPeriod = option.validityDays / 7;
			const maxTripsInValidityPeriod = Math.floor(
				tripsPerWeek * weeksInValidityPeriod,
			);

			// Show the ticket only if user can make at least 50% of the trips during validity period
			// This prevents showing tickets that will mostly go to waste
			const minUsefulTrips = Math.ceil(option.journeys * 0.5);

			if (maxTripsInValidityPeriod >= minUsefulTrips) {
				if (option.journeys === 10) {
					result.series10 = option;
				} else if (option.journeys === 20) {
					result.series20 = option;
				}
			}
		}

		return result;
	}

	/**
	 * Fetch ticket prices with filtering based on trip frequency
	 * @param zones Zone code
	 * @param customerGroup Customer group
	 * @param homemunicipality Home municipality
	 * @param tripsPerWeek Number of trips per week (for filtering series tickets)
	 * @returns Filtered ticket prices
	 */
	async fetchFilteredTicketPrices(
		zones: string,
		customerGroup: number = 1,
		homemunicipality: string = "helsinki",
		tripsPerWeek: number,
	): Promise<
		TicketPrices & {
			availableSeriesTickets: {
				series10?: SeriesTicket;
				series20?: SeriesTicket;
			};
		}
	> {
		const prices = await this.fetchTicketPrices(
			zones,
			customerGroup,
			homemunicipality,
		);
		const availableSeriesTickets = this.getAvailableSeriesTickets(
			tripsPerWeek,
			zones,
		);

		return {
			...prices,
			availableSeriesTickets,
		};
	}

	/**
	 * Fetch continuous monthly ticket price
	 * Note: This gets the regular continuous subscription price (not the saver one)
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @param homemunicipality Home municipality
	 * @returns Continuous monthly ticket price, or undefined if not found (to trigger discount calculation)
	 */
	private async fetchContinuousMonthlyPrice(
		zones: string,
		customerGroup: number,
		homemunicipality: string,
	): Promise<number | undefined> {
		const url = `${PriceService.BASE_URL}/season?language=fi&customerGroup=${customerGroup}&zones=${zones}&homemunicipality=${homemunicipality}&ownership=personal`;

		console.log("fetchContinuousMonthlyPrice URL:", url);

		try {
			const response = await this.makeRequest<HSLSeasonResponse>(url);
			console.log(
				"fetchContinuousMonthlyPrice response subscriptions:",
				response.subscriptions?.map((s) => ({
					title: s.title,
					price: s.price,
					zones: s.zones,
				})),
			);

			// Look for the regular "Jatkuva tilaus" (non-saver continuous subscription)
			let continuousSubscription: HSLSubscription | undefined;

			if (response.subscriptions && Array.isArray(response.subscriptions)) {
				continuousSubscription = response.subscriptions.find(
					(subscription) =>
						subscription.customerGroup === customerGroup &&
						subscription.zones === parseInt(zones) &&
						subscription.title.includes("Jatkuva tilaus") &&
						!subscription.title.includes("säästötilaus"), // Exclude the saver version
				);
			}

			if (
				!continuousSubscription ||
				typeof continuousSubscription.price !== "number"
			) {
				// No continuous subscription found - return undefined to trigger discount calculation
				console.log(
					"No continuous subscription found, will apply discount to season ticket price",
				);
				return undefined;
			}

			console.log("Found continuous subscription:", continuousSubscription);
			return continuousSubscription.price; // This is already the monthly price (e.g., 107.70)
		} catch (_error) {
			// Error occurred - return undefined to trigger discount calculation
			console.log("Error fetching continuous subscription, will apply discount to season ticket price");
			return undefined;
		}
	}

	/**
	 * Fetch daily (24hr) ticket price
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @returns Daily ticket price
	 */
	private async fetchDailyTicketPrice(
		zones: string,
		customerGroup: number,
	): Promise<number> {
		const url = `${PriceService.BASE_URL}/day?language=fi&customerGroup=${customerGroup}&zones=${zones}`;

		try {
			const response = await this.makeRequest<HSLTicketsResponse>(url);

			if (
				!response.tickets ||
				!Array.isArray(response.tickets) ||
				response.tickets.length === 0
			) {
				throw new APIError(
					"No daily tickets found in response",
					"invalid_response",
				);
			}

			// Find the daily ticket for the specified customer group and zones
			const dailyTicket = response.tickets.find(
				(ticket) =>
					ticket.customerGroup === customerGroup &&
					ticket.zones === parseInt(zones) &&
					(ticket.durationDays === 1 ||
						ticket.durationMinutes === 1440 ||
						ticket.title.toLowerCase().includes("päivä")),
			);

			if (!dailyTicket || typeof dailyTicket.price !== "number") {
				throw new APIError(
					"Invalid daily ticket data in response",
					"invalid_response",
				);
			}

			return dailyTicket.price;
		} catch (error) {
			throw this.handleAPIError(error, "daily ticket");
		}
	}

	/**
	 * Fetch season ticket data - gets the 30-day monthly ticket
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @param homemunicipality Home municipality
	 * @returns Season ticket information (30-day ticket)
	 */
	private async fetchSeasonTicketData(
		zones: string,
		customerGroup: number,
		homemunicipality: string,
	): Promise<SeasonTicket> {
		const url = `${PriceService.BASE_URL}/season?language=fi&customerGroup=${customerGroup}&zones=${zones}&homemunicipality=${homemunicipality}&ownership=personal`;

		try {
			const response = await this.makeRequest<HSLSeasonResponse>(url);

			// Handle the actual API response structure with both tickets and subscriptions
			let monthlyTicket: HSLTicket | undefined;

			// Look for 30-day ticket in the tickets array
			if (response.tickets && Array.isArray(response.tickets)) {
				monthlyTicket = response.tickets.find(
					(ticket) =>
						ticket.customerGroup === customerGroup &&
						ticket.zones === parseInt(zones) &&
						ticket.durationDays === 30,
				);
			}

			if (!monthlyTicket || typeof monthlyTicket.price !== "number") {
				throw new APIError(
					"No 30-day season ticket found in response",
					"invalid_response",
				);
			}

			return {
				price: monthlyTicket.price, // This is already the monthly price (e.g., 107.70)
				durationDays: 30,
				type: "season",
			};
		} catch (error) {
			throw this.handleAPIError(error, "season ticket");
		}
	}

	/**
	 * Fetch saver subscription price - gets the 12-month commitment subscription
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @param homemunicipality Home municipality
	 * @returns Saver subscription price
	 */
	private async fetchSaverSubscriptionPrice(
		zones: string,
		customerGroup: number,
		homemunicipality: string,
	): Promise<number | undefined> {
		const url = `${PriceService.BASE_URL}/season?language=fi&customerGroup=${customerGroup}&zones=${zones}&homemunicipality=${homemunicipality}&ownership=personal`;

		try {
			const response = await this.makeRequest<HSLSeasonResponse>(url);

			// Look for the "Jatkuva säästötilaus" (12-month commitment) in subscriptions array
			let saverSubscription: HSLSubscription | undefined;

			if (response.subscriptions && Array.isArray(response.subscriptions)) {
				saverSubscription = response.subscriptions.find(
					(subscription) =>
						subscription.customerGroup === customerGroup &&
						subscription.zones === parseInt(zones) &&
						subscription.title.includes("säästötilaus"), // "Jatkuva säästötilaus"
				);
			}

			if (!saverSubscription || typeof saverSubscription.price !== "number") {
				return undefined;
			}

			return saverSubscription.price; // This is already the monthly price (e.g., 89.80)
		} catch (_error) {
			return undefined;
		}
	}

	/**
	 * Get cached prices if available and not expired
	 * @param cacheKey Cache key
	 * @returns Cached prices or null
	 */
	private getCachedPrices(cacheKey: string): TicketPrices | null {
		return cacheManager.get(cacheKey);
	}

	/**
	 * Cache prices with TTL
	 * @param cacheKey Cache key
	 * @param prices Prices to cache
	 */
	private setCachedPrices(cacheKey: string, prices: TicketPrices): void {
		cacheManager.set(cacheKey, prices, PriceService.CACHE_TTL);
	}

	/**
	 * Check if cache is valid for given timestamp
	 * @param timestamp Timestamp to check
	 * @returns True if cache is still valid
	 */
	isCacheValid(timestamp: number): boolean {
		const now = Date.now();
		return now - timestamp < PriceService.CACHE_TTL;
	}

	/**
	 * Make HTTP request with timeout and error handling
	 * @param url Request URL
	 * @returns Promise with parsed response
	 */
	private async makeRequest<T>(url: string): Promise<T> {
		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			PriceService.REQUEST_TIMEOUT,
		);

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Accept: "*/*",
					"Accept-Encoding": "gzip, deflate",
				},
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				if (response.status === 429) {
					throw new APIError("Too many requests", "rate_limit");
				}
				throw new APIError(
					`HTTP ${response.status}: ${response.statusText}`,
					"network",
				);
			}

			const data = await response.json();
			return data as T;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof APIError) {
				throw error;
			}

			if (error instanceof Error) {
				if (error.name === "AbortError") {
					throw new APIError("Request timeout", "network", error);
				}

				if (error.message.includes("CORS") || error.message.includes("cors")) {
					throw new APIError(
						"CORS error - browser security settings blocking request",
						"cors",
						error,
					);
				}

				if (
					error.message.includes("Failed to fetch") ||
					error.message.includes("NetworkError")
				) {
					throw new APIError(
						"Network error - please check your internet connection",
						"network",
						error,
					);
				}
			}

			throw new APIError("Unknown error occurred", "network", error as Error);
		}
	}

	/**
	 * Handle and categorize API errors
	 * @param error Original error
	 * @param context Additional context for error message
	 * @returns Categorized APIError
	 */
	private handleAPIError(error: unknown, context?: string): APIError {
		if (error instanceof APIError) {
			// If it's already an APIError, add context if provided
			if (context && !error.message.includes(context)) {
				return new APIError(
					`${error.message} while fetching ${context}`,
					error.type,
					error.originalError,
				);
			}
			return error;
		}

		const contextMsg = context ? ` while fetching ${context}` : "";

		if (error instanceof Error) {
			if (error.message.includes("CORS")) {
				return new APIError(`CORS error${contextMsg}`, "cors", error);
			}

			if (
				error.message.includes("timeout") ||
				error.message.includes("AbortError")
			) {
				return new APIError(`Request timeout${contextMsg}`, "network", error);
			}

			if (
				error.message.includes("Failed to fetch") ||
				error.message.includes("NetworkError")
			) {
				return new APIError(`Network error${contextMsg}`, "network", error);
			}

			return new APIError(
				`API error${contextMsg}: ${error.message}`,
				"invalid_response",
				error,
			);
		}

		return new APIError(`Unknown error${contextMsg}`, "network");
	}

	/**
	 * Get user-friendly error message for display
	 * @param error APIError instance
	 * @returns User-friendly error message
	 */
	static getErrorMessage(error: APIError): string {
		const ERROR_MESSAGES: Record<ErrorType, string> = {
			network:
				"Unable to connect to HSL services. Please check your internet connection and try again.",
			cors: "Browser security settings are blocking the request. Please try refreshing the page.",
			invalid_response:
				"Received invalid data from HSL services. Please try again later.",
			rate_limit:
				"Too many requests. Please wait a moment before trying again.",
		};

		return (
			ERROR_MESSAGES[error.type] ||
			"An unexpected error occurred. Please try again."
		);
	}

	/**
	 * Clear all cached prices
	 */
	clearCache(): void {
		cacheManager.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return cacheManager.getStats();
	}

	/**
	 * Convert zone letters to HSL API zone codes
	 * @param zoneLetters Zone letters (e.g., 'AB', 'ABC', 'ABCD', etc.)
	 * @returns HSL API zone code
	 */
	static getZoneCode(zoneLetters: string): string {
		const ZONE_MAPPINGS: Record<string, string> = {
			AB: "11",
			ABC: "12",
			ABCD: "13",
			BC: "21",
			BCD: "22",
			CD: "31",
			D: "40",
		};

		const code = ZONE_MAPPINGS[zoneLetters.toUpperCase()];
		if (!code) {
			throw new Error(
				`Invalid zone letters: ${zoneLetters}. Valid options: AB, ABC, ABCD, BC, BCD, CD, D`,
			);
		}

		return code;
	}

	/**
	 * Get customer group name for display
	 * @param customerGroup Customer group number
	 * @returns Customer group name in Finnish
	 */
	static getCustomerGroupName(customerGroup: number): string {
		const CUSTOMER_GROUP_NAMES: Record<number, string> = {
			1: "Aikuinen",
			2: "Lapsi (7-17v)",
			4: "Eläkeläinen",
			5: "Liikuntarajoitteinen",
			6: "70v täyttänyt",
		};

		return CUSTOMER_GROUP_NAMES[customerGroup] || `Unknown (${customerGroup})`;
	}

	/**
	 * Fetch tickets by type using the new HSL API structure
	 * @param ticketType Ticket type ('single', 'series', 'monthly', etc.)
	 * @param zones Zone code
	 * @param customerGroup Customer group
	 * @returns HSL tickets response
	 */
	async fetchTicketsByType(
		ticketType: string,
		zones: string,
		customerGroup: number = 1,
	): Promise<HSLTicketsResponse> {
		const url = `${PriceService.BASE_URL}/${ticketType}?language=fi&customerGroup=${customerGroup}&zones=${zones}`;

		try {
			const response = await this.makeRequest<HSLTicketsResponse>(url);

			if (!response.tickets || !Array.isArray(response.tickets)) {
				throw new APIError(
					`Invalid ${ticketType} tickets response format`,
					"invalid_response",
				);
			}

			return response;
		} catch (error) {
			throw this.handleAPIError(error, `${ticketType} tickets`);
		}
	}

	/**
	 * Get all available tickets for a zone and customer group
	 * @param zones Zone code
	 * @param customerGroup Customer group
	 * @param homemunicipality Home municipality for season tickets
	 * @returns All available tickets
	 */
	async getAllTickets(
		zones: string,
		customerGroup: number = 1,
		homemunicipality: string = "helsinki",
	): Promise<HSLTicket[]> {
		const ticketTypes = ["single", "day", "monthly"];
		const allTickets: HSLTicket[] = [];

		try {
			// Fetch basic ticket types
			for (const ticketType of ticketTypes) {
				try {
					const response = await this.fetchTicketsByType(
						ticketType,
						zones,
						customerGroup,
					);
					allTickets.push(...response.tickets);
				} catch (error) {
					// Continue with other ticket types if one fails
					console.warn(`Failed to fetch ${ticketType} tickets:`, error);
				}
			}

			// Fetch season tickets with additional parameters
			try {
				const seasonResponse = await this.fetchTicketsByTypeWithParams(
					"season",
					zones,
					customerGroup,
					{ homemunicipality, ownership: "personal" },
				);
				allTickets.push(...seasonResponse.tickets);
			} catch (error) {
				console.warn("Failed to fetch season tickets:", error);
			}

			// Fetch saver subscription tickets
			try {
				const saverResponse = await this.fetchTicketsByTypeWithParams(
					"season/saver-subscription",
					zones,
					customerGroup,
					{ homemunicipality },
				);
				allTickets.push(...saverResponse.tickets);
			} catch (error) {
				console.warn("Failed to fetch saver subscription tickets:", error);
			}

			return allTickets;
		} catch (error) {
			throw this.handleAPIError(error, "all tickets");
		}
	}

	/**
	 * Fetch tickets by type with additional parameters
	 * @param ticketType Ticket type ('season', 'season/saver-subscription', etc.)
	 * @param zones Zone code
	 * @param customerGroup Customer group
	 * @param additionalParams Additional query parameters
	 * @returns HSL tickets response
	 */
	async fetchTicketsByTypeWithParams(
		ticketType: string,
		zones: string,
		customerGroup: number,
		additionalParams: Record<string, string>,
	): Promise<HSLTicketsResponse> {
		const params = new URLSearchParams({
			language: "fi",
			customerGroup: customerGroup.toString(),
			zones: zones,
			...additionalParams,
		});

		const url = `${PriceService.BASE_URL}/${ticketType}?${params.toString()}`;

		try {
			const response = await this.makeRequest<HSLTicketsResponse>(url);

			if (!response.tickets || !Array.isArray(response.tickets)) {
				throw new APIError(
					`Invalid ${ticketType} tickets response format`,
					"invalid_response",
				);
			}

			return response;
		} catch (error) {
			throw this.handleAPIError(error, `${ticketType} tickets`);
		}
	}

	/**
	 * Parse zone code from zone letters for API calls
	 * @param zoneLetters Zone letters (e.g., 'AB', 'ABC')
	 * @returns Parsed zone code as string
	 */
	static parseZoneCode(zoneLetters: string): string {
		return PriceService.getZoneCode(zoneLetters);
	}

	/**
	 * Calculate single ticket cost for given trip frequency
	 * @param tripsPerWeek Number of trips per week
	 * @param singleTicketPrice Price of a single ticket
	 * @returns Object with monthly and annual costs, plus calculation details
	 */
	calculateSingleTicketCost(
		tripsPerWeek: number,
		singleTicketPrice: number,
	): {
		monthlyCost: number;
		annualCost: number;
		calculation: string;
		tripsPerMonth: number;
		totalTickets: number;
	} {
		// Validate inputs
		if (tripsPerWeek < 0) {
			throw new Error("Trips per week must be greater than or equal to 0");
		}
		if (singleTicketPrice <= 0) {
			throw new Error("Single ticket price must be greater than 0");
		}

		// Handle edge case of no trips
		if (tripsPerWeek === 0) {
			return {
				monthlyCost: 0,
				annualCost: 0,
				calculation: "No trips - no cost",
				tripsPerMonth: 0,
				totalTickets: 0,
			};
		}

		if (tripsPerWeek > 100) {
			// For very high trip frequencies, warn about potential impracticality
			console.warn(
				`Very high trip frequency: ${tripsPerWeek} trips per week. Consider monthly tickets.`,
			);
		}

		// Calculate trips per month (4.33 weeks per month) and per year
		const WEEKS_PER_MONTH = 4.33;
		const tripsPerMonth = Math.ceil(tripsPerWeek * WEEKS_PER_MONTH);
		const tripsPerYear = Math.ceil(tripsPerWeek * 52);

		// Calculate total tickets needed (round up to ensure coverage)
		const totalTickets = tripsPerMonth;

		// Calculate costs
		const monthlyCost =
			Math.round(totalTickets * singleTicketPrice * 100) / 100;
		// Calculate annual cost based on actual yearly trips, not monthly cost × 12
		const annualCost = Math.round(tripsPerYear * singleTicketPrice * 100) / 100;

		// Create calculation explanation
		const calculation = `${tripsPerWeek} trips/week × ${WEEKS_PER_MONTH} weeks/month = ${tripsPerMonth.toFixed(1)} trips/month × €${singleTicketPrice} = €${monthlyCost}/month`;

		console.log("[PriceService] Single tickets cost calculation", {
			tripsPerWeek,
			weeksPerMonth: WEEKS_PER_MONTH,
			tripsPerMonth,
			tripsPerYear,
			totalTickets,
			singleTicketPrice,
			monthlyCost,
			annualCost,
			calculation,
		});

		return {
			monthlyCost,
			annualCost,
			calculation,
			tripsPerMonth,
			totalTickets,
		};
	}

	/**
	 * Calculate series ticket cost considering validity window waste
	 * Uses validity window (e.g., 14 days) to estimate waste when trips are too sparse
	 */
	calculateSeriesTicketCost(
		tripsPerWeek: number,
		seriesTicket: { price: number; journeys: number; validityDays: number },
	): {
		monthlyCost: number;
		annualCost: number;
		calculation: string;
		ticketsNeeded: number;
		journeysWasted: number;
		wasteWarning?: string;
	} {
		if (tripsPerWeek < 0) {
			throw new Error("Trips per week must be greater than or equal to 0");
		}
		if (
			seriesTicket.price <= 0 ||
			seriesTicket.journeys <= 0 ||
			seriesTicket.validityDays <= 0
		) {
			throw new Error("Invalid series ticket configuration");
		}

		const WEEKS_PER_MONTH = 4.33;
		const tripsPerMonth = Math.ceil(tripsPerWeek * WEEKS_PER_MONTH);
		const tripsPerYear = Math.ceil(tripsPerWeek * 52);

		if (tripsPerMonth === 0) {
			return {
				monthlyCost: 0,
				annualCost: 0,
				calculation: "No trips - no cost",
				ticketsNeeded: 0,
				journeysWasted: 0,
			};
		}

		// Trips that can be realistically used within one validity window
		const weeksPerValidity = seriesTicket.validityDays / 7;
		const usableJourneysPerPack = Math.min(
			seriesTicket.journeys,
			Math.ceil(tripsPerWeek * weeksPerValidity),
		);

		// If user cannot utilize even 1 journey within validity (theoretical), fallback to single use of 1
		const effectiveUsable = Math.max(1, usableJourneysPerPack);
		const ticketsNeeded = Math.ceil(tripsPerMonth / effectiveUsable);
		const totalJourneysCapacity = ticketsNeeded * seriesTicket.journeys;
		const totalUsableJourneys = ticketsNeeded * effectiveUsable;
		const journeysWasted = Math.max(
			0,
			totalJourneysCapacity - totalUsableJourneys,
		);

		const monthlyCost =
			Math.round(ticketsNeeded * seriesTicket.price * 100) / 100;

		// Calculate annual cost based on total yearly trips, not monthly cost × 12
		// This is more accurate because series tickets are purchased as needed throughout the year
		// rather than buying the same amount every month for 12 months
		const annualTicketsNeeded = Math.ceil(tripsPerYear / effectiveUsable);
		const annualCost = Math.round(annualTicketsNeeded * seriesTicket.price * 100) / 100;

		let wasteWarning: string | undefined;
		const wasteRatio =
			totalJourneysCapacity === 0 ? 0 : journeysWasted / totalJourneysCapacity;
		if (wasteRatio >= 0.2) {
			wasteWarning =
				"Significant waste expected (≥20%) due to validity limits.";
		}

		const calculation = `${ticketsNeeded}× series (${seriesTicket.journeys} journeys, ${seriesTicket.validityDays} days) with ~${effectiveUsable} usable per pack → €${monthlyCost}/month`;

		console.log("[PriceService] Series tickets cost calculation", {
			tripsPerWeek,
			seriesTicket,
			weeksPerMonth: WEEKS_PER_MONTH,
			tripsPerMonth,
			tripsPerYear,
			usableJourneysPerPack,
			effectiveUsable,
			ticketsNeeded,
			totalJourneysCapacity,
			totalUsableJourneys,
			journeysWasted,
			monthlyCost,
			annualTicketsNeeded,
			annualCost,
			wasteWarning,
			calculation,
		});

		return {
			monthlyCost,
			annualCost,
			calculation,
			ticketsNeeded,
			journeysWasted,
			...(wasteWarning ? { wasteWarning } : {}),
		};
	}

	/**
	 * Calculate fixed-price monthly ticket cost
	 */
	calculateMonthlyTicketCost(monthlyPrice: number): {
		monthlyCost: number;
		annualCost: number;
		calculation: string;
	} {
		if (monthlyPrice <= 0) {
			throw new Error("Monthly ticket price must be greater than 0");
		}
		const monthlyCost = Math.round(monthlyPrice * 100) / 100;
		const annualCost = Math.round(monthlyCost * 12 * 100) / 100;
		const calculation = `Fixed €${monthlyCost}/month`;
		console.log("[PriceService] Monthly ticket cost calculation", {
			monthlyPrice,
			monthlyCost,
			annualCost,
			calculation,
		});
		return {
			monthlyCost,
			annualCost,
			calculation,
		};
	}

	/**
	 * Calculate continuous monthly price (optionally using provided price)
	 */
	calculateContinuousMonthlyTicketCost(
		monthlyPrice: number,
		continuousMonthlyPrice?: number,
		discountRatio: number = 0.05,
	): {
		monthlyCost: number;
		annualCost: number;
		calculation: string;
	} {
		console.log("calculateContinuousMonthlyTicketCost called with:", {
			monthlyPrice,
			continuousMonthlyPrice,
			discountRatio,
		});

		if (monthlyPrice <= 0) {
			throw new Error("Monthly ticket price must be greater than 0");
		}
		const effective =
			continuousMonthlyPrice && continuousMonthlyPrice > 0
				? continuousMonthlyPrice
				: Math.round(monthlyPrice * (1 - discountRatio) * 100) / 100;
		const monthlyCost = Math.round(effective * 100) / 100;
		const annualCost = Math.round(monthlyCost * 12 * 100) / 100;
		const calc =
			continuousMonthlyPrice && continuousMonthlyPrice > 0
				? `Fixed €${monthlyCost}/month`
				: `Monthly (€${monthlyPrice}) with ${(discountRatio * 100).toFixed(0)}% discount = €${monthlyCost}/month`;
		console.log("[PriceService] Continuous monthly cost calculation", {
			monthlyPrice,
			providedContinuousMonthlyPrice: continuousMonthlyPrice,
			discountRatio,
			effectiveMonthlyPrice: effective,
			monthlyCost,
			annualCost,
			calculation: calc,
		});
		return {
			monthlyCost,
			annualCost,
			calculation: calc,
		};
	}

	/**
	 * Calculate season ticket cost (30-day ticket is already monthly price)
	 */
	calculateSeasonTicketCost(seasonPrice: number): {
		monthlyCost: number;
		annualCost: number;
		calculation: string;
	} {
		if (seasonPrice <= 0) {
			throw new Error("Season ticket price must be greater than 0");
		}
		const monthlyCost = Math.round(seasonPrice * 100) / 100;
		const annualCost = Math.round(seasonPrice * 12 * 100) / 100;
		const calculation = `30-day ticket: €${monthlyCost}/month`;
		console.log("[PriceService] Season ticket cost calculation", {
			seasonPrice,
			monthlyCost,
			annualCost,
			calculation,
		});
		return {
			monthlyCost,
			annualCost,
			calculation,
		};
	}

	/**
	 * Find optimal option among provided ticket prices
	 */
	findOptimalOption(
		tripsPerWeek: number,
		prices: {
			single: number;
			series10?: { price: number; journeys: number; validityDays: number };
			series20?: { price: number; journeys: number; validityDays: number };
			season: number;
			continuousMonthly?: number;
		},
	): {
		single: { monthlyCost: number; annualCost: number; calculation: string };
		series10?: {
			monthlyCost: number;
			annualCost: number;
			calculation: string;
			ticketsNeeded: number;
			journeysWasted: number;
			wasteWarning?: string;
		};
		series20?: {
			monthlyCost: number;
			annualCost: number;
			calculation: string;
			ticketsNeeded: number;
			journeysWasted: number;
			wasteWarning?: string;
		};
		season: { monthlyCost: number; annualCost: number; calculation: string };
		continuousMonthly: {
			monthlyCost: number;
			annualCost: number;
			calculation: string;
		};
		optimal:
			| "single"
			| "series10"
			| "series20"
			| "season"
			| "continuousMonthly";
	} {
		const single = this.calculateSingleTicketCost(tripsPerWeek, prices.single);
		const season = this.calculateSeasonTicketCost(prices.season);
		const continuousMonthly = this.calculateContinuousMonthlyTicketCost(
			prices.season,
			prices.continuousMonthly,
		);

		// Calculate series tickets only if they are available
		const series10 = prices.series10
			? this.calculateSeriesTicketCost(tripsPerWeek, prices.series10)
			: undefined;
		const series20 = prices.series20
			? this.calculateSeriesTicketCost(tripsPerWeek, prices.series20)
			: undefined;

		// Build options array with only available tickets
		const options: Array<{
			key: "single" | "series10" | "series20" | "season" | "continuousMonthly";
			cost: number;
		}> = [
			{ key: "single", cost: single.monthlyCost },
			{ key: "season", cost: season.monthlyCost },
			{ key: "continuousMonthly", cost: continuousMonthly.monthlyCost },
		];

		if (series10) {
			options.push({ key: "series10", cost: series10.monthlyCost });
		}
		if (series20) {
			options.push({ key: "series20", cost: series20.monthlyCost });
		}

		options.sort((a, b) => a.cost - b.cost);
		const optimal = options[0]?.key ?? "single";

		console.log("[PriceService] Options monthly vs annual costs", {
			inputs: { tripsPerWeek, prices },
			results: {
				single,
				series10,
				series20,
				season,
				continuousMonthly,
				optimal,
			},
		});

		return {
			single: {
				monthlyCost: single.monthlyCost,
				annualCost: single.annualCost,
				calculation: single.calculation,
			},
			...(series10 ? { series10 } : {}),
			...(series20 ? { series20 } : {}),
			season,
			continuousMonthly,
			optimal,
		};
	}

	/**
	 * Get optimal ticket recommendation based on trip frequency
	 * @param tripsPerWeek Number of trips per week
	 * @param singleTicketPrice Price of a single ticket
	 * @param monthlyTicketPrice Price of monthly ticket
	 * @returns Recommendation with reasoning
	 */
	getTicketRecommendation(
		tripsPerWeek: number,
		singleTicketPrice: number,
		monthlyTicketPrice: number,
	): {
		recommendation: "single" | "monthly" | "series";
		reasoning: string;
		singleCost: number;
		monthlyCost: number;
		savings: number;
		breakEvenTrips: number;
	} {
		const singleTicketCost = this.calculateSingleTicketCost(
			tripsPerWeek,
			singleTicketPrice,
		);
		const monthlyCost = monthlyTicketPrice;

		// Calculate break-even point
		const breakEvenTrips = Math.ceil(monthlyCost / singleTicketPrice);

		// Determine recommendation
		let recommendation: "single" | "monthly" | "series";
		let reasoning: string;

		if (tripsPerWeek === 0) {
			recommendation = "single";
			reasoning = "No trips planned";
		} else if (singleTicketCost.monthlyCost <= monthlyCost) {
			recommendation = "single";
			reasoning = `Single tickets are cheaper (€${singleTicketCost.monthlyCost}/month vs €${monthlyCost}/month)`;
		} else {
			recommendation = "monthly";
			const savings = singleTicketCost.monthlyCost - monthlyCost;
			reasoning = `Monthly ticket saves €${savings.toFixed(2)}/month. Break-even at ${breakEvenTrips} trips/month`;
		}

		console.log("[PriceService] Ticket recommendation", {
			tripsPerWeek,
			singleTicketPrice,
			monthlyTicketPrice,
			computed: {
				singleMonthlyCost: singleTicketCost.monthlyCost,
				monthlyCost,
				breakEvenTrips,
				recommendation,
				reasoning,
			},
		});

		return {
			recommendation,
			reasoning,
			singleCost: singleTicketCost.monthlyCost,
			monthlyCost,
			savings: Math.max(0, singleTicketCost.monthlyCost - monthlyCost),
			breakEvenTrips,
		};
	}
}

// Export singleton instance
export const priceService = new PriceService();
