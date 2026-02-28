import { formatLocalPrice } from "@/lib/countries";

/**
 * Format a number as Nigerian Naira (legacy helper).
 * Example: formatNaira(25000) → "₦25,000"
 */
export function formatNaira(amount: number | null | undefined): string {
  if (amount == null) return "Free";
  return `₦${amount.toLocaleString("en-NG")}`;
}

/**
 * Format price in the user's local currency based on country code.
 * Falls back to Naira if no country provided.
 */
export function formatPrice(amount: number | null | undefined, countryCode?: string | null): string {
  return formatLocalPrice(amount, countryCode);
}
