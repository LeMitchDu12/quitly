import { StorageKeys } from "./keys";
import { getString, setString } from "./mmkv";
import { todayLocalISODate } from "../utils/date";
import { upsertDailyStatusFromCheckin } from "../reports/reportStorage";

export type DailyCheckin = {
  date: string;
  smoked: number;
};

function sanitizeCheckin(raw: unknown): DailyCheckin | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as { date?: unknown; smoked?: unknown };
  if (typeof candidate.date !== "string") return null;
  const smoked = Number(candidate.smoked);
  if (!Number.isFinite(smoked)) return null;
  return {
    date: candidate.date,
    smoked: Math.max(0, Math.floor(smoked)),
  };
}

export function readDailyCheckins(): DailyCheckin[] {
  const raw = getString(StorageKeys.dailyCheckins);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.map(sanitizeCheckin).filter((entry): entry is DailyCheckin => entry != null);
    return clean.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function writeDailyCheckins(entries: DailyCheckin[]) {
  setString(StorageKeys.dailyCheckins, JSON.stringify(entries));
}

export function upsertDailyCheckin(date: string, smoked: number) {
  const cleanSmoked = Math.max(0, Math.floor(smoked));
  const entries = readDailyCheckins();
  const idx = entries.findIndex((entry) => entry.date === date);
  if (idx >= 0) {
    entries[idx] = { date, smoked: cleanSmoked };
  } else {
    entries.push({ date, smoked: cleanSmoked });
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  writeDailyCheckins(entries);
  upsertDailyStatusFromCheckin({ date, smoked: cleanSmoked });
}

export function getTodayCheckin(): DailyCheckin | undefined {
  const today = todayLocalISODate();
  return readDailyCheckins().find((entry) => entry.date === today);
}

export function totalSmokedSince(checkins: DailyCheckin[], fromDate: string, toDate = todayLocalISODate()): number {
  return checkins
    .filter((entry) => entry.date >= fromDate && entry.date <= toDate)
    .reduce((sum, entry) => sum + entry.smoked, 0);
}

export function smokedSinceUntil(checkins: DailyCheckin[], fromDate: string, toDate: string): number {
  return checkins
    .filter((entry) => entry.date >= fromDate && entry.date <= toDate)
    .reduce((sum, entry) => sum + entry.smoked, 0);
}

export function lastRelapseDate(checkins: DailyCheckin[], fromDate: string): string | undefined {
  for (let i = checkins.length - 1; i >= 0; i -= 1) {
    const entry = checkins[i];
    if (entry.date >= fromDate && entry.smoked > 0) {
      return entry.date;
    }
  }
  return undefined;
}
