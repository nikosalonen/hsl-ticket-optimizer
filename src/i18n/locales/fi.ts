import type { TranslationMap } from "../types.js";

export const fi: TranslationMap = {
  // Header
  "header.title.line1": "HSL-lippu",
  "header.title.line2": "laskuri",
  "header.subtitle": "Löydä edullisin lippu työmatkallesi.",
  "header.github.ariaLabel": "Katso lähdekoodi GitHubissa",
  "header.theme.ariaLabel": "Vaihda tumma/vaalea tila",

  // Form
  "form.zones.label": "Vyöhykkeet",
  "form.zones.placeholder": "Valitse vyöhykkeet",
  "form.municipality.label": "Kotikunta",
  "form.trips.label": "Matkat viikossa",
  "form.trips.unit": "matkaa / viikko",
  "form.vacation.label": "Kesäloma (4 viikkoa ilman matkoja)",
  "form.vacation.description": "Vähentää vuosikustannusta kuukauden verran",

  // Municipalities
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
  "municipality.muu": "Muu",

  // Loading
  "loading.text": "Haetaan hintoja HSL:ltä...",

  // Results
  "results.bestOption": "Paras vaihtoehto",
  "results.allOptions": "Kaikki vaihtoehdot",
  "results.monthly": "Kuukausi",
  "results.annual": "Vuosi",
  "results.best": "Paras",
  "results.savingsPerMonth": "Säästä \u20AC{amount}/kk kalleimpaan verrattuna",
  "results.howCalculated": "Näin tämä on laskettu",
  "results.perMonth": "/kk",
  "results.savingsTotal": "Säästä \u20AC{amount}/kk (\u20AC{annualAmount}/v)",
  "results.viewMonthly": "Kuukausi",
  "results.viewAnnual": "Vuosi",
  "results.perYear": "/v",
  "results.savingsPerYear": "Säästä \u20AC{amount}/v kalleimpaan verrattuna",

  // Ticket types
  "ticket.single.label": "Kertalippu",
  "ticket.single.description": "Maksu matkalta",
  "ticket.season.label": "Kausilippu",
  "ticket.season.description": "Vuositilaus",
  "ticket.continuousMonthly.label": "Jatkuva kuukausi",
  "ticket.continuousMonthly.description": "Kuukausittainen automaattitilaus",
  "ticket.series10.label": "Sarjalippu 10",
  "ticket.series10.description": "10 matkaa, 30 päivää",
  "ticket.series20.label": "Sarjalippu 20",
  "ticket.series20.description": "20 matkaa, 60 päivää",

  // Charts
  "chart.monthlyCost": "Kuukausikustannus",
  "chart.costVsTrips": "Hinta vs. matkat",
  "chart.monthlyCostLabel": "Kuukausikustannus (\u20AC)",
  "chart.euroPerMonth": "\u20AC / kuukausi",
  "chart.tripsPerWeek": "Matkaa viikossa",
  "chart.euroPerMonthAxis": "\u20AC kuukaudessa",
  "chart.single": "Kertalippu",
  "chart.season": "Kausilippu",
  "chart.continuous": "Jatkuva",
  "chart.series10": "Sarjalippu 10",
  "chart.series20": "Sarjalippu 20",

  // Footer
  "footer.disclaimer": "Hinnat HSL:ltä. Arviot vain vertailua varten.",

  // Calculations
  "calc.noTrips": "Ei matkoja \u2013 ei kustannuksia",
  "calc.single":
    "{trips} matkaa/vk \u00D7 {weeks} vk/kk = {tripsMonth} matkaa/kk \u00D7 \u20AC{price} = \u20AC{cost}/kk",
  "calc.series":
    "{count}\u00D7 sarjalippu ({journeys} matkaa, {days} pv) ~{usable} käyttökelpoista/paketti \u2192 \u20AC{cost}/kk",
  "calc.fixedMonthly": "Kiinteä \u20AC{cost}/kk",
  "calc.discountMonthly":
    "Kuukausi (\u20AC{price}) {discount}% alennuksella = \u20AC{cost}/kk",
  "calc.season": "30 päivän lippu: \u20AC{cost}/kk",
  "calc.wasteWarning":
    "~{wasted}/{total} matkasta voi jäädä käyttämättä voimassaolorajoitusten vuoksi.",

  // Errors
  "error.unexpected": "Odottamaton virhe laskennassa",
  "error.network":
    "Ei yhteyttä HSL:n palveluihin. Tarkista internet-yhteytesi ja yritä uudelleen.",
  "error.cors":
    "Selaimen turvallisuusasetukset estävät pyynnön. Yritä päivittää sivu.",
  "error.invalidResponse":
    "HSL:n palveluista saatiin virheellistä tietoa. Yritä myöhemmin uudelleen.",
  "error.rateLimit": "Liian monta pyyntöä. Odota hetki ja yritä uudelleen.",
  "error.unknown": "Odottamaton virhe. Yritä uudelleen.",

  // Meta
  "meta.title": "HSL-lippulaskuri \u2014 Edullisin lippu työmatkallesi",
  "meta.description":
    "Vertaa HSL:n kertalippuja, sarjalippuja, kausilippuja ja kuukausilippuja. Syötä vyöhykkeesi ja matkamääräsi löytääksesi edullisimman vaihtoehdon.",
};
