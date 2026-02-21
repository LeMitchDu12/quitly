import type { NotificationTime } from "../storage/notificationTimes";

export function sanitizeNotificationTime(time: NotificationTime | null | undefined): NotificationTime {
  if (!time) return { hour: 9, minute: 0 };
  const rawHour = Number(time.hour);
  const rawMinute = Number(time.minute);
  if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute)) return { hour: 9, minute: 0 };
  const hour = Math.max(0, Math.min(23, Math.floor(rawHour)));
  const minute = Math.max(0, Math.min(59, Math.floor(rawMinute)));
  return { hour, minute };
}

export function shiftHour(time: NotificationTime, delta: number): NotificationTime {
  const safe = sanitizeNotificationTime(time);
  const hour = (safe.hour + delta + 24) % 24;
  return { ...safe, hour };
}

export function shiftMinute(time: NotificationTime, delta: number): NotificationTime {
  const safe = sanitizeNotificationTime(time);
  const minute = (safe.minute + delta + 60) % 60;
  return { ...safe, minute };
}
