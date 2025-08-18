/**
 * @fileoverview Constants for HSL Ticket Optimizer
 * Contains zone options, validation rules, and other application constants
 */

import type {
	ErrorType,
	TestScenario,
	TicketOption,
	TicketPrices,
	ValidationRule,
	ZoneOption,
} from "./types.js";

/**
 * Available HSL zone combinations
 */
export const ZONE_OPTIONS: ZoneOption[] = [
	{
		value: "12",
		label: "AB",
		description: "Helsinki, Espoo, Vantaa, Kauniainen",
	},
	{
		value: "123",
		label: "ABC",
		description: "AB + Kerava, Kirkkonummi, Sipoo",
	},
	{
		value: "1234",
		label: "ABCD",
		description: "ABC + Tuusula, Nurmijärvi",
	},
	{
		value: "234",
		label: "BCD",
		description:
			"Espoo, Vantaa + Kerava, Kirkkonummi, Sipoo, Tuusula, Nurmijärvi",
	},
	{
		value: "34",
		label: "CD",
		description: "Kerava, Kirkkonummi, Sipoo, Tuusula, Nurmijärvi",
	},
	{
		value: "4",
		label: "D",
		description: "Tuusula, Nurmijärvi",
	},
] as const;

/**
 * Available ticket types
 */
export const TICKET_OPTIONS: TicketOption[] = [
	{
		type: "single",
		name: "Single tickets",
		enabled: true,
	},
	{
		type: "series",
		name: "Series tickets (sarjalippu)",
		enabled: true,
	},
	{
		type: "monthly",
		name: "Monthly ticket",
		enabled: true,
	},
	{
		type: "continuousMonthly",
		name: "Continuous monthly order",
		enabled: true,
	},
] as const;

/**
 * Form validation rules
 */
export const VALIDATION_RULES: Record<string, ValidationRule> = {
	tripsPerWeek: {
		required: true,
		min: 1,
		max: 50,
		type: "integer",
	},
	zones: {
		required: true,
		validValues: ["12", "123", "1234", "234", "34", "4"],
	},
	ticketTypes: {
		required: true,
		minSelected: 1,
	},
} as const;

/**
 * Validation error messages
 */
export const VALIDATION_ERROR_MESSAGES: Record<
	string,
	Record<string, string>
> = {
	tripsPerWeek: {
		required: "Please enter the number of trips per week",
		min: "Minimum 1 trip per week required",
		max: "Maximum 50 trips per week allowed",
		type: "Please enter a valid number",
	},
	zones: {
		required: "Please select a zone",
		invalid: "Please select a valid zone",
	},
	ticketTypes: {
		required: "Please select at least one ticket type to compare",
		minSelected: "At least one ticket type must be selected",
	},
} as const;

/**
 * Application constants
 */
export const APP_CONSTANTS = {
	// Average weeks per month for calculations
	WEEKS_PER_MONTH: 4.33,

	// Cache duration in milliseconds (1 hour)
	CACHE_DURATION: 60 * 60 * 1000,

	// HSL API customer group for adults
	CUSTOMER_GROUP: 1,

	// Series ticket validity period in days
	SERIES_VALIDITY_DAYS: 14,

	// API language
	API_LANGUAGE: "fi",
} as const;

/**
 * Error messages for user display
 */
export const ERROR_MESSAGES: Record<ErrorType | string, string> = {
	network:
		"Unable to connect to HSL services. Please check your internet connection.",
	cors: "Browser security settings are blocking the request. Please try refreshing the page.",
	invalid_response:
		"Received invalid data from HSL services. Please try again later.",
	rate_limit: "Too many requests. Please wait a moment before trying again.",
	generic: "Unable to fetch current prices. Please try again later.",
	no_trips: "Please enter at least 1 trip per week",
	cache_expired: "Prices may not be current",
} as const;

/**
 * CSS class names for styling
 */
export const CSS_CLASSES = {
	optimal: "optimal-option",
	warning: "warning-message",
	error: "error-message",
	loading: "loading",
	hidden: "hidden",
} as const;

/**
 * Mock data for testing
 */
export const MOCK_PRICES: Record<string, TicketPrices> = {
	zones12: {
		single: 2.95,
		series: { price: 27.0, journeys: 10, validityDays: 14 },
		daily: 9.5,
		monthly: 64.7,
		continuousMonthly: 61.5,
		season: { price: 650.0, durationDays: 365, type: "season" },
		saverSubscription: 580.0,
		timestamp: Date.now(),
	},
} as const;

/**
 * Test scenarios for unit testing
 */
export const TEST_SCENARIOS: TestScenario[] = [
	{ tripsPerWeek: 2, expectedOptimal: "single" },
	{ tripsPerWeek: 8, expectedOptimal: "series" },
	{ tripsPerWeek: 15, expectedOptimal: "monthly" },
	{ tripsPerWeek: 20, expectedOptimal: "continuousMonthly" },
] as const;
