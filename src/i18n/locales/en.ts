import type { TranslationMap } from "../types.js";

export const en: TranslationMap = {
  // Header
  "header.title.line1": "HSL Fare",
  "header.title.line2": "Finder",
  "header.subtitle": "Find the cheapest ticket for your commute.",
  "header.github.ariaLabel": "View source on GitHub",
  "header.theme.ariaLabel": "Toggle dark mode",

  // Form
  "form.zones.label": "Zones",
  "form.zones.placeholder": "Select zones",
  "form.municipality.label": "Municipality",
  "form.trips.label": "Trips per week",
  "form.trips.unit": "trips / week",

  // Municipalities (Finnish names, except Muu → Other)
  "municipality.helsinki": "Helsinki",
  "municipality.espoo": "Espoo",
  "municipality.vantaa": "Vantaa",
  "municipality.kauniainen": "Kauniainen",
  "municipality.kerava": "Kerava",
  "municipality.kirkkonummi": "Kirkkonummi",
  "municipality.sipoo": "Sipoo",
  "municipality.siuntio": "Siuntio",
  "municipality.tuusula": "Tuusula",
  "municipality.askola": "Askola",
  "municipality.hanko": "Hanko",
  "municipality.hausjarvi": "Hausjärvi",
  "municipality.inkoo": "Inkoo",
  "municipality.jarvenpaa": "Järvenpää",
  "municipality.karkkila": "Karkkila",
  "municipality.lohja": "Lohja",
  "municipality.loppi": "Loppi",
  "municipality.mantsala": "Mäntsälä",
  "municipality.nurmijarvi": "Nurmijärvi",
  "municipality.pornainen": "Pornainen",
  "municipality.porvoo": "Porvoo",
  "municipality.pukkila": "Pukkila",
  "municipality.raasepori": "Raasepori",
  "municipality.vihti": "Vihti",
  "municipality.muu": "Other",

  // Loading
  "loading.text": "Fetching prices from HSL...",

  // Results
  "results.bestOption": "Best Option",
  "results.allOptions": "All Options",
  "results.monthly": "Monthly",
  "results.annual": "Annual",
  "results.best": "Best",
  "results.savingsPerMonth": "Save \u20AC{amount}/mo vs most expensive",
  "results.howCalculated": "How this is calculated",
  "results.perMonth": "/mo",
  "results.savingsTotal": "Save \u20AC{amount}/mo (\u20AC{annualAmount}/yr)",

  // Ticket types
  "ticket.single.label": "Single tickets",
  "ticket.single.description": "Pay per trip",
  "ticket.season.label": "Season tickets",
  "ticket.season.description": "Annual subscription",
  "ticket.continuousMonthly.label": "Continuous monthly",
  "ticket.continuousMonthly.description": "Monthly auto-renewal",
  "ticket.series10.label": "10-trip series",
  "ticket.series10.description": "10 trips, 30-day validity",
  "ticket.series20.label": "20-trip series",
  "ticket.series20.description": "20 trips, 60-day validity",

  // Charts
  "chart.monthlyCost": "Monthly Cost",
  "chart.costVsTrips": "Cost vs. Trips",
  "chart.monthlyCostLabel": "Monthly Cost (\u20AC)",
  "chart.euroPerMonth": "\u20AC / month",
  "chart.tripsPerWeek": "Trips per week",
  "chart.euroPerMonthAxis": "\u20AC per month",
  "chart.single": "Single",
  "chart.season": "Season",
  "chart.continuous": "Continuous",
  "chart.series10": "Series 10",
  "chart.series20": "Series 20",

  // Footer
  "footer.disclaimer": "Prices from HSL. Estimates for comparison only.",

  // Calculations
  "calc.noTrips": "No trips - no cost",
  "calc.single":
    "{trips} trips/week \u00D7 {weeks} weeks/month = {tripsMonth} trips/month \u00D7 \u20AC{price} = \u20AC{cost}/month",
  "calc.series":
    "{count}\u00D7 series ({journeys} journeys, {days} days) with ~{usable} usable per pack \u2192 \u20AC{cost}/month",
  "calc.fixedMonthly": "Fixed \u20AC{cost}/month",
  "calc.discountMonthly":
    "Monthly (\u20AC{price}) with {discount}% discount = \u20AC{cost}/month",
  "calc.season": "30-day ticket: \u20AC{cost}/month",
  "calc.wasteWarning":
    "~{wasted} of {total} trips may expire unused due to validity limits.",

  // Errors
  "error.unexpected": "Unexpected error occurred while calculating",
  "error.network":
    "Unable to connect to HSL services. Please check your internet connection and try again.",
  "error.cors":
    "Browser security settings are blocking the request. Please try refreshing the page.",
  "error.invalidResponse":
    "Received invalid data from HSL services. Please try again later.",
  "error.rateLimit":
    "Too many requests. Please wait a moment before trying again.",
  "error.unknown": "An unexpected error occurred. Please try again.",

  // Meta
  "meta.title": "HSL Fare Finder \u2014 Cheapest Ticket for Your Commute",
  "meta.description":
    "Compare HSL single, series, season, and monthly tickets side by side. Enter your zones and trips to instantly see which Helsinki Region transport pass saves you the most money.",
};
