/**
 * Mirror of the edge function pricing formula.
 * Base 10 Stars/day with volume discount down to ~8/day at 30 days.
 */
export function calculateBoostStars(days: number): number {
  const clamped = Math.max(1, Math.min(30, Math.round(days)));
  const perDay = 10 - (clamped - 1) * 0.069;
  return Math.round(clamped * perDay);
}
