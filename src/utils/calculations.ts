export function daysSince(dateISO: string): number {
  const start = new Date(dateISO);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function cigarettesAvoided(days: number, cigsPerDay: number): number {
  return Math.max(0, Math.floor(days * cigsPerDay));
}

export function moneySaved(
  days: number,
  cigsPerDay: number,
  cigsPerPack: number,
  pricePerPack: number
): number {
  if (cigsPerPack <= 0) return 0;
  const packsPerDay = cigsPerDay / cigsPerPack;
  const saved = days * packsPerDay * pricePerPack;
  return Math.max(0, saved);
}

export function timeGainedHours(cigsAvoided: number): number {
  // approximation simple : ~5 minutes / cigarette
  const minutes = cigsAvoided * 5;
  return Math.max(0, Math.round((minutes / 60) * 10) / 10); // 1 décimale
}
