# Requirements Document

## Introduction

This feature is a single-page application (SPA) that helps users determine the most cost-effective HSL public transport ticket option based on their travel patterns. The application will compare single-use tickets, series tickets (sarjalippu), monthly tickets, and continuous monthly ticket orders by fetching real-time pricing data from the HSL API and calculating costs based on user input regarding their weekly travel frequency.

## Technical Context and Constraints

- **Platform**: Single-page web application deployed on GitHub Pages
- **API Integration**: HSL CMS API (https://cms.hsl.fi/api/v1/tickets/)
- **Browser Support**: Modern browsers with ES6+ support
- **CORS Handling**: Client-side only, must work with HSL API CORS policies
- **No Backend**: Pure frontend solution with no server-side processing

## Assumptions and Dependencies

- HSL API remains publicly accessible and maintains current endpoint structure
- HSL API provides accurate, up-to-date pricing information
- Users have basic understanding of HSL zone system
- Calculation period is monthly (4.33 weeks average)
- Series tickets (sarjalippu) have standard validity periods as per HSL policies

## Out of Scope

- User authentication or personal data storage
- Integration with HSL's actual ticket purchasing system
- Support for special discount categories (student, senior, etc.)
- Multi-language support beyond Finnish
- Mobile app development
- Annual or custom period calculations

## Glossary

- **Sarjalippu**: HSL series ticket with multiple single journeys and validity period
- **Continuous Monthly Order**: Subscription-based monthly ticket that auto-renews
- **Zone**: HSL's geographical pricing zones (A, B, C, D, etc.)
- **Customer Group**: HSL's pricing categories (adult, child, etc.)

## Requirements

### Requirement 1 (Must Have)

**User Story:** As a public transport user, I want to input my travel patterns and ticket preferences, so that I can find the most cost-effective ticket option for my needs.

#### Acceptance Criteria

1. WHEN the user accesses the application THEN the system SHALL display a form with clearly labeled input fields for ticket type selection, zone selection, and weekly trip frequency
2. WHEN the user selects ticket types THEN the system SHALL allow multiple selection from: single-use tickets, series tickets (sarjalippu), monthly tickets, and continuous monthly ticket orders
3. WHEN the user enters weekly trip frequency THEN the system SHALL accept integer values between 1-50 trips per week, SHALL validate input is numeric, SHALL display error message for invalid input
4. WHEN the user selects zones THEN the system SHALL provide dropdown selection for HSL zones (AB, ABC, ABCD, BCD, CD, D) with clear zone descriptions
5. WHEN the user submits incomplete form data THEN the system SHALL highlight missing required fields and prevent form submission

### Requirement 2 (Must Have)

**User Story:** As a user, I want the application to fetch current HSL ticket prices, so that I receive accurate cost comparisons based on real-time pricing.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL fetch current ticket prices from HSL API endpoints for single, series, monthly, and continuous monthly tickets
2. WHEN fetching prices THEN the system SHALL request data for customer group 1 (adult) and all relevant zone combinations
3. WHEN API requests fail THEN the system SHALL display user-friendly error message "Unable to fetch current prices. Please try again later." and disable calculation functionality
4. WHEN prices are successfully fetched THEN the system SHALL cache the data in browser storage for 1 hour to minimize API calls
5. WHEN cached data expires THEN the system SHALL automatically refresh prices on next user interaction

### Requirement 3 (Must Have)

**User Story:** As a user, I want to see cost calculations for different ticket options, so that I can make an informed decision about which ticket type to purchase.

#### Acceptance Criteria

1. WHEN the user submits their travel pattern THEN the system SHALL calculate the total monthly cost (4.33 weeks) for each selected ticket type
2. WHEN calculating series ticket costs THEN the system SHALL consider the 14-day validity period and calculate how many series tickets are needed per month
3. WHEN calculating single ticket costs THEN the system SHALL multiply weekly trips by 4.33 and by single ticket price
4. WHEN displaying results THEN the system SHALL highlight the most cost-effective option with green background and "Best Value" label
5. WHEN showing calculations THEN the system SHALL display itemized breakdown: "X trips/week × 4.33 weeks × €Y = €Z per month"
6. WHEN series tickets would expire unused THEN the system SHALL factor in the waste cost and display warning message

### Requirement 4

**User Story:** As a user, I want the application to work reliably on GitHub Pages, so that I can access it easily without complex deployment requirements.

#### Acceptance Criteria

1. WHEN the application is deployed THEN the system SHALL function correctly on GitHub Pages static hosting
2. WHEN users access the site THEN the system SHALL handle CORS requirements for HSL API calls
3. WHEN the application loads THEN the system SHALL work without server-side dependencies
4. WHEN deployed THEN the system SHALL be accessible via HTTPS on the GitHub Pages domain

### Requirement 5

**User Story:** As a developer, I want comprehensive tests for the application, so that I can ensure reliability and maintainability of the cost calculation logic.

#### Acceptance Criteria

1. WHEN running tests THEN the system SHALL include unit tests for cost calculation functions
2. WHEN testing API integration THEN the system SHALL include tests for HSL API data fetching and error handling
3. WHEN testing user interactions THEN the system SHALL include tests for form validation and user input handling
4. WHEN running the test suite THEN the system SHALL achieve adequate code coverage for critical functionality

### Requirement 6 (Must Have)

**User Story:** As a user, I want accurate handling of different ticket validity periods, so that the cost comparisons reflect real-world usage scenarios.

#### Acceptance Criteria

1. WHEN calculating series ticket costs THEN the system SHALL account for 14-day validity period and calculate minimum tickets needed to cover monthly usage
2. WHEN comparing monthly tickets THEN the system SHALL use fixed monthly price regardless of actual usage
3. WHEN evaluating continuous monthly orders THEN the system SHALL use the subscription price (typically lower than regular monthly)
4. WHEN a user's weekly trips would result in unused series ticket journeys THEN the system SHALL include this waste in the total cost calculation
5. WHEN trips per week is very low (1-2) THEN the system SHALL recommend single tickets and show warning about series ticket waste

### Requirement 7 (Should Have)

**User Story:** As a user, I want to understand edge cases and limitations, so that I can make informed decisions about my ticket choice.

#### Acceptance Criteria

1. WHEN user enters 0 trips per week THEN the system SHALL display message "Please enter at least 1 trip per week"
2. WHEN calculation shows series tickets expiring unused THEN the system SHALL display warning "X journeys may expire unused"
3. WHEN monthly ticket is always cheaper regardless of usage THEN the system SHALL display "Monthly ticket recommended for any usage level"
4. WHEN prices are older than 24 hours THEN the system SHALL display disclaimer "Prices may not be current"

### Requirement 8 (Nice to Have)

**User Story:** As a user, I want additional insights about my travel patterns, so that I can optimize my transport costs further.

#### Acceptance Criteria

1. WHEN displaying results THEN the system SHALL show break-even point "Monthly ticket pays off after X trips per week"
2. WHEN series tickets are optimal THEN the system SHALL show "Buy X series tickets per month"
3. WHEN results are displayed THEN the system SHALL show annual cost projection for each option

## Risks and Mitigations

- **Risk**: HSL API changes or becomes unavailable
  - **Mitigation**: Implement graceful error handling and consider fallback pricing data
- **Risk**: CORS issues with HSL API on GitHub Pages
  - **Mitigation**: Test API access early and implement proxy solution if needed
- **Risk**: Complex series ticket validity calculations
  - **Mitigation**: Create comprehensive test cases for edge scenarios
