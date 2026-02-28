/**
 * Ad pricing: 1-30 days slider with volume discount.
 * Day 1  = 14 Stars (~₦500)
 * Day 30 = 300 Stars (~₦11,100 → ~₦370/day → ~₦11/day equiv with discount)
 * Formula: stars = round(days * (14 - (days - 1) * 0.1))
 */
export function calculateAdStars(days: number): number {
  const clamped = Math.max(1, Math.min(30, Math.round(days)));
  const perDay = 14 - (clamped - 1) * 0.1;
  return Math.round(clamped * perDay);
}
