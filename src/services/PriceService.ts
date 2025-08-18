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
			// Fetch all ticket types in parallel
			const [
				singlePrice,
				seriesData,
				dailyPrice,
				monthlyPrice,
				continuousMonthlyPrice,
				seasonData,
				saverSubscriptionPrice,
			] = await Promise.all([
				this.fetchSingleTicketPrice(zones, customerGroup),
				this.fetchSeriesTicketData(zones, customerGroup),
				this.fetchDailyTicketPrice(zones, customerGroup),
				this.fetchMonthlyTicketPrice(zones, customerGroup),
				this.fetchContinuousMonthlyPrice(zones, customerGroup),
				this.fetchSeasonTicketData(zones, customerGroup, homemunicipality),
				this.fetchSaverSubscriptionPrice(
					zones,
					customerGroup,
					homemunicipality,
				),
			]);

			const prices: TicketPrices = {
				single: singlePrice,
				series: seriesData,
				daily: dailyPrice,
				monthly: monthlyPrice,
				continuousMonthly: continuousMonthlyPrice,
				season: seasonData,
				saverSubscription: saverSubscriptionPrice,
				timestamp: Date.now(),
			};

			// Cache the results
			this.setCachedPrices(cacheKey, prices);

			return prices;
		} catch (error) {
			throw this.handleAPIError(error);
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
	 * Get series ticket data using hardcoded HSL pricing
	 * Since there's no API endpoint for series tickets, we use the official pricing
	 * @param zones Zone string
	 * @param _customerGroup Customer group (unused for hardcoded pricing)
	 * @returns Series ticket information
	 */
	private async fetchSeriesTicketData(
		zones: string,
		_customerGroup: number,
	): Promise<SeriesTicket> {
		// Hardcoded series ticket pricing from HSL
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
			throw new APIError(
				`No series ticket pricing available for zone ${zones}`,
				"invalid_response",
			);
		}

		// For now, return the 10-trip option as the default
		// This could be made configurable or return both options
		return {
			price: pricing.trips10,
			journeys: 10,
			validityDays: 30,
		};
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
	 * Fetch monthly ticket price using the actual HSL API structure
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @returns Monthly ticket price
	 */
	private async fetchMonthlyTicketPrice(
		zones: string,
		customerGroup: number,
	): Promise<number> {
		const url = `${PriceService.BASE_URL}/monthly?language=fi&customerGroup=${customerGroup}&zones=${zones}`;

		try {
			const response = await this.makeRequest<HSLTicketsResponse>(url);

			if (
				!response.tickets ||
				!Array.isArray(response.tickets) ||
				response.tickets.length === 0
			) {
				throw new APIError(
					"No monthly tickets found in response",
					"invalid_response",
				);
			}

			// Find the monthly ticket for the specified customer group and zones
			const monthlyTicket = response.tickets.find(
				(ticket) =>
					ticket.customerGroup === customerGroup &&
					ticket.zones === parseInt(zones) &&
					(ticket.durationDays === 30 ||
						ticket.title.toLowerCase().includes("kuukausi")),
			);

			if (!monthlyTicket || typeof monthlyTicket.price !== "number") {
				throw new APIError(
					"Invalid monthly ticket data in response",
					"invalid_response",
				);
			}

			return monthlyTicket.price;
		} catch (error) {
			throw this.handleAPIError(error, "monthly ticket");
		}
	}

	/**
	 * Fetch continuous monthly ticket price
	 * Note: This might use the same endpoint as monthly with different parameters
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @returns Continuous monthly ticket price
	 */
	private async fetchContinuousMonthlyPrice(
		zones: string,
		customerGroup: number,
	): Promise<number> {
		// For now, assume continuous monthly is same as monthly but with a small discount
		// This would need to be adjusted based on actual HSL API structure
		const monthlyPrice = await this.fetchMonthlyTicketPrice(
			zones,
			customerGroup,
		);

		// Apply typical subscription discount (5% less than regular monthly)
		return Math.round(monthlyPrice * 0.95 * 100) / 100;
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
	 * Fetch season ticket data
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @param homemunicipality Home municipality
	 * @returns Season ticket information
	 */
	private async fetchSeasonTicketData(
		zones: string,
		customerGroup: number,
		homemunicipality: string,
	): Promise<SeasonTicket> {
		const url = `${PriceService.BASE_URL}/season?language=fi&customerGroup=${customerGroup}&zones=${zones}&homemunicipality=${homemunicipality}&ownership=personal`;

		try {
			const response = await this.makeRequest<HSLTicketsResponse>(url);

			if (
				!response.tickets ||
				!Array.isArray(response.tickets) ||
				response.tickets.length === 0
			) {
				throw new APIError(
					"No season tickets found in response",
					"invalid_response",
				);
			}

			// Find the season ticket for the specified customer group and zones
			const seasonTicket = response.tickets.find(
				(ticket) =>
					ticket.customerGroup === customerGroup &&
					ticket.zones === parseInt(zones),
			);

			if (!seasonTicket || typeof seasonTicket.price !== "number") {
				throw new APIError(
					"Invalid season ticket data in response",
					"invalid_response",
				);
			}

			// Extract duration from ticket data
			const ticketData = seasonTicket._data?.[0];
			const durationDays =
				ticketData?.durationDays || seasonTicket.durationDays || 365; // Default to 1 year

			return {
				price: seasonTicket.price,
				durationDays: durationDays,
				type: "season",
			};
		} catch (error) {
			throw this.handleAPIError(error, "season ticket");
		}
	}

	/**
	 * Fetch saver subscription price
	 * @param zones Zone string
	 * @param customerGroup Customer group
	 * @param homemunicipality Home municipality
	 * @returns Saver subscription price
	 */
	private async fetchSaverSubscriptionPrice(
		zones: string,
		customerGroup: number,
		homemunicipality: string,
	): Promise<number> {
		const url = `${PriceService.BASE_URL}/season/saver-subscription?language=fi&customerGroup=${customerGroup}&homemunicipality=${homemunicipality}&zones=${zones}`;

		try {
			const response = await this.makeRequest<HSLTicketsResponse>(url);

			if (
				!response.tickets ||
				!Array.isArray(response.tickets) ||
				response.tickets.length === 0
			) {
				throw new APIError(
					"No saver subscription tickets found in response",
					"invalid_response",
				);
			}

			// Find the saver subscription for the specified customer group and zones
			const saverTicket = response.tickets.find(
				(ticket) =>
					ticket.customerGroup === customerGroup &&
					ticket.zones === parseInt(zones),
			);

			if (!saverTicket || typeof saverTicket.price !== "number") {
				throw new APIError(
					"Invalid saver subscription data in response",
					"invalid_response",
				);
			}

			return saverTicket.price;
		} catch (error) {
			throw this.handleAPIError(error, "saver subscription");
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
	calculateSingleTicketCost(tripsPerWeek: number, singleTicketPrice: number): {
		monthlyCost: number;
		annualCost: number;
		calculation: string;
		tripsPerMonth: number;
		totalTickets: number;
	} {
		// Validate inputs
		if (tripsPerWeek < 0) {
			throw new Error('Trips per week must be greater than or equal to 0');
		}
		if (singleTicketPrice <= 0) {
			throw new Error('Single ticket price must be greater than 0');
		}

		// Handle edge case of no trips
		if (tripsPerWeek === 0) {
			return {
				monthlyCost: 0,
				annualCost: 0,
				calculation: 'No trips - no cost',
				tripsPerMonth: 0,
				totalTickets: 0
			};
		}

		if (tripsPerWeek > 100) {
			// For very high trip frequencies, warn about potential impracticality
			console.warn(`Very high trip frequency: ${tripsPerWeek} trips per week. Consider monthly tickets.`);
		}

		// Calculate trips per month (4.33 weeks per month)
		const WEEKS_PER_MONTH = 4.33;
		const tripsPerMonth = Math.ceil(tripsPerWeek * WEEKS_PER_MONTH);
		
		// Calculate total tickets needed (round up to ensure coverage)
		const totalTickets = tripsPerMonth;
		
		// Calculate costs
		const monthlyCost = Math.round((totalTickets * singleTicketPrice) * 100) / 100;
		const annualCost = Math.round((monthlyCost * 12) * 100) / 100;

		// Create calculation explanation
		const calculation = `${tripsPerWeek} trips/week × ${WEEKS_PER_MONTH} weeks/month = ${tripsPerMonth.toFixed(1)} trips/month × €${singleTicketPrice} = €${monthlyCost}/month`;

		return {
			monthlyCost,
			annualCost,
			calculation,
			tripsPerMonth,
			totalTickets
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
		monthlyTicketPrice: number
	): {
		recommendation: 'single' | 'monthly' | 'series';
		reasoning: string;
		singleCost: number;
		monthlyCost: number;
		savings: number;
		breakEvenTrips: number;
	} {
		const singleTicketCost = this.calculateSingleTicketCost(tripsPerWeek, singleTicketPrice);
		const monthlyCost = monthlyTicketPrice;
		
		// Calculate break-even point
		const breakEvenTrips = Math.ceil(monthlyCost / singleTicketPrice);
		
		// Determine recommendation
		let recommendation: 'single' | 'monthly' | 'series';
		let reasoning: string;
		
		if (tripsPerWeek === 0) {
			recommendation = 'single';
			reasoning = 'No trips planned';
		} else if (singleTicketCost.monthlyCost <= monthlyCost) {
			recommendation = 'single';
			reasoning = `Single tickets are cheaper (€${singleTicketCost.monthlyCost}/month vs €${monthlyCost}/month)`;
		} else {
			recommendation = 'monthly';
			const savings = singleTicketCost.monthlyCost - monthlyCost;
			reasoning = `Monthly ticket saves €${savings.toFixed(2)}/month. Break-even at ${breakEvenTrips} trips/month`;
		}

		return {
			recommendation,
			reasoning,
			singleCost: singleTicketCost.monthlyCost,
			monthlyCost,
			savings: Math.max(0, singleTicketCost.monthlyCost - monthlyCost),
			breakEvenTrips
		};
	}
}

// Export singleton instance
export const priceService = new PriceService();
