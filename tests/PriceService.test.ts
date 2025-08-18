/**
 * Unit tests for PriceService
 * Tests API integration, caching, and error handling
 */

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { APIError } from "../src/models/types.js";
import { PriceService } from "../src/services/PriceService.js";
import { cacheManager } from "../src/utils/CacheManager.js";

// Mock the cache manager
vi.mock("../src/utils/CacheManager.js", () => ({
	cacheManager: {
		get: vi.fn(),
		set: vi.fn(),
		clear: vi.fn(),
		getStats: vi.fn(),
	},
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock responses for all tests
const mockSingleResponse = {
	tickets: [
		{
			id: "2f0164a1-8b9a-4011-a4a0-091e63e636f9",
			ticketType: 1,
			title: "Kertalippu",
			price: 2.95,
			salePrice: null,
			pricePerDay: 0.0,
			durationMinutes: 80.0,
			durationDays: 0,
			customerGroup: 1,
			zones: 11,
			pointsOfSale: [],
			_data: [
				{
					productId: "2f0164a1-8b9a-4011-a4a0-091e63e636f9",
					productSku: "single-adult-all-personal-AB",
					hslProductId: "newstyle",
					productGroup: "single",
					customerGroup: "adult",
					usage: "personal",
					billingModel: "one-off",
					validityArea: "AB",
					residence: null,
					pricingPlanId: null,
					pricingPlanTitle: null,
					price: 2.95,
					validFrom: "2025-01-01T00:00:00",
					validUntil: "2027-12-31T23:59:59",
					purchaseMethod: null,
					durationDays: 0,
					purchaseMethods: ["app", "pos_machine", "card"],
				},
			],
		},
	],
};

const mockMonthlyResponse = {
	tickets: [
		{
			id: "monthly-ticket-id",
			ticketType: 3,
			title: "Kuukausilippu",
			price: 64.7,
			salePrice: null,
			pricePerDay: 2.16,
			durationMinutes: 0,
			durationDays: 30,
			customerGroup: 1,
			zones: 11,
			pointsOfSale: [],
			_data: [
				{
					productId: "monthly-ticket-id",
					productSku: "monthly-adult-personal-AB",
					hslProductId: "monthly",
					productGroup: "monthly",
					customerGroup: "adult",
					usage: "personal",
					billingModel: "monthly",
					validityArea: "AB",
					residence: null,
					pricingPlanId: null,
					pricingPlanTitle: null,
					price: 64.7,
					validFrom: "2025-01-01T00:00:00",
					validUntil: "2027-12-31T23:59:59",
					purchaseMethod: null,
					durationDays: 30,
					purchaseMethods: ["app", "pos_machine", "card"],
				},
			],
		},
	],
};

const mockDailyResponse = {
	tickets: [
		{
			id: "daily-ticket-id",
			ticketType: 4,
			title: "Päivälippu",
			price: 9.5,
			salePrice: null,
			pricePerDay: 9.5,
			durationMinutes: 1440,
			durationDays: 1,
			customerGroup: 1,
			zones: 11,
			pointsOfSale: [],
			_data: [
				{
					productId: "daily-ticket-id",
					productSku: "daily-adult-personal-AB",
					hslProductId: "daily",
					productGroup: "daily",
					customerGroup: "adult",
					usage: "personal",
					billingModel: "one-off",
					validityArea: "AB",
					residence: null,
					pricingPlanId: null,
					pricingPlanTitle: null,
					price: 9.5,
					validFrom: "2025-01-01T00:00:00",
					validUntil: "2027-12-31T23:59:59",
					purchaseMethod: null,
					durationDays: 1,
					purchaseMethods: ["app", "pos_machine", "card"],
				},
			],
		},
	],
};

const mockSeasonResponse = {
	subscriptions: [
		{
			id: "saver-subscription-id",
			title: "Jatkuva säästötilaus",
			description: "Sitoutuminen vuodeksi (12 veloitusta)",
			price: 89.8,
			pricePerDay: 2.99,
			durationDays: 30,
			customerGroup: 1,
			zones: 11,
			homeMunicipality: "helsinki",
		},
		{
			id: "continuous-subscription-id",
			title: "Jatkuva tilaus (30 vrk)",
			description: "Voit lopettaa tilauksen milloin vain",
			price: 107.7,
			pricePerDay: 3.59,
			durationDays: 30,
			customerGroup: 1,
			zones: 11,
			homeMunicipality: "helsinki",
		},
	],
	tickets: [
		{
			id: "season-ticket-id",
			ticketType: 3,
			title: "30 vrk",
			price: 107.7,
			salePrice: null,
			pricePerDay: 3.59,
			durationMinutes: null,
			durationDays: 30,
			customerGroup: 1,
			zones: 11,
			pointsOfSale: [],
			_data: [
				{
					productId: "season-ticket-id",
					productSku: "season-adult-hsl-personal-30-AB",
					hslProductId: null,
					productGroup: "season",
					customerGroup: "adult",
					usage: "personal",
					billingModel: "one-off",
					validityArea: "AB",
					residence: null,
					pricingPlanId: null,
					pricingPlanTitle: null,
					price: 107.7,
					validFrom: "2025-01-01T00:00:00",
					validUntil: "2027-12-31T23:59:59",
					purchaseMethod: null,
					durationDays: 30,
					purchaseMethods: ["app", "pos_machine", "card"],
				},
			],
		},
	],
};

const mockSaverResponse = {
	tickets: [
		{
			id: "saver-ticket-id",
			ticketType: 6,
			title: "Säästötilaus",
			price: 580.0,
			salePrice: null,
			pricePerDay: 1.59,
			durationMinutes: 0,
			durationDays: 365,
			customerGroup: 1,
			zones: 11,
			pointsOfSale: [],
			_data: [
				{
					productId: "saver-ticket-id",
					productSku: "saver-adult-personal-AB",
					hslProductId: "saver",
					productGroup: "saver",
					customerGroup: "adult",
					usage: "personal",
					billingModel: "subscription",
					validityArea: "AB",
					residence: null,
					pricingPlanId: null,
					pricingPlanTitle: null,
					price: 580.0,
					validFrom: "2025-01-01T00:00:00",
					validUntil: "2027-12-31T23:59:59",
					purchaseMethod: null,
					durationDays: 365,
					purchaseMethods: ["app", "pos_machine", "card"],
				},
			],
		},
	],
};

describe("PriceService", () => {
	let priceService: PriceService;
	const mockCacheManager = cacheManager as unknown as {
		get: Mock;
		set: Mock;
		clear: Mock;
		getStats: Mock;
	};

	beforeEach(() => {
		priceService = new PriceService();
		vi.clearAllMocks();

		// Reset fetch mock
		mockFetch.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("fetchTicketPrices", () => {
		it("should return cached prices if available", async () => {
			const cachedPrices = {
				single: 2.95,
				series: { price: 28.8, journeys: 10, validityDays: 30 },
				daily: 9.5,
				monthly: 64.7,
				continuousMonthly: 61.5,
				season: { price: 650.0, durationDays: 365, type: "season" as const },
				saverSubscription: 580.0,
				timestamp: Date.now(),
			};

			mockCacheManager.get.mockReturnValue(cachedPrices);

			const result = await priceService.fetchTicketPrices("11", 1);

			expect(result).toEqual(cachedPrices);
			expect(mockCacheManager.get).toHaveBeenCalledWith("prices_11_1_helsinki");
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should fetch all ticket types when cache is empty", async () => {
			mockCacheManager.get.mockReturnValue(null);

			// Mock successful responses for all endpoints (6 total calls - no series API)
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSingleResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockDailyResponse),
				})
				// Season response (contains 30-day ticket and subscriptions)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSeasonResponse),
				})
				// Saver-subscription ping (non-essential)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSaverResponse),
				});

			const result = await priceService.fetchTicketPrices("11", 1);

			expect(result.single).toBe(2.95);
			expect(result.series10).toEqual({
				price: 28.8,
				journeys: 10,
				validityDays: 30,
			}); // Hardcoded AB pricing
			expect(result.series20).toEqual({
				price: 54.4,
				journeys: 20,
				validityDays: 60,
			}); // Hardcoded AB pricing
			expect(result.daily).toBe(9.5);
			expect(result.monthly).toBe(107.7); // 30-day season ticket price
			expect(result.continuousMonthly).toBe(107.7); // Regular continuous subscription price
			expect(result.season).toEqual({
				price: 107.7,
				durationDays: 30,
				type: "season",
			});
			expect(result.saverSubscription).toBe(89.8);
			expect(result.timestamp).toBeGreaterThan(0);

			// Verify caching
			expect(mockCacheManager.set).toHaveBeenCalledWith(
				"prices_11_1_helsinki",
				result,
				3600000,
			);
		});

		it("should make requests to correct HSL API endpoints", async () => {
			mockCacheManager.get.mockReturnValue(null);

			// Mock all six endpoints with appropriate responses (no series API)
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSingleResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockDailyResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockMonthlyResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockMonthlyResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSeasonResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSaverResponse),
				});

			await priceService.fetchTicketPrices("11", 1);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://cms.hsl.fi/api/v1/tickets/single?language=fi&customerGroup=1&zones=11",
				expect.objectContaining({
					method: "GET",
					headers: {
						Accept: "*/*",
						"Accept-Encoding": "gzip, deflate",
					},
				}),
			);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://cms.hsl.fi/api/v1/tickets/day?language=fi&customerGroup=1&zones=11",
				expect.any(Object),
			);

			// Monthly endpoint is no longer called - calculated from season ticket

			expect(mockFetch).toHaveBeenCalledWith(
				"https://cms.hsl.fi/api/v1/tickets/season?language=fi&customerGroup=1&zones=11&homemunicipality=helsinki&ownership=personal",
				expect.any(Object),
			);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://cms.hsl.fi/api/v1/tickets/season/saver-subscription?language=fi&customerGroup=1&homemunicipality=helsinki&zones=11",
				expect.any(Object),
			);
		});

		it("should handle network errors", async () => {
			mockCacheManager.get.mockReturnValue(null);
			mockFetch.mockRejectedValue(new Error("Failed to fetch"));

			await expect(priceService.fetchTicketPrices("11", 1)).rejects.toThrow(
				APIError,
			);

			try {
				await priceService.fetchTicketPrices("11", 1);
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).type).toBe("network");
			}
		});

		it("should handle CORS errors", async () => {
			mockCacheManager.get.mockReturnValue(null);
			mockFetch.mockRejectedValue(new Error("CORS policy blocked"));

			try {
				await priceService.fetchTicketPrices("11", 1);
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).type).toBe("cors");
			}
		});

		it("should handle HTTP error responses", async () => {
			mockCacheManager.get.mockReturnValue(null);
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
			});

			try {
				await priceService.fetchTicketPrices("11", 1);
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).type).toBe("network");
				expect((error as APIError).message).toContain("HTTP 404");
			}
		});

		it("should handle rate limiting", async () => {
			mockCacheManager.get.mockReturnValue(null);
			mockFetch.mockResolvedValue({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			});

			try {
				await priceService.fetchTicketPrices("11", 1);
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).type).toBe("rate_limit");
			}
		});

		it("should handle invalid response format", async () => {
			mockCacheManager.get.mockReturnValue(null);
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: { invalid: "format" } }),
			});

			try {
				await priceService.fetchTicketPrices("11", 1);
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).type).toBe("invalid_response");
			}
		});

		it("should handle request timeout", async () => {
			mockCacheManager.get.mockReturnValue(null);

			// Mock AbortError
			const abortError = new Error("The operation was aborted");
			abortError.name = "AbortError";
			mockFetch.mockRejectedValue(abortError);

			try {
				await priceService.fetchTicketPrices("11", 1);
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).type).toBe("network");
				expect((error as APIError).message).toContain("timeout");
			}
		});
	});

	describe("isCacheValid", () => {
		it("should return true for recent timestamps", () => {
			const recentTimestamp = Date.now() - 30 * 60 * 1000; // 30 minutes ago
			expect(priceService.isCacheValid(recentTimestamp)).toBe(true);
		});

		it("should return false for old timestamps", () => {
			const oldTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
			expect(priceService.isCacheValid(oldTimestamp)).toBe(false);
		});
	});

	describe("getErrorMessage", () => {
		it("should return appropriate message for network errors", () => {
			const error = new APIError("Network failed", "network");
			const message = PriceService.getErrorMessage(error);
			expect(message).toContain("Unable to connect to HSL services");
		});

		it("should return appropriate message for CORS errors", () => {
			const error = new APIError("CORS blocked", "cors");
			const message = PriceService.getErrorMessage(error);
			expect(message).toContain("Browser security settings");
		});

		it("should return appropriate message for invalid response errors", () => {
			const error = new APIError("Invalid data", "invalid_response");
			const message = PriceService.getErrorMessage(error);
			expect(message).toContain("invalid data from HSL services");
		});

		it("should return appropriate message for rate limit errors", () => {
			const error = new APIError("Too many requests", "rate_limit");
			const message = PriceService.getErrorMessage(error);
			expect(message).toContain("Too many requests");
		});
	});

	describe("cache management", () => {
		it("should clear cache when requested", () => {
			priceService.clearCache();
			expect(mockCacheManager.clear).toHaveBeenCalled();
		});

		it("should return cache statistics", () => {
			const mockStats = { totalItems: 5, expiredItems: 1, totalSize: 1024 };
			mockCacheManager.getStats.mockReturnValue(mockStats);

			const stats = priceService.getCacheStats();
			expect(stats).toEqual(mockStats);
			expect(mockCacheManager.getStats).toHaveBeenCalled();
		});
	});

	describe("continuous monthly pricing", () => {
		it("should apply discount to season monthly equivalent for continuous monthly", async () => {
			mockCacheManager.get.mockReturnValue(null);

			const seasonPrice = 650.0;
			const monthlyEquivalent = seasonPrice / 12;
			const expectedContinuousPrice =
				Math.round(monthlyEquivalent * 0.95 * 100) / 100;

			// Build a season response that contains only a 30-day ticket with the desired monthlyEquivalent,
			// and no subscriptions so the implementation applies the discount fallback.
			const seasonNoSubsResponse = {
				tickets: [
					{
						id: "season-ticket-id",
						ticketType: 3,
						title: "30 vrk",
						price: monthlyEquivalent,
						salePrice: null,
						pricePerDay: 0,
						durationMinutes: null,
						durationDays: 30,
						customerGroup: 1,
						zones: 11,
						pointsOfSale: [],
						_data: [],
					},
				],
				subscriptions: [],
			};

			// Mock all endpoints with successful responses (5 calls total - no monthly endpoint)
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSingleResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockDailyResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(seasonNoSubsResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(seasonNoSubsResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSaverResponse),
				});

			const result = await priceService.fetchTicketPrices("11", 1);
			expect(result.continuousMonthly).toBe(expectedContinuousPrice);
		});
	});

	describe("error context", () => {
		it("should include context in error messages", async () => {
			mockCacheManager.get.mockReturnValue(null);

			// Mock failure for single ticket endpoint only
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			try {
				await priceService.fetchTicketPrices("11", 1);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				expect((error as APIError).message).toContain("single ticket");
			}
		});
	});
});

describe("PriceService integration", () => {
	let priceService: PriceService;

	beforeEach(() => {
		priceService = new PriceService();
		vi.clearAllMocks();
	});

	it("should handle complete successful flow", async () => {
		const mockCacheManager = cacheManager as unknown as {
			get: Mock;
			set: Mock;
		};

		// First call - cache miss
		mockCacheManager.get.mockReturnValueOnce(null);

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockSingleResponse),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockDailyResponse),
			})
			// Season response
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockSeasonResponse),
			})
			// Saver-subscription ping
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockSaverResponse),
			})
			// Extra resolved values to keep call order compatibility if needed
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockSeasonResponse),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockSaverResponse),
			});

		const result1 = await priceService.fetchTicketPrices("11", 1);

		expect(result1.single).toBe(2.95);
		expect(result1.series10.price).toBe(28.8); // Hardcoded AB pricing
		expect(result1.series20.price).toBe(54.4); // Hardcoded AB pricing
		expect(result1.daily).toBe(9.5);
		expect(result1.monthly).toBe(107.7); // 30-day season ticket price
		expect(mockCacheManager.set).toHaveBeenCalled();

		// Second call - cache hit
		mockCacheManager.get.mockReturnValueOnce(result1);

		const result2 = await priceService.fetchTicketPrices("11", 1);
		expect(result2).toEqual(result1);

		// Should not make additional API calls
		expect(mockFetch).toHaveBeenCalledTimes(4); // single, day, season, saver-subscription ping
	});
});

describe("PriceService utility methods", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		global.fetch = mockFetch;
	});
	describe("getZoneCode", () => {
		it("should convert zone letters to correct API codes", () => {
			expect(PriceService.getZoneCode("AB")).toBe("11");
			expect(PriceService.getZoneCode("ABC")).toBe("12");
			expect(PriceService.getZoneCode("ABCD")).toBe("13");
			expect(PriceService.getZoneCode("BC")).toBe("21");
			expect(PriceService.getZoneCode("BCD")).toBe("22");
			expect(PriceService.getZoneCode("CD")).toBe("31");
			expect(PriceService.getZoneCode("D")).toBe("40");
		});

		it("should handle lowercase zone letters", () => {
			expect(PriceService.getZoneCode("ab")).toBe("11");
			expect(PriceService.getZoneCode("abc")).toBe("12");
			expect(PriceService.getZoneCode("abcd")).toBe("13");
		});

		it("should throw error for invalid zone letters", () => {
			expect(() => PriceService.getZoneCode("XYZ")).toThrow(
				"Invalid zone letters: XYZ",
			);
			expect(() => PriceService.getZoneCode("A")).toThrow(
				"Invalid zone letters: A",
			);
			expect(() => PriceService.getZoneCode("")).toThrow(
				"Invalid zone letters: ",
			);
		});
	});

	describe("getCustomerGroupName", () => {
		it("should return correct Finnish names for customer groups", () => {
			expect(PriceService.getCustomerGroupName(1)).toBe("Aikuinen");
			expect(PriceService.getCustomerGroupName(2)).toBe("Lapsi (7-17v)");
			expect(PriceService.getCustomerGroupName(4)).toBe("Eläkeläinen");
			expect(PriceService.getCustomerGroupName(5)).toBe("Liikuntarajoitteinen");
			expect(PriceService.getCustomerGroupName(6)).toBe("70v täyttänyt");
		});

		it("should handle unknown customer groups", () => {
			expect(PriceService.getCustomerGroupName(99)).toBe("Unknown (99)");
			expect(PriceService.getCustomerGroupName(3)).toBe("Unknown (3)");
		});
	});

	describe("fetchTicketsByType", () => {
		it("should fetch tickets by type using new API structure", async () => {
			const mockResponse = {
				tickets: [
					{
						id: "test-ticket",
						ticketType: 1,
						title: "Test Single Ticket",
						price: 3.2,
						customerGroup: 1,
						zones: 11,
						pointsOfSale: [],
						_data: [],
					},
				],
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const testService = new PriceService();
			const result = await testService.fetchTicketsByType("single", "11", 1);

			expect(result.tickets).toHaveLength(1);
			expect(result.tickets[0]?.price).toBe(3.2);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://cms.hsl.fi/api/v1/tickets/single?language=fi&customerGroup=1&zones=11",
				expect.any(Object),
			);
		});

		it("should handle invalid response format", async () => {
			const testService = new PriceService();

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ invalid: "response" }),
			});

			await expect(
				testService.fetchTicketsByType("single", "11", 1),
			).rejects.toThrow("Invalid single tickets response format");
		});
	});

	describe("getAllTickets", () => {
		it("should fetch all ticket types", async () => {
			const testService = new PriceService();
			const mockSingleTickets = {
				tickets: [{ id: "1", ticketType: 1, price: 3.2 }],
			};
			const mockDayTickets = {
				tickets: [{ id: "3", ticketType: 4, price: 9.5 }],
			};
			const mockMonthlyTickets = {
				tickets: [{ id: "4", ticketType: 3, price: 64.7 }],
			};
			const mockSeasonTickets = {
				tickets: [{ id: "5", ticketType: 5, price: 650.0 }],
			};
			const mockSaverTickets = {
				tickets: [{ id: "6", ticketType: 6, price: 580.0 }],
			};

			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSingleTickets),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockDayTickets),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockMonthlyTickets),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSeasonTickets),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSaverTickets),
				});

			const result = await testService.getAllTickets("11", 1);

			expect(result).toHaveLength(5);
			expect(result[0]?.ticketType).toBe(1);
			expect(result[1]?.ticketType).toBe(4);
			expect(result[2]?.ticketType).toBe(3);
			expect(result[3]?.ticketType).toBe(5);
			expect(result[4]?.ticketType).toBe(6);
		});

		it("should continue with other ticket types if one fails", async () => {
			const testService = new PriceService();
			const mockDayTickets = {
				tickets: [{ id: "3", ticketType: 4, price: 9.5 }],
			};
			const mockMonthlyTickets = {
				tickets: [{ id: "4", ticketType: 3, price: 64.7 }],
			};
			const mockSeasonTickets = {
				tickets: [{ id: "5", ticketType: 5, price: 650.0 }],
			};

			mockFetch
				.mockRejectedValueOnce(new Error("Single tickets failed"))
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockDayTickets),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockMonthlyTickets),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSeasonTickets),
				})
				.mockRejectedValueOnce(new Error("Saver subscription failed"));

			const result = await testService.getAllTickets("11", 1);

			expect(result).toHaveLength(3);
			expect(result[0]?.ticketType).toBe(4);
			expect(result[1]?.ticketType).toBe(3);
			expect(result[2]?.ticketType).toBe(5);
		});
	});

	describe("fetchTicketsByTypeWithParams", () => {
		it("should fetch tickets with additional parameters", async () => {
			const testService = new PriceService();

			const mockResponse = {
				tickets: [
					{
						id: "season-ticket",
						ticketType: 5,
						title: "Season Ticket",
						price: 650.0,
						customerGroup: 1,
						zones: 11,
						pointsOfSale: [],
						_data: [],
					},
				],
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await testService.fetchTicketsByTypeWithParams(
				"season",
				"11",
				1,
				{ homemunicipality: "helsinki", ownership: "personal" },
			);

			expect(result.tickets).toHaveLength(1);
			expect(result.tickets[0]?.price).toBe(650.0);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://cms.hsl.fi/api/v1/tickets/season?language=fi&customerGroup=1&zones=11&homemunicipality=helsinki&ownership=personal",
				expect.any(Object),
			);
		});
	});

	describe("getSeriesTicketOptions", () => {
		it("should return correct series ticket options for AB zones", () => {
			const testService = new PriceService();
			const options = testService.getSeriesTicketOptions("11");

			expect(options).toHaveLength(2);
			expect(options[0]).toEqual({
				price: 28.8,
				journeys: 10,
				validityDays: 30,
			});
			expect(options[1]).toEqual({
				price: 54.4,
				journeys: 20,
				validityDays: 60,
			});
		});

		it("should return correct series ticket options for ABC zones", () => {
			const testService = new PriceService();
			const options = testService.getSeriesTicketOptions("12");

			expect(options).toHaveLength(2);
			expect(options[0]).toEqual({
				price: 39.6,
				journeys: 10,
				validityDays: 30,
			});
			expect(options[1]).toEqual({
				price: 74.8,
				journeys: 20,
				validityDays: 60,
			});
		});

		it("should return correct series ticket options for ABCD zones", () => {
			const testService = new PriceService();
			const options = testService.getSeriesTicketOptions("13");

			expect(options).toHaveLength(2);
			expect(options[0]).toEqual({
				price: 43.2,
				journeys: 10,
				validityDays: 30,
			});
			expect(options[1]).toEqual({
				price: 81.6,
				journeys: 20,
				validityDays: 60,
			});
		});

		it("should return empty array for invalid zones", () => {
			const testService = new PriceService();
			const options = testService.getSeriesTicketOptions("99");
			expect(options).toHaveLength(0);
		});
	});

	describe("parseZoneCode", () => {
		it("should be an alias for getZoneCode", () => {
			expect(PriceService.parseZoneCode("AB")).toBe("11");
			expect(PriceService.parseZoneCode("ABC")).toBe("12");
		});
	});

	describe("calculateSingleTicketCost", () => {
		it("should calculate correct costs for typical trip frequencies", () => {
			const testService = new PriceService();
			const result = testService.calculateSingleTicketCost(5, 3.2);

			// 5 trips/week × 4.33 weeks/month = 21.65 trips/month, rounded up to 22
			expect(result.monthlyCost).toBe(70.4); // 22 × 3.2
			expect(result.annualCost).toBe(832); // 5 trips/week × 52 weeks = 260 annual trips × €3.2 = €832
			expect(result.tripsPerMonth).toBe(22);
			expect(result.totalTickets).toBe(22);
			expect(result.calculation).toContain("5 trips/week × 4.33 weeks/month");
			expect(result.calculation).toContain("€3.2 = €70.4/month");
		});

		it("should handle low trip frequencies correctly", () => {
			const testService = new PriceService();
			const result = testService.calculateSingleTicketCost(1, 2.95);

			// 1 trip/week × 4.33 weeks/month = 4.33 trips/month, rounded up to 5
			expect(result.monthlyCost).toBe(14.75); // 5 × 2.95
			expect(result.annualCost).toBe(153.4); // 1 trip/week × 52 weeks = 52 annual trips × €2.95 = €153.4
			expect(result.tripsPerMonth).toBe(5);
			expect(result.totalTickets).toBe(5);
		});

		it("should handle high trip frequencies correctly", () => {
			const testService = new PriceService();
			const result = testService.calculateSingleTicketCost(20, 3.2);

			// 20 trips/week × 4.33 weeks/month = 86.6 trips/month, rounded up to 87
			expect(result.monthlyCost).toBe(278.4); // 87 × 3.2
			expect(result.annualCost).toBe(3328); // 20 trips/week × 52 weeks = 1040 annual trips × €3.2 = €3328
			expect(result.tripsPerMonth).toBe(87);
			expect(result.totalTickets).toBe(87);
		});

		it("should handle edge case of 0 trips per week", () => {
			const testService = new PriceService();
			const result = testService.calculateSingleTicketCost(0, 3.2);

			expect(result.monthlyCost).toBe(0);
			expect(result.annualCost).toBe(0);
			expect(result.tripsPerMonth).toBe(0);
			expect(result.totalTickets).toBe(0);
			expect(result.calculation).toBe("No trips - no cost");
		});

		it("should handle edge case of very low trips (less than 1)", () => {
			const testService = new PriceService();
			const result = testService.calculateSingleTicketCost(0.5, 3.2);

			// 0.5 trips/week × 4.33 weeks/month = 2.165 trips/month, rounded up to 3
			expect(result.monthlyCost).toBe(9.6); // 3 × 3.2
			expect(result.annualCost).toBe(83.2); // 0.5 trips/week × 52 weeks = 26 annual trips × €3.2 = €83.2
			expect(result.tripsPerMonth).toBe(3);
			expect(result.totalTickets).toBe(3);
		});

		it("should handle edge case of very high trips (over 100)", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const testService = new PriceService();
			const result = testService.calculateSingleTicketCost(150, 3.2);

			// 150 trips/week × 4.33 weeks/month = 649.5 trips/month, rounded up to 650
			expect(result.monthlyCost).toBe(2080.0); // 650 × 3.2
			expect(result.annualCost).toBe(24960.0); // 150 trips/week × 52 weeks = 7800 annual trips × €3.2 = €24960
			expect(result.tripsPerMonth).toBe(650);
			expect(result.totalTickets).toBe(650);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Very high trip frequency: 150 trips per week. Consider monthly tickets.",
			);

			consoleSpy.mockRestore();
		});

		it("should round costs to 2 decimal places", () => {
			const testService = new PriceService();
			const result = testService.calculateSingleTicketCost(3, 2.99);

			// 3 trips/week × 4.33 weeks/month = 12.99 trips/month, rounded up to 13
			expect(result.monthlyCost).toBe(38.87); // 13 × 2.99
			expect(result.annualCost).toBe(466.44); // 3 trips/week × 52 weeks = 156 annual trips × €2.99 = €466.44
		});

		it("should throw error for negative trips per week", () => {
			const testService = new PriceService();
			expect(() => testService.calculateSingleTicketCost(-1, 3.2)).toThrow(
				"Trips per week must be greater than or equal to 0",
			);
		});

		it("should handle zero trips per week without error", () => {
			const testService = new PriceService();
			const result = testService.calculateSingleTicketCost(0, 3.2);

			expect(result.monthlyCost).toBe(0);
			expect(result.annualCost).toBe(0);
			expect(result.tripsPerMonth).toBe(0);
			expect(result.totalTickets).toBe(0);
			expect(result.calculation).toBe("No trips - no cost");
		});

		it("should throw error for negative ticket price", () => {
			const testService = new PriceService();
			expect(() => testService.calculateSingleTicketCost(5, -3.2)).toThrow(
				"Single ticket price must be greater than 0",
			);
		});

		it("should throw error for zero ticket price", () => {
			const testService = new PriceService();
			expect(() => testService.calculateSingleTicketCost(5, 0)).toThrow(
				"Single ticket price must be greater than 0",
			);
		});
	});

	describe("getTicketRecommendation", () => {
		it("should recommend single tickets for low trip frequencies", () => {
			const testService = new PriceService();
			const result = testService.getTicketRecommendation(2, 3.2, 64.7);

			expect(result.recommendation).toBe("single");
			expect(result.reasoning).toContain("Single tickets are cheaper");
			expect(result.singleCost).toBeLessThan(result.monthlyCost);
			expect(result.savings).toBe(0); // No savings with single tickets
		});

		it("should recommend monthly tickets for high trip frequencies", () => {
			const testService = new PriceService();
			const result = testService.getTicketRecommendation(25, 3.2, 64.7);

			expect(result.recommendation).toBe("monthly");
			expect(result.reasoning).toContain("Monthly ticket saves");
			expect(result.singleCost).toBeGreaterThan(result.monthlyCost);
			expect(result.savings).toBeGreaterThan(0);
		});

		it("should calculate correct break-even point", () => {
			const testService = new PriceService();
			const result = testService.getTicketRecommendation(10, 3.2, 64.7);

			// Break-even: 64.7 / 3.2 = 20.22, rounded up to 21
			expect(result.breakEvenTrips).toBe(21);
		});

		it("should handle edge case of no trips", () => {
			const testService = new PriceService();
			const result = testService.getTicketRecommendation(0, 3.2, 64.7);

			expect(result.recommendation).toBe("single");
			expect(result.reasoning).toBe("No trips planned");
			expect(result.singleCost).toBe(0);
			expect(result.savings).toBe(0);
		});

		it("should provide detailed reasoning for recommendations", () => {
			const testService = new PriceService();
			const result = testService.getTicketRecommendation(30, 3.2, 64.7);

			expect(result.reasoning).toContain("Monthly ticket saves");
			expect(result.reasoning).toContain("Break-even at");
			expect(result.savings).toBeGreaterThan(0);
		});

		it("should handle exact break-even scenarios", () => {
			const testService = new PriceService();
			// 20 trips/week × 4.33 weeks/month = 86.6 trips/month, rounded up to 87
			// 87 × 3.2 = 278.4, which is greater than 64.7
			const result = testService.getTicketRecommendation(20, 3.2, 64.7);

			expect(result.recommendation).toBe("monthly");
			expect(result.singleCost).toBeGreaterThan(result.monthlyCost);
		});
	});

	describe("calculateSeriesTicketCost", () => {
		it("should calculate series ticket cost for typical usage", () => {
			const testService = new PriceService();
			const seriesTicket = { price: 12.5, journeys: 10, validityDays: 14 };
			const result = testService.calculateSeriesTicketCost(5, seriesTicket);

			// 5 trips/week × 4.33 weeks/month = 21.65 trips/month, rounded up to 22
			// 14 days = 2 weeks, so usable journeys per pack = min(10, 5 × 2) = 10
			// effectiveUsable = max(1, 10) = 10
			// Tickets needed = ceil(22 / 10) = 3
			expect(result.ticketsNeeded).toBe(3);
			expect(result.monthlyCost).toBe(37.5); // 3 × 12.5
			expect(result.annualCost).toBe(325); // 26 annual tickets needed × 12.5 = 325 (based on 260 annual trips ÷ 10 effective usable per pack)
			expect(result.journeysWasted).toBe(0); // (3 × 10) - (3 × 10) = 0
			expect(result.calculation).toContain("3× series");
		});

		it("should handle high trip frequency with series tickets", () => {
			const testService = new PriceService();
			const seriesTicket = { price: 12.5, journeys: 10, validityDays: 14 };
			const result = testService.calculateSeriesTicketCost(20, seriesTicket);

			// 20 trips/week × 4.33 weeks/month = 86.6 trips/month, rounded up to 87
			// 14 days = 2 weeks, so usable journeys per pack = min(10, 20 × 2) = 10
			// Tickets needed = ceil(87 / 10) = 9
			expect(result.ticketsNeeded).toBe(9);
			expect(result.monthlyCost).toBe(112.5); // 9 × 12.5
			expect(result.annualCost).toBe(1300); // 104 annual tickets needed × 12.5 = 1300 (based on 1040 annual trips ÷ 10 effective usable per pack)
		});

		it("should handle low trip frequency efficiently", () => {
			const testService = new PriceService();
			const seriesTicket = { price: 12.5, journeys: 10, validityDays: 14 };
			const result = testService.calculateSeriesTicketCost(1, seriesTicket);

			// 1 trip/week × 4.33 weeks/month = 4.33 trips/month, rounded up to 5
			// 14 days = 2 weeks, so usable journeys per pack = min(10, 1 × 2) = 2
			// Tickets needed = ceil(5 / 2) = 3
			expect(result.ticketsNeeded).toBe(3);
			expect(result.monthlyCost).toBe(37.5); // 3 × 12.5
		});

		it("should handle zero trips per week", () => {
			const testService = new PriceService();
			const seriesTicket = { price: 12.5, journeys: 10, validityDays: 14 };
			const result = testService.calculateSeriesTicketCost(0, seriesTicket);

			expect(result.monthlyCost).toBe(0);
			expect(result.annualCost).toBe(0);
			expect(result.ticketsNeeded).toBe(0);
			expect(result.journeysWasted).toBe(0);
			expect(result.calculation).toBe("No trips - no cost");
		});

		it("should warn about significant waste when validity limits cause waste", () => {
			const testService = new PriceService();
			const seriesTicket = { price: 12.5, journeys: 10, validityDays: 7 }; // Only 1 week validity
			const result = testService.calculateSeriesTicketCost(2, seriesTicket);

			// 2 trips/week × 4.33 weeks/month = 8.66 trips/month, rounded up to 9
			// 7 days = 1 week, so usable journeys per pack = min(10, 2 × 1) = 2
			// effectiveUsable = max(1, 2) = 2
			// Tickets needed = ceil(9 / 2) = 5
			// Total capacity = 5 × 10 = 50, usable = 5 × 2 = 10, waste = 40
			// Waste ratio = 40/50 = 80% ≥ 20%
			expect(result.wasteWarning).toBeDefined();
			expect(result.wasteWarning).toContain("Significant waste expected");
			expect(result.journeysWasted).toBe(40);
		});

		it("should not warn about waste when usage is efficient", () => {
			const testService = new PriceService();
			const seriesTicket = { price: 12.5, journeys: 10, validityDays: 30 }; // 4+ weeks validity
			const result = testService.calculateSeriesTicketCost(5, seriesTicket);

			// 5 trips/week × 4.33 weeks/month = 21.65 trips/month, rounded up to 22
			// 30 days = 4.3 weeks, so usable journeys per pack = min(10, 5 × 4.3) = 10
			// effectiveUsable = max(1, 10) = 10
			// Tickets needed = ceil(22 / 10) = 3
			// Total capacity = 3 × 10 = 30, usable = 3 × 10 = 30, waste = 0
			// Waste ratio = 0/30 = 0% < 20%, so no warning
			expect(result.wasteWarning).toBeUndefined();
			expect(result.journeysWasted).toBe(0);
		});

		it("should throw error for negative trips per week", () => {
			const testService = new PriceService();
			const seriesTicket = { price: 12.5, journeys: 10, validityDays: 14 };
			expect(() =>
				testService.calculateSeriesTicketCost(-1, seriesTicket),
			).toThrow("Trips per week must be greater than or equal to 0");
		});

		it("should throw error for invalid series ticket configuration", () => {
			const testService = new PriceService();
			expect(() =>
				testService.calculateSeriesTicketCost(5, {
					price: 0,
					journeys: 10,
					validityDays: 14,
				}),
			).toThrow("Invalid series ticket configuration");
			expect(() =>
				testService.calculateSeriesTicketCost(5, {
					price: 12.5,
					journeys: 0,
					validityDays: 14,
				}),
			).toThrow("Invalid series ticket configuration");
			expect(() =>
				testService.calculateSeriesTicketCost(5, {
					price: 12.5,
					journeys: 10,
					validityDays: 0,
				}),
			).toThrow("Invalid series ticket configuration");
		});

		it("should handle edge case of very high trip frequency", () => {
			const testService = new PriceService();
			const seriesTicket = { price: 12.5, journeys: 10, validityDays: 14 };
			const result = testService.calculateSeriesTicketCost(100, seriesTicket);

			// 100 trips/week × 4.33 weeks/month = 433 trips/month
			// 14 days = 2 weeks, so usable journeys per pack = min(10, 100 × 2) = 10
			// Tickets needed = ceil(433 / 10) = 44
			expect(result.ticketsNeeded).toBe(44);
			expect(result.monthlyCost).toBe(550); // 44 × 12.5
			expect(result.annualCost).toBe(6500); // 520 annual tickets needed × 12.5 = 6500 (based on 5200 annual trips ÷ 10 effective usable per pack)
		});
	});

	describe("calculateMonthlyTicketCost", () => {
		it("should calculate monthly ticket cost correctly", () => {
			const testService = new PriceService();
			const result = testService.calculateMonthlyTicketCost(64.7);

			expect(result.monthlyCost).toBe(64.7);
			expect(result.annualCost).toBe(776.4); // 64.7 × 12
			expect(result.calculation).toBe("Fixed €64.7/month");
		});

		it("should handle decimal prices with proper rounding", () => {
			const testService = new PriceService();
			const result = testService.calculateMonthlyTicketCost(64.75);

			expect(result.monthlyCost).toBe(64.75);
			expect(result.annualCost).toBe(777); // 64.75 × 12
		});

		it("should throw error for negative price", () => {
			const testService = new PriceService();
			expect(() => testService.calculateMonthlyTicketCost(-64.7)).toThrow(
				"Monthly ticket price must be greater than 0",
			);
		});

		it("should throw error for zero price", () => {
			const testService = new PriceService();
			expect(() => testService.calculateMonthlyTicketCost(0)).toThrow(
				"Monthly ticket price must be greater than 0",
			);
		});
	});

	describe("calculateContinuousMonthlyTicketCost", () => {
		it("should calculate continuous monthly with default discount", () => {
			const testService = new PriceService();
			const result = testService.calculateContinuousMonthlyTicketCost(64.7);

			// Default 5% discount: 64.7 × 0.95 = 61.465, rounded to 61.47
			expect(result.monthlyCost).toBe(61.47);
			expect(result.annualCost).toBe(737.64); // 61.47 × 12
			expect(result.calculation).toContain("5% discount");
		});

		it("should use provided continuous monthly price when available", () => {
			const testService = new PriceService();
			const result = testService.calculateContinuousMonthlyTicketCost(
				64.7,
				58.0,
			);

			expect(result.monthlyCost).toBe(58.0);
			expect(result.annualCost).toBe(696); // 58.0 × 12
			expect(result.calculation).toBe("Fixed €58/month");
		});

		it("should handle custom discount ratio", () => {
			const testService = new PriceService();
			const result = testService.calculateContinuousMonthlyTicketCost(
				64.7,
				undefined,
				0.1,
			); // 10% discount

			// 10% discount: 64.7 × 0.9 = 58.23, rounded to 58.23
			expect(result.monthlyCost).toBe(58.23);
			expect(result.annualCost).toBe(698.76); // 58.23 × 12
			expect(result.calculation).toContain("10% discount");
		});

		it("should prioritize provided price over calculated discount", () => {
			const testService = new PriceService();
			const result = testService.calculateContinuousMonthlyTicketCost(
				64.7,
				58.0,
				0.15,
			); // 15% discount

			// Should use provided price 55.0, not calculated 64.7 × 0.85 = 54.995
			expect(result.monthlyCost).toBe(58.0);
			expect(result.calculation).toBe("Fixed €58/month");
		});

		it("should throw error for negative price", () => {
			const testService = new PriceService();
			expect(() =>
				testService.calculateContinuousMonthlyTicketCost(-64.7),
			).toThrow("Monthly ticket price must be greater than 0");
		});

		it("should throw error for zero price", () => {
			const testService = new PriceService();
			expect(() => testService.calculateContinuousMonthlyTicketCost(0)).toThrow(
				"Monthly ticket price must be greater than 0",
			);
		});
	});

	describe("findOptimalOption", () => {
		it("should find optimal option among all ticket types", () => {
			const testService = new PriceService();
			const prices = {
				single: 3.2,
				series10: { price: 12.5, journeys: 10, validityDays: 14 },
				season: 107.7,
				continuousMonthly: 58.0,
			};
			const result = testService.findOptimalOption(5, prices);

			// Single: 5 trips/week × 4.33 weeks/month = 21.65 trips/month, rounded up to 22
			// Single cost: 22 × 3.2 = 70.4
			// Series: 22 trips/month, usable 10 per pack, need 3 tickets = 3 × 12.5 = 37.5
			// Season: 107.70
			// Continuous: 58.0
			// Optimal should be series10 at 37.5
			expect(result.optimal).toBe("series10");
			expect(result.single.monthlyCost).toBe(70.4);
			expect(result.series10!.monthlyCost).toBe(37.5);
			expect(result.season.monthlyCost).toBe(107.7);
			expect(result.continuousMonthly.monthlyCost).toBe(58.0);
		});

		it("should handle case where single tickets are cheapest", () => {
			const testService = new PriceService();
			const prices = {
				single: 1.0, // Very cheap single tickets
				series10: { price: 12.5, journeys: 10, validityDays: 14 },
				season: 107.7,
				continuousMonthly: 58.0,
			};
			const result = testService.findOptimalOption(2, prices);

			// Single: 2 trips/week × 4.33 weeks/month = 8.66 trips/month, rounded up to 9
			// Single cost: 9 × 1.0 = 9.0
			// Series: 9 trips/month, usable 10 per pack, need 1 ticket = 1 × 12.5 = 12.5
			// Season: 650.0/12 = 54.17
			// Continuous: 58.0
			// Optimal should be single at 9.0
			expect(result.optimal).toBe("single");
			expect(result.single.monthlyCost).toBe(9.0);
		});

		it("should handle case where season tickets are cheapest", () => {
			const testService = new PriceService();
			const prices = {
				single: 5.0, // Expensive single tickets
				series10: { price: 15.0, journeys: 5, validityDays: 7 }, // Expensive series
				season: 240.0, // Cheap season (240/12 = 20.0/month)
				continuousMonthly: 18.0,
			};
			const result = testService.findOptimalOption(10, prices);

			// Single: 10 trips/week × 4.33 weeks/month = 43.3 trips/month, rounded up to 44
			// Single cost: 44 × 5.0 = 220.0
			// Series: 44 trips/month, usable 5 per pack, need 9 tickets = 9 × 15.0 = 135.0
			// Season: 240.0/12 = 20.0
			// Continuous: 18.0
			// Optimal should be continuous monthly at 18.0
			expect(result.optimal).toBe("continuousMonthly");
			expect(result.continuousMonthly.monthlyCost).toBe(18.0);
		});

		it("should handle zero trips per week", () => {
			const testService = new PriceService();
			const prices = {
				single: 3.2,
				series10: { price: 12.5, journeys: 10, validityDays: 14 },
				season: 107.7,
				continuousMonthly: 58.0,
			};
			const result = testService.findOptimalOption(0, prices);

			// All costs should be 0 for zero trips
			expect(result.single.monthlyCost).toBe(0);
			expect(result.series10!.monthlyCost).toBe(0);
			expect(result.season.monthlyCost).toBe(107.7); // Season is fixed price (650/12)
			expect(result.continuousMonthly.monthlyCost).toBe(58.0); // Continuous is fixed price
			// Optimal should be single (0 cost) or series (0 cost), but single is first in array
			expect(result.optimal).toBe("single");
		});

		it("should handle tie-breaking scenarios by selecting first option", () => {
			const testService = new PriceService();
			const prices = {
				single: 3.0,
				series10: { price: 3.0, journeys: 1, validityDays: 30 }, // Same price as single
				season: 36.0, // Same price (36/12 = 3.0/month)
				continuousMonthly: 3.0, // Same price
			};
			const result = testService.findOptimalOption(1, prices);

			// Single: 1 trip/week × 4.33 weeks/month = 4.33 trips/month, rounded up to 5
			// Single cost: 5 × 3.0 = 15.0
			// Series: 5 trips/month, usable 1 per pack, need 5 tickets = 5 × 3.0 = 15.0
			// Season: 36.0 (fixed)
			// Continuous: 3.0 (fixed)
			expect(result.single.monthlyCost).toBe(15.0);
			expect(result.series10!.monthlyCost).toBe(15.0);
			expect(result.season.monthlyCost).toBe(36.0);
			expect(result.continuousMonthly.monthlyCost).toBe(3.0);
			// Continuous monthly is cheapest at 3.0 vs season at 36.0, single/series at 15.0
			expect(result.optimal).toBe("continuousMonthly");
		});

		it("should provide complete calculation details for all options", () => {
			const testService = new PriceService();
			const prices = {
				single: 3.2,
				series10: { price: 12.5, journeys: 10, validityDays: 14 },
				season: 107.7,
				continuousMonthly: 58.0,
			};
			const result = testService.findOptimalOption(5, prices);

			// Verify all calculation details are provided
			expect(result.single.calculation).toContain(
				"5 trips/week × 4.33 weeks/month",
			);
			expect(result.series10!.calculation).toContain("series");
			expect(result.season.calculation).toContain("30-day ticket");
			expect(result.continuousMonthly.calculation).toContain("Fixed €58/month");
		});

		it("should handle very high trip frequencies", () => {
			const testService = new PriceService();
			const prices = {
				single: 3.2,
				series10: { price: 12.5, journeys: 10, validityDays: 14 },
				season: 107.7,
				continuousMonthly: 58.0,
			};
			const result = testService.findOptimalOption(100, prices);

			// Single: 100 trips/week × 4.33 weeks/month = 433 trips/month, rounded up to 433
			// Single cost: 433 × 3.2 = 1385.6
			// Series: 433 trips/month, usable 10 per pack, need 44 tickets = 44 × 12.5 = 550
			// Season: 107.70
			// Continuous: 58.0
			// Season: 107.70, Continuous: 58.0 - Optimal should be continuous monthly
			expect(result.optimal).toBe("continuousMonthly");
			expect(result.single.monthlyCost).toBe(1385.6);
			expect(result.series10!.monthlyCost).toBe(550);
			expect(result.season.monthlyCost).toBe(107.7);
			expect(result.continuousMonthly.monthlyCost).toBe(58.0);
		});
	});
});
