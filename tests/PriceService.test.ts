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
	tickets: [
		{
			id: "season-ticket-id",
			ticketType: 5,
			title: "Kausilippu",
			price: 650.0,
			salePrice: null,
			pricePerDay: 1.78,
			durationMinutes: 0,
			durationDays: 365,
			customerGroup: 1,
			zones: 11,
			pointsOfSale: [],
			_data: [
				{
					productId: "season-ticket-id",
					productSku: "season-adult-personal-AB",
					hslProductId: "season",
					productGroup: "season",
					customerGroup: "adult",
					usage: "personal",
					billingModel: "season",
					validityArea: "AB",
					residence: null,
					pricingPlanId: null,
					pricingPlanTitle: null,
					price: 650.0,
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

			const result = await priceService.fetchTicketPrices("11", 1);

			expect(result.single).toBe(2.95);
			expect(result.series).toEqual({
				price: 28.8,
				journeys: 10,
				validityDays: 30,
			}); // Hardcoded AB pricing
			expect(result.daily).toBe(9.5);
			expect(result.monthly).toBe(64.7);
			expect(result.continuousMonthly).toBe(61.47); // 5% discount applied
			expect(result.season).toEqual({
				price: 650.0,
				durationDays: 365,
				type: "season",
			});
			expect(result.saverSubscription).toBe(580.0);
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

			expect(mockFetch).toHaveBeenCalledWith(
				"https://cms.hsl.fi/api/v1/tickets/monthly?language=fi&customerGroup=1&zones=11",
				expect.any(Object),
			);

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
		it("should apply discount to monthly price for continuous monthly", async () => {
			mockCacheManager.get.mockReturnValue(null);

			const monthlyPrice = 64.7;
			const expectedContinuousPrice =
				Math.round(monthlyPrice * 0.95 * 100) / 100;

			// Create a monthly response with the test price
			const testMonthlyResponse = {
				tickets: [
					{
						id: "monthly-ticket",
						ticketType: 3,
						title: "Kuukausilippu",
						price: monthlyPrice,
						salePrice: null,
						pricePerDay: 2.16,
						durationMinutes: 0,
						durationDays: 30,
						customerGroup: 1,
						zones: 11,
						pointsOfSale: [],
						_data: [
							{
								productId: "monthly-ticket",
								productSku: "monthly-ticket-sku",
								hslProductId: "monthly",
								productGroup: "monthly",
								customerGroup: "adult",
								usage: "personal",
								billingModel: "monthly",
								validityArea: "AB",
								residence: null,
								pricingPlanId: null,
								pricingPlanTitle: null,
								price: monthlyPrice,
								validFrom: "2025-01-01T00:00:00",
								validUntil: "2027-12-31T23:59:59",
								purchaseMethod: null,
								durationDays: 30,
								purchaseMethods: ["app"],
							},
						],
					},
				],
			};

			// Mock all endpoints with successful responses (6 calls total)
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
					json: () => Promise.resolve(testMonthlyResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(testMonthlyResponse),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockSeasonResponse),
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

		const result1 = await priceService.fetchTicketPrices("11", 1);

		expect(result1.single).toBe(2.95);
		expect(result1.series.price).toBe(28.8); // Hardcoded AB pricing
		expect(result1.daily).toBe(9.5);
		expect(result1.monthly).toBe(64.7);
		expect(mockCacheManager.set).toHaveBeenCalled();

		// Second call - cache hit
		mockCacheManager.get.mockReturnValueOnce(result1);

		const result2 = await priceService.fetchTicketPrices("11", 1);
		expect(result2).toEqual(result1);

		// Should not make additional API calls
		expect(mockFetch).toHaveBeenCalledTimes(6); // Only from first call (no series API)
	});
});

describe("PriceService utility methods", () => {
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
});
