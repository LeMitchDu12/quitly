import { readShieldSessions, readShieldTotalCompleted, readShieldWeekState, type ShieldSession, getISOWeekKey } from "./shieldStorage";

export type TopRiskHour = {
  hour: number;
  count: number;
};

export function getTopRiskHours(sessions: ShieldSession[], topN = 3): TopRiskHour[] {
  const byHour = new Map<number, number>();
  sessions.forEach((session) => {
    const hour = Math.max(0, Math.min(23, Math.floor(session.hourOfDay)));
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  });
  return Array.from(byHour.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => (b.count - a.count) || (a.hour - b.hour))
    .slice(0, topN);
}

export function formatHourRange(hour: number) {
  const start = String(Math.max(0, Math.min(23, Math.floor(hour)))).padStart(2, "0");
  const end = String((Math.max(0, Math.min(23, Math.floor(hour))) + 1) % 24).padStart(2, "0");
  return `${start}:00-${end}:00`;
}

export function getShieldStatsSnapshot(now = new Date()) {
  const sessions = readShieldSessions();
  const currentWeekKey = getISOWeekKey(now);
  const thisWeekCompleted = sessions.filter((session) => session.completed && getISOWeekKey(new Date(session.createdAt)) === currentWeekKey).length;

  return {
    totalCompleted: readShieldTotalCompleted(),
    thisWeekCount: readShieldWeekState(now).weekCount,
    thisWeekCompleted,
    topRiskHours: getTopRiskHours(sessions, 3),
    recentSessions: [...sessions].reverse().slice(0, 10),
  };
}
