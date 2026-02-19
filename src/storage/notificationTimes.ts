import { StorageKeys } from "./keys";
import { getString, setString } from "./mmkv";

export type NotificationTime = { hour: number; minute: number };
export type NotificationPlan = {
  check: NotificationTime | null;
  passive: NotificationTime[];
};

const DEFAULT_PLAN: NotificationPlan = {
  check: null,
  passive: [],
};

function normalize(time: NotificationTime): NotificationTime {
  const h = Math.max(0, Math.min(23, Math.floor(time.hour)));
  const m = Math.max(0, Math.min(59, Math.floor(time.minute)));
  return { hour: h, minute: m };
}

function readTimeEntry(input: unknown): NotificationTime | null {
  if (typeof input !== "object" || input == null) return null;
  const { hour, minute } = input as { hour?: unknown; minute?: unknown };
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  if (!Number.isFinite(parsedHour) || !Number.isFinite(parsedMinute)) return null;
  return normalize({ hour: parsedHour, minute: parsedMinute });
}

function sortTimes(times: NotificationTime[]): NotificationTime[] {
  return [...times].sort((a, b) => a.hour - b.hour || a.minute - b.minute);
}

function normalizePlan(plan: NotificationPlan): NotificationPlan {
  return {
    check: plan.check ? normalize(plan.check) : null,
    passive: sortTimes(plan.passive.map(normalize)).slice(0, 2),
  };
}

export function readNotificationPlan(): NotificationPlan {
  const raw = getString(StorageKeys.notificationTimes);
  if (!raw) return DEFAULT_PLAN;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.map(readTimeEntry).filter((entry): entry is NotificationTime => entry != null);
      return normalizePlan({
        check: clean[0] ?? null,
        passive: clean.slice(1, 3),
      });
    }

    if (typeof parsed !== "object" || parsed == null) return DEFAULT_PLAN;
    const obj = parsed as { check?: unknown; passive?: unknown };
    const check = readTimeEntry(obj.check);
    const passive = Array.isArray(obj.passive)
      ? obj.passive.map(readTimeEntry).filter((entry): entry is NotificationTime => entry != null)
      : [];

    return normalizePlan({
      check,
      passive,
    });
  } catch {
    return DEFAULT_PLAN;
  }
}

export function saveNotificationPlan(plan: NotificationPlan) {
  const normalized = normalizePlan(plan);
  setString(StorageKeys.notificationTimes, JSON.stringify(normalized));
}

export function readNotificationTimes(): NotificationTime[] {
  const plan = readNotificationPlan();
  return plan.check ? [plan.check, ...plan.passive] : [...plan.passive];
}

export function saveNotificationTimes(times: NotificationTime[]) {
  const clean = sortTimes(times.map(normalize));
  saveNotificationPlan({
    check: clean[0] ?? null,
    passive: clean.slice(1, 3),
  });
}
