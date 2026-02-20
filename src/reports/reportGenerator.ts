import type { ShieldSession } from "../shield/shieldStorage";
import type { DailyStatusMap, MonthlyReport, ReportProfile } from "./reportTypes";
import {
  getDaysInMonth,
  getISOWeekday,
  getMonthBounds,
  getPreviousMonthKey,
  isCurrentMonth,
  toDateKey,
} from "./reportSelectors";

type GenerateMonthlyReportInput = {
  monthKey: string;
  dailyStatusMap: DailyStatusMap;
  shieldSessions: ShieldSession[];
  profile: ReportProfile;
  previousReport?: MonthlyReport;
  now?: Date;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clampNonNegativeInt(value: number) {
  return Math.max(0, Math.floor(value));
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

function getInsight(params: {
  topHours: number[];
  consistencyDeltaPct?: number;
  cravingsBeaten: number;
}) {
  const { topHours, consistencyDeltaPct, cravingsBeaten } = params;
  if (topHours.length > 0) {
    return { key: "monthly_report.insight.top_hour", params: { hour: topHours[0] } };
  }
  if ((consistencyDeltaPct ?? 0) > 0) {
    return { key: "monthly_report.insight.consistency_up" };
  }
  if (cravingsBeaten > 0) {
    return { key: "monthly_report.insight.cravings_count", params: { count: cravingsBeaten } };
  }
  return { key: "monthly_report.insight.keep_going" };
}

function inMonth(date: Date, monthStart: Date, monthEnd: Date) {
  return date.getTime() >= monthStart.getTime() && date.getTime() <= monthEnd.getTime();
}

export function getTopHoursFromSessions(sessions: ShieldSession[], topN = 3): number[] {
  const byHour = new Map<number, number>();
  sessions.forEach((session) => {
    const hour = Math.max(0, Math.min(23, Math.floor(session.hourOfDay)));
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  });

  return Array.from(byHour.entries())
    .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))
    .slice(0, topN)
    .map(([hour]) => hour);
}

export function getTopWeekdaysFromSessions(sessions: ShieldSession[], topN = 2): number[] {
  const byWeekday = new Map<number, number>();
  sessions.forEach((session) => {
    const source = new Date(session.createdAt || session.startedAt);
    if (Number.isNaN(source.getTime())) return;
    const weekday = getISOWeekday(source);
    byWeekday.set(weekday, (byWeekday.get(weekday) ?? 0) + 1);
  });

  return Array.from(byWeekday.entries())
    .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))
    .slice(0, topN)
    .map(([weekday]) => weekday);
}

function getMonthStatuses(monthKey: string, dailyStatusMap: DailyStatusMap, quitDate: string) {
  return Object.values(dailyStatusMap).filter(
    (entry) => entry.dateKey.startsWith(`${monthKey}-`) && entry.dateKey >= quitDate
  );
}

function sumActualSmoked(statuses: { smoked: boolean; cigarettesSmoked?: number }[]) {
  return sum(
    statuses.map((status) => {
      if (!status.smoked) return 0;
      if (typeof status.cigarettesSmoked === "number" && Number.isFinite(status.cigarettesSmoked)) {
        return clampNonNegativeInt(status.cigarettesSmoked);
      }
      return 1;
    })
  );
}

function getRangeStartDate(quitDate: string, fallbackDateKey?: string) {
  const quit = new Date(`${quitDate}T00:00:00`);
  if (!Number.isNaN(quit.getTime())) return quit;
  if (!fallbackDateKey) return new Date();
  const fallback = new Date(`${fallbackDateKey}T00:00:00`);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

function toSafeDate(value: string, fallback: Date) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function diffDaysInclusive(start: Date, end: Date) {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (e < s) return 0;
  return Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export function generateMonthlyReport(input: GenerateMonthlyReportInput): MonthlyReport {
  const { monthKey, dailyStatusMap, shieldSessions, profile, previousReport, now = new Date() } = input;
  const { start: monthStart, end: monthEnd } = getMonthBounds(monthKey);
  const reportCutoff = isCurrentMonth(monthKey, now) ? now : monthEnd;
  const daysInMonth = getDaysInMonth(monthKey);
  const statuses = getMonthStatuses(monthKey, dailyStatusMap, profile.quitDate);
  const daysTracked = statuses.length;
  const daysSmokeFree = statuses.filter((status) => !status.smoked).length;
  const consistencyPct = daysTracked > 0 ? Math.round((daysSmokeFree / daysTracked) * 100) : 0;

  const completedInMonth = shieldSessions.filter((session) => {
    if (!session.completed) return false;
    const createdAt = toSafeDate(session.createdAt || session.startedAt, monthStart);
    return inMonth(createdAt, monthStart, reportCutoff);
  });

  const cravingsBeaten = completedInMonth.length;
  const topHours = getTopHoursFromSessions(completedInMonth, 3);
  const topWeekdays = getTopWeekdaysFromSessions(completedInMonth, 2);

  const quitDate = toSafeDate(`${profile.quitDate}T00:00:00`, monthStart);
  const monthBaselineStart = quitDate > monthStart ? quitDate : monthStart;
  const baselineDaysInMonth = diffDaysInclusive(monthBaselineStart, reportCutoff);
  const baselineMonth = clampNonNegativeInt(profile.cigsPerDay) * baselineDaysInMonth;
  const actualMonth = sumActualSmoked(statuses);
  const relapseDaysMonth = statuses.filter((status) => status.smoked).length;
  const cigarettesAvoidedMonth = Math.max(0, baselineMonth - actualMonth);

  const pricePerCigarette =
    profile.cigsPerPack > 0 ? profile.pricePerPack / profile.cigsPerPack : 0;
  const moneySavedMonth = round2(cigarettesAvoidedMonth * pricePerCigarette);

  const sortedDateKeys = Object.keys(dailyStatusMap).sort((a, b) => a.localeCompare(b));
  const firstDateKey = sortedDateKeys[0];
  const baselineStart = getRangeStartDate(profile.quitDate, firstDateKey);
  const baselineStartKey = toDateKey(baselineStart);
  const cutoffKey = toDateKey(reportCutoff);

  const statusesInTotalRange = Object.values(dailyStatusMap).filter(
    (entry) => entry.dateKey >= baselineStartKey && entry.dateKey <= cutoffKey
  );
  const actualTotal = sumActualSmoked(statusesInTotalRange);

  let elapsedDays = 0;
  const startDate = new Date(`${baselineStartKey}T00:00:00`);
  const cutoffDate = new Date(`${cutoffKey}T00:00:00`);
  if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(cutoffDate.getTime()) && cutoffDate >= startDate) {
    const diffMs = cutoffDate.getTime() - startDate.getTime();
    elapsedDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  }

  const baselineTotal = clampNonNegativeInt(profile.cigsPerDay) * elapsedDays;
  const cigarettesAvoidedTotal = Math.max(0, baselineTotal - actualTotal);
  const moneySavedTotal = round2(cigarettesAvoidedTotal * pricePerCigarette);

  const prevMonthKey = getPreviousMonthKey(monthKey);
  const prev = previousReport?.monthKey === prevMonthKey ? previousReport : undefined;
  const consistencyDeltaPct = prev ? consistencyPct - prev.totals.consistencyPct : undefined;
  const cravingsDelta = prev ? cravingsBeaten - prev.totals.cravingsBeaten : undefined;
  const moneyDelta = prev ? round2(moneySavedMonth - prev.totals.moneySavedMonth) : undefined;
  const insight = getInsight({ topHours, consistencyDeltaPct, cravingsBeaten });

  return {
    monthKey,
    generatedAt: now.getTime(),
    totals: {
      daysInMonth,
      daysTracked,
      daysSmokeFree,
      consistencyPct,
      cravingsBeaten,
      moneySavedMonth,
      moneySavedTotal,
      cigarettesSmokedMonth: actualMonth,
      relapseDaysMonth,
      cigarettesAvoidedMonth,
      cigarettesAvoidedTotal,
    },
    trends:
      prev != null
        ? {
            consistencyDeltaPct,
            cravingsDelta,
            moneyDelta,
          }
        : undefined,
    sensitive: {
      topHours,
      topWeekdays,
    },
    insight,
  };
}
