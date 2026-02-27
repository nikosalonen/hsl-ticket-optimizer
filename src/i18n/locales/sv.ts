import type { TranslationMap } from "../types.js";

export const sv: TranslationMap = {
  // Header
  "header.title.line1": "HRT-biljett",
  "header.title.line2": "kalkylator",
  "header.subtitle": "Hitta den billigaste biljetten för din pendling.",
  "header.github.ariaLabel": "Visa källkoden på GitHub",
  "header.theme.ariaLabel": "Växla mörkt/ljust läge",

  // Form
  "form.zones.label": "Zoner",
  "form.zones.placeholder": "Välj zoner",
  "form.municipality.label": "Hemkommun",
  "form.trips.label": "Resor per vecka",
  "form.trips.unit": "resor / vecka",
  "form.vacation.label": "Sommarsemester (4 veckor utan resor)",
  "form.vacation.description": "Minskar årskostnaden med en månad",

  // Municipalities (Swedish names)
  "municipality.helsinki": "Helsingfors",
  "municipality.espoo": "Esbo",
  "municipality.vantaa": "Vanda",
  "municipality.kauniainen": "Grankulla",
  "municipality.kerava": "Kervo",
  "municipality.kirkkonummi": "Kyrkslätt",
  "municipality.sipoo": "Sibbo",
  "municipality.siuntio": "Sjundeå",
  "municipality.tuusula": "Tusby",
  "municipality.askola": "Askola",
  "municipality.hanko": "Hangö",
  "municipality.hausjarvi": "Hausjärvi",
  "municipality.inkoo": "Ingå",
  "municipality.jarvenpaa": "Träskända",
  "municipality.karkkila": "Högfors",
  "municipality.lohja": "Lojo",
  "municipality.loppi": "Loppi",
  "municipality.mantsala": "Mäntsälä",
  "municipality.nurmijarvi": "Nurmijärvi",
  "municipality.pornainen": "Borgnäs",
  "municipality.porvoo": "Borgå",
  "municipality.pukkila": "Pukkila",
  "municipality.raasepori": "Raseborg",
  "municipality.vihti": "Vichtis",
  "municipality.muu": "Övrig",

  // Loading
  "loading.text": "Hämtar priser från HRT...",

  // Results
  "results.bestOption": "Bästa alternativet",
  "results.allOptions": "Alla alternativ",
  "results.monthly": "Månad",
  "results.annual": "År",
  "results.best": "Bäst",
  "results.savingsPerMonth": "Spara \u20AC{amount}/mån jämfört med dyraste",
  "results.howCalculated": "Så här räknas detta",
  "results.perMonth": "/mån",
  "results.savingsTotal": "Spara \u20AC{amount}/mån (\u20AC{annualAmount}/år)",

  // Ticket types
  "ticket.single.label": "Enkelbiljett",
  "ticket.single.description": "Betala per resa",
  "ticket.season.label": "Periodbiljett",
  "ticket.season.description": "Årsabonnemang",
  "ticket.continuousMonthly.label": "Fortlöpande månad",
  "ticket.continuousMonthly.description": "Månatlig automatisk förnyelse",
  "ticket.series10.label": "Seriebiljett 10",
  "ticket.series10.description": "10 resor, 30 dagars giltighet",
  "ticket.series20.label": "Seriebiljett 20",
  "ticket.series20.description": "20 resor, 60 dagars giltighet",

  // Charts
  "chart.monthlyCost": "Månadskostnad",
  "chart.costVsTrips": "Kostnad vs. resor",
  "chart.monthlyCostLabel": "Månadskostnad (\u20AC)",
  "chart.euroPerMonth": "\u20AC / månad",
  "chart.tripsPerWeek": "Resor per vecka",
  "chart.euroPerMonthAxis": "\u20AC per månad",
  "chart.single": "Enkelbiljett",
  "chart.season": "Periodbiljett",
  "chart.continuous": "Fortlöpande",
  "chart.series10": "Seriebiljett 10",
  "chart.series20": "Seriebiljett 20",

  // Footer
  "footer.disclaimer": "Priser från HRT. Uppskattningar endast för jämförelse.",

  // Calculations
  "calc.noTrips": "Inga resor \u2013 ingen kostnad",
  "calc.single":
    "{trips} resor/vecka \u00D7 {weeks} veckor/mån = {tripsMonth} resor/mån \u00D7 \u20AC{price} = \u20AC{cost}/mån",
  "calc.series":
    "{count}\u00D7 seriebiljett ({journeys} resor, {days} dagar) ~{usable} användbara/paket \u2192 \u20AC{cost}/mån",
  "calc.fixedMonthly": "Fast \u20AC{cost}/mån",
  "calc.discountMonthly":
    "Månad (\u20AC{price}) med {discount}% rabatt = \u20AC{cost}/mån",
  "calc.season": "30-dagars biljett: \u20AC{cost}/mån",
  "calc.wasteWarning":
    "~{wasted} av {total} resor kan förfalla oanvända på grund av giltighetsbegränsningar.",

  // Errors
  "error.unexpected": "Oväntat fel vid beräkning",
  "error.network":
    "Kan inte ansluta till HRT:s tjänster. Kontrollera din internetanslutning och försök igen.",
  "error.cors":
    "Webbläsarens säkerhetsinställningar blockerar begäran. Försök att uppdatera sidan.",
  "error.invalidResponse":
    "Ogiltig data mottagen från HRT:s tjänster. Försök igen senare.",
  "error.rateLimit": "För många förfrågningar. Vänta en stund och försök igen.",
  "error.unknown": "Ett oväntat fel inträffade. Försök igen.",

  // Meta
  "meta.title":
    "HRT-biljettkalkylator \u2014 Billigaste biljetten för din pendling",
  "meta.description":
    "Jämför HRT:s enkelbiljetter, seriebiljetter, periodbiljetter och månadsbiljetter. Ange dina zoner och resor för att hitta det billigaste alternativet.",
};
