import type { DailyCheckin } from "../storage/checkins";
import { StorageKeys } from "../storage/keys";
import { getBool, getString, setBool, setString } from "../storage/mmkv";
import type { DailyStatus, DailyStatusMap, MonthlyReport, MonthlyReportsMap } from "./reportTypes";

const MAX_MONTHLY_REPORTS = 12;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function sanitizeDailyStatus(value: unknown): DailyStatus | null {
  if (!isObject(value)) return null;
  if (typeof value.dateKey !== "string") return null;
  if (typeof value.smoked !== "boolean") return null;
  const clean: DailyStatus = { dateKey: value.dateKey, smoked: value.smoked };
  if (typeof value.cigarettesSmoked === "number" && Number.isFinite(value.cigarettesSmoked)) {
    clean.cigarettesSmoked = Math.max(0, Math.floor(value.cigarettesSmoked));
  }
  return clean;
}

function sanitizeMonthlyReport(value: unknown): MonthlyReport | null {
  if (!isObject(value)) return null;
  if (typeof value.monthKey !== "string") return null;
  if (typeof value.generatedAt !== "number" || !Number.isFinite(value.generatedAt)) return null;
  if (!isObject(value.totals)) return null;

  const totals = value.totals as Record<string, unknown>;
  const requiredNumericKeys = ["daysInMonth", "daysTracked", "daysSmokeFree", "consistencyPct", "cravingsBeaten"] as const;
  for (const key of requiredNumericKeys) {
    if (typeof totals[key] !== "number" || !Number.isFinite(totals[key] as number)) return null;
  }

  const normalizedTotals = {
    daysInMonth: totals.daysInMonth as number,
    daysTracked: totals.daysTracked as number,
    daysSmokeFree: totals.daysSmokeFree as number,
    consistencyPct: totals.consistencyPct as number,
    cravingsBeaten: totals.cravingsBeaten as number,
    moneySavedMonth: typeof totals.moneySavedMonth === "number" && Number.isFinite(totals.moneySavedMonth) ? (totals.moneySavedMonth as number) : 0,
    moneySavedTotal: typeof totals.moneySavedTotal === "number" && Number.isFinite(totals.moneySavedTotal) ? (totals.moneySavedTotal as number) : 0,
    cigarettesSmokedMonth:
      typeof totals.cigarettesSmokedMonth === "number" && Number.isFinite(totals.cigarettesSmokedMonth)
        ? (totals.cigarettesSmokedMonth as number)
        : 0,
    relapseDaysMonth:
      typeof totals.relapseDaysMonth === "number" && Number.isFinite(totals.relapseDaysMonth)
        ? (totals.relapseDaysMonth as number)
        : 0,
    cigarettesAvoidedMonth:
      typeof totals.cigarettesAvoidedMonth === "number" && Number.isFinite(totals.cigarettesAvoidedMonth)
        ? (totals.cigarettesAvoidedMonth as number)
        : 0,
    cigarettesAvoidedTotal:
      typeof totals.cigarettesAvoidedTotal === "number" && Number.isFinite(totals.cigarettesAvoidedTotal)
        ? (totals.cigarettesAvoidedTotal as number)
        : 0,
  };

  return {
    ...(value as MonthlyReport),
    totals: normalizedTotals,
  };
}

function parseJsonMap<T>(raw: string | undefined, sanitizer: (value: unknown) => T | null): Record<string, T> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!isObject(parsed)) return {};

    const clean: Record<string, T> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const sanitized = sanitizer(value);
      if (sanitized != null) clean[key] = sanitized;
    });
    return clean;
  } catch {
    return {};
  }
}

function toDailyStatusFromCheckin(checkin: DailyCheckin): DailyStatus {
  const smokedCount = Math.max(0, Math.floor(checkin.smoked));
  return {
    dateKey: checkin.date,
    smoked: smokedCount > 0,
    cigarettesSmoked: smokedCount > 0 ? smokedCount : 0,
  };
}

export function readDailyStatusMap(): DailyStatusMap {
  return parseJsonMap(getString(StorageKeys.dailyStatusV1), sanitizeDailyStatus);
}

export function writeDailyStatusMap(map: DailyStatusMap) {
  setString(StorageKeys.dailyStatusV1, JSON.stringify(map));
}

export function upsertDailyStatus(status: DailyStatus) {
  const map = readDailyStatusMap();
  map[status.dateKey] = status;
  writeDailyStatusMap(map);
}

export function upsertDailyStatusFromCheckin(checkin: DailyCheckin) {
  upsertDailyStatus(toDailyStatusFromCheckin(checkin));
}

export function syncDailyStatusFromCheckins(checkins: DailyCheckin[]) {
  if (checkins.length === 0) return;
  const map = readDailyStatusMap();
  checkins.forEach((checkin) => {
    map[checkin.date] = toDailyStatusFromCheckin(checkin);
  });
  writeDailyStatusMap(map);
}

export function readMonthlyReportsMap(): MonthlyReportsMap {
  return parseJsonMap(getString(StorageKeys.monthlyReportsV1), sanitizeMonthlyReport);
}

export function trimMonthlyReports(map: MonthlyReportsMap): MonthlyReportsMap {
  const orderedKeys = Object.keys(map).sort((a, b) => a.localeCompare(b));
  if (orderedKeys.length <= MAX_MONTHLY_REPORTS) return map;

  const next: MonthlyReportsMap = {};
  orderedKeys.slice(-MAX_MONTHLY_REPORTS).forEach((monthKey) => {
    const report = map[monthKey];
    if (report) next[monthKey] = report;
  });
  return next;
}

export function writeMonthlyReportsMap(map: MonthlyReportsMap) {
  const trimmed = trimMonthlyReports(map);
  setString(StorageKeys.monthlyReportsV1, JSON.stringify(trimmed));
}

export function saveMonthlyReportSnapshot(report: MonthlyReport) {
  const map = readMonthlyReportsMap();
  map[report.monthKey] = report;
  writeMonthlyReportsMap(map);
  return trimMonthlyReports(map);
}

export function readMonthlyReportSnapshot(monthKey: string): MonthlyReport | undefined {
  return readMonthlyReportsMap()[monthKey];
}

export function isMonthlyReportNotificationFeatureEnabled() {
  return getBool(StorageKeys.monthlyReportNotifFeatureFlag) ?? false;
}

export function setMonthlyReportNotificationFeatureEnabled(enabled: boolean) {
  setBool(StorageKeys.monthlyReportNotifFeatureFlag, enabled);
}

export function isMonthlyReportNotificationEnabled() {
  return getBool(StorageKeys.monthlyReportNotifEnabled) ?? false;
}

export function setMonthlyReportNotificationEnabled(enabled: boolean) {
  setBool(StorageKeys.monthlyReportNotifEnabled, enabled);
}
