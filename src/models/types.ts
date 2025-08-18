/**
 * @fileoverview Core data models and interfaces for HSL Ticket Optimizer
 * Defines TypeScript interfaces for strict type safety
 */

/**
 * Ticket prices fetched from HSL API
 */
export interface TicketPrices {
  single: number;
  series: SeriesTicket;
  monthly: number;
  continuousMonthly: number;
  timestamp: number;
}

/**
 * Series ticket information with validity period
 */
export interface SeriesTicket {
  price: number;
  journeys: number;
  validityDays: number;
}

/**
 * User input from the form
 */
export interface UserInput {
  selectedTicketTypes: string[];
  zones: string;
  tripsPerWeek: number;
}

/**
 * Complete calculation results for all ticket types
 */
export interface CalculationResults {
  single?: CostBreakdown;
  series?: SeriesCalculation;
  monthly?: CostBreakdown;
  continuousMonthly?: CostBreakdown;
  optimal: string;
}

/**
 * Basic cost breakdown for a ticket type
 */
export interface CostBreakdown {
  monthlyCost: number;
  calculation: string;
  annualCost: number;
}

/**
 * Extended calculation for series tickets with waste tracking
 */
export interface SeriesCalculation extends CostBreakdown {
  ticketsNeeded: number;
  journeysWasted: number;
  wasteWarning?: string;
}

/**
 * Zone option for dropdown selection
 */
export interface ZoneOption {
  value: string;
  label: string;
  description: string;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Ticket type option for form
 */
export interface TicketOption {
  type: 'single' | 'series' | 'monthly' | 'continuousMonthly';
  name: string;
  enabled: boolean;
}

/**
 * HSL API response types
 */
export interface HSLSingleResponse {
  data: {
    price: number;
    currency: string;
    zones: string;
  };
}

export interface HSLSeriesResponse {
  data: {
    price: number;
    journeys: number;
    validityDays: number;
    currency: string;
    zones: string;
  };
}

export interface HSLMonthlyResponse {
  data: {
    price: number;
    currency: string;
    zones: string;
  };
}

/**
 * Error types for API handling
 */
export type ErrorType = 'network' | 'cors' | 'invalid_response' | 'rate_limit';

/**
 * Custom API error class
 */
export class APIError extends Error {
  public type: ErrorType;
  public originalError?: Error;

  constructor(message: string, type: ErrorType, originalError?: Error) {
    super(message);
    this.type = type;
    if (originalError !== undefined) {
      this.originalError = originalError;
    }
  }
}

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  required: boolean;
  min?: number;
  max?: number;
  type?: 'integer' | 'string';
  validValues?: string[];
  minSelected?: number;
}

/**
 * Test scenario for unit testing
 */
export interface TestScenario {
  tripsPerWeek: number;
  expectedOptimal: string;
}
