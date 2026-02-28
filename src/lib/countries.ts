/**
 * African country data: bounding boxes (lat/lng), currency symbol, currency code.
 * Used for offline reverse-geocoding from coordinates.
 */

export interface CountryInfo {
  code: string;
  name: string;
  symbol: string;
  currencyCode: string;
}

// Approximate bounding boxes for African countries [minLat, maxLat, minLng, maxLng]
const AFRICAN_COUNTRIES: Array<CountryInfo & { bounds: [number, number, number, number] }> = [
  { code: "NG", name: "Nigeria", symbol: "₦", currencyCode: "NGN", bounds: [4.27, 13.89, 2.69, 14.68] },
  { code: "GH", name: "Ghana", symbol: "GH₵", currencyCode: "GHS", bounds: [4.74, 11.17, -3.26, 1.19] },
  { code: "KE", name: "Kenya", symbol: "KSh", currencyCode: "KES", bounds: [-4.68, 5.51, 33.91, 41.91] },
  { code: "ZA", name: "South Africa", symbol: "R", currencyCode: "ZAR", bounds: [-34.84, -22.13, 16.45, 32.89] },
  { code: "EG", name: "Egypt", symbol: "E£", currencyCode: "EGP", bounds: [22.0, 31.67, 24.7, 36.9] },
  { code: "TZ", name: "Tanzania", symbol: "TSh", currencyCode: "TZS", bounds: [-11.75, -1.0, 29.33, 40.44] },
  { code: "ET", name: "Ethiopia", symbol: "Br", currencyCode: "ETB", bounds: [3.4, 14.89, 32.99, 47.99] },
  { code: "UG", name: "Uganda", symbol: "USh", currencyCode: "UGX", bounds: [-1.48, 4.23, 29.57, 35.04] },
  { code: "CM", name: "Cameroon", symbol: "FCFA", currencyCode: "XAF", bounds: [1.65, 13.08, 8.49, 16.19] },
  { code: "CI", name: "Côte d'Ivoire", symbol: "CFA", currencyCode: "XOF", bounds: [4.36, 10.74, -8.6, -2.49] },
  { code: "SN", name: "Senegal", symbol: "CFA", currencyCode: "XOF", bounds: [12.31, 16.69, -17.54, -11.36] },
  { code: "RW", name: "Rwanda", symbol: "FRw", currencyCode: "RWF", bounds: [-2.84, -1.05, 28.86, 30.9] },
  { code: "MA", name: "Morocco", symbol: "MAD", currencyCode: "MAD", bounds: [27.67, 35.92, -13.17, -1.0] },
  { code: "TN", name: "Tunisia", symbol: "DT", currencyCode: "TND", bounds: [30.23, 37.54, 7.52, 11.6] },
  { code: "DZ", name: "Algeria", symbol: "DA", currencyCode: "DZD", bounds: [18.97, 37.09, -8.67, 12.0] },
  { code: "AO", name: "Angola", symbol: "Kz", currencyCode: "AOA", bounds: [-18.04, -4.37, 11.64, 24.08] },
  { code: "MZ", name: "Mozambique", symbol: "MT", currencyCode: "MZN", bounds: [-26.87, -10.47, 30.22, 40.84] },
  { code: "ZM", name: "Zambia", symbol: "ZK", currencyCode: "ZMW", bounds: [-18.08, -8.22, 21.99, 33.71] },
  { code: "ZW", name: "Zimbabwe", symbol: "Z$", currencyCode: "ZWL", bounds: [-22.42, -15.61, 25.24, 33.07] },
  { code: "BW", name: "Botswana", symbol: "P", currencyCode: "BWP", bounds: [-26.91, -17.78, 19.99, 29.37] },
  { code: "NA", name: "Namibia", symbol: "N$", currencyCode: "NAD", bounds: [-28.97, -16.96, 11.72, 25.26] },
  { code: "ML", name: "Mali", symbol: "CFA", currencyCode: "XOF", bounds: [10.16, 25.0, -12.24, 4.27] },
  { code: "BF", name: "Burkina Faso", symbol: "CFA", currencyCode: "XOF", bounds: [9.4, 15.08, -5.52, 2.4] },
  { code: "NE", name: "Niger", symbol: "CFA", currencyCode: "XOF", bounds: [11.69, 23.52, 0.17, 15.99] },
  { code: "TD", name: "Chad", symbol: "FCFA", currencyCode: "XAF", bounds: [7.44, 23.45, 13.47, 24.0] },
  { code: "MG", name: "Madagascar", symbol: "Ar", currencyCode: "MGA", bounds: [-25.6, -11.95, 43.19, 50.48] },
  { code: "CD", name: "DR Congo", symbol: "FC", currencyCode: "CDF", bounds: [-13.46, 5.39, 12.18, 31.31] },
  { code: "SD", name: "Sudan", symbol: "SDG", currencyCode: "SDG", bounds: [8.68, 22.23, 21.81, 38.61] },
  { code: "LY", name: "Libya", symbol: "LD", currencyCode: "LYD", bounds: [19.5, 33.17, 9.39, 25.15] },
  { code: "SO", name: "Somalia", symbol: "Sh", currencyCode: "SOS", bounds: [-1.67, 11.98, 40.99, 51.41] },
  { code: "BJ", name: "Benin", symbol: "CFA", currencyCode: "XOF", bounds: [6.23, 12.42, 0.77, 3.85] },
  { code: "TG", name: "Togo", symbol: "CFA", currencyCode: "XOF", bounds: [6.1, 11.14, -0.15, 1.81] },
  { code: "SL", name: "Sierra Leone", symbol: "Le", currencyCode: "SLL", bounds: [6.93, 10.0, -13.3, -10.27] },
  { code: "LR", name: "Liberia", symbol: "L$", currencyCode: "LRD", bounds: [4.35, 8.55, -11.49, -7.37] },
  { code: "GM", name: "Gambia", symbol: "D", currencyCode: "GMD", bounds: [13.06, 13.83, -16.82, -13.8] },
  { code: "GW", name: "Guinea-Bissau", symbol: "CFA", currencyCode: "XOF", bounds: [10.93, 12.68, -16.71, -13.64] },
  { code: "GN", name: "Guinea", symbol: "FG", currencyCode: "GNF", bounds: [7.19, 12.68, -15.08, -7.64] },
  { code: "MR", name: "Mauritania", symbol: "UM", currencyCode: "MRU", bounds: [14.72, 27.3, -17.07, -4.83] },
  { code: "MW", name: "Malawi", symbol: "MK", currencyCode: "MWK", bounds: [-17.13, -9.37, 32.67, 35.92] },
  { code: "GA", name: "Gabon", symbol: "FCFA", currencyCode: "XAF", bounds: [-3.98, 2.32, 8.7, 14.5] },
  { code: "CG", name: "Congo", symbol: "FCFA", currencyCode: "XAF", bounds: [-5.03, 3.7, 11.2, 18.65] },
  { code: "ER", name: "Eritrea", symbol: "Nfk", currencyCode: "ERN", bounds: [12.36, 18.0, 36.44, 43.12] },
  { code: "DJ", name: "Djibouti", symbol: "Fdj", currencyCode: "DJF", bounds: [10.93, 12.71, 41.77, 43.42] },
  { code: "MU", name: "Mauritius", symbol: "₨", currencyCode: "MUR", bounds: [-20.53, -19.97, 57.31, 57.81] },
  { code: "SC", name: "Seychelles", symbol: "₨", currencyCode: "SCR", bounds: [-9.76, -4.28, 46.2, 56.3] },
  { code: "CV", name: "Cape Verde", symbol: "$", currencyCode: "CVE", bounds: [14.81, 17.2, -25.36, -22.66] },
  { code: "ST", name: "São Tomé", symbol: "Db", currencyCode: "STN", bounds: [0.0, 1.7, 6.47, 7.47] },
  { code: "GQ", name: "Equatorial Guinea", symbol: "FCFA", currencyCode: "XAF", bounds: [0.92, 3.78, 5.62, 11.34] },
  { code: "KM", name: "Comoros", symbol: "CF", currencyCode: "KMF", bounds: [-12.42, -11.36, 43.23, 44.54] },
  { code: "BI", name: "Burundi", symbol: "FBu", currencyCode: "BIF", bounds: [-4.47, -2.31, 29.0, 30.85] },
  { code: "SS", name: "South Sudan", symbol: "SSP", currencyCode: "SSP", bounds: [3.49, 12.24, 23.44, 35.95] },
  { code: "LS", name: "Lesotho", symbol: "L", currencyCode: "LSL", bounds: [-30.67, -28.57, 27.01, 29.46] },
  { code: "SZ", name: "Eswatini", symbol: "E", currencyCode: "SZL", bounds: [-27.32, -25.72, 30.79, 32.14] },
];

const DEFAULT_COUNTRY: CountryInfo = { code: "NG", name: "Nigeria", symbol: "₦", currencyCode: "NGN" };

/**
 * Detect country from lat/lng using bounding box matching.
 * Returns Nigeria as default if no match found.
 */
export function detectCountryFromCoords(lat: number, lng: number): CountryInfo {
  for (const c of AFRICAN_COUNTRIES) {
    const [minLat, maxLat, minLng, maxLng] = c.bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return { code: c.code, name: c.name, symbol: c.symbol, currencyCode: c.currencyCode };
    }
  }
  return DEFAULT_COUNTRY;
}

/**
 * Get country info by country code.
 */
export function getCountryByCode(code: string): CountryInfo {
  const found = AFRICAN_COUNTRIES.find((c) => c.code === code);
  return found ? { code: found.code, name: found.name, symbol: found.symbol, currencyCode: found.currencyCode } : DEFAULT_COUNTRY;
}

/**
 * Format price in local currency.
 */
export function formatLocalPrice(amount: number | null | undefined, countryCode?: string | null): string {
  if (amount == null) return "Free";
  const info = countryCode ? getCountryByCode(countryCode) : DEFAULT_COUNTRY;
  return `${info.symbol}${amount.toLocaleString("en")}`;
}

/**
 * All country names for UI selectors.
 */
export function getAllAfricanCountries(): CountryInfo[] {
  return AFRICAN_COUNTRIES.map((c) => ({ code: c.code, name: c.name, symbol: c.symbol, currencyCode: c.currencyCode }));
}
