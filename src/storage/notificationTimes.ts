import { StorageKeys } from "./keys";
import { getString, setString } from "./mmkv";

export type NotificationTime = { hour: number; minute: number };

const DEFAULT_TIMES: NotificationTime[] = [{ hour: 9, minute: 0 }];

function normalize(time: NotificationTime): NotificationTime {
  const h = Math.max(0, Math.min(23, Math.floor(time.hour)));
  const m = Math.max(0, Math.min(59, Math.floor(time.minute)));
  return { hour: h, minute: m };
}

export function readNotificationTimes(): NotificationTime[] {
  const raw = getString(StorageKeys.notificationTimes);
  if (!raw) return DEFAULT_TIMES;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TIMES;
    const clean = parsed
      .map((entry) => {
        if (typeof entry !== "object" || entry == null) return null;
        const { hour, minute } = entry as { hour?: unknown; minute?: unknown };
        const parsedHour = Number(hour);
        const parsedMinute = Number(minute);
        if (!Number.isFinite(parsedHour) || !Number.isFinite(parsedMinute)) return null;
        return normalize({ hour: parsedHour, minute: parsedMinute });
      })
      .filter((entry): entry is NotificationTime => entry != null);
    return clean.length > 0 ? clean : DEFAULT_TIMES;
  } catch {
    return DEFAULT_TIMES;
  }
}

export function saveNotificationTimes(times: NotificationTime[]) {
  const normalized = times.map(normalize);
  setString(StorageKeys.notificationTimes, JSON.stringify(normalized));
}
