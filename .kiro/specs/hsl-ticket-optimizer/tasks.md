# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Create Vite-based project with modern JavaScript setup
  - Configure package.json with necessary dependencies (Vitest)
  - Set up basic HTML structure and CSS reset
  - Create directory structure: src/, tests/, public/
  - _Requirements: 4.3, 4.4_

- [ ] 2. Implement core data models and interfaces
  - Create TypeScript-style interfaces as JSDoc comments for type safety
  - Define TicketPrices, UserInput, CalculationResults interfaces
  - Create constants for zone options and validation rules
  - _Requirements: 1.4, 6.1_

- [ ] 3. Build Cache Manager utility
  - Implement localStorage wrapper with TTL support
  - Create methods for get, set, isExpired, and clear operations
  - Add error handling for localStorage quota exceeded
  - Write unit tests for cache functionality
  - _Requirements: 2.4, 2.5_

- [ ] 4. Create Price Service for HSL API integration
  - Implement fetchTicketPrices method with proper error handling
  - Create methods for different ticket types (single, series, monthly)
  - Integrate with Cache Manager for price caching
  - Add CORS error detection and user-friendly error messages
  - Write unit tests with mocked API responses
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 5. Implement Calculation Engine core logic
- [ ] 5.1 Implement single ticket cost calculations
  - Create calculateSingleTicketCost method (trips/week × 4.33 × price)
  - Handle edge cases for very low and high trip frequencies
  - Write unit tests for single ticket calculation scenarios
  - _Requirements: 3.1, 3.3_

- [ ] 5.2 Implement series ticket cost calculations with validity logic
  - Create calculateSeriesTicketCost with 14-day validity period handling
  - Calculate minimum series tickets needed to cover monthly usage
  - Implement journey waste detection and cost calculation
  - Write unit tests for validity overlap scenarios and waste calculations
  - _Requirements: 3.2, 6.1, 6.4_

- [ ] 5.3 Implement monthly and continuous monthly calculations
  - Add calculateMonthlyTicketCost method for fixed monthly pricing
  - Create calculateContinuousMonthly with subscription discount logic
  - Write comparison tests between monthly options
  - _Requirements: 6.2, 6.3_

- [ ] 5.4 Create optimal option selection logic
  - Implement findOptimalOption method to determine best value
  - Add logic to handle tie-breaking scenarios
  - Write unit tests for optimal selection with various trip patterns
  - _Requirements: 3.4, 3.5_

- [ ] 6. Build Form Handler with validation
  - Create HTML form with ticket type checkboxes, zone dropdown, trips input
  - Implement input validation (1-50 trips, required fields)
  - Add real-time validation feedback with error messages
  - Create form submission handler that prevents invalid submissions
  - Write tests for form validation logic
  - _Requirements: 1.1, 1.3, 1.5, 7.1_

- [ ] 7. Create Results Formatter for displaying calculations
  - Implement formatResults method to create results HTML
  - Add formatCostBreakdown to show "X trips/week × 4.33 weeks × €Y = €Z"
  - Create highlightOptimalOption to mark best value with green styling
  - Implement series ticket waste warning display
  - Write tests for result formatting functions
  - _Requirements: 3.4, 3.5, 3.6, 6.5, 7.2_

- [ ] 8. Integrate all components in main application
  - Create main App class that coordinates all components
  - Wire form submission to trigger price fetching and calculations
  - Connect calculation results to results formatter
  - Add loading states and error handling UI
  - Implement application initialization and event binding
  - _Requirements: 1.1, 1.2, 3.1_

- [ ] 9. Add comprehensive error handling and edge cases
  - Implement network error handling with user-friendly messages
  - Add handling for API rate limiting and CORS issues
  - Create fallback behavior when prices cannot be fetched
  - Add warnings for series ticket waste scenarios
  - Write integration tests for error scenarios
  - _Requirements: 2.3, 6.5, 7.1, 7.2, 7.3_

- [ ] 10. Create responsive CSS styling
  - Design mobile-first responsive layout using CSS Grid/Flexbox
  - Style form elements with clear labels and validation states
  - Create results display with clear cost breakdowns and highlighting
  - Add loading spinners and error message styling
  - Ensure accessibility with proper ARIA labels and focus management
  - _Requirements: 1.1, 3.4, 3.5_

- [ ] 11. Write comprehensive test suite
  - Create unit tests for all calculation edge cases (low/high trip counts)
  - Add integration tests for complete user workflows
  - Mock HSL API responses for consistent testing
  - Test form validation with various invalid inputs
  - Achieve adequate code coverage for critical calculation logic
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 12. Set up GitHub Pages deployment
  - Configure Vite build for GitHub Pages with correct base path
  - Create GitHub Actions workflow for automated deployment
  - Add build step that runs tests before deployment
  - Configure proper HTTPS and static file serving
  - Test deployment process and verify functionality
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 13. Add enhanced user experience features
  - Implement break-even point calculations ("Monthly pays off after X trips")
  - Add annual cost projections for each ticket option
  - Create "Buy X series tickets per month" recommendations
  - Add price freshness indicators and manual refresh option
  - Write tests for enhanced calculation features
  - _Requirements: 8.1, 8.2, 8.3, 7.4_

## Definition of Done for Each Task

Each task is considered complete when:
- [ ] Code is written and functioning correctly
- [ ] Unit tests are written and passing (where applicable)
- [ ] No console errors or warnings in browser
- [ ] Code follows consistent formatting and naming conventions
- [ ] Accessibility requirements are met (proper ARIA labels, keyboard navigation)
- [ ] Error handling is implemented for expected failure scenarios
- [ ] Documentation/comments are added for complex logic
