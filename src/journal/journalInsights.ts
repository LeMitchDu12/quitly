import type { JournalEntry } from "./journalTypes";

export type JournalPatterns = {
  stressRate: number;
  cravingLinked: number;
  relapseLinked: number;
};

function toPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function analyzeJournalPatterns(entries: JournalEntry[]): JournalPatterns {
  const total = entries.length;
  const stressCount = entries.filter((entry) => entry.mood === "stress").length;
  const cravingLinkedCount = entries.filter((entry) => entry.linkedToShield || entry.mood === "craving").length;
  const relapseLinkedCount = entries.filter((entry) => entry.linkedToRelapse).length;

  return {
    stressRate: toPercent(stressCount, total),
    cravingLinked: toPercent(cravingLinkedCount, total),
    relapseLinked: toPercent(relapseLinkedCount, total),
  };
}
